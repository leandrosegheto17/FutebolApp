/**
 * Validação de variáveis de ambiente (BE-01 — TASK.md Seção 3.1).
 *
 * Decisão de detalhe (documentada, não escalada — TASK.md Seção 1.0): usa
 * `zod` como biblioteca de validação de input do projeto. Não há stack
 * definida para isso no SDD.md/TASK.md; escolha de baixo risco, já usada em
 * conjunto com TypeScript `strict` para falhar cedo (em vez de silenciosamente)
 * quando uma variável obrigatória está ausente ou malformada.
 *
 * Duas listas deliberadamente separadas:
 * - `publicEnv`: seguro expor ao navegador (Next.js só faz isso para
 *   variáveis prefixadas `NEXT_PUBLIC_*`, mas mantemos a separação de types
 *   aqui também, para nenhum código de servidor confundir as duas).
 * - `serverEnv`: nunca deve ser importado por código que roda no navegador
 *   (ex.: `SUPABASE_SERVICE_ROLE_KEY` — GUARDRAILS.md regra 7).
 */
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida do projeto Supabase.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória.",
  }),
  NEXT_PUBLIC_APP_BASE_URL: z.string().url({
    message: "NEXT_PUBLIC_APP_BASE_URL deve ser uma URL válida.",
  }),
});

const serverOnlyEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: "SUPABASE_SERVICE_ROLE_KEY é obrigatória (nunca expor ao cliente).",
  }),
  SESSION_COOKIE_SECRET: z.string().min(1, {
    message: "SESSION_COOKIE_SECRET é obrigatória (nunca expor ao cliente).",
  }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerOnlyEnv = z.infer<typeof serverOnlyEnvSchema>;

function formatZodError(prefix: string, error: z.ZodError): string {
  const issues = error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );
  return `${prefix}\n${issues.join("\n")}`;
}

/**
 * Valida e retorna as variáveis de ambiente seguras para o cliente. Pode ser
 * chamada tanto no servidor quanto no navegador (Next.js já garante que só
 * variáveis `NEXT_PUBLIC_*` chegam ao bundle do cliente).
 */
export function getPublicEnv(
  source: Record<string, string | undefined> = process.env,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      formatZodError(
        "Variáveis de ambiente públicas inválidas ou ausentes:",
        parsed.error,
      ),
    );
  }
  return parsed.data;
}

/**
 * Valida e retorna as variáveis de ambiente restritas ao servidor. Lança erro
 * imediatamente se chamada em contexto de navegador — nenhuma chamada
 * silenciosa expõe `SUPABASE_SERVICE_ROLE_KEY`/`SESSION_COOKIE_SECRET` ao
 * cliente (GUARDRAILS.md regra 7).
 */
export function getServerOnlyEnv(
  source: Record<string, string | undefined> = process.env,
): ServerOnlyEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerOnlyEnv() nunca deve ser chamada em código que roda no navegador " +
        "(GUARDRAILS.md regra 7 — chave de serviço nunca exposta ao cliente).",
    );
  }
  const parsed = serverOnlyEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      formatZodError(
        "Variáveis de ambiente de servidor inválidas ou ausentes:",
        parsed.error,
      ),
    );
  }
  return parsed.data;
}
