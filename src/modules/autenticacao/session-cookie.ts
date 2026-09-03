/**
 * Atributos do cookie de sessão (BE-04, TASK.md Secao 1.3/ADR-004): sempre
 * `httpOnly`, `SameSite=Strict`, `path=/`, `Max-Age` = TTL da sessão (8-12h).
 * Só usado pelos Route Handlers de login/logout (Node.js runtime) — nunca
 * pelo middleware (Edge Runtime), que só precisa LER o cookie, não escrevê-lo
 * (`verifySessionToken`, em `session-token.ts`).
 *
 * Decisão de detalhe documentada (não escalada): o atributo `Secure` é
 * derivado do protocolo real da requisição (`https:` → `Secure`), não fixado
 * incondicionalmente em `true`. Em produção (Vercel) toda requisição chega
 * via HTTPS, então `Secure` é sempre `true` na prática — a única situação em
 * que vira `false` é `next dev` local sobre `http://localhost`, onde um
 * cookie `Secure` nunca seria enviado de volta pelo navegador, quebrando o
 * fluxo de sessão inteiro em ambiente de desenvolvimento (não há risco real
 * de interceptação em `localhost`). Se essa leitura estiver errada para o
 * Tech Lead/Software Architect (ex.: preferirem `Secure` incondicional e
 * exigir HTTPS local via certificado de desenvolvimento), é um ajuste de uma
 * linha aqui, sem impacto em nenhum outro módulo.
 */
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./constants";
import { createSessionToken, type SessionToken } from "./session-token";

function isHttpsRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    // Falha ao interpretar a URL da requisição: assume o cenário mais
    // restritivo (Secure=true) em vez de arriscar um cookie sem proteção.
    return true;
  }
}

/** Emite um novo token de sessão e grava o cookie na resposta. */
export async function setSessionCookie(
  response: NextResponse,
  request: Request,
  now?: Date,
): Promise<SessionToken> {
  const session = await createSessionToken(now);
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: isHttpsRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAgeSeconds,
  });
  return session;
}

/** Limpa o cookie de sessão (logout) — idempotente, mesmo sem sessão prévia. */
export function clearSessionCookie(response: NextResponse, request: Request): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isHttpsRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
