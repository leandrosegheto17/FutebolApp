import { cn } from "@/lib/cn";
import styles from "./MedalBadge.module.css";

export type MedalPosition = 1 | 2 | 3;

const MEDAL_EMOJI: Record<MedalPosition, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export interface MedalBadgeProps {
  /** Posição no ranking — só os 3 primeiros colocados recebem medalha. */
  position: MedalPosition;
  className?: string;
}

/**
 * `MedalBadge` — UX-SPEC.md Parte II Seção 2.2/3.2/5.4/7.2 item 6 (novo,
 * específico do domínio, T02 — Ranking Público).
 *
 * O conteúdo visual é o próprio emoji de medalha aprovado no mockup real
 * (🥇🥈🥉), não um ícone SVG substituto — decisão do organizador já fechada
 * (UX-SPEC.md Seção 7.2, item 6: "a medalha de T02 continua sendo o
 * componente `MedalBadge`, mas seu conteúdo visual é o próprio emoji").
 *
 * Este componente existe, sobretudo, para centralizar a **correção de
 * acessibilidade obrigatória** identificada na auditoria de fidelidade desta
 * revisão (Seção 2.2/5.4): o mockup real mostra a medalha SEM nenhum texto
 * ordinal equivalente para os 3 primeiros colocados — ao contrário das
 * posições 4+ (que mostram "4º"/"5º" como texto simples) — o que viola
 * 1.4.1/1.1.1 (ícone sem texto equivalente). Nenhum sign-off de
 * `accessibility-review` pode ser dado para T02 sem esta correção.
 *
 * Decisão de detalhe (documentada, não escalada — a própria Seção 5.4
 * autoriza as duas alternativas): o texto ordinal é `sr-only` (visualmente
 * oculto), preservando a leitura visual do mockup aprovado exatamente como
 * veio — a alternativa visível ("1º" pequeno ao lado do emoji) mudaria a
 * composição visual aprovada sem necessidade, já que `sr-only` satisfaz
 * integralmente o requisito de a11y (texto perceptível por tecnologia
 * assistiva, ainda que não pintado na tela).
 */
export function MedalBadge({ position, className }: MedalBadgeProps) {
  return (
    <span className={cn(styles.badge, className)}>
      <span aria-hidden="true" className={styles.emoji}>
        {MEDAL_EMOJI[position]}
      </span>
      <span className="sr-only">{`${position}º lugar`}</span>
    </span>
  );
}
