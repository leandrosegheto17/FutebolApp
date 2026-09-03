/**
 * Cliente Supabase server-side com `service role` (BE-01 — setup; consumido
 * pelas tarefas de serviço de domínio a partir de BE-02).
 *
 * Regra inegociável (TASK.md Seção 1.2, GUARDRAILS.md regras 6/7): a chave de
 * serviço nunca roda no navegador, e toda escrita da schema `app` passa
 * exclusivamente por este cliente (nunca pela chave anônima do lado
 * cliente). `getServerOnlyEnv()` já lança erro se importado em contexto de
 * navegador — este módulo herda essa proteção.
 *
 * Um novo cliente é criado a cada chamada (sem estado compartilhado global)
 * porque Route Handlers do Next.js rodam em ambiente serverless — evita
 * reaproveitar conexão/estado entre invocações que não compartilham processo.
 */
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerOnlyEnv } from "@/lib/config/env";

export function getServiceRoleClient() {
  // Ordem importa: a checagem de contexto (nunca no navegador) precisa
  // acontecer antes de qualquer outra validação, para nunca vazar por outro
  // caminho de erro quando as duas condições coincidirem (ex.: teste rodando
  // em jsdom sem env pública configurada).
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerOnlyEnv();
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "app",
    },
  });
}
