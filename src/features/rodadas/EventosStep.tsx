"use client";

import { StepperCounter } from "@/components/ui";
import type { ParticipacaoState } from "./participacaoState";
import { STATUS_PARTICIPACAO_LABEL } from "./statusParticipacao";
import styles from "./LancamentoRodadaForm.module.css";

export interface EventosStepProps {
  participacoes: ParticipacaoState[];
  onChangeEvento: (
    atletaId: string,
    campo: "gols" | "cartoesAmarelos" | "cartoesVermelhos",
    valor: number,
  ) => void;
}

/**
 * Etapa 2/3 — Eventos (`UX-SPEC.md` T05). Gols/cartões por atleta via
 * `StepperCounter`. Controles de um atleta "Ausente" ficam **desabilitados,
 * nunca escondidos**, com texto explicando o motivo (RF-02.6) — nunca
 * confundir "não consigo marcar" com "esse atleta não existe nesta tela".
 */
export function EventosStep({ participacoes, onChangeEvento }: EventosStepProps) {
  return (
    <div className={styles.stepBody}>
      {participacoes.map((participacao) => {
        const bloqueado = participacao.status === "ausente";
        return (
          <div key={participacao.atletaId} className={styles.eventosRow}>
            <p className={styles.atletaNome}>
              {participacao.nome} ({STATUS_PARTICIPACAO_LABEL[participacao.status]})
            </p>

            {bloqueado ? (
              <p role="note" className={styles.bloqueioTexto}>
                Eventos bloqueados — atleta ausente (RF-02.6)
              </p>
            ) : null}

            <div className={styles.contadores}>
              <StepperCounter
                label={`Gols de ${participacao.nome}`}
                value={participacao.gols}
                min={0}
                disabled={bloqueado}
                onChange={(valor) => onChangeEvento(participacao.atletaId, "gols", valor)}
              />
              <StepperCounter
                label={`Cartões amarelos de ${participacao.nome}`}
                value={participacao.cartoesAmarelos}
                min={0}
                disabled={bloqueado}
                onChange={(valor) =>
                  onChangeEvento(participacao.atletaId, "cartoesAmarelos", valor)
                }
              />
              <StepperCounter
                label={`Cartões vermelhos de ${participacao.nome}`}
                value={participacao.cartoesVermelhos}
                min={0}
                disabled={bloqueado}
                onChange={(valor) =>
                  onChangeEvento(participacao.atletaId, "cartoesVermelhos", valor)
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
