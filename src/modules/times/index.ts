/**
 * Serviço de Times (SDD.md Seção 2.1) — heurística determinística de duas
 * fases (backtracking com poda + busca local, ADR-007), parametrizada por
 * `N`; explicação de conflito por componentes conexos (ADR-010).
 *
 * Implementado em BE-11 (`grafo.ts` — union-find/componentes conexos;
 * `backtracking.ts` — Fase 1; `busca-local.ts` — Fase 2; `timeout.ts` —
 * guard de timeout (TASK.md Seção 6.2 item 3); `repository.ts`/
 * `validation.ts`/`montar.ts`/`presenter.ts`, consumidos por
 * `app/api/times/sugestao/route.ts`) — ver TASK.md Seção 3.1. Restrições
 * obrigatórias (RN-11) ficam em `./restricoes`, submódulo próprio (BE-12),
 * consumidas por este módulo a partir da mesma tabela
 * `app.restricao_obrigatoria`.
 */
export * from "./constants";
export * from "./validation";
export * from "./repository";
export * from "./grafo";
export * from "./backtracking";
export * from "./busca-local";
export * from "./timeout";
export * from "./montar";
export * from "./presenter";
