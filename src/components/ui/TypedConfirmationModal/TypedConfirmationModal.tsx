"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import styles from "./TypedConfirmationModal.module.css";

export interface TypedConfirmationModalProps {
  open: boolean;
  title: string;
  /** Corpo explicando, em linguagem simples, o efeito da ação (UX-SPEC.md
   * Seção 2, T04 — "o que é sobrescrito, o que é preservado, que não há
   * reversão"). */
  description: ReactNode;
  /** Palavra exata exigida para habilitar o botão de ação (ex.: "ANONIMIZAR"). */
  confirmationWord: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Estado de carregamento da ação destrutiva em si (ex.: aguardando a API
   * de anonimização) — distinto do gate de "texto ainda não confere": aqui
   * o botão fica nativamente `disabled` (padrão já usado por todo `Button`
   * com `loading`), porque a ação já foi confirmada e está em voo, não
   * porque o texto não bate. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * TypedConfirmationModal — UX-SPEC.md Seção 3.2 ("novo, específico do
 * domínio", revisão 2026-09-02) + Seção 5.2 (T04 Anonimização). Variante de
 * `Modal/Dialog` para ações destrutivas e **irreversíveis**: só habilita o
 * botão de ação depois que o usuário digita a palavra de confirmação exata.
 *
 * Colocado no design system (`src/components/ui`), não dentro de
 * `src/features/atletas` — decisão de detalhe documentada (TASK.md FE-04):
 * a Seção 3.2 do UX-SPEC.md o lista na própria tabela de "Componentes
 * reutilizáveis" (mesma categoria de `ConflictList`/`DiffViewer`: "novo,
 * específico do domínio", mas ainda parte do inventário compartilhado, não
 * um componente amarrado a uma tela só) e o padrão em si — título/descrição/
 * palavra de confirmação parametrizados, sem nenhuma referência a "atleta"
 * ou a qualquer conceito de domínio — é genérico o bastante para qualquer
 * ação futura irreversível equivalente reaproveitar sem duplicar a lógica
 * de "aria-disabled até o texto bater" (GUARDRAILS.md/TASK.md Seção 1.6:
 * "nenhuma tela cria uma variação paralela de Button/Modal/Toast"). Hoje só
 * T04 (anonimização) o consome — `Modal.tsx` já antecipava isso no próprio
 * comentário ("variantes de domínio são construídas sobre este componente
 * pelas tarefas que as usam"), sem dizer que precisariam viver fora do
 * design system.
 *
 * Acessibilidade (UX-SPEC.md Seção 5.2, T04 Anonimização):
 * - Foco inicial em "Cancelar" (herdado de `Modal` via `initialFocusRef`),
 *   nunca no botão destrutivo — mesmo critério de T07.
 * - Botão destrutivo nunca usa `disabled` nativo enquanto o texto não bate
 *   — usa `aria-disabled` (permanece no DOM/na ordem de tabulação; só o
 *   clique é ignorado) + texto de status associado via `aria-describedby`
 *   (nunca só cor de borda do campo).
 */
export function TypedConfirmationModal({
  open,
  title,
  description,
  confirmationWord,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onClose,
}: TypedConfirmationModalProps) {
  const [value, setValue] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const feedbackId = useId();
  const inputId = useId();
  const isMatch = value.length > 0 && value === confirmationWord;

  // Reseta o texto digitado sempre que o modal (re)abre — nunca herda o
  // valor de uma tentativa anterior (ex.: reabrir após "Cancelar").
  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  function handleConfirmClick() {
    if (!isMatch || loading) return;
    onConfirm();
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      initialFocusRef={cancelRef as React.RefObject<HTMLElement>}
      actions={
        <>
          <Button ref={cancelRef} type="button" variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            aria-disabled={!isMatch}
            aria-describedby={feedbackId}
            loading={loading}
            onClick={handleConfirmClick}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.description}>{description}</div>
        <label className={styles.label} htmlFor={inputId}>
          {`Digite "${confirmationWord}" para confirmar:`}
        </label>
        <input
          id={inputId}
          type="text"
          className={styles.input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby={feedbackId}
          autoComplete="off"
          disabled={loading}
        />
        <p id={feedbackId} className={styles.feedback} aria-live="polite">
          {isMatch
            ? "Confirmação habilitada."
            : `O texto digitado precisa ser exatamente "${confirmationWord}".`}
        </p>
      </div>
    </Modal>
  );
}
