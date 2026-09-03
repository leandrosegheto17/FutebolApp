/**
 * POST /api/auth/logout (BE-04, ADR-004).
 *
 * Isento do middleware de sessão (junto com /api/auth/login) — logout
 * precisa ser idempotente mesmo com sessão já expirada/inválida (o cliente
 * não pode ficar "preso" sem conseguir limpar um cookie que o servidor já
 * não aceitaria de qualquer forma). Não toca a camada de dados — só limpa o
 * cookie, por isso não precisa do `service role` do Supabase.
 */
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/modules/autenticacao/session-cookie";

export function POST(request: Request): NextResponse {
  const response = NextResponse.json({ status: "ok" }, { status: 200 });
  clearSessionCookie(response, request);
  return response;
}
