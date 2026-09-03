"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import styles from "./SegmentedControl.module.css";

export interface SegmentedControlOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  label: string;
  options: SegmentedControlOption[];
  value: string | null;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
}

/**
 * SegmentedControl — UX-SPEC.md Seção 3.2 (T05: Presente/Ausente/Lesionado).
 * Implementado como `radiogroup` semântico (WCAG 4.1.2), não `div`s
 * clicáveis — navegação por seta (roving tabindex, padrão APG de radiogroup),
 * `Tab` entra/sai do grupo uma única vez.
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  name,
  className,
}: SegmentedControlProps) {
  const groupId = useId();
  const groupName = name ?? groupId;
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index !== -1);

  function focusIndex(index: number) {
    const button = itemRefs.current[index];
    button?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const currentPos = enabledIndexes.indexOf(index);
    if (currentPos === -1) return;

    let nextPos: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextPos = (currentPos + 1) % enabledIndexes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextPos = (currentPos - 1 + enabledIndexes.length) % enabledIndexes.length;
    } else if (event.key === "Home") {
      nextPos = 0;
    } else if (event.key === "End") {
      nextPos = enabledIndexes.length - 1;
    }

    if (nextPos !== null) {
      event.preventDefault();
      const nextIndex = enabledIndexes[nextPos];
      if (nextIndex === undefined) return;
      focusIndex(nextIndex);
      const nextOption = options[nextIndex];
      if (nextOption) onChange(nextOption.value);
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn(styles.group, className)}>
      {options.map((option, index) => {
        const checked = option.value === value;
        // Roving tabindex: apenas o item selecionado (ou o primeiro
        // habilitado, se nada selecionado ainda) participa da ordem de Tab.
        const isTabStop = checked || (!value && index === enabledIndexes[0]);

        return (
          <button
            key={option.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            disabled={option.disabled}
            tabIndex={isTabStop ? 0 : -1}
            name={groupName}
            className={styles.option}
            onClick={() => !option.disabled && onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
