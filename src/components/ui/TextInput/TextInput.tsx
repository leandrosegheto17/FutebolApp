import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, buildFieldIds } from "../_internal/FormField";
import inputStyles from "../_internal/input.module.css";

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  id?: string;
  label: string;
  helpText?: string;
  error?: string;
}

/**
 * TextInput — UX-SPEC.md Seção 3.2. Label sempre visível (nunca só
 * placeholder); erro associado via `aria-describedby` + `aria-invalid`.
 * Estados: default, hover, focus-visible, disabled (todos em
 * `_internal/input.module.css`, compartilhado com DateInput/NumberInput/
 * PasswordInput para nunca haver duas implementações visuais de input).
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, helpText, error, required, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? `text-input-${autoId}`;
    const { helpId, errorId, describedBy } = buildFieldIds(
      inputId,
      Boolean(helpText),
      Boolean(error),
    );

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
        <input
          ref={ref}
          id={inputId}
          type="text"
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(inputStyles.input, className)}
          {...rest}
        />
      </FormField>
    );
  },
);

TextInput.displayName = "TextInput";
