import { config } from "dotenv";

// Carrega `.env.test.local` (nunca versionado — `.gitignore` já cobre
// `.env*.local`) para os testes de integração encontrarem
// TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY/TEST_SUPABASE_SERVICE_ROLE_KEY/
// TEST_SUPABASE_DB_URL sem exigir exportação manual de variável de ambiente
// a cada execução local.
config({ path: ".env.test.local", quiet: true });

// BE-04: alguns testes de integração chamam Route Handlers reais (ex.:
// `POST /api/auth/login`) que, por sua vez, usam `getServiceRoleClient()`/
// `getPublicEnv()` (`src/lib/config/env.ts`) — essas funções leem as
// variáveis de ambiente "de produção" (`NEXT_PUBLIC_SUPABASE_URL`,
// `SUPABASE_SERVICE_ROLE_KEY`, etc.), não as variáveis `TEST_SUPABASE_*`
// usadas pelos testes de integração que falam diretamente com o Postgres/
// PostgREST local (BE-02/BE-03). Preenche os nomes "de produção" a partir
// dos equivalentes `TEST_*` quando ainda não definidos, para que qualquer
// Route Handler testado aqui aponte para o Supabase local, nunca para um
// projeto real — nunca sobrescreve um valor já definido explicitamente no
// ambiente (ex.: em CI, se algum dia este pipeline rodar lá).
function aliasEnv(target: string, source?: string, fallback?: string) {
  if (process.env[target]) return;
  const value = (source ? process.env[source] : undefined) ?? fallback;
  if (value) process.env[target] = value;
}

aliasEnv("NEXT_PUBLIC_SUPABASE_URL", "TEST_SUPABASE_URL");
aliasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "TEST_SUPABASE_ANON_KEY");
aliasEnv("SUPABASE_SERVICE_ROLE_KEY", "TEST_SUPABASE_SERVICE_ROLE_KEY");
aliasEnv("NEXT_PUBLIC_APP_BASE_URL", undefined, "http://localhost:3000");
aliasEnv(
  "SESSION_COOKIE_SECRET",
  undefined,
  "integration-test-session-cookie-secret-nao-e-segredo-real",
);
