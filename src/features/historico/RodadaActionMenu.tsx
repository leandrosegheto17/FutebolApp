"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import styles from "./RodadaActionMenu.module.css";

export interface RodadaActionMenuProps {
  /** Usado só para compor o nome acessível do botão-gatilho (ex.: "rodada de 19/09/2026"). */
  rodadaLabel: string;
  corrigirHref: string;
  onExcluir: () => void;
}

/**
 * Menu "⋮" por rodada (UX-SPEC.md Seção 2, T06 — "Corrigir" / "Excluir
 * rodada"). Decisão de detalhe documentada (TASK.md Seção 1.0 — não é
 * lacuna estrutural, não escalada): implementado como um "disclosure"
 * simples (botão-gatilho + painel com um `<Link>` e um `<button>` reais),
 * não como o padrão ARIA `menu`/`menuitem` completo (que exige navegação por
 * seta com "roving tabindex"). Para apenas duas ações, a WAI-ARIA Authoring
 * Practices aceita esse padrão mais simples como alternativa — usar
 * elementos interativos nativos com nome/função corretos (WCAG 4.1.2) evita
 * o risco maior de um widget `role="menu"` implementado incorretamente.
 */
export function RodadaActionMenu({
  rodadaLabel,
  corrigirHref,
  onExcluir,
}: RodadaActionMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Mais ações para ${rodadaLabel}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open && (
        <div id={panelId} ref={panelRef} className={styles.panel}>
          <Link
            ref={firstItemRef}
            href={corrigirHref}
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            Corrigir
          </Link>
          <button
            type="button"
            className={cn(styles.item, styles.danger)}
            onClick={() => {
              setOpen(false);
              onExcluir();
            }}
          >
            Excluir rodada
          </button>
        </div>
      )}
    </div>
  );
}
