import type { ReactNode } from "react";
import styles from "./FormField.module.css";

export interface FormFieldA11yIds {
  inputId: string;
  helpId?: string;
  errorId?: string;
  describedBy?: string;
}

export function buildFieldIds(
  baseId: string,
  hasHelp: boolean,
  hasError: boolean,
): FormFieldA11yIds {
  const helpId = hasHelp ? `${baseId}-help` : undefined;
  const errorId = hasError ? `${baseId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  return { inputId: baseId, helpId, errorId, describedBy };
}

export interface FormFieldProps {
  inputId: string;
  label: string;
  required?: boolean;
  helpText?: string;
  helpId?: string;
  error?: string;
  errorId?: string;
  children: ReactNode;
}

/**
 * Wrapper interno de layout compartilhado por TextInput/DateInput/
 * NumberInput/PasswordInput — garante `<label for>` associado (WCAG 1.3.1),
 * mensagem de erro ligada via `aria-describedby` (o input consumidor é quem
 * aplica o atributo, usando os ids retornados por `buildFieldIds`) e
 * `aria-invalid` (WCAG 3.3.1/3.3.3). Não é um componente listado por nome na
 * Seção 3.2 do UX-SPEC.md — é detalhe de implementação interno, não uma
 * variação paralela de componente público.
 */
export function FormField({
  inputId,
  label,
  required,
  helpText,
  helpId,
  error,
  errorId,
  children,
}: FormFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        {required && <span className="sr-only">(obrigatório)</span>}
      </div>
      {children}
      {helpText && (
        <p id={helpId} className={styles.helpText}>
          {helpText}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
