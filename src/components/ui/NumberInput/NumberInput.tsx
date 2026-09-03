import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, buildFieldIds } from "../_internal/FormField";
import inputStyles from "../_internal/input.module.css";

export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> {
  id?: string;
  label: string;
  helpText?: string;
  error?: string;
}

/**
 * NumberInput — UX-SPEC.md Seção 3.2 (usado por ex. em "Pontuação inicial",
 * mínimo 0, T04). Para contadores incrementais de gols/cartões (T05), usar
 * `StepperCounter`, não este componente — este é para entrada numérica livre
 * com teclado, aquele é o widget +/- de incremento unitário.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, helpText, error, required, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? `number-input-${autoId}`;
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
          type="number"
          inputMode="numeric"
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

NumberInput.displayName = "NumberInput";
