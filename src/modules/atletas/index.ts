/**
 * Serviço de Atletas (SDD.md Seção 2.1) — CRUD de atleta, cálculo de nível
 * técnico (RN-03), alerta de duplicidade de nome (RF-01.5), anonimização de
 * dado pessoal a pedido do titular (ADR-011).
 *
 * Núcleo implementado em BE-06 (`constants.ts`/`validation.ts`/
 * `repository.ts`, consumidos por `app/api/atletas/*`); anonimização
 * (`anonimizar.ts`, consumida por `app/api/atletas/[id]/anonimizar`)
 * implementada em BE-07 (ver TASK.md Seção 3.1).
 */
export * from "./constants";
export * from "./validation";
export * from "./repository";
export * from "./presenter";
export * from "./mutate";
export * from "./anonimizar";
