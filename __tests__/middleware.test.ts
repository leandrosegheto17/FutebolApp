// @vitest-environment node
//
// BE-04 — critério de aceite literal: "toda rota de escrita retorna 401 sem
// sessão válida" (TASK.md Secao 3.1, GUARDRAILS.md regra 17). Como nenhuma
// rota de escrita de domínio existe ainda neste `TASK.md` (BE-06 em diante),
// o teste usa um caminho representativo (`/api/atletas`) só para provar o
// mecanismo genérico do middleware — não é uma rota real, e o próprio
// matcher (`config.matcher = ["/api/:path*"]`) garante que ele se aplica a
// qualquer caminho futuro sob `/api/`, não só ao usado aqui.
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { middleware } from "../middleware";
import { SESSION_COOKIE_NAME } from "@/modules/autenticacao/constants";
import { createSessionToken } from "@/modules/autenticacao/session-token";

const ORIGINAL_SECRET = process.env.SESSION_COOKIE_SECRET;

beforeAll(() => {
  process.env.SESSION_COOKIE_SECRET = "segredo-de-teste-nao-e-real-para-middleware";
});

afterAll(() => {
  process.env.SESSION_COOKIE_SECRET = ORIGINAL_SECRET;
});

function buildRequest(opts: {
  method: string;
  path: string;
  cookie?: string;
}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", opts.cookie);
  return new NextRequest(new URL(opts.path, "http://localhost:3000"), {
    method: opts.method,
    headers,
  });
}

/** `NextResponse.next()` marca a resposta com este header interno para o runtime do Next.js. */
function deixaPassar(response: Response): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

describe("middleware (BE-04, verificação de sessão em rota de escrita)", () => {
  it("retorna 401 em POST para rota de escrita sem cookie de sessão", async () => {
    const response = await middleware(
      buildRequest({ method: "POST", path: "/api/atletas" }),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("permite POST com sessão válida", async () => {
    const { token } = await createSessionToken();
    const response = await middleware(
      buildRequest({
        method: "POST",
        path: "/api/atletas",
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      }),
    );
    expect(deixaPassar(response)).toBe(true);
  });

  it("retorna 401 com sessão expirada", async () => {
    const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { token } = await createSessionToken(umDiaAtras);
    const response = await middleware(
      buildRequest({
        method: "PUT",
        path: "/api/atletas/123",
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("retorna 401 com cookie de sessão adulterado", async () => {
    const { token } = await createSessionToken();
    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature === "AA" ? "BB" : "AA" + signature!.slice(2)}`;
    const response = await middleware(
      buildRequest({
        method: "DELETE",
        path: "/api/atletas/123",
        cookie: `${SESSION_COOKIE_NAME}=${tampered}`,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("nunca bloqueia GET (nenhuma rota de leitura própria nesta versão)", async () => {
    const response = await middleware(
      buildRequest({ method: "GET", path: "/api/health" }),
    );
    expect(deixaPassar(response)).toBe(true);
  });

  it("isenta POST /api/auth/login mesmo sem sessão", async () => {
    const response = await middleware(
      buildRequest({ method: "POST", path: "/api/auth/login" }),
    );
    expect(deixaPassar(response)).toBe(true);
  });

  it("isenta POST /api/auth/logout mesmo sem sessão (idempotente)", async () => {
    const response = await middleware(
      buildRequest({ method: "POST", path: "/api/auth/logout" }),
    );
    expect(deixaPassar(response)).toBe(true);
  });
});
