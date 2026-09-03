"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Tabs.module.css";

export interface TabItem {
  value: string;
  label: string;
  panel: ReactNode;
}

export interface TabsProps {
  label: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Tabs — UX-SPEC.md Seção 3.2 (T02/T03: Ranking/Presença Mensal).
 * `tablist`/`tab`/`tabpanel` reais (WCAG 4.1.2), navegação por seta
 * esquerda/direita com ativação automática (padrão APG de tabs), `Tab` entra
 * no painel ativo diretamente.
 */
export function Tabs({ label, items, value, onChange, className }: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = items.findIndex((item) => item.value === value);

  function focusAndSelect(index: number) {
    const item = items[index];
    if (!item) return;
    tabRefs.current[index]?.focus();
    onChange(item.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAndSelect((activeIndex + 1) % items.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAndSelect((activeIndex - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAndSelect(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAndSelect(items.length - 1);
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className={styles.tablist}>
        {items.map((item, index) => {
          const selected = item.value === value;
          const tabId = `${baseId}-tab-${item.value}`;
          const panelId = `${baseId}-panel-${item.value}`;
          return (
            <button
              key={item.value}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => onChange(item.value)}
              onKeyDown={handleKeyDown}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const tabId = `${baseId}-tab-${item.value}`;
        const panelId = `${baseId}-panel-${item.value}`;
        const selected = item.value === value;
        return (
          <div
            key={item.value}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            hidden={!selected}
            className={styles.panel}
            // Padrão ARIA APG de Tabs: quando o painel não garante conter um
            // elemento focável (o conteúdo é decidido pela tela consumidora,
            // ex.: T02/T03), o próprio tabpanel entra na sequência de Tab
            // (WCAG 2.1.1) para não deixar o conteúdo inalcançável por teclado.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
          >
            {selected && item.panel}
          </div>
        );
      })}
    </div>
  );
}
