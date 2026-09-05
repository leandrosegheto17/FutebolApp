import { cn } from "@/lib/cn";
import styles from "./PresenceDot.module.css";

export type PresenceStatus = "presente" | "ausente" | "lesionado";

const LETTER: Record<PresenceStatus, string> = {
  presente: "P",
  ausente: "A",
  lesionado: "L",
};

const LABEL: Record<PresenceStatus, string> = {
  presente: "Presente",
  ausente: "Ausente",
  lesionado: "Lesionado",
};

export interface PresenceDotProps {
  status: PresenceStatus;
  /**
   * Quando `true`, o dot é puramente decorativo (`aria-hidden`) — usar
   * apenas quando um texto adjacente já anuncia o status por extenso (ex.:
   * legenda "Presente"/"Ausente"/"Lesionado" ao lado). Quando `false`
   * (default), o dot é a própria fonte do status e expõe `role="img"` +
   * `aria-label` (mesmo padrão já usado por `BrandCrest`/`Icon`, FE-R00).
   */
  decorative?: boolean;
  className?: string;
}

/**
 * `PresenceDot` — UX-SPEC.md Parte II Seção 2.2 ("dots de presença/ausência/
 * lesão... contém a letra P/A/L dentro de um fundo colorido... não é cor
 * isolada, já atende 1.4.1 estruturalmente; recomenda-se ainda `aria-label`
 * expandido... já que uma letra solta 'P'/'A'/'L' sem contexto é uma leitura
 * pobre por voz").
 *
 * Não listado nominalmente na tabela de componentes novos da Seção 3.2 (só
 * `MedalBadge` está lá), mas a Seção 2.3 (T03) já antecipa reuso literal:
 * "mesmo componente/estilo confirmado em T02" — decisão de detalhe deste
 * agente (não escalada) implementar como componente único do design system
 * agora, em vez de duplicar o markup/CSS quando `FE-R03` (T03) chegar
 * (Guardrail 31 — "todo componente do design system implementado uma única
 * vez e reutilizado").
 *
 * `role="img"` + `aria-label` (quando não `decorative`) faz a letra visível
 * ser ignorada pelo nome acessível calculado, substituída pelo rótulo por
 * extenso — evita a leitura pobre "P" solta por voz citada acima, sem deixar
 * de mostrar a letra para quem lê visualmente (paridade com o mockup real).
 */
export function PresenceDot({ status, decorative = false, className }: PresenceDotProps) {
  return (
    <span
      className={cn(styles.dot, styles[status], className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : LABEL[status]}
      aria-hidden={decorative ? true : undefined}
    >
      {LETTER[status]}
    </span>
  );
}
