/**
 * Teste de integração de BE-10 (TASK.md Secao 3.1) — critério de aceite
 * literal coberto aqui: "chamar a função com um valor hipotético novo
 * retorna o delta de pontos calculado sem gravar nenhuma linha nova" e "usa
 * a mesma tabela `configuracao_pontuacao` vigente que a correção real
 * usaria".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02 a BE-09 (ver `.env.test.local` / `npm run test:integration`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { PATCH as patchParticipacao } from "../../route";
import { POST as postSimularCorrecao } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildSimularRequest(rodadaId: string, atletaId: string, body: unknown): Request {
  return new Request(
    `http://localhost:3000/api/rodadas/${rodadaId}/participacoes/${atletaId}/simular-correcao`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function buildPatchRequest(rodadaId: string, atletaId: string, body: unknown): Request {
  return new Request(
    `http://localhost:3000/api/rodadas/${rodadaId}/participacoes/${atletaId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe.skipIf(!podeRodar)(
  "BE-10 — POST /api/rodadas/:id/participacoes/:atletaId/simular-correcao",
  () => {
    let service: SupabaseClient<any, any, any>;
    const runSeed = Date.now();
    const runId = `be10-simular-${runSeed}`;

    beforeAll(() => {
      service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    });

    /** Data civil única por `indice`, âncora distinta de BE-08 (2031)/exclusão (2032)/correção (2033)/log (2034). */
    function rodadaData(indice: number): string {
      const ancora = new Date("2035-01-01T00:00:00.000Z");
      const diasOffset = (runSeed % 100000) + indice;
      const data = new Date(ancora.getTime() + diasOffset * 24 * 60 * 60 * 1000);
      return data.toISOString().slice(0, 10);
    }

    async function criarAtleta(sufixo: string): Promise<string> {
      const { data, error } = await service
        .from("atleta")
        .insert({
          nome_completo: `${runId} ${sufixo}`,
          apelido_exibicao: `${runId}-${sufixo}`,
          data_nascimento: "1990-01-01",
          pontuacao_inicial: 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    }

    async function lancarRodadaComUmAtleta(
      indice: number,
      atletaId: string,
      status: string,
      eventos: Array<{ tipo: string; quantidade: number }>,
    ): Promise<string> {
      const { data: rodadaId, error } = await service.rpc("lancar_rodada", {
        p_data: rodadaData(indice),
        p_participacoes: [{ atleta_id: atletaId, status, eventos }],
      });
      if (error) throw error;
      return rodadaId as string;
    }

    async function contarLinhas(
      tabela:
        "lancamento_pontos" | "evento_jogo" | "log_auditoria" | "participacao_rodada",
      coluna: string,
      valor: string,
    ): Promise<number> {
      const { count, error } = await service
        .from(tabela)
        .select("id", { count: "exact", head: true })
        .eq(coluna, valor);
      if (error) throw error;
      return count ?? 0;
    }

    it(
      "retorna o delta calculado sem gravar nenhuma linha nova em nenhuma tabela, " +
        "usando a mesma configuracao_pontuacao vigente que a correção real usaria — " +
        "delta bate exatamente com o que app.corrigir_participacao_rodada gravaria",
      async () => {
        const atleta = await criarAtleta("delta-sem-escrita");
        // presente + 1 gol = 2 + 3 = 5 pontos (mesmos valores seedados por BE-08).
        const rodadaId = await lancarRodadaComUmAtleta(1, atleta, "presente", [
          { tipo: "gol", quantidade: 1 },
        ]);

        // --- Snapshot de "antes" em TODAS as tabelas que uma correção real tocaria.
        const { data: participacaoAntes } = await service
          .from("participacao_rodada")
          .select("id, status")
          .eq("rodada_id", rodadaId)
          .eq("atleta_id", atleta)
          .single();
        const participacaoId = participacaoAntes!.id as string;

        const [lancamentosAntes, eventosAntes, logsAntes] = await Promise.all([
          contarLinhas("lancamento_pontos", "rodada_id", rodadaId),
          service
            .from("evento_jogo")
            .select("id, tipo, quantidade")
            .eq("participacao_id", participacaoId),
          contarLinhas("log_auditoria", "rodada_id", rodadaId),
        ]);
        expect(lancamentosAntes).toBe(1);
        expect(logsAntes).toBe(0);
        expect((eventosAntes as any).data).toHaveLength(1);

        // Simula: presente + 2 gols = 2 + 6 = 8 pontos — delta hipotético = +3.
        const response = await postSimularCorrecao(
          buildSimularRequest(rodadaId, atleta, {
            status: "presente",
            eventos: [{ tipo: "gol", quantidade: 2 }],
          }),
          { params: { id: rodadaId, atletaId: atleta } },
        );

        expect(response.status).toBe(200);
        const preview = await response.json();
        expect(preview.atleta_id).toBe(atleta);
        expect(preview.status_atual).toBe("presente");
        expect(preview.eventos_atuais).toEqual([{ tipo: "gol", quantidade: 1 }]);
        expect(preview.novo_status).toBe("presente");
        expect(preview.novos_eventos).toEqual([{ tipo: "gol", quantidade: 2 }]);
        expect(preview.pontos_antes).toBe(5);
        expect(preview.pontos_depois).toBe(8); // confirma leitura de configuracao_pontuacao vigente
        expect(preview.pontos_delta).toBe(3);

        // --- CRITÉRIO DE ACEITE LITERAL: nenhuma linha nova gravada em
        // NENHUMA tabela, em nenhum ponto tocado por uma correção real.
        const [lancamentosDepois, eventosDepois, logsDepois, participacaoDepois] =
          await Promise.all([
            contarLinhas("lancamento_pontos", "rodada_id", rodadaId),
            service
              .from("evento_jogo")
              .select("id, tipo, quantidade")
              .eq("participacao_id", participacaoId),
            contarLinhas("log_auditoria", "rodada_id", rodadaId),
            service
              .from("participacao_rodada")
              .select("status")
              .eq("id", participacaoId)
              .single(),
          ]);
        expect(lancamentosDepois).toBe(1); // nenhum novo lançamento
        expect(
          (eventosDepois as any).data.map((e: any) => ({
            tipo: e.tipo,
            quantidade: e.quantidade,
          })),
        ).toEqual([{ tipo: "gol", quantidade: 1 }]); // evento_jogo nunca substituído pelo preview
        expect(logsDepois).toBe(0); // nenhuma entrada de auditoria
        expect((participacaoDepois as any).data.status).toBe("presente"); // status nunca alterado

        // --- Agora aplica a correção REAL com o MESMO cenário e confirma
        // que o ajuste de fato gravado é EXATAMENTE o pontos_delta previsto
        // pelo preview (mesmo helper de cálculo compartilhado, BE-10).
        const correcaoReal = await patchParticipacao(
          buildPatchRequest(rodadaId, atleta, {
            status: "presente",
            eventos: [{ tipo: "gol", quantidade: 2 }],
          }),
          { params: { id: rodadaId, atletaId: atleta } },
        );
        expect(correcaoReal.status).toBe(200);

        const { data: lancamentosFinal } = await service
          .from("lancamento_pontos")
          .select("origem, pontos_delta")
          .eq("atleta_id", atleta)
          .eq("rodada_id", rodadaId)
          .order("criado_em", { ascending: true });
        expect(lancamentosFinal).toHaveLength(2);
        expect(lancamentosFinal![1]).toMatchObject({
          origem: "correcao",
          pontos_delta: preview.pontos_delta, // === 3, exatamente o valor previsto
        });
      },
    );

    it(
      "correção que reduz pontos (presente → ausente): preview não escreve nada e " +
        "delta previsto é negativo, batendo com o que a correção real grava",
      async () => {
        const atleta = await criarAtleta("delta-negativo");
        const rodadaId = await lancarRodadaComUmAtleta(2, atleta, "presente", []); // 2 pontos

        const response = await postSimularCorrecao(
          buildSimularRequest(rodadaId, atleta, { status: "ausente", eventos: [] }),
          { params: { id: rodadaId, atletaId: atleta } },
        );
        expect(response.status).toBe(200);
        const preview = await response.json();
        expect(preview.pontos_antes).toBe(2);
        expect(preview.pontos_depois).toBe(0);
        expect(preview.pontos_delta).toBe(-2);

        const totalLancamentos = await contarLinhas(
          "lancamento_pontos",
          "rodada_id",
          rodadaId,
        );
        expect(totalLancamentos).toBe(1); // nenhum novo lançamento gravado pelo preview

        const totalLogs = await contarLinhas("log_auditoria", "rodada_id", rodadaId);
        expect(totalLogs).toBe(0);
      },
    );

    it("simular para status ausente com eventos retorna 400 (RF-02.6), sem gravar nada", async () => {
      const atleta = await criarAtleta("bloqueio-ausente");
      const rodadaId = await lancarRodadaComUmAtleta(3, atleta, "presente", []);

      const response = await postSimularCorrecao(
        buildSimularRequest(rodadaId, atleta, {
          status: "ausente",
          eventos: [{ tipo: "gol", quantidade: 1 }],
        }),
        { params: { id: rodadaId, atletaId: atleta } },
      );
      expect(response.status).toBe(400);

      const totalLancamentos = await contarLinhas(
        "lancamento_pontos",
        "rodada_id",
        rodadaId,
      );
      expect(totalLancamentos).toBe(1);
      const totalLogs = await contarLinhas("log_auditoria", "rodada_id", rodadaId);
      expect(totalLogs).toBe(0);
    });

    it("retorna 404 quando a rodada não existe, sem gravar nada", async () => {
      const atleta = await criarAtleta("rodada-inexistente");
      const idInexistente = "00000000-0000-0000-0000-000000000000";
      const response = await postSimularCorrecao(
        buildSimularRequest(idInexistente, atleta, { status: "presente", eventos: [] }),
        { params: { id: idInexistente, atletaId: atleta } },
      );
      expect(response.status).toBe(404);
    });

    it("retorna 404 quando o atleta não participou da rodada", async () => {
      const atletaParticipante = await criarAtleta("participante");
      const atletaFora = await criarAtleta("nao-participante");
      const rodadaId = await lancarRodadaComUmAtleta(
        4,
        atletaParticipante,
        "presente",
        [],
      );

      const response = await postSimularCorrecao(
        buildSimularRequest(rodadaId, atletaFora, { status: "presente", eventos: [] }),
        { params: { id: rodadaId, atletaId: atletaFora } },
      );
      expect(response.status).toBe(404);
    });

    it("retorna 409 ao tentar simular correção sobre uma rodada já excluída", async () => {
      const atleta = await criarAtleta("rodada-excluida");
      const rodadaId = await lancarRodadaComUmAtleta(5, atleta, "presente", []);

      const { error: excluirError } = await service.rpc("excluir_rodada", {
        p_rodada_id: rodadaId,
      });
      if (excluirError) throw excluirError;

      const response = await postSimularCorrecao(
        buildSimularRequest(rodadaId, atleta, { status: "ausente", eventos: [] }),
        { params: { id: rodadaId, atletaId: atleta } },
      );
      expect(response.status).toBe(409);
    });

    it("POST com corpo malformado retorna 400", async () => {
      const atleta = await criarAtleta("corpo-malformado");
      const rodadaId = await lancarRodadaComUmAtleta(6, atleta, "presente", []);

      const response = await postSimularCorrecao(
        new Request(
          `http://localhost:3000/api/rodadas/${rodadaId}/participacoes/${atleta}/simular-correcao`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{ nao-e-json-valido",
          },
        ),
        { params: { id: rodadaId, atletaId: atleta } },
      );
      expect(response.status).toBe(400);
    });
  },
);

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-10 — POST .../simular-correcao (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
