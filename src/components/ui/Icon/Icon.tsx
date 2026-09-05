import type { SVGAttributes } from "react";
import { cn } from "@/lib/cn";
import styles from "./Icon.module.css";

/**
 * Glifos cobertos por este componente — UX-SPEC.md Parte II Seção 3.4:
 * apenas os emoji da Parte I **sem evidência direta no mockup real**. Os
 * cinco emoji confirmados no mockup (🥇🥈🥉 T02, ⚽🟨🟥 T05, 🔄✓ T09)
 * permanecem emoji reais, nunca migram para `Icon` (decisão final do
 * organizador, não uma escolha deste componente).
 */
export type IconName =
  "lock" | "alert-triangle" | "eye" | "eye-off" | "zap" | "more-vertical" | "menu";

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "name"> {
  name: IconName;
  /** Lado do glifo em px (largura = altura, ícone é sempre quadrado). */
  size?: number;
  className?: string;
  /**
   * Rótulo acessível. Quando ausente (caso mais comum — UX-SPEC.md exige
   * "sempre `aria-hidden=true` com texto/rótulo equivalente adjacente"), o
   * ícone é puramente decorativo e some da árvore de acessibilidade. Quando
   * fornecido, o ícone se torna a própria fonte da informação
   * (`role="img"`) — usar apenas quando não há texto adjacente equivalente.
   */
  "aria-label"?: string;
}

/**
 * Icon — UX-SPEC.md Parte II Seção 3.2/3.4 (novo, fundação FE-R00).
 *
 * Decisão de detalhe do Frontend (UX-SPEC.md delega a biblioteca exata):
 * SVG inline autoral por glifo, sem dependência de pacote externo (ex.:
 * Lucide/Feather) — evita superfície nova a auditar pelo DevSecOps para um
 * conjunto de 7 glifos geométricos simples, e mantém RNF-04 (custo mínimo).
 * `stroke="currentColor"` — o componente nunca define cor própria; herda a
 * cor de texto do contexto que o envolve, o que já satisfaz a regra de
 * contraste específica por superfície (claro vs. navy) sem precisar de uma
 * prop de cor dedicada — UX-SPEC.md Parte II Seção 5.4.
 */
export function Icon({
  name,
  size = 20,
  className,
  "aria-label": ariaLabel,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(styles.icon, className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
      {...rest}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const ICON_PATHS: Record<IconName, JSX.Element> = {
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </>
  ),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  "more-vertical": (
    <>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  menu: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </>
  ),
};
