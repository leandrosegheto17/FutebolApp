/**
 * Teste de integração de BE-16 (TASK.md Secao 3.1) — critério de aceite
 * literal: "detalhe de uma rodada específica: participações (por atleta,
 * status presente/ausente/lesionado), eventos de jogo (gol/cartão por
 * atleta), e o `pontos_delta` já gravado por atleta nesta rodada" (GET
 * /api/rodadas/{id}, T07 do `UX-SPEC.md` — consumido pela tela de
 * Correção/Estorno).
 *
 * Lacuna deixada por BE-08/BE-09/BE-10 (nenhuma tarefa anterior cobria
 * LEITURA de detalhe de rodada) — fechada por decisão explícita do usuário
 * ao identificar o bloqueio de FE-06/FE-07.
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02 a BE-13. Âncora de data `2037-01-01`, nunca usada por nenhuma
 * outra suíte deste projeto (mesmo racional de "nunca limpo no afterAll"
 * já usado pelas demais suítes de rodadas).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as getRodada } from "../route";
import { PATCH as patchParticipacao } from "../participacoes/[atletaId]/route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildGetRequest(rodadaId: string): Request {
  return new Request(`http://localhost:3000/api/rodadas/${rodadaId}`, { method: "GET" });
}

function buildPatchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/rodadas/x/participacoes/y", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!podeRodar)("BE-16 — GET /api/rodadas/:id", () => {
  let service: SupabaseClient<any, any, any>;
  const runSeed = Date.now();
  const runId = `be16-detalhar-${runSeed}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  /** Data civil única por `indice`, âncora nunca usada por outra suíte (2037). */
  function rodadaData(indice: number): string {
    const ancora = new Date("2037-01-01T00:00:00.000Z");
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
    "devolve participações (status/eventos) e pontos_delta corretos por atleta, " +
      "incluindo apelido_exibicao para exibição",
    async () => {
      const atletaPresente = await criarAtleta("presente");
      const atletaLesionado = await criarAtleta("lesionado");
      const atletaAusente = await criarAtleta("ausente");
      const data = rodadaData(1);

      const { data: rodadaId, error } = await service.rpc("lancar_rodada", {
        p_data: data,
        p_participacoes: [
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
          { atleta_id: atletaAusente, status: "ausente", eventos: [] },
        ],
      });
      if (error) throw error;

      const response = await getRodada(buildGetRequest(rodadaId), {
        params: { id: rodadaId },
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(rodadaId);
      expect(body.data).toBe(data);
      expect(body.status).toBe("lancada");
      expect(body.participacoes).toHaveLength(3);

      const porAtleta = new Map<string, any>(
        body.participacoes.map((p: any) => [p.atleta_id, p]),
      );

      const presente = porAtleta.get(atletaPresente);
      expect(presente.status).toBe("presente");
      expect(presente.apelido_exibicao).toBe(`${runId}-presente`);
      expect(presente.eventos).toEqual(
        expect.arrayContaining([
          { tipo: "gol", quantidade: 2 },
          { tipo: "cartao_amarelo", quantidade: 1 },
        ]),
      );
      // presença (+2) + 2 gols (2*3=6) + 1 cartão amarelo (-1) = 7
      expect(presente.pontos_delta).toBe(7);

      const lesionado = porAtleta.get(atletaLesionado);
      expect(lesionado.status).toBe("lesionado");
      // lesionado pontua presença (+2) + 1 gol (3) = 5 (RF-02.3)
      expect(lesionado.pontos_delta).toBe(5);

      const ausente = porAtleta.get(atletaAusente);
      expect(ausente.status).toBe("ausente");
      expect(ausente.eventos).toEqual([]);
      expect(ausente.pontos_delta).toBe(0);
    },
  );

  it(
    "pontos_delta reflete o total LÍQUIDO após correção (soma de todos os " +
      "lançamentos — original + ajuste — nunca só o lançamento original)",
    async () => {
      const atleta = await criarAtleta("corrigido");
      const data = rodadaData(2);

      const { data: rodadaId, error } = await service.rpc("lancar_rodada", {
        p_data: data,
        p_participacoes: [
          {
            atleta_id: atleta,
            status: "presente",
            eventos: [{ tipo: "gol", quantidade: 1 }],
          },
        ],
      });
      if (error) throw error;
      // presença (+2) + 1 gol (3) = 5

      const correcao = await patchParticipacao(
        buildPatchRequest({
          status: "presente",
          eventos: [{ tipo: "gol", quantidade: 2 }],
        }),
        { params: { id: rodadaId, atletaId: atleta } },
      );
      expect(correcao.status).toBe(200);
      // presença (+2) + 2 gols (6) = 8 — total líquido esperado após correção

      const response = await getRodada(buildGetRequest(rodadaId), {
        params: { id: rodadaId },
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      const participacao = body.participacoes.find((p: any) => p.atleta_id === atleta);
      expect(participacao.status).toBe("presente");
      expect(participacao.eventos).toEqual([{ tipo: "gol", quantidade: 2 }]);
      expect(participacao.pontos_delta).toBe(8);

      // Confirma direto no banco: 2 lançamentos (original + ajuste), soma = 8.
      const { data: lancamentos } = await service
        .from("lancamento_pontos")
        .select("origem, pontos_delta")
        .eq("rodada_id", rodadaId)
        .eq("atleta_id", atleta);
      expect(lancamentos).toHaveLength(2);
      const soma = (lancamentos! as any[]).reduce(
        (total, l) => total + Number(l.pontos_delta),
        0,
      );
      expect(soma).toBe(8);
    },
  );

  it("devolve o detalhe de uma rodada já excluída (nunca escondida, decisão de detalhe)", async () => {
    const atleta = await criarAtleta("excluida");
    const data = rodadaData(3);
    const { data: rodadaId, error } = await service.rpc("lancar_rodada", {
      p_data: data,
      p_participacoes: [{ atleta_id: atleta, status: "presente", eventos: [] }],
    });
    if (error) throw error;

    const { error: excluirError } = await service.rpc("excluir_rodada", {
      p_rodada_id: rodadaId,
    });
    if (excluirError) throw excluirError;

    const response = await getRodada(buildGetRequest(rodadaId), {
      params: { id: rodadaId },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("excluida");
    expect(body.participacoes).toHaveLength(1);
    // Pontos revertidos: lançamento original + estorno = 0 líquido.
    expect(body.participacoes[0].pontos_delta).toBe(0);
  });

  it("retorna 404 para rodada inexistente", async () => {
    const idInexistente = "00000000-0000-0000-0000-000000000000";
    const response = await getRodada(buildGetRequest(idInexistente), {
      params: { id: idInexistente },
    });
    expect(response.status).toBe(404);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-16 — GET /api/rodadas/:id (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
