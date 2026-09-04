/**
 * Serviço de Substituições (BE-13, RF-06) — registro de fidelidade
 * histórica vinculado a rodada/time (RF-06.1), múltiplas substituições sem
 * limite por rodada (RF-06.2), sem efeito em pontuação (RF-06.3).
 *
 * `validation.ts`/`repository.ts`/`mutate.ts`/`presenter.ts`, consumidos
 * por `app/api/rodadas/[id]/substituicoes/route.ts` — mesmo padrão de
 * módulo já usado por `../restricoes` (BE-12). Depende de `../confirmacao`
 * ter persistido `app.time` para a rodada (escopo ampliado desta mesma
 * execução, ver TASK.md, nota de status de BE-13) — sem isso, nenhum
 * `time_id` válido existiria para vincular (RF-06.1).
 */
export * from "./validation";
export * from "./repository";
export * from "./mutate";
export * from "./presenter";
