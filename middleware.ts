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
 * Escopo (matcher abaixo): todo `/api/*`. Dentro do matcher, todo método que
 * escreve (`POST`/`PUT`/`PATCH`/`DELETE`) exige sessão, em qualquer rota —
 * `/api/auth/login` e `/api/auth/logout` são isentos por desenho (ver
 * comentário nos próprios Route Handlers). GET, por padrão, não exige sessão
 * (toda leitura pública passa direto pelo PostgREST do Supabase com a chave
 * `anon`, ADR-005/SDD.md Secao 7.5, nunca por este app) — EXCETO nos
 * prefixos listados em `INTERNAL_READ_PROTECTED_PREFIXES`, reservado a rotas
 * de leitura interna que devolvem dado sensível (RN-01/GUARDRAILS.md regra
 * 19). Primeiro caso: `GET /api/atletas*` (BE-06) — `app.atleta` carrega
 * `contato`/`data_nascimento`, que nunca podem ser lidos sem sessão válida,
 * mesmo que o método seja GET. O comentário original de BE-04 já antecipava
 * esse caso ("se uma tarefa futura introduzir uma rota de leitura interna
 * nova, cabe a ela também exigir sessão") — decisão de escopo de BE-06, não
 * uma lacuna desta tarefa. Segundo caso: `GET /api/log-auditoria` (BE-09,
 * RF-04.5) — não carrega `contato`/`data_nascimento`, mas é feature
 * exclusiva da área interna (RF-07.1 lista "histórico/correção" entre as
 * ações que exigem a senha interna), então também exige sessão válida
 * mesmo em `GET`. Terceiro caso: `GET /api/restricoes` (BE-12, RF-05.5) —
 * mesmo racional de `/api/log-auditoria`: não carrega dado pessoal
 * sensível, mas é feature exclusiva da área interna (T10 do `UX-SPEC.md`).
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/modules/autenticacao/constants";
import { verifySessionToken } from "@/modules/autenticacao/session-token";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const EXEMPT_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);

/**
 * Prefixos de rota cuja LEITURA (GET) também exige sessão, além da escrita
 * já coberta por `WRITE_METHODS` — reservado a rotas internas que devolvem
 * dado sensível (RN-01/GUARDRAILS.md regra 19). `/api/atletas` (BE-06) é o
 * primeiro caso; qualquer rota futura com o mesmo perfil (dado pessoal
 * sensível exposto só à área interna) deve ser adicionada aqui.
 * `/api/log-auditoria` (BE-09, RF-04.5) é o segundo caso — não expõe dado
 * pessoal sensível, mas é feature exclusiva da área interna (RF-07.1).
 * `/api/restricoes` (BE-12, RF-05.5) é o terceiro caso, mesmo racional de
 * `/api/log-auditoria`. `/api/rodadas` (BE-13, RF-06 —
 * `GET /api/rodadas/{id}/substituicoes`, T11 do `UX-SPEC.md`) é o quarto
 * caso, mesmo racional — as rotas de `/api/rodadas` já existentes antes de
 * BE-13 eram só de escrita (já cobertas por `WRITE_METHODS`), então este
 * prefixo nunca precisou entrar nesta lista até agora.
 */
const INTERNAL_READ_PROTECTED_PREFIXES = [
  "/api/atletas",
  "/api/log-auditoria",
  "/api/restricoes",
  "/api/rodadas",
];

function exigeSessaoParaLeitura(pathname: string): boolean {
  return INTERNAL_READ_PROTECTED_PREFIXES.some(
    (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const exigeSessao =
    WRITE_METHODS.has(request.method) ||
    (request.method === "GET" && exigeSessaoParaLeitura(pathname));

  if (!exigeSessao || EXEMPT_PATHS.has(pathname)) {
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
