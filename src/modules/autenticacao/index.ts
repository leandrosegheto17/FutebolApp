/**
 * Módulo de Autenticação Custom (SDD.md Seção 2.1, ADR-004) — valida senha
 * única compartilhada, emite/valida sessão (cookie httpOnly/Secure/
 * SameSite=Strict), aplica rate limiting de tentativas de login, mensagem de
 * erro sempre genérica (RF-07.3).
 *
 * Implementado em BE-04 (módulo + Route Handlers de login/logout +
 * middleware de sessão) e BE-05 (`redefinir-senha.ts` — lógica de
 * validação/gravação do novo hash em `app.auth_interno`, consumida pelo
 * script/CLI `scripts/redefinir-senha-interna.ts`) — ver TASK.md Seção 3.1.
 */
export * from "./constants";
export * from "./session-token";
export * from "./session-cookie";
export * from "./password";
export * from "./rate-limit";
export * from "./client-ip";
export * from "./repository";
export * from "./redefinir-senha";
