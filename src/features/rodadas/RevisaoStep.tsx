"use client";

import { AlertBanner } from "@/components/ui";
import { formatDataExibicao } from "./format";
import type { ResumoRodada } from "./participacaoState";
import styles from "./LancamentoRodadaForm.module.css";

export interface RevisaoStepProps {
  data: string;
  resumo: ResumoRodada;
  formError: string | null;
}

/**
 * Etapa 3/3 — Revisão e Confirmação (`UX-SPEC.md` T05). Ponto de
 * não-retorno: a ação de confirmar (botão no `Stepper`, fora deste
 * componente) dispara a transação atômica única (`POST /api/rodadas`,
 * TASK.md Seção 1.2). Este componente é só o resumo somente-leitura + área
 * de erro — nunca sugere que algo já foi salvo antes da confirmação.
 */
export function RevisaoStep({ data, resumo, formError }: RevisaoStepProps) {
  return (
    <div className={styles.stepBody}>
      <h2 className={styles.resumoTitulo}>Resumo da rodada {formatDataExibicao(data)}</h2>
      <p>{`${resumo.presentes} presentes · ${resumo.ausentes} ausentes · ${resumo.lesionados} lesionados`}</p>
      <p>{`${resumo.gols} gols · ${resumo.cartoesAmarelos} cartões amarelos · ${resumo.cartoesVermelhos} cartões vermelhos`}</p>

      {formError && <AlertBanner variant="danger">{formError}</AlertBanner>}
    </div>
  );
}
