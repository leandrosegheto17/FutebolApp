/**
 * Cliente Supabase do projeto LEGADO (BE-15) — wiring de I/O real, usado
 * EXCLUSIVAMENTE por `scripts/migrar-legado.ts`. Nunca importado pelo
 * restante da aplicação (Route Handlers, `middleware.ts`) — este cliente
 * fala com um projeto Supabase DIFERENTE do projeto principal (`app`), lendo
 * a schema `public` (LEGADO-SCHEMA.md).
 *
 * Deliberadamente SEPARADO de `src/lib/config/env.ts` (`getServerOnlyEnv`):
 * `LEGACY_SUPABASE_URL`/`LEGACY_SUPABASE_SERVICE_ROLE_KEY` são credenciais de
 * uso pontual/administrativo (só este script), não variáveis de ambiente da
 * aplicação em produção — misturá-las ao schema de env "vivo" do app faria
 * o build/deploy normal exigi-las sempre, o que não é o caso.
 *
 * Restrição de governança (GUARDRAILS.md regra 35/BLOCKER-003, TASK.md Seção
 * 3.1/BE-15): construir este cliente NÃO EXECUTA nenhuma migração real por
 * si só (só abre a conexão HTTP/PostgREST) — o bloqueio de execução real
 * fica em `scripts/migrar-legado.ts` (`verificarAutorizacaoGovernanca`),
 * chamado ANTES de qualquer leitura acontecer.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const legadoEnvSchema = z.object({
  LEGACY_SUPABASE_URL: z.string().url({
    message: "LEGACY_SUPABASE_URL deve ser uma URL válida do projeto Supabase legado.",
  }),
  LEGACY_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: "LEGACY_SUPABASE_SERVICE_ROLE_KEY é obrigatória.",
  }),
});

export function getLegadoClient(
  source: Record<string, string | undefined> = process.env,
): SupabaseClient<any, any, any> {
  const parsed = legadoEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(
      `Variáveis de ambiente do legado inválidas ou ausentes:\n${issues.join("\n")}`,
    );
  }

  return createClient(
    parsed.data.LEGACY_SUPABASE_URL,
    parsed.data.LEGACY_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" },
    },
  );
}
