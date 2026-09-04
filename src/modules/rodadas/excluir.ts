/**
 * Orquestração de exclusão de rodada (BE-09, RF-04.1) — aciona a função
 * PL/pgSQL `app.excluir_rodada` (via RPC) e relê o resultado para montar a
 * resposta da API. Toda a reversão multi-tabela (estorno de 100% dos pontos
 * daquela rodada para todos os atletas afetados + `rodada.status =
 * 'excluida'` + `log_auditoria`) vive inteira na função (TASK.md Seção 1.2)
 * — este módulo nunca orquestra os UPDATEs/INSERTs em separado. Separado do
 * Route Handler (`app/api/rodadas/[id]/route.ts`) para ser testável sem
 * montar um `Request`/`NextResponse` — mesmo racional de `lancar.ts`/
 * `src/modules/atletas/anonimizar.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ERRCODE_PARTICIPACAO_NAO_ENCONTRADA,
  ERRCODE_RODADA_JA_EXCLUIDA,
  ERRCODE_RODADA_NAO_ENCONTRADA,
} from "./constants";
import {
  buscarRodadaPorId,
  contarParticipantesPorRodada,
  excluirRodadaViaRpc,
  type RodadaRow,
} from "./repository";

export type ResultadoExclusaoRodada =
  | { tipo: "sucesso"; rodada: RodadaRow; atletasAfetados: number }
  | { tipo: "nao_encontrada" }
  | { tipo: "ja_excluida" };

/**
 * Exclui (soft-delete) uma rodada já lançada, revertendo automaticamente
 * 100% dos pontos daquela rodada para todos os atletas afetados (RF-04.1) —
 * atomicidade garantida pela função PL/pgSQL, nunca por esta orquestração.
 */
export async function excluirRodada(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<ResultadoExclusaoRodada> {
  const resultado = await excluirRodadaViaRpc(client, rodadaId);

  if ("erro" in resultado) {
    const { code, message } = resultado.erro;
    if (code === ERRCODE_RODADA_NAO_ENCONTRADA) {
      return { tipo: "nao_encontrada" };
    }
    if (code === ERRCODE_RODADA_JA_EXCLUIDA) {
      return { tipo: "ja_excluida" };
    }
    // Nenhum outro errcode é esperado deste RPC — participação não
    // encontrada não se aplica a exclusão de rodada inteira (só à
    // correção de uma única participação, ver `corrigir.ts`).
    if (code === ERRCODE_PARTICIPACAO_NAO_ENCONTRADA) {
      throw new Error(
        `errcode inesperado (${ERRCODE_PARTICIPACAO_NAO_ENCONTRADA}) para app.excluir_rodada: ${message}`,
      );
    }
    throw new Error(`Falha ao excluir rodada (app.excluir_rodada): ${message}`);
  }

  const [rodada, atletasAfetados] = await Promise.all([
    buscarRodadaPorId(client, rodadaId),
    contarParticipantesPorRodada(client, rodadaId),
  ]);

  if (!rodada) {
    // Nunca deveria acontecer — a função PL/pgSQL acabou de confirmar
    // (via FOR UPDATE) que a rodada existe antes de retornar sem erro.
    // Defensivo, não uma lacuna silenciosa (TASK.md Seção 1.0).
    throw new Error(
      `app.rodada ${rodadaId} não encontrada logo após exclusão bem-sucedida (inconsistência inesperada).`,
    );
  }

  return { tipo: "sucesso", rodada, atletasAfetados };
}
