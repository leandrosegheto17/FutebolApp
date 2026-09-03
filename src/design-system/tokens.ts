/**
 * Espelho em TypeScript dos tokens definidos em `tokens.css`
 * (UX-SPEC.md Seção 3.1), para uso em lógica de componente (não em CSS).
 * Mantido em sincronia manualmente com `tokens.css` — qualquer mudança de
 * valor deve ser refletida nos dois arquivos.
 */

export const breakpoints = {
  base: 0,
  sm: 640,
  lg: 1024,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const motionDuration = {
  fast: 150,
  base: 200,
  slow: 250,
} as const;

/**
 * Lê `prefers-reduced-motion` do sistema. Usado por componentes que animam
 * via JS (ex.: `Skeleton` decide não pulsar, `Toast`/`Modal` decidem não
 * fazer transição de entrada) — CSS já trata o caso via media query em
 * `tokens.css`, isto cobre o caso em que o componente decide **não iniciar**
 * a animação, não apenas encurtá-la.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
