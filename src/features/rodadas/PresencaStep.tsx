"use client";

import { AlertBanner, DateInput, SegmentedControl } from "@/components/ui";
import type { ParticipacaoState } from "./participacaoState";
import { STATUS_PARTICIPACAO_OPTIONS, isStatusParticipacao } from "./statusParticipacao";
import type { StatusParticipacao } from "./types";
import styles from "./LancamentoRodadaForm.module.css";

export interface PresencaStepProps {
  data: string;
  onDataChange: (value: string) => void;
  dataError?: string;
  participacoes: ParticipacaoState[];
  onStatusChange: (atletaId: string, status: StatusParticipacao) => void;
}

/**
 * Etapa 1/3 — Presença (`UX-SPEC.md` T05). Data da rodada + marcação de
 * presença por atleta (`SegmentedControl` — Presente/Ausente/Lesionado,
 * `radiogroup` semântico, WCAG 4.1.2).
 */
export function PresencaStep({
  data,
  onDataChange,
  dataError,
  participacoes,
  onStatusChange,
}: PresencaStepProps) {
  return (
    <div className={styles.stepBody}>
      <DateInput
        label="Data da rodada"
        required
        value={data}
        onChange={(event) => onDataChange(event.target.value)}
        error={dataError}
      />

      {/* RF-02.8 — o alerta de duplicidade real só é conhecido depois da
          tentativa de confirmação (Etapa 3, `POST /api/rodadas` devolve
          `409`); não há endpoint de checagem antecipada no
          `API-CONTRACT.yaml`. O modal de confirmação explícita (mesmo
          padrão de `AtletaForm`/BE-06) cobre o requisito funcional aqui —
          este espaço permanece reservado para o mesmo tipo de aviso caso a
          Etapa 3 volte com duplicidade confirmada pelo usuário. */}

      <ul className={styles.atletaList}>
        {participacoes.map((participacao) => (
          <li key={participacao.atletaId} className={styles.atletaRow}>
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
          </li>
        ))}
      </ul>

      {participacoes.length === 0 && (
        <AlertBanner variant="warning">
          Nenhum atleta ativo disponível para marcar presença.
        </AlertBanner>
      )}
    </div>
  );
}
