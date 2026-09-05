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
 * Resumo somente-leitura + área de erro do **modal de confirmação final**
 * de T05 (`UX-SPEC.md` Parte II Seção 2.4; `LancamentoRodadaForm.tsx`).
 *
 * Reaproveitado sem alteração de composição (Guardrail 31) desde a Parte I
 * (onde era o corpo da antiga "Etapa 3/3: Revisão e Confirmação" de um
 * `Stepper`): a reescrita de `FE-R05` removeu o wizard de 3 etapas, mas a
 * reconciliação do próprio `UX-SPEC.md` para preservar a intenção de
 * RNF-10 ("ponto de não-retorno com resumo explícito antes da transação")
 * é justamente reabrir este mesmo componente dentro de um `Modal`, em vez de
 * duplicar sua composição. Ponto de não-retorno: o botão "Confirmar
 * lançamento" (nas `actions` do `Modal`, fora deste componente) dispara a
 * transação atômica única (`POST /api/rodadas`, TASK.md Seção 1.2).
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
