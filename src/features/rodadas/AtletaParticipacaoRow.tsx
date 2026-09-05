"use client";

import { SegmentedControl, StepperCounter } from "@/components/ui";
import type { ParticipacaoState } from "./participacaoState";
import { STATUS_PARTICIPACAO_OPTIONS, isStatusParticipacao } from "./statusParticipacao";
import type { StatusParticipacao } from "./types";
import styles from "./LancamentoRodadaForm.module.css";

export interface AtletaParticipacaoRowProps {
  participacao: ParticipacaoState;
  onStatusChange: (atletaId: string, status: StatusParticipacao) => void;
  onChangeEvento: (
    atletaId: string,
    campo: "gols" | "cartoesAmarelos" | "cartoesVermelhos",
    valor: number,
  ) => void;
}

/**
 * Um item da lista contínua única de T05 (`UX-SPEC.md` Parte II Seção 2.4) —
 * substitui a dupla Etapa 1 (`PresencaStep`)/Etapa 2 (`EventosStep`) da Parte
 * I por um único cartão: nome + `SegmentedControl` de presença **na mesma
 * linha**, com a linha de eventos (gol/cartão) revelada logo abaixo.
 *
 * **RF-02.6 preservado sem mudança de regra**: eventos ficam bloqueados
 * (texto explicativo, nunca escondidos) só para "Ausente". Para "Lesionado"
 * os controles permanecem visíveis/habilitados — RF-02.3/RF-02.4/RF-02.5
 * (PRD-TECNICO.md) exigem explicitamente que gol/cartão continuem
 * registráveis para um atleta lesionado ("permitindo ainda registrar
 * eventos ocorridos até o momento da lesão"), então nunca colidem com o
 * "bloqueio" de RF-02.6, que é exclusivo de "Ausente". A nota do mockup real
 * citada em `UX-SPEC.md` ("eventos só aparecem p/ presente") generaliza esse
 * bloqueio para "Lesionado" também — divergência sinalizada em
 * `BLOCKERS.md` (não decidida silenciosamente): esta implementação preserva
 * o comportamento de negócio já testado/aprovado (RN-D06, "zero mudança de
 * lógica de negócio" — instrução explícita desta tarefa), em vez de seguir a
 * generalização literal do texto do mockup, que reduziria uma capacidade já
 * garantida por requisito funcional aprovado.
 */
export function AtletaParticipacaoRow({
  participacao,
  onStatusChange,
  onChangeEvento,
}: AtletaParticipacaoRowProps) {
  const bloqueado = participacao.status === "ausente";

  return (
    <li className={styles.atletaCard}>
      <div className={styles.atletaHeaderRow}>
        <span className={styles.atletaNome}>{participacao.nome}</span>
        <SegmentedControl
          label={`Presença de ${participacao.nome}`}
          options={STATUS_PARTICIPACAO_OPTIONS}
          value={participacao.status}
          onChange={(value) => {
            if (isStatusParticipacao(value)) {
              onStatusChange(participacao.atletaId, value);
            }
          }}
        />
      </div>

      {bloqueado ? (
        <p role="note" className={styles.bloqueioTexto}>
          Eventos bloqueados — atleta ausente (RF-02.6)
        </p>
      ) : (
        <div className={styles.eventosRow}>
          <div className={styles.eventoChip}>
            <span aria-hidden="true">⚽</span>
            <StepperCounter
              label={`Gols de ${participacao.nome}`}
              value={participacao.gols}
              min={0}
              onChange={(valor) => onChangeEvento(participacao.atletaId, "gols", valor)}
            />
            <span className={styles.eventoLabel}>gol</span>
          </div>
          <div className={styles.eventoChip}>
            <span aria-hidden="true">🟨</span>
            <StepperCounter
              label={`Cartões amarelos de ${participacao.nome}`}
              value={participacao.cartoesAmarelos}
              min={0}
              onChange={(valor) =>
                onChangeEvento(participacao.atletaId, "cartoesAmarelos", valor)
              }
            />
            <span className={styles.eventoLabel}>cartão amarelo</span>
          </div>
          <div className={styles.eventoChip}>
            <span aria-hidden="true">🟥</span>
            <StepperCounter
              label={`Cartões vermelhos de ${participacao.nome}`}
              value={participacao.cartoesVermelhos}
              min={0}
              onChange={(valor) =>
                onChangeEvento(participacao.atletaId, "cartoesVermelhos", valor)
              }
            />
            <span className={styles.eventoLabel}>cartão vermelho</span>
          </div>
        </div>
      )}
    </li>
  );
}
