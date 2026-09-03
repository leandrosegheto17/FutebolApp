import { LOGIN_GENERIC_ERROR_MESSAGE, LOGIN_TECHNICAL_ERROR_MESSAGE } from "./constants";

/**
 * Erro de login com mensagem já pronta para exibição (T01 nunca mostra
 * detalhe técnico bruto ao usuário — Seção 1.0 do TASK.md/critério de T02
 * reaproveitado aqui pelo mesmo princípio).
 */
export class LoginError extends Error {}

interface AuthErrorBody {
  error?: unknown;
}

/**
 * `POST /api/auth/login` (API-CONTRACT.yaml, BE-04 — endpoint real, já
 * aprovado pelo QA; não é mock).
 *
 * - `200` — sessão emitida via `Set-Cookie` `httpOnly` na própria resposta;
 *   o navegador grava o cookie automaticamente, este cliente nunca lê nem
 *   manipula `sessao_interna` diretamente (RN-12/ADR-004).
 * - `401` — senha incorreta OU bloqueado por rate limiting, resposta
 *   idêntica nos dois casos (RF-07.3) — o texto exibido é sempre o `error`
 *   devolvido pelo servidor, nunca uma inferência do cliente sobre qual dos
 *   dois casos ocorreu.
 * - `400`/falha de rede/erro inesperado — classe de erro diferente de
 *   RF-07.3 (contrato distingue explicitamente), mensagem técnica genérica
 *   própria, para não fingir que foi a senha digitada o problema.
 */
export async function login(senha: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
  } catch {
    throw new LoginError(LOGIN_TECHNICAL_ERROR_MESSAGE);
  }

  if (response.ok) {
    return;
  }

  if (response.status === 401) {
    const body = await safeReadJson(response);
    const message =
      typeof body?.error === "string" && body.error.length > 0
        ? body.error
        : LOGIN_GENERIC_ERROR_MESSAGE;
    throw new LoginError(message);
  }

  throw new LoginError(LOGIN_TECHNICAL_ERROR_MESSAGE);
}

async function safeReadJson(response: Response): Promise<AuthErrorBody | null> {
  try {
    return (await response.json()) as AuthErrorBody;
  } catch {
    return null;
  }
}
