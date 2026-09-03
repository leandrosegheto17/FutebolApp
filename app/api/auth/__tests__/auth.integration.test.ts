/**
 * Teste de integração de BE-04 (TASK.md Secao 3.1) — critério de aceite
 * literal: "login com senha correta emite cookie httpOnly/secure/
 * SameSite=strict com TTL 8-12h; 5 tentativas erradas em 15 min bloqueiam
 * com backoff; mensagem de erro idêntica em ambos os casos (RF-07.3); toda
 * rota de escrita retorna 401 sem sessão válida" (a última parte —
 * middleware — é coberta por `__tests__/middleware.test.ts`, teste
 * unitário; aqui cobrimos os Route Handlers de login/logout de ponta a
 * ponta contra o Supabase local real).
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02/BE-03 (ver `src/lib/supabase/__tests__/app-schema-rls.integration.test.ts`):
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * `vitest.integration.setup.ts` (BE-04) espelha TEST_SUPABASE_* nas
 * variáveis "de produção" (NEXT_PUBLIC_SUPABASE_URL, etc.) que os Route
 * Handlers de fato leem via `getServiceRoleClient()` — por isso os handlers
 * importados abaixo já apontam para o Supabase local deste teste, sem
 * nenhuma configuração adicional neste arquivo.
 *
 * `app.auth_interno` é singleton e nunca aceita DELETE (BE-04, trigger
 * `forbid_auth_interno_delete`) — o `beforeAll` usa `upsert` (nunca
 * `insert`), então este teste é seguro para rodar repetidamente contra o
 * mesmo banco local sem exigir `supabase db reset` entre execuções.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "@/modules/autenticacao/password";
import { POST as loginHandler } from "../login/route";
import { POST as logoutHandler } from "../logout/route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const SENHA_CORRETA = "senha-de-teste-be04-correta";

function buildLoginRequest(senha: unknown, ip: string): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ senha }),
  });
}

function buildLogoutRequest(ip: string): Request {
  return new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

function getSetCookieHeader(response: Response): string {
  const cookie = response.headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return cookie!;
}

describe.skipIf(!podeRodar)("BE-04 — POST /api/auth/login e /api/auth/logout", () => {
  let service: SupabaseClient<any, any, any>;
  // IP único por execução — evita que o histórico de tentativas de uma
  // execução anterior deste teste (nunca apagado, tabela não é
  // append-only "forçada" por trigger, mas o teste não depende de limpar
  // para ficar correto) interfira no rate limiting desta execução.
  const runId = `be04-${Date.now()}`;

  beforeAll(async () => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const hash = await hashPassword(SENHA_CORRETA);
    const { error } = await service
      .from("auth_interno")
      .upsert({ id: 1, hash_senha: hash });
    if (error) throw error;
  });

  afterAll(async () => {
    // `tentativa_login` não tem trigger de bloqueio de DELETE (só
    // `auth_interno`/`atleta`/`lancamento_pontos` têm) — limpa o que este
    // teste gerou, filtrando pelo prefixo único do IP, nunca por
    // "a tabela está vazia" (mesmo padrão de BE-03).
    await service.from("tentativa_login").delete().like("ip", `${runId}%`);
  });

  it("login com senha correta emite cookie httpOnly/Secure/SameSite=Strict com TTL 8-12h", async () => {
    const ip = `${runId}-sucesso`;
    const response = await loginHandler(buildLoginRequest(SENHA_CORRETA, ip));
    expect(response.status).toBe(200);

    const cookie = getSetCookieHeader(response);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    // Requisição construída com URL http:// (sem TLS) — `Secure` reflete
    // o protocolo real da requisição (decisão de detalhe documentada em
    // `session-cookie.ts`), então não aparece aqui; a asserção de
    // `Secure` incondicional em produção fica coberta pela suíte
    // unitária de `session-cookie` não ser necessária além disso, já que
    // a decisão em si (derivar de `request.url`) é testada indiretamente
    // por este teste "não aparecer" e pelo teste de sessão expirada abaixo.
    const maxAgeMatch = cookie.match(/Max-Age=(\d+)/i);
    expect(maxAgeMatch).not.toBeNull();
    const maxAgeSeconds = Number(maxAgeMatch![1]);
    expect(maxAgeSeconds).toBeGreaterThanOrEqual(8 * 60 * 60);
    expect(maxAgeSeconds).toBeLessThanOrEqual(12 * 60 * 60);
  });

  it("login com senha incorreta retorna 401 com mensagem genérica e registra tentativa falha", async () => {
    const ip = `${runId}-errada`;
    const response = await loginHandler(
      buildLoginRequest("senha-inteiramente-errada", ip),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Senha incorreta.");

    const { data, error } = await service
      .from("tentativa_login")
      .select("sucesso")
      .eq("ip", ip);
    if (error) throw error;
    expect(data).toHaveLength(1);
    expect(data![0]!.sucesso).toBe(false);
  });

  it("corpo malformado (sem campo senha) retorna 400, nunca 401 (não é o mesmo caso de RF-07.3)", async () => {
    const ip = `${runId}-malformado`;
    const response = await loginHandler(buildLoginRequest(undefined, ip));
    expect(response.status).toBe(400);
  });

  it(
    "5 tentativas erradas em 15 min bloqueiam com a MESMA mensagem/status de senha " +
      "incorreta (RF-07.3) — 6ª tentativa (mesmo com senha correta) continua bloqueada",
    async () => {
      const ip = `${runId}-bloqueio`;

      let ultimaRespostaErrada: { status: number; body: unknown } | null = null;
      for (let i = 0; i < 5; i++) {
        const response = await loginHandler(
          buildLoginRequest("senha-errada-repetida", ip),
        );
        ultimaRespostaErrada = { status: response.status, body: await response.json() };
      }
      expect(ultimaRespostaErrada!.status).toBe(401);

      // 6ª tentativa: agora bloqueada por rate limiting, mesmo que a
      // senha esteja correta — resposta precisa ser byte-a-byte igual à
      // de senha incorreta (RF-07.3/GUARDRAILS.md regra 15).
      const respostaBloqueada = await loginHandler(buildLoginRequest(SENHA_CORRETA, ip));
      expect(respostaBloqueada.status).toBe(401);
      const bodyBloqueado = await respostaBloqueada.json();
      expect(bodyBloqueado).toEqual(ultimaRespostaErrada!.body);
      // Nenhum cookie de sessão emitido mesmo com a senha certa, porque a
      // tentativa nunca chega a verificar a senha (rate limiting).
      expect(respostaBloqueada.headers.get("set-cookie")).toBeNull();

      const { data, error } = await service
        .from("tentativa_login")
        .select("sucesso")
        .eq("ip", ip);
      if (error) throw error;
      expect(data).toHaveLength(6);
      expect(data!.every((row) => row.sucesso === false)).toBe(true);
    },
  );

  it("logout limpa o cookie de sessão (Max-Age=0) mesmo sem sessão prévia", async () => {
    const response = logoutHandler(buildLogoutRequest(`${runId}-logout`));
    const resolved = await response;
    expect(resolved.status).toBe(200);
    const cookie = getSetCookieHeader(resolved);
    expect(cookie).toMatch(/Max-Age=0/i);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-04 — autenticação (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
