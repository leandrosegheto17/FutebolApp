/**
 * Acesso a `app.auth_interno`/`app.tentativa_login` (BE-04) — sempre via
 * `getServiceRoleClient()` (TASK.md Secao 1.2/GUARDRAILS.md regra 6: `anon`
 * nunca escreve, toda escrita passa pela `service role` no servidor).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { LOGIN_RATE_LIMIT_WINDOW_MS } from "./constants";
import type { TentativaLogin } from "./rate-limit";

/** Busca o hash vigente da senha única. `null` se `auth_interno` ainda não tem linha. */
export async function getHashSenhaVigente(
  client: SupabaseClient<any, any, any>,
): Promise<string | null> {
  const { data, error } = await client
    .from("auth_interno")
    .select("hash_senha")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao consultar app.auth_interno: ${error.message}`);
  }
  return data?.hash_senha ?? null;
}

/** Tentativas de login do IP dentro da janela de rate limiting, para avaliação. */
export async function getTentativasRecentes(
  client: SupabaseClient<any, any, any>,
  ip: string,
  now: Date = new Date(),
): Promise<TentativaLogin[]> {
  const desde = new Date(now.getTime() - LOGIN_RATE_LIMIT_WINDOW_MS).toISOString();
  const { data, error } = await client
    .from("tentativa_login")
    .select("sucesso, tentado_em")
    .eq("ip", ip)
    .gt("tentado_em", desde)
    .order("tentado_em", { ascending: false });
  if (error) {
    throw new Error(`Falha ao consultar app.tentativa_login: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    sucesso: row.sucesso as boolean,
    tentadoEm: new Date(row.tentado_em as string),
  }));
}

/** Registra uma tentativa de login (sucesso ou falha, inclusive as rejeitadas por rate limiting). */
export async function registrarTentativaLogin(
  client: SupabaseClient<any, any, any>,
  params: { ip: string; sucesso: boolean },
): Promise<void> {
  const { error } = await client
    .from("tentativa_login")
    .insert({ ip: params.ip, sucesso: params.sucesso });
  if (error) {
    throw new Error(`Falha ao registrar app.tentativa_login: ${error.message}`);
  }
}
