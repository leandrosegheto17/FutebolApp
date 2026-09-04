"use client";

import { AlertBanner, Button, EmptyState, SegmentedControl } from "@/components/ui";
import { QUANTIDADE_TIMES } from "./times";
import type { ParticipacaoPresente } from "./types";
import styles from "./MontagemTimesShell.module.css";

const PRESENCA_OPTIONS = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
];

export interface PresencaSelecaoProps {
  rodadaDataExibida: string;
  presentes: ParticipacaoPresente[];
  selecionados: Set<string>;
  onToggle: (atletaId: string, selecionado: boolean) => void;
  onGerar: () => void;
  gerando: boolean;
  erroGeracao: string | null;
}

/**
 * Fase de seleção de presentes de T09 (UX-SPEC.md Seção 4, estado "Vazio" —
 * "Selecione os presentes da rodada para gerar times", texto literal
 * reproduzido abaixo). Pré-preenchida com os presentes já registrados na
 * rodada (`buscarPresentesDaRodada`, BE-16) — decisão de detalhe documentada
 * em `MontagemTimesShell.tsx` — mas cada um pode ser desmarcado individualmente
 * (mesmo padrão de `SegmentedControl` por atleta já usado por `PresencaStep`/
 * T05, `radiogroup` semântico, WCAG 4.1.2).
 */
export function PresencaSelecao({
  rodadaDataExibida,
  presentes,
  selecionados,
  onToggle,
  onGerar,
  gerando,
  erroGeracao,
}: PresencaSelecaoProps) {
  const podeGerar = selecionados.size >= QUANTIDADE_TIMES;

  return (
    <div className={styles.selecaoWrapper}>
      <p className={styles.instrucao}>
        Selecione os presentes da rodada para gerar times
      </p>
      <p className={styles.contagem}>
        Presentes selecionados: <strong>{selecionados.size}</strong>
      </p>

      {presentes.length === 0 ? (
        <EmptyState
          title="Nenhum presente registrado nesta rodada."
          description={`Lance a presença na rodada de ${rodadaDataExibida} antes de montar os times.`}
        />
      ) : (
        <ul className={styles.atletaList}>
          {presentes.map((presente) => (
            <li key={presente.atleta_id} className={styles.atletaRow}>
              <span className={styles.atletaNome}>{presente.apelido_exibicao}</span>
              <SegmentedControl
                label={`Seleção de ${presente.apelido_exibicao} para os times`}
                options={PRESENCA_OPTIONS}
                value={selecionados.has(presente.atleta_id) ? "presente" : "ausente"}
                onChange={(value) => onToggle(presente.atleta_id, value === "presente")}
              />
            </li>
          ))}
        </ul>
      )}

      {presentes.length > 0 && !podeGerar && (
        <AlertBanner variant="warning">
          Selecione ao menos {QUANTIDADE_TIMES} presentes para gerar times.
        </AlertBanner>
      )}

      {erroGeracao && <AlertBanner variant="danger">{erroGeracao}</AlertBanner>}

      <Button onClick={onGerar} loading={gerando} disabled={!podeGerar}>
        Gerar sugestão de times
      </Button>

      {/* Texto literal do `UX-SPEC.md` Seção 4 (linha "T09 Montagem de
          Times", coluna Carregando) — "pode levar alguns segundos" (heurística
          de backtracking, guarda de 8s, TASK.md Seção 6.2 item 3). `role="status"`
          (`aria-live="polite"` implícito, WCAG 4.1.3) — o spinner do próprio
          `Button` já comunica visualmente, este texto garante o anúncio para
          quem usa leitor de tela. */}
      {gerando && (
        <p role="status" className={styles.calculando}>
          Calculando divisão de times…
        </p>
      )}
    </div>
  );
}
