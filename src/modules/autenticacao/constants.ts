/**
 * Constantes compartilhadas do módulo de Autenticação Custom (BE-04, ADR-004).
 * Isoladas num arquivo próprio (sem `"use server"`/import de Node-only) para
 * que tanto o middleware (`middleware.ts`, roda em Edge Runtime — Next.js
 * 14 App Router não suporta Node.js runtime para middleware) quanto os
 * Route Handlers de login/logout (Node.js runtime) importem os mesmos
 * valores sem duplicar constante em dois lugares.
 */

/** Nome do cookie de sessão (TASK.md Secao 1.3 — httpOnly/Secure/SameSite=Strict). */
export const SESSION_COOKIE_NAME = "sessao_interna";

/**
 * TTL da sessão. TASK.md Secao 1.3/ADR-004 exigem uma faixa (8-12h), não um
 * valor único — decisão de detalhe (documentada, não escalada): 10h, o
 * ponto médio exato da faixa, sem nenhum motivo de produto para puxar para
 * uma das pontas.
 */
export const SESSION_TTL_MS = 10 * 60 * 60 * 1000;

/**
 * Janela de rate limiting de tentativas de login (TASK.md Secao 1.3/RNF-03):
 * 5 tentativas erradas por IP em 15 minutos.
 */
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Quantidade de tentativas falhas consecutivas que aciona o bloqueio. */
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Mensagem de erro de login — SEMPRE esta mesma string, nunca diferenciada
 * entre "senha incorreta" e "bloqueado por rate limiting" (RF-07.3, TASK.md
 * Secao 1.3, GUARDRAILS.md regra 15). Nenhum outro ponto do código deve
 * literal-tipar uma mensagem de erro de login alternativa.
 */
export const LOGIN_GENERIC_ERROR_MESSAGE = "Senha incorreta.";
