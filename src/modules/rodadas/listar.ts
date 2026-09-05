/**
 * Orquestração de leitura — listagem de rodadas (BE-16, T06 do
 * `UX-SPEC.md`/FE-06; `confronto`/`status_correcao` acrescentados por
 * BE-R02, TASK.md Parte II Seção 3.1 — Iniciativa de Redesenho Visual, para
 * consumo de `FE-R06`/T06 redesenhado). Leitura pura, sem função PL/pgSQL
 * nova (não altera nenhuma tabela) — combina `listarRodadasResumo` com as
 * consultas auxiliares de `repository.ts` (times/gols/configuração de
 * pontos/log de auditoria) e o cálculo puro de `confronto.ts`. Mantido como
 * módulo próprio, separado do Route Handler (`app/api/rodadas/route.ts`),
 * pelo mesmo racional de testabilidade sem `Request`/`NextResponse` já
 * usado por `lancar.ts`/`excluir.ts`/`corrigir.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularConfronto, valorPontosVigente, type Confronto } from "./confronto";
import {
  listarConfiguracaoPontosPorEvento,
  listarRodadaIdsComLogAuditoria,
  listarRodadasResumo,
  listarTimesComAtletasPorRodadas,
  somarGolsPorAtletaERodada,
  type RodadaResumoRow,
} from "./repository";

/** `RodadaResumoRow` (BE-16) + os dois campos novos de BE-R02. */
export type RodadaResumoComConfrontoRow = RodadaResumoRow & {
  confronto: Confronto | null;
  status_correcao: "encerrada" | "corrigida";
};

/**
 * Lista rodadas em ordem cronológica decrescente (RF-04.5 lê "histórico" em
 * termos amplos; critério de aceite literal desta tarefa: "listagem
 * ordenada" — mais recente primeiro). Nunca filtra por `status` — rodada
 * `excluida` aparece normalmente, com o status visível (decisão de detalhe
 * documentada em `repository.ts`).
 *
 * `confronto`/`status_correcao` (BE-R02) calculados em memória a partir de
 * consultas auxiliares em lote (uma por tabela, nunca N+1 por rodada — mesmo
 * padrão de `presentes` em `listarRodadasResumo`), nunca via view/coluna
 * nova (critério de aceite literal: "cálculo por JOIN/subquery no próprio
 * endpoint").
 */
export async function listarRodadas(
  client: SupabaseClient<any, any, any>,
  limit: number,
): Promise<RodadaResumoComConfrontoRow[]> {
  const rodadas = await listarRodadasResumo(client, limit);
  if (rodadas.length === 0) {
    return [];
  }

  const rodadaIds = rodadas.map((rodada) => rodada.id);
  const [timesPorRodada, golsPorRodada, configuracaoGol, rodadaIdsComLog] = await Promise.all([
    listarTimesComAtletasPorRodadas(client, rodadaIds),
    somarGolsPorAtletaERodada(client, rodadaIds),
    listarConfiguracaoPontosPorEvento(client, "gol"),
    listarRodadaIdsComLogAuditoria(client, rodadaIds),
  ]);

  return rodadas.map((rodada) => {
    const valorPontosPorGol = valorPontosVigente(configuracaoGol, rodada.data);
    return {
      ...rodada,
      confronto: calcularConfronto(
        timesPorRodada.get(rodada.id),
        golsPorRodada.get(rodada.id),
        valorPontosPorGol,
      ),
      status_correcao: rodadaIdsComLog.has(rodada.id) ? "corrigida" : "encerrada",
    };
  });
}
