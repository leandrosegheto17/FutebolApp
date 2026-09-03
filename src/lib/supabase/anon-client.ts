/**
 * Cliente Supabase com a chave anônima (`anon`), restrito por desenho a
 * `SELECT` nas views públicas curadas (`ranking_publico`,
 * `presenca_mensal_publica` — ADR-005, BE-03). Nunca usado para escrita: a
 * role `anon` não tem permissão de `INSERT`/`UPDATE`/`DELETE` em nenhuma
 * tabela (GUARDRAILS.md regra 6), então este cliente não deve ser usado para
 * tentar escrever — a garantia real está no banco, não neste arquivo.
 *
 * Seguro de instanciar tanto no servidor (SSR, Fluxo 2.2 do SDD.md) quanto no
 * navegador — a chave anônima não é segredo, ao contrário da `service role`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/config/env";

export function getAnonClient(): SupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
