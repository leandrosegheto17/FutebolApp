import type { SegmentedControlOption } from "@/components/ui";
import type { StatusParticipacao } from "./types";

/** Opções do `SegmentedControl` de presença por atleta (Etapa 1, `UX-SPEC.md` T05). */
export const STATUS_PARTICIPACAO_OPTIONS: SegmentedControlOption[] = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "lesionado", label: "Lesionado" },
];

export const STATUS_PARTICIPACAO_LABEL: Record<StatusParticipacao, string> = {
  presente: "Presente",
  ausente: "Ausente",
  lesionado: "Lesionado",
};

export function isStatusParticipacao(value: string): value is StatusParticipacao {
  return value === "presente" || value === "ausente" || value === "lesionado";
}
