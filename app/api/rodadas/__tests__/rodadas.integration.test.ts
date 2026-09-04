/**
 * Teste de integração de BE-08 (TASK.md Secao 3.1) — critério de aceite
 * literal: "confirmar lançamento aplica pontos corretos por evento; tentar
 * lançar gol/cartão para atleta ausente retorna erro bloqueante; lançar
 * rodada com data já existente exige confirmação explícita; toda a operação
 * é atômica (uma transação)".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02 a BE-07:
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * `app.lancamento_pontos` é ledger append-only (GUARDRAILS.md regra 8,
 * trigger de BE-02) e `app.rodada`/`app.participacao_rodada` ficam presas a
 * ele por FK `on delete restrict` assim que um lançamento bem-sucedido
 * acontece — mesmo padrão de "nunca limpo no afterAll" já usado por
 * `app.atleta` em BE-03/04/06/07: toda rodada/atleta criado por este teste
 * usa uma `data`/`nome_completo` derivados de `runSeed` (único por
 * execução), e as asserções filtram por id/data conhecidos, nunca por "a
 * tabela está vazia". Os únicos registros limpos no `finally` são rodadas
 * semeadas diretamente pelo teste SEM nenhuma participação/lançamento
 * associado (nada as prende por FK `restrict`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as postRodada } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/rodadas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!podeRodar)("BE-08 — POST /api/rodadas", () => {
  let service: SupabaseClient<any, any, any>;
  // Seed único por execução — cada `rodadaData(indice)` deriva um dia civil
  // distinto a partir daqui, evitando colisão de `data` entre execuções
  // sucessivas do mesmo Supabase local persistente (mesmo racional do
  // `runId` prefixado já usado por BE-03/04/06/07 para nome/texto).
  const runSeed = Date.now();
  const runId = `be08-${runSeed}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  /**
   * Data civil (AAAA-MM-DD) determinística e única por `indice` dentro desta
   * execução — âncora bem distante de 2000-01-01 (vigência do seed de RN-05,
   * migration BE-08) e de qualquer outra data usada por outros testes de
   * integração deste projeto.
   */
  function rodadaData(indice: number): string {
    const ancora = new Date("2031-01-01T00:00:00.000Z");
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

  it(
    "confirmar lançamento aplica pontos corretos por evento (RN-05): presença +2, " +
      "lesionado conta como presença, gol +3, cartão amarelo -1, ausência 0",
    async () => {
      const atletaPresente = await criarAtleta("presente");
      const atletaLesionado = await criarAtleta("lesionado");
      const atletaAusente = await criarAtleta("ausente");
      const data = rodadaData(1);

      const response = await postRodada(
        buildRequest({
          data,
          participacoes: [
            {
              atleta_id: atletaPresente,
              status: "presente",
              eventos: [
                { tipo: "gol", quantidade: 2 },
                { tipo: "cartao_amarelo", quantidade: 1 },
              ],
            },
            {
              atleta_id: atletaLesionado,
              status: "lesionado",
              eventos: [{ tipo: "gol", quantidade: 1 }],
            },
            { atleta_id: atletaAusente, status: "ausente" },
          ],
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toBe(data);
      expect(body.status).toBe("lancada");

      const porAtleta = new Map<string, any>(
        body.participacoes.map((p: any) => [p.atleta_id, p]),
      );

      // presença (+2) + 2 gols (2*3=6) + 1 cartão amarelo (-1) = 7
      expect(porAtleta.get(atletaPresente).pontos_delta).toBe(7);
      // lesionado pontua presença (+2) + 1 gol (3) = 5 (RF-02.3)
      expect(porAtleta.get(atletaLesionado).pontos_delta).toBe(5);
      // ausência = 0
      expect(porAtleta.get(atletaAusente).pontos_delta).toBe(0);

      // Confirma direto no banco (não só a resposta HTTP) — lancamento_pontos
      // é o ledger que de fato determina o saldo do atleta.
      const { data: lancamentos, error } = await service
        .from("lancamento_pontos")
        .select("atleta_id, pontos_delta, origem, rodada_id")
        .in("atleta_id", [atletaPresente, atletaLesionado, atletaAusente]);
      if (error) throw error;
      expect(lancamentos).toHaveLength(3);
      for (const lancamento of lancamentos!) {
        expect(lancamento.origem).toBe("lancamento");
        expect(lancamento.rodada_id).toBe(body.id);
      }
      const pontosPorAtleta = new Map(
        lancamentos!.map((l: any) => [l.atleta_id, l.pontos_delta]),
      );
      expect(pontosPorAtleta.get(atletaPresente)).toBe(7);
      expect(pontosPorAtleta.get(atletaLesionado)).toBe(5);
      expect(pontosPorAtleta.get(atletaAusente)).toBe(0);

      // evento_jogo gravado com tipo/quantidade corretos.
      const { data: participacoes } = await service
        .from("participacao_rodada")
        .select("id, atleta_id, status")
        .eq("rodada_id", body.id);
      const participacaoPresente = participacoes!.find(
        (p: any) => p.atleta_id === atletaPresente,
      );
      expect(participacaoPresente).toBeTruthy();
      expect(participacaoPresente!.status).toBe("presente");
      const { data: eventos } = await service
        .from("evento_jogo")
        .select("tipo, quantidade")
        .eq("participacao_id", participacaoPresente!.id)
        .order("tipo");
      expect(eventos).toEqual([
        { tipo: "cartao_amarelo", quantidade: 1 },
        { tipo: "gol", quantidade: 2 },
      ]);
    },
  );

  it(
    "tentar lançar gol/cartão para atleta ausente retorna erro bloqueante (RF-02.6) — " +
      "400, nenhuma rodada criada",
    async () => {
      const atletaAusente = await criarAtleta("bloqueio-ausente");
      const data = rodadaData(2);

      const response = await postRodada(
        buildRequest({
          data,
          participacoes: [
            {
              atleta_id: atletaAusente,
              status: "ausente",
              eventos: [{ tipo: "gol", quantidade: 1 }],
            },
          ],
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(
        body.detalhes.some((d: any) => d.path.join(".") === "participacoes.0.eventos"),
      ).toBe(true);

      const { data: rodadas } = await service
        .from("rodada")
        .select("id")
        .eq("data", data);
      expect(rodadas).toHaveLength(0);
    },
  );

  it(
    "atomicidade (RNF-10): chamada direta a app.lancar_rodada (contornando a validação " +
      "da API) com evento para atleta ausente é bloqueada pela própria função e reverte " +
      "100% da transação — nenhuma gravação parcial, nem do atleta processado antes do erro",
    async () => {
      const atletaOk = await criarAtleta("atomico-ok");
      const atletaBloqueado = await criarAtleta("atomico-bloqueado");
      const data = rodadaData(3);

      // Chama a RPC diretamente com o client de serviço — contorna
      // `lancarRodadaBodySchema` de propósito, para provar que a garantia de
      // atomicidade/bloqueio é estrutural (na própria função PL/pgSQL), não
      // apenas uma validação de borda em TypeScript (TASK.md Seção 1.2).
      const { error } = await service.rpc("lancar_rodada", {
        p_data: data,
        p_participacoes: [
          // Processado primeiro no loop da função — insere participação +
          // evento + lançamento de pontos ANTES de a função chegar ao
          // segundo item e abortar.
          {
            atleta_id: atletaOk,
            status: "presente",
            eventos: [{ tipo: "gol", quantidade: 1 }],
          },
          {
            atleta_id: atletaBloqueado,
            status: "ausente",
            eventos: [{ tipo: "gol", quantidade: 1 }],
          },
        ],
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/RF-02\.6/);

      // Nenhuma rodada com esta data foi persistida...
      const { data: rodadas } = await service
        .from("rodada")
        .select("id")
        .eq("data", data);
      expect(rodadas).toHaveLength(0);

      // ...e, mais importante: nem o primeiro atleta (processado com sucesso
      // ANTES do erro, dentro do mesmo loop) tem qualquer rastro persistido
      // — prova de que a transação inteira foi revertida, não só o item que
      // falhou.
      const { data: lancamentosOk } = await service
        .from("lancamento_pontos")
        .select("id")
        .eq("atleta_id", atletaOk);
      expect(lancamentosOk).toHaveLength(0);
      const { data: participacoesOk } = await service
        .from("participacao_rodada")
        .select("id")
        .eq("atleta_id", atletaOk);
      expect(participacoesOk).toHaveLength(0);
    },
  );

  it(
    "lançar rodada com data já existente exige confirmação explícita (RF-02.8) — " +
      "409 sem confirmar_duplicidade, 201 com confirmar_duplicidade: true",
    async () => {
      const data = rodadaData(4);
      const { data: rodadaExistente, error: seedError } = await service
        .from("rodada")
        .insert({ data, status: "lancada" })
        .select("id")
        .single();
      if (seedError) throw seedError;

      const atleta = await criarAtleta("duplicidade");

      try {
        const semConfirmar = await postRodada(
          buildRequest({
            data,
            participacoes: [{ atleta_id: atleta, status: "presente" }],
          }),
        );
        expect(semConfirmar.status).toBe(409);
        const semConfirmarBody = await semConfirmar.json();
        expect(semConfirmarBody.error).toBe("duplicidade");
        expect(semConfirmarBody.rodadas_duplicadas).toHaveLength(1);
        expect(semConfirmarBody.rodadas_duplicadas[0].id).toBe(rodadaExistente!.id);

        const { data: rodadasAposTentativa } = await service
          .from("rodada")
          .select("id")
          .eq("data", data);
        expect(rodadasAposTentativa).toHaveLength(1); // nada novo foi criado

        const comConfirmar = await postRodada(
          buildRequest({
            data,
            confirmar_duplicidade: true,
            participacoes: [{ atleta_id: atleta, status: "presente" }],
          }),
        );
        expect(comConfirmar.status).toBe(201);

        const { data: rodadasFinal } = await service
          .from("rodada")
          .select("id")
          .eq("data", data);
        expect(rodadasFinal).toHaveLength(2); // a semeada + a confirmada
      } finally {
        // A rodada semeada diretamente (sem participação/lançamento) não tem
        // nenhuma FK `restrict` a segurar — pode ser limpa. A rodada criada
        // via confirmação já tem `lancamento_pontos` (append-only) e fica
        // permanente, mesmo padrão já aceito para `app.atleta` em BE-03/06/07.
        await service.from("rodada").delete().eq("id", rodadaExistente!.id);
      }
    },
  );

  it(
    "rodada com status 'excluida' na mesma data NÃO dispara o alerta de duplicidade " +
      "(decisão de detalhe documentada na migration de app.lancar_rodada/repository.ts)",
    async () => {
      const data = rodadaData(5);
      const { data: rodadaExcluida, error: seedError } = await service
        .from("rodada")
        .insert({ data, status: "excluida" })
        .select("id")
        .single();
      if (seedError) throw seedError;

      const atleta = await criarAtleta("excluida-nao-conta");

      try {
        const response = await postRodada(
          buildRequest({
            data,
            participacoes: [{ atleta_id: atleta, status: "presente" }],
          }),
        );
        expect(response.status).toBe(201);
      } finally {
        await service.from("rodada").delete().eq("id", rodadaExcluida!.id);
      }
    },
  );

  it("POST com corpo malformado retorna 400", async () => {
    const response = await postRodada(
      new Request("http://localhost:3000/api/rodadas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ nao-e-json-valido",
      }),
    );
    expect(response.status).toBe(400);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-08 — POST /api/rodadas (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
