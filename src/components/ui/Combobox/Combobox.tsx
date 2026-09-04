import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";
import { FormField, buildFieldIds } from "../_internal/FormField";
import inputStyles from "../_internal/input.module.css";
import styles from "./Combobox.module.css";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  id?: string;
  label: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options: ComboboxOption[];
  /** `value` da opção selecionada, `""` quando nenhuma (mesma convenção de `Select`). */
  value: string;
  onChange: (value: string) => void;
}

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

/** Remove acento/caixa para comparação de substring "por nome" tolerante. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(DIACRITICS_PATTERN, "").toLowerCase();
}

/**
 * Combobox — componente novo do design system, criado por T10 (`UX-SPEC.md`
 * Seção 2: "dois seletores de atleta (**autocomplete por nome**)"; não
 * nomeado explicitamente na Seção 3.2, ao lado de `Select` (FE-11) — mesma
 * situação já documentada por aquele componente).
 *
 * **Decisão de detalhe do Frontend, documentada aqui e no `TASK.md` FE-10,
 * não escalada ao `ux-ui`**: diferente de T11 (Select simples — o wireframe
 * só pede a afordance "▾" de um seletor comum), o próprio texto do
 * `UX-SPEC.md` de T10 exige explicitamente "autocomplete", um comportamento
 * mais rico que uma lista suspensa nativa (filtrar por texto digitado,
 * navegação por teclado sobre o subconjunto filtrado) — reaproveitar
 * `Select` aqui não satisfaria o critério de aceite literal. Implementa o
 * padrão ARIA 1.2 "Combobox with List Autocomplete" (WAI-ARIA Authoring
 * Practices): `role="combobox"` no `<input>` (nunca um `<div>` estilizado),
 * `aria-expanded`/`aria-controls`/`aria-autocomplete="list"`/
 * `aria-activedescendant` refletindo o estado real da lista, `listbox`/
 * `option` reais associados. Reaproveita 100% do wrapper/tokens já usados
 * por `TextInput`/`Select` (`FormField`, `input.module.css`) — nenhuma
 * decisão visual nova, só a camada de popup filtrável por cima do mesmo
 * campo de texto. Sinalizado para o `ux-ui` avaliar se quer formalizar este
 * componente na Seção 3.2/3.3 do `UX-SPEC.md` (mesmo mecanismo de
 * histórico já sinalizado para `Select` em FE-11), sem bloquear a entrega.
 *
 * Seleção sempre exige escolher uma opção real da lista (nunca aceita texto
 * livre como valor) — digitar invalida a seleção anterior (`onChange("")`)
 * até que o usuário escolha (clique ou `Enter` sobre a opção destacada); ao
 * perder o foco sem uma seleção válida, o campo volta a refletir só o que
 * está realmente selecionado (nunca deixa um rótulo digitado "órfão", sem um
 * id real por trás — TASK.md Seção 1.0, nunca lacuna silenciosa).
 */
export function Combobox({
  id,
  label,
  helpText,
  error,
  required,
  disabled,
  placeholder,
  options,
  value,
  onChange,
}: ComboboxProps) {
  const autoId = useId();
  const inputId = id ?? `combobox-${autoId}`;
  const listboxId = `${inputId}-listbox`;
  const { helpId, errorId, describedBy } = buildFieldIds(
    inputId,
    Boolean(helpText),
    Boolean(error),
  );

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? "";

  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o texto exibido quando `value` muda por fora do componente
  // (reset de formulário, pré-preenchimento em edição) — nunca sobrescreve o
  // que o usuário está digitando ativamente, só reage a uma mudança real de
  // `value`.
  useEffect(() => {
    setQuery(selectedLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((option) => normalize(option.label).includes(normalize(query)));

  function commitSelection(option: ComboboxOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);
    setActiveIndex(0);
    if (value !== "") {
      onChange("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((current) => (current + 1 >= filtered.length ? 0 : current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length - 1);
        return;
      }
      setActiveIndex((current) => (current - 1 < 0 ? filtered.length - 1 : current - 1));
      return;
    }
    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        event.preventDefault();
        commitSelection(filtered[activeIndex]);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleBlur() {
    setOpen(false);
    setActiveIndex(-1);
    setQuery(value === "" ? "" : selectedLabel);
  }

  const activeOptionId =
    activeIndex >= 0 && filtered[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

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
      <div className={styles.wrapper}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={inputStyles.input}
        />
        {open && filtered.length > 0 && (
          <ul id={listboxId} role="listbox" className={styles.listbox}>
            {filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  styles.option,
                  index === activeIndex && styles.optionActive,
                )}
                onMouseDown={(event) => {
                  // Evita que o `blur` do input feche a lista antes do
                  // clique na opção ser processado (padrão consagrado de
                  // combobox — `mousedown` dispara antes de `blur`).
                  event.preventDefault();
                  commitSelection(option);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
        {open && filtered.length === 0 && (
          <p className={styles.noResults}>Nenhum atleta encontrado</p>
        )}
      </div>
    </FormField>
  );
}
