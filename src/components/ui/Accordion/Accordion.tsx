"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Accordion.module.css";

export interface AccordionItemData {
  value: string;
  title: string;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  /** Permite mais de um item aberto ao mesmo tempo. Padrão: true (T03 pode
   * ter várias rodadas do mês expandidas simultaneamente). */
  allowMultiple?: boolean;
  defaultOpenValues?: string[];
  className?: string;
}

/**
 * Accordion — UX-SPEC.md Seção 3.2 (T03: lista de presentes por rodada).
 * Botão de disparo com `aria-expanded`/`aria-controls` (WCAG 4.1.2), painel
 * com `role="region"` + `aria-labelledby`, nunca oculto só via CSS
 * `display:none` sem estado ARIA correspondente.
 */
export function Accordion({
  items,
  allowMultiple = true,
  defaultOpenValues = [],
  className,
}: AccordionProps) {
  const baseId = useId();
  const [openValues, setOpenValues] = useState<Set<string>>(new Set(defaultOpenValues));

  function toggle(value: string) {
    setOpenValues((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (!allowMultiple) next.clear();
        next.add(value);
      }
      return next;
    });
  }

  return (
    <div className={className}>
      {items.map((item) => {
        const isOpen = openValues.has(item.value);
        const triggerId = `${baseId}-trigger-${item.value}`;
        const panelId = `${baseId}-panel-${item.value}`;
        return (
          <div key={item.value} className={styles.item}>
            <h3>
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={styles.trigger}
                onClick={() => toggle(item.value)}
              >
                <span>{item.title}</span>
                <ChevronIcon className={styles.icon} aria-hidden="true" />
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className={styles.panel}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
