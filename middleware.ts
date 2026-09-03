/**
 * Middleware de verificação de sessão (BE-04, ADR-004, TASK.md Secao 1.3 —
 * "Proibido: qualquer rota de escrita da área interna sem verificação de
 * sessão válida em middleware, executada antes de qualquer chamada à
 * camada de dados"; GUARDRAILS.md regra 17).
 *
 * Roda em Edge Runtime (única opção para `middleware.ts` no Next.js 14 App
 * Router) — por isso importa só de `constants`/`session-token` (Web Crypto,
 * portátil), NUNCA do barrel `@/modules/autenticacao` nem de `password.ts`/
 * `session-cookie.ts` (que dependem de `@node-rs/argon2`, um addon nativo,
 * e de `next/server` `NextResponse.cookies.set`, respectivamente — nenhum
 * dos dois é necessário para só LER e validar o cookie).
 *
 * Escopo (matcher abaixo): todo `/api/*`. Dentro do matcher, só métodos que
 * escrevem (`POST`/`PUT`/`PATCH`/`DELETE`) exigem sessão — GET nunca aparece
 * hoje em nenhum Route Handler desta área interna (toda leitura pública
 * passa direto pelo PostgREST do Supabase com a chave `anon`, ADR-005/SDD.md
 * Secao 7.5, nunca por este app), então não há rota de leitura própria para
 * decidir agora; se uma tarefa futura (ex.: BE-09, consulta de log de
 * auditoria) introduzir uma rota de leitura interna nova, cabe a ela também
 * exigir sessão — decisão de escopo daquela tarefa, não uma lacuna desta.
 * `/api/auth/login` e `/api/auth/logout` são isentos por desenho (ver
 * comentário nos próprios Route Handlers).
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/modules/autenticacao/constants";
import { verifySessionToken } from "@/modules/autenticacao/session-token";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const EXEMPT_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (!WRITE_METHODS.has(request.method) || EXEMPT_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessaoValida = await verifySessionToken(token);

  if (!sessaoValida) {
    return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
