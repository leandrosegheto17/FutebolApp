/**
 * CRUD de Restrições Obrigatórias (RF-05.5, RN-11) — criar/editar/desativar
 * par de atletas, soft-delete (nunca exclusão física).
 *
 * Implementado em BE-12 (`validation.ts`/`repository.ts`/`presenter.ts`/
 * `mutate.ts`, consumidos por `app/api/restricoes/*`) — ver TASK.md Seção
 * 3.1. Consumida por `BE-11` (Serviço de Times, ADR-010) a partir da mesma
 * tabela `app.restricao_obrigatoria`.
 */
export * from "./validation";
export * from "./repository";
export * from "./presenter";
export * from "./mutate";
