import { cn } from "@/lib/cn";
import styles from "./BrandCrest.module.css";

export type BrandCrestSize = "large" | "compact";

export interface BrandCrestProps {
  /** `large` — T01 (hero de login). `compact` — `TopNav`/rodapé de T02. */
  size?: BrandCrestSize;
  /**
   * Quando `true`, o crest é puramente decorativo (`aria-hidden`) — usar
   * apenas quando um texto adjacente já identifica a marca por extenso (ex.:
   * wordmark "Turma do Rola" visível ao lado). Quando `false` (default), o
   * crest é a própria fonte da identidade visual e recebe `role="img"` +
   * `aria-label`.
   */
  decorative?: boolean;
  /** Rótulo acessível — ignorado quando `decorative`. */
  title?: string;
  className?: string;
}

/**
 * BrandCrest — UX-SPEC.md Parte II Seção 3.2/1.6-R (novo, fundação FE-R00).
 *
 * **Pendência documentada, não bloqueante desta tarefa** (TASK.md Parte II,
 * Seção 1.6-R/Seção 4.3): o asset real do brasão do Grupo Rola (`logo.jpg`,
 * raiz do repositório) não pode ser referenciado por nenhum componente
 * mesclado em `main` antes de PM+stakeholder confirmarem o direito de uso —
 * essa confirmação é uma dependência de governança, não técnica, e não deve
 * bloquear a fundação do design system. Por isso, `BrandCrest` renderiza um
 * **placeholder** (brasão decorativo em SVG, geometria genérica, sem
 * reproduzir a arte real) até a confirmação chegar.
 *
 * Quando confirmado, a troca é local a este arquivo: substituir o `<svg>`
 * abaixo por `<Image src="/brand/grupo-rola-crest.png" ... />` (convenção de
 * path já decidida pelo Tech Lead, Seção 1.6-R/6.2-R item 3 do TASK.md) —
 * nenhuma tela que já consome `BrandCrest` precisa mudar.
 */
export function BrandCrest({
  size = "large",
  decorative = false,
  title = "Grupo Rola Futebol",
  className,
}: BrandCrestProps) {
  return (
    <span
      className={cn(styles.crest, size === "compact" && styles.compact, className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative ? true : undefined}
    >
      {/* Placeholder — ver nota acima sobre a pendência de direito de uso do
          asset real. Geometria decorativa (escudo + linha de meio-campo),
          não reproduz a arte de `logo.jpg`. */}
      <svg
        viewBox="0 0 48 56"
        className={styles.svg}
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M24 2 44 9v16c0 15-8.5 24.5-20 29C12.5 49.5 4 40 4 25V9Z"
          fill="var(--color-brand-navy)"
          stroke="var(--color-brand-gold)"
          strokeWidth="2"
        />
        <circle
          cx="24"
          cy="26"
          r="10"
          fill="none"
          stroke="var(--color-brand-gold)"
          strokeWidth="1.5"
        />
        <path d="M24 16v20M14 26h20" stroke="var(--color-brand-gold)" strokeWidth="1.5" />
      </svg>
    </span>
  );
}
