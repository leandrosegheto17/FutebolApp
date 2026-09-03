"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/design-system/tokens";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /**
   * Estado de carregamento (ex.: envio de formulário). Mostra spinner
   * *ao lado* do texto — o texto nunca é substituído só pelo ícone
   * (UX-SPEC.md Seção 3.2: "loading (spinner + texto mantido, nunca só ícone)").
   */
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Button — UX-SPEC.md Seção 3.2.
 * Estados cobertos: default, hover, focus-visible (global em globals.css),
 * disabled, loading. Alvo de toque mínimo 44×44px (WCAG 2.5.5/2.5.8).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const reducedMotion = prefersReducedMotion();

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          styles.button,
          styles[variant],
          fullWidth && styles.fullWidth,
          className,
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && (
          <span
            className={cn(styles.spinner, reducedMotion && styles.spinnerStatic)}
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";
