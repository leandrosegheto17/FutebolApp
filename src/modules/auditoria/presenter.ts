/**
 * Monta o payload de resposta de `GET /api/log-auditoria` (BE-09, RF-04.5) a
 * partir de `listarLogAuditoria` (`repository.ts`). Função pura, separada
 * da orquestração de I/O — mesmo racional de
 * `src/modules/rodadas/presenter.ts`/`src/modules/atletas/presenter.ts`.
 * Nunca inclui campo de autor (RN-12) — `LogAuditoriaRow` já não tem essa
 * coluna, então não há nada a omitir aqui além de repassar os campos.
 */
import type { LogAuditoriaRow } from "./repository";

export type LogAuditoriaItemResponse = {
  id: string;
  rodada_id: string | null;
  atleta_id: string | null;
  tipo_evento: string;
  ocorrido_em: string;
  valores_antes: unknown;
  valores_depois: unknown;
};

export function paraLogAuditoriaResponse(
  linhas: LogAuditoriaRow[],
): LogAuditoriaItemResponse[] {
  return linhas.map((linha) => ({
    id: linha.id,
    rodada_id: linha.rodada_id,
    atleta_id: linha.atleta_id,
    tipo_evento: linha.tipo_evento,
    ocorrido_em: linha.ocorrido_em,
    valores_antes: linha.valores_antes,
    valores_depois: linha.valores_depois,
  }));
}
