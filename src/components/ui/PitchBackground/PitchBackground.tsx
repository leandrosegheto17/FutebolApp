import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./PitchBackground.module.css";

export interface PitchBackgroundProps {
  /**
   * Rótulo decorativo de formação (ex.: "4-3-3") — UX-SPEC.md Parte II Seção
   * 2.6/7.2 item 8: confirmado diretamente pelo organizador como puramente
   * decorativo, sem lógica de posicionamento real associada (RF-D01.2).
   */
  formacao: string;
  /** Área do time "Colete" — primeira metade do campo (`base`: acima; `lg`: à esquerda). */
  colete: ReactNode;
  /** Área do time "Sem Colete" — segunda metade do campo (`base`: abaixo; `lg`: à direita). */
  semColete: ReactNode;
  className?: string;
}

/**
 * `PitchBackground` — UX-SPEC.md Parte II Seção 2.6/3.2 (novo, específico do
 * domínio). Composição via CSS Grid/Flexbox sobre elementos DOM reais —
 * nenhuma biblioteca de renderização gráfica nova (`ADR-014`).
 *
 * Decisão de detalhe sobre o `aria-hidden="true"` citado na Seção 3.2
 * ("Contêiner decorativo... aria-hidden=true"), documentada (não escalada):
 * aplicado apenas à **textura/divisor puramente visual** do campo (a listra
 * verde de fundo, via `background` CSS — não é um nó de DOM à parte, então
 * não precisa do atributo — e a linha de meio-campo dourada, `.centerLine`
 * abaixo, que não carrega texto/significado próprio), nunca ao contêiner
 * inteiro. Aplicar `aria-hidden` ao contêiner todo esconderia os times/
 * `PlayerChip` reais de tecnologia assistiva — o oposto do que `ADR-014`
 * exige explicitamente como consequência positiva ("cada jogador continua
 * sendo um elemento DOM focável"/"leitura por leitor de tela sem trabalho
 * adicional"). Esta leitura reconcilia a célula resumida da Seção 3.2 com o
 * próprio `ADR-014` e com a Seção 2.6 (`PlayerChip` "dentro do
 * `PitchBackground`", claramente não oculto).
 */
export function PitchBackground({
  formacao,
  colete,
  semColete,
  className,
}: PitchBackgroundProps) {
  return (
    <div className={cn(styles.frame, className)}>
      <p className={styles.formacao}>{`Formação ${formacao}`}</p>
      <div className={styles.pitch}>
        <div className={styles.teamArea}>{colete}</div>
        <div className={styles.centerLine} aria-hidden="true" />
        <div className={styles.teamArea}>{semColete}</div>
      </div>
    </div>
  );
}

export interface PitchTeamHeaderProps {
  nome: string;
  pontos: string;
}

/**
 * Cabeçalho de uma área de time dentro do campo (ex.: "COLETE" / "62 pts").
 * Nome do time como `<h2>` real (estrutura de documento, WCAG 1.3.1) — mesma
 * semântica já usada pela composição anterior desta tela, preservada aqui.
 */
export function PitchTeamHeader({ nome, pontos }: PitchTeamHeaderProps) {
  return (
    <div className={styles.teamHeader}>
      <h2 className={styles.teamNome}>{nome}</h2>
      <span className={styles.teamPontos}>{pontos}</span>
    </div>
  );
}

/** Lista de `PlayerChip` de uma área de time — `flex-wrap`, sem grade de posição real (`ADR-014`). */
export function PitchPlayerList({ children }: { children: ReactNode }) {
  return <div className={styles.playerGrid}>{children}</div>;
}
