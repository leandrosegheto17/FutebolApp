import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, buildFieldIds } from "../_internal/FormField";
import inputStyles from "../_internal/input.module.css";

export interface DateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> {
  id?: string;
  label: string;
  helpText?: string;
  error?: string;
}

/**
 * DateInput — UX-SPEC.md Seção 3.2.
 *
 * Decisão de implementação (documentada, não lacuna silenciosa — Seção 1.0
 * do TASK.md): usa `<input type="date">` nativo em vez de um campo mascarado
 * de 3 segmentos (dd/mm/aaaa) desenhado no wireframe de T04/T05. Motivo:
 * navegação/edição por segmento com teclado e anúncio correto por leitor de
 * tela é um problema de acessibilidade não-trivial para reimplementar à mão
 * (WCAG 2.1.1/4.1.2), e o input nativo já resolve isso corretamente em todos
 * os navegadores modernos. Trade-off aceito: o formato de exibição
 * (dd/mm/aaaa vs. mm/dd/aaaa) segue o locale do navegador/SO do usuário, não
 * é garantido 100% dd/mm/aaaa como no wireframe — se isto for um requisito
 * rígido de produto, sinalizar para `ux-ui` confirmar antes de T04/T05
 * congelarem a tela definitivamente.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, helpText, error, required, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? `date-input-${autoId}`;
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
          type="date"
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

DateInput.displayName = "DateInput";
