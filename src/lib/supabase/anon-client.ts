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
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/config/env";

// Sem anotação explícita de retorno (mesmo padrão de `getServiceRoleClient`,
// `server-client.ts`) — deixa o TypeScript inferir `SupabaseClient<..., "app", ...>`
// a partir do `db: { schema: "app" }` abaixo; uma anotação `: SupabaseClient`
// fixaria o parâmetro de schema em `"public"` (o default do tipo genérico) e
// conflitaria com o schema real usado em tempo de execução.
export function getAnonClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "app",
    },
  });
}
