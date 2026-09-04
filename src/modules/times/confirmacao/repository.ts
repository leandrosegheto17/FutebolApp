/**
 * Acesso a `app.time`/`app.time_atleta` para a confirmação/persistência da
 * divisão de times (RF-05.4, escopo ampliado desta execução de BE-13 — ver
 * nota de status de BE-13 no `TASK.md`). A escrita multi-tabela em si
 * (delete da divisão anterior, se existir + insert da nova — N times + M
 * `time_atleta`) NUNCA acontece aqui — vive inteira na função PL/pgSQL
 * `app.confirmar_times_rodada` (migration
 * `20260903160000_create_confirmar_times_rodada_function.sql`), acionada
 * via RPC (`confirmarTimesRodadaViaRpc` abaixo). Ver a própria migration
 * para a justificativa completa de por que uma função PL/pgSQL foi
 * escolhida mesmo esta operação não alterar saldo/histórico do atleta
 * (TASK.md Seção 1.2 só exige isso para operações de saldo — aqui a função
 * é necessária pela atomicidade multi-tabela em si, único mecanismo
 * disponível nesta stack PostgREST-based para isso, não porque altera
 * saldo).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type TimeConfirmadoInput = {
  label: string;
  atletas_ids: string[];
};

/**
 * Aciona `app.confirmar_times_rodada` via RPC (sempre `service role`,
 * TASK.md Seção 1.2/GUARDRAILS.md regra 6). Toda a gravação multi-tabela
 * (delete da divisão anterior, se existir + insert da nova) acontece dentro
 * da própria função, em uma única transação Postgres; este cliente
 * TypeScript nunca orquestra os INSERTs/DELETEs em separado.
 */
export async function confirmarTimesRodadaViaRpc(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  times: TimeConfirmadoInput[],
): Promise<{ ok: true } | { erro: { code: string; message: string } }> {
  const { error } = await client.rpc("confirmar_times_rodada", {
    p_rodada_id: rodadaId,
    p_times: times,
  });
  if (error) {
    return { erro: { code: error.code ?? "", message: error.message } };
  }
  return { ok: true };
}

export type TimeConfirmadoRow = {
  id: string;
  rodada_id: string;
  label: string;
  criado_em: string;
};

export type TimeAtletaRow = {
  time_id: string;
  atleta_id: string;
};

/** Times já persistidos de uma rodada (após `confirmar_times_rodada`), mais antigo primeiro. */
export async function listarTimesDaRodada(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<TimeConfirmadoRow[]> {
  const { data, error } = await client
    .from("time")
    .select("id, rodada_id, label, criado_em")
    .eq("rodada_id", rodadaId)
    .order("criado_em", { ascending: true });
  if (error) {
    throw new Error(`Falha ao listar app.time da rodada ${rodadaId}: ${error.message}`);
  }
  return (data ?? []) as unknown as TimeConfirmadoRow[];
}

/** Associações atleta<->time (`app.time_atleta`) para os times informados. */
export async function listarAtletasDosTimes(
  client: SupabaseClient<any, any, any>,
  timeIds: readonly string[],
): Promise<TimeAtletaRow[]> {
  if (timeIds.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("time_atleta")
    .select("time_id, atleta_id")
    .in("time_id", timeIds);
  if (error) {
    throw new Error(`Falha ao listar app.time_atleta: ${error.message}`);
  }
  return (data ?? []) as unknown as TimeAtletaRow[];
}
