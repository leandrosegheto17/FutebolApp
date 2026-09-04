/**
 * Confirmação/persistência da divisão de times (RF-05.4) — escopo ampliado
 * desta execução de BE-13 (decisão explícita do usuário, ver TASK.md, nota
 * de status de BE-13), pré-requisito para o Serviço de Substituições
 * (`../substituicoes`, RF-06.1) ter um `time_id` já persistido para
 * vincular. Resolve o GAP estrutural sinalizado na nota de status de BE-11.
 *
 * `validation.ts`/`repository.ts`/`mutate.ts`/`presenter.ts`, consumidos
 * por `app/api/rodadas/[id]/times/route.ts` — mesmo padrão de módulo já
 * usado por `../restricoes` (BE-12).
 */
export * from "./validation";
export * from "./repository";
export * from "./mutate";
export * from "./presenter";
