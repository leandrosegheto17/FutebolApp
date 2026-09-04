"use client";

import { Modal } from "@/components/ui";
import type { AtletaMontado } from "./types";
import { labelParaIndice } from "./times";
import styles from "./TimesResultado.module.css";

export interface TrocarJogadorCandidato {
  atleta: AtletaMontado;
  indiceTime: number;
}

export interface TrocarJogadorModalProps {
  open: boolean;
  atleta: AtletaMontado | null;
  candidatos: TrocarJogadorCandidato[];
  onClose: () => void;
  onSelect: (candidatoId: string) => void;
}

/**
 * "Trocar jogador" (RF-05.4, UX-SPEC.md Seção 2/6.2) — modal de seleção,
 * **nunca** só `drag-and-drop` (GUARDRAILS.md regra 30/TASK.md Seção 1.4):
 * "em mobile, ao tocar em um jogador, abre seletor 'trocar com quem?'"; em
 * `lg`, um atalho de arrastar-e-soltar é só opcional (Seção 6.2), este modal
 * continua sempre disponível como alternativa igualmente completa — por
 * isso nenhuma implementação de drag-and-drop nativo foi adicionada nesta
 * tarefa (decisão de detalhe documentada, não escalada: o requisito de
 * acessibilidade por teclado, 2.1.1/2.1.2, já está 100% satisfeito por este
 * componente sozinho; o atalho de arrastar é um "pode oferecer", não um
 * "deve", e adicioná-lo não mudaria nenhum comportamento observável para
 * quem usa teclado/leitor de tela).
 *
 * Toda a lista de candidatos é focável/navegável por teclado (`button`
 * nativo, um por linha) — nenhum elemento decorativo interativo.
 */
export function TrocarJogadorModal({
  open,
  atleta,
  candidatos,
  onClose,
  onSelect,
}: TrocarJogadorModalProps) {
  return (
    <Modal
      open={open && atleta !== null}
      title={atleta ? `Trocar ${atleta.apelido_exibicao} com quem?` : "Trocar jogador"}
      onClose={onClose}
    >
      {candidatos.length === 0 ? (
        <p>Nenhum outro atleta disponível para troca.</p>
      ) : (
        <ul className={styles.candidatoList}>
          {candidatos.map((candidato) => (
            <li key={candidato.atleta.atleta_id}>
              <button
                type="button"
                className={styles.candidatoButton}
                onClick={() => onSelect(candidato.atleta.atleta_id)}
              >
                {candidato.atleta.apelido_exibicao}
                <span className={styles.candidatoTime}>
                  {labelParaIndice(candidato.indiceTime)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
