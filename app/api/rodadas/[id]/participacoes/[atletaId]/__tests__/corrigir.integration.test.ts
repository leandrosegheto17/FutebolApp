/**
 * Teste de integração de BE-09 (TASK.md Secao 3.1) — parte do critério de
 * aceite literal coberta aqui: "corrigir um valor aplica só a diferença" e
 * "toda correção/exclusão gera entrada em log_auditoria sem campo de
 * autor".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02 a BE-08 (ver `.env.test.local` / `npm run test:integration`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { PATCH as patchParticipacao } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

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
  "BE-09 — PATCH /api/rodadas/:id/participacoes/:atletaId",
  () => {
    let service: SupabaseClient<any, any, any>;
    const runSeed = Date.now();
    const runId = `be09-corrigir-${runSeed}`;

    beforeAll(() => {
      service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    });

    /** Data civil única por `indice`, âncora distinta de BE-08 (2031)/exclusão (2032). */
    function rodadaData(indice: number): string {
      const ancora = new Date("2033-01-01T00:00:00.000Z");
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

    it(
      "corrigir um valor aplica só a diferença (RF-04.2) — não substitui o lançamento " +
        "original, e grava log_auditoria (antes/depois) sem campo de autor",
      async () => {
        const atleta = await criarAtleta("diferenca");
        // presente + 1 gol = 2 + 3 = 5 pontos.
        const rodadaId = await lancarRodadaComUmAtleta(1, atleta, "presente", [
          { tipo: "gol", quantidade: 1 },
        ]);

        // Corrige para presente + 2 gols = 2 + 6 = 8 pontos — diferença = +3.
        const response = await patchParticipacao(
          buildPatchRequest(rodadaId, atleta, {
            status: "presente",
            eventos: [{ tipo: "gol", quantidade: 2 }],
          }),
          { params: { id: rodadaId, atletaId: atleta } },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.atleta_id).toBe(atleta);
        expect(body.status).toBe("presente");
        expect(body.eventos).toEqual([{ tipo: "gol", quantidade: 2 }]);
        expect(body.pontos_delta).toBe(8); // total líquido já refletido

        // --- Confirma diretamente no banco: DOIS lançamentos (original +
        // ajuste), nunca um UPDATE do original — a diferença aplicada é
        // exatamente +3, não uma reescrita para 8.
        const { data: lancamentos } = await service
          .from("lancamento_pontos")
          .select("origem, pontos_delta")
          .eq("atleta_id", atleta)
          .eq("rodada_id", rodadaId)
          .order("criado_em", { ascending: true });
        expect(lancamentos).toHaveLength(2);
        expect(lancamentos![0]).toMatchObject({ origem: "lancamento", pontos_delta: 5 });
        expect(lancamentos![1]).toMatchObject({ origem: "correcao", pontos_delta: 3 });
        const somaLiquida = (lancamentos! as any[]).reduce(
          (total, linha) => total + Number(linha.pontos_delta),
          0,
        );
        expect(somaLiquida).toBe(8);

        // evento_jogo substituído pelo novo total (1 gol → 2 gols).
        const { data: participacao } = await service
          .from("participacao_rodada")
          .select("id, status")
          .eq("rodada_id", rodadaId)
          .eq("atleta_id", atleta)
          .single();
        expect(participacao!.status).toBe("presente");
        const { data: eventos } = await service
          .from("evento_jogo")
          .select("tipo, quantidade")
          .eq("participacao_id", participacao!.id);
        expect(eventos).toEqual([{ tipo: "gol", quantidade: 2 }]);

        // log_auditoria: exatamente 1 entrada, sem campo de autor,
        // valores_antes/valores_depois refletem o estado real.
        const { data: logs } = await service
          .from("log_auditoria")
          .select("tipo_evento, rodada_id, atleta_id, valores_antes, valores_depois")
          .eq("rodada_id", rodadaId)
          .eq("atleta_id", atleta);
        expect(logs).toHaveLength(1);
        const log = logs![0]!;
        expect(log.tipo_evento).toBe("correcao");
        expect(log.valores_antes).toEqual({
          status: "presente",
          eventos: [{ tipo: "gol", quantidade: 1 }],
          pontos_acumulados: 5,
        });
        expect(log.valores_depois).toEqual({
          status: "presente",
          eventos: [{ tipo: "gol", quantidade: 2 }],
          pontos_acumulados: 8,
          ajuste_aplicado: 3,
        });
        expect(Object.keys(log)).not.toContain("autor");
      },
    );

    it(
      "corrigir presença para ausente aplica só a diferença negativa (não zera via " +
        "reescrita do lançamento original)",
      async () => {
        const atleta = await criarAtleta("presente-para-ausente");
        // presente sem eventos = 2 pontos.
        const rodadaId = await lancarRodadaComUmAtleta(2, atleta, "presente", []);

        const response = await patchParticipacao(
          buildPatchRequest(rodadaId, atleta, { status: "ausente", eventos: [] }),
          { params: { id: rodadaId, atletaId: atleta } },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.status).toBe("ausente");
        expect(body.pontos_delta).toBe(0); // ausência = 0, diferença aplicada = -2

        const { data: lancamentos } = await service
          .from("lancamento_pontos")
          .select("origem, pontos_delta")
          .eq("atleta_id", atleta)
          .eq("rodada_id", rodadaId)
          .order("criado_em", { ascending: true });
        expect(lancamentos).toHaveLength(2);
        expect(lancamentos![1]).toMatchObject({ origem: "correcao", pontos_delta: -2 });
      },
    );

    it(
      "corrigir para status ausente com eventos retorna 400 (RF-02.6), sem gravar " +
        "log_auditoria nem novo lançamento",
      async () => {
        const atleta = await criarAtleta("bloqueio-ausente");
        const rodadaId = await lancarRodadaComUmAtleta(3, atleta, "presente", []);

        const response = await patchParticipacao(
          buildPatchRequest(rodadaId, atleta, {
            status: "ausente",
            eventos: [{ tipo: "gol", quantidade: 1 }],
          }),
          { params: { id: rodadaId, atletaId: atleta } },
        );
        expect(response.status).toBe(400);

        const { data: logs } = await service
          .from("log_auditoria")
          .select("id")
          .eq("rodada_id", rodadaId)
          .eq("atleta_id", atleta);
        expect(logs).toHaveLength(0);

        const { data: lancamentos } = await service
          .from("lancamento_pontos")
          .select("id")
          .eq("atleta_id", atleta)
          .eq("rodada_id", rodadaId);
        expect(lancamentos).toHaveLength(1); // só o lançamento original
      },
    );

    it("retorna 404 quando a rodada não existe", async () => {
      const atleta = await criarAtleta("rodada-inexistente");
      const idInexistente = "00000000-0000-0000-0000-000000000000";
      const response = await patchParticipacao(
        buildPatchRequest(idInexistente, atleta, { status: "presente", eventos: [] }),
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

      const response = await patchParticipacao(
        buildPatchRequest(rodadaId, atletaFora, { status: "presente", eventos: [] }),
        { params: { id: rodadaId, atletaId: atletaFora } },
      );
      expect(response.status).toBe(404);
    });

    it("retorna 409 ao tentar corrigir uma rodada já excluída", async () => {
      const atleta = await criarAtleta("rodada-excluida");
      const rodadaId = await lancarRodadaComUmAtleta(5, atleta, "presente", []);

      const { error: excluirError } = await service.rpc("excluir_rodada", {
        p_rodada_id: rodadaId,
      });
      if (excluirError) throw excluirError;

      const response = await patchParticipacao(
        buildPatchRequest(rodadaId, atleta, { status: "ausente", eventos: [] }),
        { params: { id: rodadaId, atletaId: atleta } },
      );
      expect(response.status).toBe(409);
    });

    it("PATCH com corpo malformado retorna 400", async () => {
      const atleta = await criarAtleta("corpo-malformado");
      const rodadaId = await lancarRodadaComUmAtleta(6, atleta, "presente", []);

      const response = await patchParticipacao(
        new Request(
          `http://localhost:3000/api/rodadas/${rodadaId}/participacoes/${atleta}`,
          {
            method: "PATCH",
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
  describe("BE-09 — PATCH /api/rodadas/:id/participacoes/:atletaId (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
