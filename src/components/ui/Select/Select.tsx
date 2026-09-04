import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, buildFieldIds } from "../_internal/FormField";
import inputStyles from "../_internal/input.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id?: string;
  label: string;
  helpText?: string;
  error?: string;
  options: SelectOption[];
  /** Primeira `<option>` desabilitada/sem valor, para "nenhuma seleção ainda" (ex.: "Selecione quem sai"). */
  placeholder?: string;
}

/**
 * Select — componente novo do design system (`UX-SPEC.md` Seção 3.2 não o
 * nomeia explicitamente, ao lado de `TextInput`/`DateInput`/`NumberInput`/
 * `PasswordInput` — decisão de detalhe do Frontend, documentada aqui e no
 * `TASK.md` FE-11, não escalada ao `ux-ui`): o wireframe de T11 pede
 * seletores "Sai"/"Entra" com afordance de lista suspensa (`▾`), exatamente o
 * que um `<select>` nativo oferece; a implementação reutiliza 100% dos
 * mesmos tokens/wrapper já usados por `TextInput` (`FormField`,
 * `input.module.css`) — nenhuma decisão visual/interativa nova, só a
 * aplicação do padrão já aprovado a um elemento de formulário nativo
 * diferente. Mesmos critérios de acessibilidade: label sempre visível
 * (`<label for>`, WCAG 1.3.1), erro associado via `aria-describedby` +
 * `aria-invalid` (WCAG 3.3.1/3.3.3).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, helpText, error, required, className, id, options, placeholder, ...rest },
    ref,
  ) => {
    const autoId = useId();
    const selectId = id ?? `select-${autoId}`;
    const { helpId, errorId, describedBy } = buildFieldIds(
      selectId,
      Boolean(helpText),
      Boolean(error),
    );

    return (
      <FormField
        inputId={selectId}
        label={label}
        required={required}
        helpText={helpText}
        helpId={helpId}
        error={error}
        errorId={errorId}
      >
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(inputStyles.input, className)}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
    );
  },
);

Select.displayName = "Select";
