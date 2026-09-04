/**
 * Teste de integração de BE-16 (TASK.md Secao 3.1) — critério de aceite
 * literal: "lista de rodadas em ordem cronológica decrescente (mais recente
 * primeiro)" (GET /api/rodadas, T06 do `UX-SPEC.md`).
 *
 * Lacuna deixada por BE-08/BE-09/BE-10 (nenhuma tarefa anterior cobria
 * LEITURA de listagem de rodada — BE-08 documentou a omissão explicitamente
 * na época, "listagem/histórico de rodada ficam para BE-09/BE-10"; nenhuma
 * das duas cobriu de fato) — fechada por decisão explícita do usuário ao
 * identificar o bloqueio de FE-06.
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02 a BE-13. `app.rodada`/`app.participacao_rodada`/
 * `app.lancamento_pontos` ficam presas por FK `on delete restrict` assim
 * que um lançamento acontece — mesmo padrão de "nunca limpo no afterAll"
 * já usado pelas demais suítes de rodadas: toda rodada criada por este
 * teste usa uma `data` derivada de `runSeed` (âncora `2036-01-01`, nunca
 * usada por nenhuma outra suíte deste projeto).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { DELETE as deleteRodada } from "../[id]/route";
import { GET as getRodadas } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildGetRequest(query?: string): Request {
  const url = query
    ? `http://localhost:3000/api/rodadas?${query}`
    : "http://localhost:3000/api/rodadas";
  return new Request(url, { method: "GET" });
}

function buildDeleteRequest(rodadaId: string): Request {
  return new Request(`http://localhost:3000/api/rodadas/${rodadaId}`, {
    method: "DELETE",
  });
}

describe.skipIf(!podeRodar)("BE-16 — GET /api/rodadas", () => {
  let service: SupabaseClient<any, any, any>;
  const runSeed = Date.now();
  const runId = `be16-listar-${runSeed}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  /** Data civil única por `indice`, âncora nunca usada por outra suíte (2036, não 2031-2035). */
  function rodadaData(indice: number): string {
    const ancora = new Date("2036-01-01T00:00:00.000Z");
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

  async function lancarRodadaDireta(
    data: string,
    participacoes: Array<{ atleta_id: string; status: string; eventos?: unknown[] }>,
  ): Promise<string> {
    const { data: rodadaId, error } = await service.rpc("lancar_rodada", {
      p_data: data,
      p_participacoes: participacoes.map((p) => ({ ...p, eventos: p.eventos ?? [] })),
    });
    if (error) throw error;
    return rodadaId as string;
  }

  it(
    "lista em ordem cronológica decrescente (mais recente primeiro), com " +
      "presentes contado corretamente e rodada excluída visível (nunca escondida)",
    async () => {
      const atletaPresente = await criarAtleta("presente");
      const atletaAusente = await criarAtleta("ausente");

      // Três rodadas criadas em ordem CRESCENTE de data — a resposta deve
      // devolvê-las em ordem inversa (mais recente/maior data primeiro).
      const rodadaAntiga = await lancarRodadaDireta(rodadaData(1), [
        { atleta_id: atletaPresente, status: "presente" },
      ]);
      const rodadaIntermediaria = await lancarRodadaDireta(rodadaData(2), [
        { atleta_id: atletaPresente, status: "presente" },
        { atleta_id: atletaAusente, status: "ausente" },
      ]);
      const rodadaRecente = await lancarRodadaDireta(rodadaData(3), [
        { atleta_id: atletaPresente, status: "presente" },
      ]);

      // Exclui (soft-delete) a rodada intermediária — deve continuar
      // aparecendo na listagem, com status "excluida" visível.
      const respostaExclusao = await deleteRodada(
        buildDeleteRequest(rodadaIntermediaria),
        {
          params: { id: rodadaIntermediaria },
        },
      );
      expect(respostaExclusao.status).toBe(200);

      const response = await getRodadas(buildGetRequest());
      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{
        id: string;
        data: string;
        status: string;
        criado_em: string;
        presentes: number;
      }>;

      const porId = new Map(body.map((item) => [item.id, item]));
      expect(porId.has(rodadaAntiga)).toBe(true);
      expect(porId.has(rodadaIntermediaria)).toBe(true);
      expect(porId.has(rodadaRecente)).toBe(true);

      // Ordem relativa entre as três rodadas conhecidas — mais recente
      // primeiro, independente de quantas outras rodadas (de outras
      // execuções/suítes) também estejam na resposta.
      const indiceRecente = body.findIndex((item) => item.id === rodadaRecente);
      const indiceIntermediaria = body.findIndex(
        (item) => item.id === rodadaIntermediaria,
      );
      const indiceAntiga = body.findIndex((item) => item.id === rodadaAntiga);
      expect(indiceRecente).toBeLessThan(indiceIntermediaria);
      expect(indiceIntermediaria).toBeLessThan(indiceAntiga);

      // presentes: rodadaIntermediaria tem 1 presente + 1 ausente = 1.
      expect(porId.get(rodadaIntermediaria)!.presentes).toBe(1);
      expect(porId.get(rodadaAntiga)!.presentes).toBe(1);

      // Rodada excluída aparece com o status visível — nunca escondida
      // silenciosamente (decisão de detalhe, TASK.md nota de status BE-16).
      expect(porId.get(rodadaIntermediaria)!.status).toBe("excluida");
      expect(porId.get(rodadaAntiga)!.status).toBe("lancada");
      expect(porId.get(rodadaRecente)!.status).toBe("lancada");
    },
  );

  it("respeita ?limit= (teto de itens retornados)", async () => {
    const response = await getRodadas(buildGetRequest("limit=1"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as unknown[];
    expect(body.length).toBe(1);
  });

  it("retorna 400 para limit inválido (não numérico)", async () => {
    const response = await getRodadas(buildGetRequest("limit=abc"));
    expect(response.status).toBe(400);
  });

  it("retorna 400 para limit acima do teto máximo (200)", async () => {
    const response = await getRodadas(buildGetRequest("limit=201"));
    expect(response.status).toBe(400);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-16 — GET /api/rodadas (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
