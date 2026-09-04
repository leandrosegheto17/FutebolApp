/**
 * Teste de integração de BE-09 (TASK.md Secao 3.1) — parte do critério de
 * aceite literal coberta aqui: "excluir uma rodada reverte 100% dos pontos
 * daquela rodada para todos os atletas afetados numa única transação" e
 * "toda correção/exclusão gera entrada em log_auditoria sem campo de
 * autor".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02 a BE-08 (ver `.env.test.local` / `npm run test:integration`).
 *
 * `app.lancamento_pontos` é ledger append-only (GUARDRAILS.md regra 8) e
 * `app.rodada`/`app.participacao_rodada` ficam presas a ele por FK
 * `on delete restrict` assim que um lançamento acontece — mesmo padrão de
 * "nunca limpo no afterAll" já usado por BE-08: toda rodada/atleta criado
 * por este teste usa uma `data`/`nome_completo` derivados de `runSeed`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { DELETE as deleteRodada } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildDeleteRequest(rodadaId: string): Request {
  return new Request(`http://localhost:3000/api/rodadas/${rodadaId}`, {
    method: "DELETE",
  });
}

describe.skipIf(!podeRodar)("BE-09 — DELETE /api/rodadas/:id", () => {
  let service: SupabaseClient<any, any, any>;
  const runSeed = Date.now();
  const runId = `be09-excluir-${runSeed}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  /** Data civil única por `indice`, âncora bem distante de outras suítes (2032, não 2031 de BE-08). */
  function rodadaData(indice: number): string {
    const ancora = new Date("2032-01-01T00:00:00.000Z");
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
    "reverte 100% dos pontos da rodada para todos os atletas afetados, numa única " +
      "transação, e grava exatamente uma entrada em log_auditoria sem campo de autor",
    async () => {
      const atletaA = await criarAtleta("a");
      const atletaB = await criarAtleta("b");
      const data = rodadaData(1);

      // Setup: rodada real via app.lancar_rodada (RPC direta — mesmo
      // padrão já usado pelo teste de atomicidade de BE-08) — atletaA
      // presente com 2 gols (2+6=8 pts), atletaB ausente (0 pts).
      const { data: rodadaId, error: lancarError } = await service.rpc("lancar_rodada", {
        p_data: data,
        p_participacoes: [
          {
            atleta_id: atletaA,
            status: "presente",
            eventos: [{ tipo: "gol", quantidade: 2 }],
          },
          { atleta_id: atletaB, status: "ausente", eventos: [] },
        ],
      });
      if (lancarError) throw lancarError;

      const response = await deleteRodada(buildDeleteRequest(rodadaId), {
        params: { id: rodadaId },
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(rodadaId);
      expect(body.status).toBe("excluida");
      expect(body.atletas_afetados).toBe(2);

      // --- Confirma diretamente no banco (não só a resposta HTTP).
      const { data: rodadaDepois } = await service
        .from("rodada")
        .select("status")
        .eq("id", rodadaId)
        .single();
      expect(rodadaDepois!.status).toBe("excluida");

      // Ledger append-only: o lançamento original NUNCA é alterado — o
      // saldo líquido por atleta+rodada é zerado por um NOVO lançamento de
      // estorno.
      const { data: lancamentos } = await service
        .from("lancamento_pontos")
        .select("atleta_id, origem, pontos_delta")
        .eq("rodada_id", rodadaId)
        .order("criado_em", { ascending: true });
      expect(lancamentos).toHaveLength(4); // 2 lancamento + 2 estorno
      const porAtleta = new Map<string, number>();
      for (const linha of lancamentos! as any[]) {
        porAtleta.set(
          linha.atleta_id,
          (porAtleta.get(linha.atleta_id) ?? 0) + Number(linha.pontos_delta),
        );
      }
      expect(porAtleta.get(atletaA)).toBe(0); // 8 - 8 = 0 (100% revertido)
      expect(porAtleta.get(atletaB)).toBe(0); // 0 - 0 = 0

      const estornoAtletaA = (lancamentos! as any[]).find(
        (l) => l.atleta_id === atletaA && l.origem === "estorno",
      );
      expect(Number(estornoAtletaA.pontos_delta)).toBe(-8);
      const lancamentoOriginalAtletaA = (lancamentos! as any[]).find(
        (l) => l.atleta_id === atletaA && l.origem === "lancamento",
      );
      expect(Number(lancamentoOriginalAtletaA.pontos_delta)).toBe(8); // nunca alterado

      // presença/eventos originais preservados como registro histórico —
      // nunca apagados (só a rodada muda de status).
      const { data: participacoesDepois } = await service
        .from("participacao_rodada")
        .select("status")
        .eq("rodada_id", rodadaId);
      expect(participacoesDepois).toHaveLength(2);

      // log_auditoria: exatamente 1 entrada (não 1 por atleta), sem campo
      // de autor (a própria tabela não tem essa coluna, RN-12).
      const { data: logs } = await service
        .from("log_auditoria")
        .select("tipo_evento, rodada_id, atleta_id, valores_antes, valores_depois")
        .eq("rodada_id", rodadaId);
      expect(logs).toHaveLength(1);
      const log = logs![0]!;
      expect(log.tipo_evento).toBe("estorno");
      expect(log.atleta_id).toBeNull();
      expect(log.valores_antes).toEqual({ status: "lancada" });
      expect((log.valores_depois as any).status).toBe("excluida");
      expect((log.valores_depois as any).atletas_afetados).toBe(2);
      expect((log.valores_depois as any).pontos_revertidos).toEqual(
        expect.arrayContaining([
          { atleta_id: atletaA, pontos_revertidos: -8 },
          { atleta_id: atletaB, pontos_revertidos: 0 },
        ]),
      );
      // Nenhum campo de autor em nenhum lugar do log (RN-12/RN-07).
      expect(Object.keys(log)).not.toContain("autor");
      expect(JSON.stringify(log.valores_depois)).not.toMatch(/autor|organizador/i);

      // --- Reprocessar a mesma rodada é recusado (409), sem segunda
      // entrada em log_auditoria nem novo estorno.
      const segunda = await deleteRodada(buildDeleteRequest(rodadaId), {
        params: { id: rodadaId },
      });
      expect(segunda.status).toBe(409);

      const { data: logsDepoisSegunda } = await service
        .from("log_auditoria")
        .select("id")
        .eq("rodada_id", rodadaId);
      expect(logsDepoisSegunda).toHaveLength(1);

      const { data: lancamentosDepoisSegunda } = await service
        .from("lancamento_pontos")
        .select("id")
        .eq("rodada_id", rodadaId);
      expect(lancamentosDepoisSegunda).toHaveLength(4); // nada novo foi gravado
    },
  );

  it("retorna 404 para rodada inexistente, sem gravar log_auditoria", async () => {
    const idInexistente = "00000000-0000-0000-0000-000000000000";
    const response = await deleteRodada(buildDeleteRequest(idInexistente), {
      params: { id: idInexistente },
    });
    expect(response.status).toBe(404);

    const { data: logs } = await service
      .from("log_auditoria")
      .select("id")
      .eq("rodada_id", idInexistente);
    expect(logs).toHaveLength(0);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-09 — DELETE /api/rodadas/:id (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
