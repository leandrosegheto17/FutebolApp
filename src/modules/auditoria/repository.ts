/**
 * Acesso a `app.log_auditoria` (BE-09, RF-04.5) — sempre via
 * `getServiceRoleClient()` (TASK.md Seção 1.2/GUARDRAILS.md regra 6: `anon`
 * nunca lê esta tabela; toda leitura passa pela `service role` no servidor,
 * atrás do middleware de sessão — log de auditoria é feature exclusiva da
 * área interna, RF-07.1 "histórico/correção").
 *
 * Somente leitura — a escrita em `log_auditoria` acontece inteiramente
 * dentro das funções PL/pgSQL (`anonimizar_atleta`, BE-07;
 * `excluir_rodada`/`corrigir_participacao_rodada`, BE-09), nunca por um
 * INSERT desta camada (TASK.md Seção 1.2).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type LogAuditoriaRow = {
  id: string;
  rodada_id: string | null;
  atleta_id: string | null;
  tipo_evento: string;
  ocorrido_em: string;
  valores_antes: unknown;
  valores_depois: unknown;
};

const LOG_AUDITORIA_COLUNAS =
  "id, rodada_id, atleta_id, tipo_evento, ocorrido_em, valores_antes, valores_depois";

/**
 * Lista o log de auditoria ordenado do mais recente ao mais antigo
 * (RF-04.5) — nenhuma coluna de autor individual é selecionada (não existe
 * em `app.log_auditoria`, RN-12/GUARDRAILS.md regra 18).
 */
export async function listarLogAuditoria(
  client: SupabaseClient<any, any, any>,
  limit: number,
): Promise<LogAuditoriaRow[]> {
  const { data, error } = await client
    .from("log_auditoria")
    .select(LOG_AUDITORIA_COLUNAS)
    .order("ocorrido_em", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`Falha ao listar app.log_auditoria: ${error.message}`);
  }
  return (data ?? []) as unknown as LogAuditoriaRow[];
}
