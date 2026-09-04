/**
 * Teste de integração de BE-11 (TASK.md Secao 3.1) — critério de aceite
 * literal: "Para N times, gera divisão respeitando 100% das restrições
 * obrigatórias ativas ou retorna status: 'conflito' com o contrato exato do
 * ADR-010; nível técnico + idade usados como soft constraint (RF-05.3);
 * execução acima do timeout configurado retorna erro de 'falha técnica
 * real'".
 *
 * O caso de TIMEOUT é coberto separadamente em
 * `src/modules/times/__tests__/montar.integration.test.ts` (chama
 * `montarSugestaoTimes` diretamente com um orçamento de tempo já vencido,
 * `orcamentoMsOverride` — ver comentário em `src/modules/times/montar.ts` —
 * em vez de esperar `TIMEOUT_MONTAGEM_MS` de verdade ou montar uma entrada
 * adversária artificialmente densa só para estourar o tempo real).
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02/03/04/06/12:
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * Nível técnico (RN-03) controlado sem precisar lançar rodada nenhuma: um
 * atleta sem nenhuma `participacao_rodada` tem `nivel_tecnico` = `pontuacao_inicial`
 * (fallback, mesma regra já validada por BE-06) — os atletas deste arquivo
 * usam `pontuacao_inicial` para controlar precisamente o nível técnico de
 * cada um em cada cenário de equilíbrio (RF-05.3), sem a complexidade de
 * semear `configuracao_pontuacao`/lançar rodadas reais.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as postSugestao } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildRequest(body?: unknown): Request {
  return new Request("http://localhost:3000/api/times/sugestao", {
    method: "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";

describe.skipIf(!podeRodar)("BE-11 — POST /api/times/sugestao", () => {
  let service: SupabaseClient<any, any, any>;
  const runId = `be11-${Date.now()}`;

  async function criarAtleta(
    apelido: string,
    pontuacaoInicial: number,
    dataNascimento: string,
  ): Promise<string> {
    const { data, error } = await service
      .from("atleta")
      .insert({
        nome_completo: `${runId} ${apelido}`,
        apelido_exibicao: `${runId}-${apelido}`,
        data_nascimento: dataNascimento,
        pontuacao_inicial: pontuacaoInicial,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async function criarRestricaoAtiva(
    atletaAId: string,
    atletaBId: string,
  ): Promise<void> {
    const { error } = await service
      .from("restricao_obrigatoria")
      .insert({ atleta_a_id: atletaAId, atleta_b_id: atletaBId });
    if (error) throw error;
  }

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  // Nenhum `afterAll` de limpeza: `atleta`/`restricao_obrigatoria` não podem
  // ser fisicamente apagados (GUARDRAILS.md regra 9 / RN-11) — mesmo padrão
  // de BE-06/BE-12. Cada teste cria seu próprio conjunto de atletas
  // prefixado por `runId`, sem depender de estado de outro teste.

  it("corpo malformado retorna 400", async () => {
    const response = await postSugestao(
      new Request("http://localhost:3000/api/times/sugestao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ nao-e-json-valido",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("corpo com quantidade_times maior que atletas_ids retorna 400", async () => {
    const a = await criarAtleta("qtd-a", 5, "1990-01-01");
    const b = await criarAtleta("qtd-b", 5, "1990-01-01");
    const response = await postSugestao(
      buildRequest({ atletas_ids: [a, b], quantidade_times: 3 }),
    );
    expect(response.status).toBe(400);
  });

  it("atletas_ids com id inexistente em app.atleta retorna 404", async () => {
    const a = await criarAtleta("existe", 5, "1990-01-01");
    const response = await postSugestao(
      buildRequest({ atletas_ids: [a, ID_INEXISTENTE], quantidade_times: 2 }),
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.atleta_id).toBe(ID_INEXISTENTE);
  });

  it(
    "sem nenhuma restrição obrigatória, gera 2 times de tamanho igual (status ok), " +
      "cada atleta aparece em exatamente um time",
    async () => {
      const ids = await Promise.all([
        criarAtleta("livre-1", 8, "1990-01-01"),
        criarAtleta("livre-2", 6, "1990-01-01"),
        criarAtleta("livre-3", 4, "1990-01-01"),
        criarAtleta("livre-4", 2, "1990-01-01"),
      ]);
      const response = await postSugestao(
        buildRequest({ atletas_ids: ids, quantidade_times: 2 }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(body.times).toHaveLength(2);
      expect(body.times[0].atletas).toHaveLength(2);
      expect(body.times[1].atletas).toHaveLength(2);

      const todosOsIdsNaResposta = body.times.flatMap((t: any) =>
        t.atletas.map((a: any) => a.atleta_id),
      );
      expect(todosOsIdsNaResposta.sort()).toEqual([...ids].sort());
    },
  );

  it(
    "RF-05.3 — nível técnico é usado como soft constraint: minimiza a diferença agregada " +
      "entre os times (níveis [8,6,4,2] convergem para times de média 5 e 5, não [8,6] vs [4,2])",
    async () => {
      const ids = await Promise.all([
        criarAtleta("nivel-8", 8, "1990-01-01"),
        criarAtleta("nivel-6", 6, "1990-01-01"),
        criarAtleta("nivel-4", 4, "1990-01-01"),
        criarAtleta("nivel-2", 2, "1990-01-01"),
      ]);
      const response = await postSugestao(
        buildRequest({ atletas_ids: ids, quantidade_times: 2 }),
      );
      const body = await response.json();
      expect(body.status).toBe("ok");
      const medias = body.times
        .map((t: any) => t.nivel_tecnico_medio)
        .sort((x: number, y: number) => x - y);
      // Ótimo global para {8,6,4,2} em 2 times de 2 é média 5 e 5 (par {8,2} e {6,4}).
      expect(medias[0]).toBeCloseTo(5, 5);
      expect(medias[1]).toBeCloseTo(5, 5);
    },
  );

  it(
    "RF-05.1 — com uma restrição obrigatória ativa entre dois presentes, os dois nunca " +
      "ficam no mesmo time (status ok)",
    async () => {
      const a = await criarAtleta("restrito-a", 5, "1990-01-01");
      const b = await criarAtleta("restrito-b", 5, "1990-01-01");
      const c = await criarAtleta("restrito-c", 5, "1990-01-01");
      const d = await criarAtleta("restrito-d", 5, "1990-01-01");
      await criarRestricaoAtiva(a, b);

      const response = await postSugestao(
        buildRequest({ atletas_ids: [a, b, c, d], quantidade_times: 2 }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
      const timeDoA = body.times.find((t: any) =>
        t.atletas.some((x: any) => x.atleta_id === a),
      );
      expect(timeDoA.atletas.some((x: any) => x.atleta_id === b)).toBe(false);
    },
  );

  it(
    "RF-05.2/ADR-010 — três atletas mutuamente restritos com quantidade_times=2 retornam " +
      "status: 'conflito' com o contrato exato (restricoes_conflitantes + grupos_conflito)",
    async () => {
      const a = await criarAtleta("conflito-a", 5, "1990-01-01");
      const b = await criarAtleta("conflito-b", 5, "1990-01-01");
      const c = await criarAtleta("conflito-c", 5, "1990-01-01");
      await criarRestricaoAtiva(a, b);
      await criarRestricaoAtiva(b, c);
      await criarRestricaoAtiva(a, c);

      const response = await postSugestao(
        buildRequest({ atletas_ids: [a, b, c], quantidade_times: 2 }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("conflito");
      expect(body.times).toBeUndefined();
      expect(body.restricoes_conflitantes).toHaveLength(3);
      for (const item of body.restricoes_conflitantes) {
        expect(item).toHaveProperty("restricao_id");
        expect(item).toHaveProperty("atleta_a_id");
        expect(item).toHaveProperty("atleta_a_nome");
        expect(item).toHaveProperty("atleta_b_id");
        expect(item).toHaveProperty("atleta_b_nome");
        expect(item.motivo).toBe("restricao_obrigatoria_ativa");
        expect(item.grupo_conflito).toBe(1);
      }
      expect(body.grupos_conflito).toHaveLength(1);
      expect(body.grupos_conflito[0].atletas_ids.sort()).toEqual([a, b, c].sort());
      expect(body.grupos_conflito[0].quantidade_times_solicitada).toBe(2);
      expect(body.grupos_conflito[0].mensagem).toContain("3 atletas");
    },
  );

  it(
    "o mesmo trio mutuamente restrito É viável com quantidade_times=3 (status ok, um " +
      "atleta por time)",
    async () => {
      const a = await criarAtleta("conflito3-a", 5, "1990-01-01");
      const b = await criarAtleta("conflito3-b", 5, "1990-01-01");
      const c = await criarAtleta("conflito3-c", 5, "1990-01-01");
      await criarRestricaoAtiva(a, b);
      await criarRestricaoAtiva(b, c);
      await criarRestricaoAtiva(a, c);

      const response = await postSugestao(
        buildRequest({ atletas_ids: [a, b, c], quantidade_times: 3 }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(body.times).toHaveLength(3);
      for (const time of body.times) {
        expect(time.atletas).toHaveLength(1);
      }
    },
  );

  it(
    "uma restrição desativada (ativo=false) NUNCA é tratada como conflito — mesmo trio " +
      "de antes, mas com a restrição a-c desativada, agora é viável com N=2",
    async () => {
      const a = await criarAtleta("desativada-a", 5, "1990-01-01");
      const b = await criarAtleta("desativada-b", 5, "1990-01-01");
      const c = await criarAtleta("desativada-c", 5, "1990-01-01");
      await criarRestricaoAtiva(a, b);
      const { data: restricaoAC, error } = await service
        .from("restricao_obrigatoria")
        .insert({ atleta_a_id: a, atleta_b_id: c })
        .select("id")
        .single();
      if (error) throw error;
      await service
        .from("restricao_obrigatoria")
        .update({ ativo: false, desativado_em: new Date().toISOString() })
        .eq("id", (restricaoAC as { id: string }).id);

      const response = await postSugestao(
        buildRequest({ atletas_ids: [a, b, c], quantidade_times: 2 }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
    },
  );
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-11 — POST /api/times/sugestao (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
