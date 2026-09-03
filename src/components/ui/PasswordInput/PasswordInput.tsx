"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, buildFieldIds } from "../_internal/FormField";
import inputStyles from "../_internal/input.module.css";
import styles from "./PasswordInput.module.css";

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> {
  id?: string;
  label: string;
  helpText?: string;
  error?: string;
}

/**
 * PasswordInput — UX-SPEC.md Seção 3.2 / T01.
 * Toggle mostrar/ocultar senha acessível: `aria-pressed` reflete o estado,
 * nome acessível textual ("Mostrar senha"/"Ocultar senha") via `aria-label` +
 * texto oculto para leitor de tela — nunca comunicado só pelo ícone de olho
 * (Seção 5.2 do UX-SPEC.md). `autocomplete="current-password"` por padrão.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      helpText,
      error,
      required,
      className,
      id,
      autoComplete = "current-password",
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? `password-input-${autoId}`;
    const { helpId, errorId, describedBy } = buildFieldIds(
      inputId,
      Boolean(helpText),
      Boolean(error),
    );
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? "Ocultar senha" : "Mostrar senha";

    return (
      <FormField
        inputId={inputId}
        label={label}
        required={required}
        helpText={helpText}
        helpId={helpId}
        error={error}
        errorId={errorId}
      >
        <div className={inputStyles.inputRow}>
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            required={required}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(inputStyles.input, styles.inputWithToggle, className)}
            {...rest}
          />
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={visible}
            aria-label={toggleLabel}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? (
              <EyeOffIcon aria-hidden="true" className={styles.icon} />
            ) : (
              <EyeIcon aria-hidden="true" className={styles.icon} />
            )}
            <span className="sr-only">{toggleLabel}</span>
          </button>
        </div>
      </FormField>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.5 10.5 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
