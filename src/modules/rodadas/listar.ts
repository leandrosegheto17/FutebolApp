/**
 * Orquestração de leitura — listagem de rodadas (BE-16, T06 do
 * `UX-SPEC.md`/FE-06). Leitura pura, sem função PL/pgSQL nova (não altera
 * nenhuma tabela) — passa direto por `listarRodadasResumo` (`repository.ts`).
 * Mantido como módulo próprio, separado do Route Handler
 * (`app/api/rodadas/route.ts`), pelo mesmo racional de testabilidade sem
 * `Request`/`NextResponse` já usado por `lancar.ts`/`excluir.ts`/`corrigir.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listarRodadasResumo, type RodadaResumoRow } from "./repository";

/**
 * Lista rodadas em ordem cronológica decrescente (RF-04.5 lê "histórico" em
 * termos amplos; critério de aceite literal desta tarefa: "listagem
 * ordenada" — mais recente primeiro). Nunca filtra por `status` — rodada
 * `excluida` aparece normalmente, com o status visível (decisão de detalhe
 * documentada em `repository.ts`).
 */
export async function listarRodadas(
  client: SupabaseClient<any, any, any>,
  limit: number,
): Promise<RodadaResumoRow[]> {
  return listarRodadasResumo(client, limit);
}
