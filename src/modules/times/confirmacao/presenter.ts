/**
 * Monta o payload de resposta de `POST /api/rodadas/:id/times` a partir do
 * resultado de `mutate.ts`. Função pura, separada da orquestração de I/O —
 * mesmo racional de `src/modules/times/presenter.ts`/
 * `src/modules/times/restricoes/presenter.ts`.
 */
import type { TimeConfirmadoComAtletas } from "./mutate";

export type TimesConfirmadosResponse = {
  rodada_id: string;
  times: Array<{
    time_id: string;
    label: string;
    atletas: Array<{ atleta_id: string; apelido_exibicao: string }>;
  }>;
};

export function paraTimesConfirmadosResponse(
  rodadaId: string,
  times: readonly TimeConfirmadoComAtletas[],
): TimesConfirmadosResponse {
  return {
    rodada_id: rodadaId,
    times: times.map((time) => ({
      time_id: time.time_id,
      label: time.label,
      atletas: time.atletas.map((atleta) => ({ ...atleta })),
    })),
  };
}
