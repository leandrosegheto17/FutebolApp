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
 * A partir de BE-R02 (TASK.md Parte II Seção 3.1 — Iniciativa de Redesenho
 * Visual), esta mesma suíte também cobre `confronto`/`status_correcao`
 * (T06 redesenhado, `UX-SPEC.md` Parte II Seção 2.5, consumidos por
 * `FE-R06`) — ver bloco de testes dedicado ao final deste arquivo.
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
import { PATCH as corrigirParticipacao } from "../[id]/participacoes/[atletaId]/route";
import { DELETE as deleteRodada } from "../[id]/route";
import { POST as confirmarTimes } from "../[id]/times/route";
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

function buildConfirmarTimesRequest(rodadaId: string, body: unknown): Request {
  return new Request(`http://localhost:3000/api/rodadas/${rodadaId}/times`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildCorrigirRequest(rodadaId: string, atletaId: string, body: unknown): Request {
  return new Request(
    `http://localhost:3000/api/rodadas/${rodadaId}/participacoes/${atletaId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
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

      // `limit=200` (teto máximo) explícito, não o default (`50`) — achado
      // incidental durante a verificação de `BE-R02` (não uma mudança de
      // escopo desta tarefa): este harness de Supabase local nunca é
      // resetado entre execuções (mesma nota já registrada no topo deste
      // arquivo), e o acúmulo de rodadas `data >= 2036-01-01` de execuções
      // repetidas desta mesma suíte ao longo do tempo já ultrapassa 50
      // linhas — o default silenciosamente deixaria de incluir as 3 rodadas
      // desta asserção. Decisão de detalhe (não escalada): mesmo teto já
      // usado pelas asserções de `BE-R02` mais abaixo neste arquivo.
      const response = await getRodadas(buildGetRequest("limit=200"));
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

  type RodadaResumoBody = {
    id: string;
    data: string;
    status: string;
    criado_em: string;
    presentes: number;
    confronto: { colete: number; sem_colete: number } | null;
    status_correcao: "encerrada" | "corrigida";
  };

  async function buscarRodadaNaListagem(rodadaId: string): Promise<RodadaResumoBody> {
    const response = await getRodadas(buildGetRequest("limit=200"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as RodadaResumoBody[];
    const rodada = body.find((item) => item.id === rodadaId);
    if (!rodada) {
      throw new Error(`Rodada ${rodadaId} não encontrada na listagem (limit=200).`);
    }
    return rodada;
  }

  // BE-R02 (TASK.md Parte II Seção 3.1 — Iniciativa de Redesenho Visual):
  // "Confronto"/"Status" de T06 redesenhado, consumidos por FE-R06.
  describe("BE-R02 — confronto/status_correcao (T06 redesenhado)", () => {
    it(
      "confronto soma pontos de gol por time (via app.time_atleta + evento_jogo tipo=gol) " +
        "quando exatamente 2 times estão confirmados — primeiro time = colete, segundo = sem_colete",
      async () => {
        const a1 = await criarAtleta("confronto-a1");
        const a2 = await criarAtleta("confronto-a2");
        const b1 = await criarAtleta("confronto-b1");

        const rodadaId = await lancarRodadaDireta(rodadaData(10), [
          { atleta_id: a1, status: "presente", eventos: [{ tipo: "gol", quantidade: 2 }] },
          { atleta_id: a2, status: "presente" },
          { atleta_id: b1, status: "presente", eventos: [{ tipo: "gol", quantidade: 1 }] },
        ]);

        const respostaTimes = await confirmarTimes(
          buildConfirmarTimesRequest(rodadaId, {
            times: [{ atletas_ids: [a1, a2] }, { atletas_ids: [b1] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(respostaTimes.status).toBe(200);

        const rodada = await buscarRodadaNaListagem(rodadaId);
        // Seed de app.configuracao_pontuacao (BE-08): evento "gol" = 3 pontos.
        // Time A (a1+a2): 2 gols * 3 = 6. Time B (b1): 1 gol * 3 = 3.
        expect(rodada.confronto).toEqual({ colete: 6, sem_colete: 3 });
        expect(rodada.status_correcao).toBe("encerrada");
      },
    );

    it(
      "confronto é null quando a rodada não tem exatamente 2 times persistidos — " +
        "comportamento padrão e esperado para toda rodada de origem legado (SPK-02), " +
        "nunca um erro",
      async () => {
        const atleta = await criarAtleta("sem-times");
        const rodadaId = await lancarRodadaDireta(rodadaData(11), [
          { atleta_id: atleta, status: "presente" },
        ]);

        // Nenhum app.time confirmado para esta rodada (equivalente ao estado
        // real de toda rodada migrada do legado, conforme SPK-02).
        const rodada = await buscarRodadaNaListagem(rodadaId);
        expect(rodada.confronto).toBeNull();
      },
    );

    it(
      "confronto 0x0 é um placar legítimo (nenhum gol registrado na rodada), não null",
      async () => {
        const a1 = await criarAtleta("zerozero-a1");
        const b1 = await criarAtleta("zerozero-b1");
        const rodadaId = await lancarRodadaDireta(rodadaData(12), [
          { atleta_id: a1, status: "presente" },
          { atleta_id: b1, status: "presente" },
        ]);

        const respostaTimes = await confirmarTimes(
          buildConfirmarTimesRequest(rodadaId, {
            times: [{ atletas_ids: [a1] }, { atletas_ids: [b1] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(respostaTimes.status).toBe(200);

        const rodada = await buscarRodadaNaListagem(rodadaId);
        expect(rodada.confronto).toEqual({ colete: 0, sem_colete: 0 });
      },
    );

    it(
      "status_correcao é 'encerrada' até a rodada sofrer uma correção (RF-04.2) — depois " +
        "disso, vira 'corrigida' (derivado de app.log_auditoria, RF-04.4)",
      async () => {
        const atleta = await criarAtleta("status-correcao");
        const rodadaId = await lancarRodadaDireta(rodadaData(13), [
          { atleta_id: atleta, status: "presente" },
        ]);

        const antesDaCorrecao = await buscarRodadaNaListagem(rodadaId);
        expect(antesDaCorrecao.status_correcao).toBe("encerrada");

        const respostaCorrecao = await corrigirParticipacao(
          buildCorrigirRequest(rodadaId, atleta, { status: "ausente", eventos: [] }),
          { params: { id: rodadaId, atletaId: atleta } },
        );
        expect(respostaCorrecao.status).toBe(200);

        const depoisDaCorrecao = await buscarRodadaNaListagem(rodadaId);
        expect(depoisDaCorrecao.status_correcao).toBe("corrigida");
      },
    );
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
