"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import styles from "./StepperCounter.module.css";

export interface StepperCounterProps {
  /**
   * Rótulo específico do campo, ex.: "Gols de Carlinhos" — nunca um rótulo
   * genérico repetido (UX-SPEC.md Seção 5.2, crítico em lista longa de
   * atletas em T05).
   */
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * StepperCounter — UX-SPEC.md Seção 3.2 (T05: contador de gols/cartões).
 * Widget `spinbutton` (WCAG 4.1.2) com botões +/- de alvo de toque mínimo
 * 44×44px e suporte a seta para cima/baixo pelo teclado.
 */
export function StepperCounter({
  label,
  value,
  min = 0,
  max,
  step = 1,
  disabled = false,
  onChange,
  className,
}: StepperCounterProps) {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  function decrement() {
    if (!disabled && !atMin) onChange(Math.max(min, value - step));
  }

  function increment() {
    if (!disabled && !atMax)
      onChange(max !== undefined ? Math.min(max, value + step) : value + step);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      increment();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      decrement();
    } else if (event.key === "Home" && min !== undefined) {
      event.preventDefault();
      onChange(min);
    } else if (event.key === "End" && max !== undefined) {
      event.preventDefault();
      onChange(max);
    }
  }

  return (
    <div className={cn(styles.wrapper, className)}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Diminuir ${label}`}
        disabled={disabled || atMin}
        onClick={decrement}
      >
        <span aria-hidden="true">−</span>
      </button>
      <div
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        className={styles.value}
        onKeyDown={handleKeyDown}
      >
        {value}
      </div>
      <button
        type="button"
        className={styles.button}
        aria-label={`Aumentar ${label}`}
        disabled={disabled || atMax}
        onClick={increment}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
