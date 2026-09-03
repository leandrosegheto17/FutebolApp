"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/design-system/tokens";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}

/**
 * Skeleton — UX-SPEC.md Seção 3.2 (T02, T05, T06). Placeholder de
 * carregamento individual — decorativo, `aria-hidden` (a informação "está
 * carregando" é anunciada uma única vez pelo `SkeletonGroup` ao redor, não
 * repetida em cada barra). Sem "pulso" quando `prefers-reduced-motion`.
 */
export function Skeleton({ width, height = "1em", circle, className }: SkeletonProps) {
  const reducedMotion = prefersReducedMotion();
  const style: CSSProperties = {
    width: width ?? (circle ? height : "100%"),
    height,
    borderRadius: circle ? "50%" : undefined,
  };

  return (
    <span
      aria-hidden="true"
      className={cn(styles.bar, !reducedMotion && styles.pulse, className)}
      style={style}
    />
  );
}

/**
 * Agrupa múltiplos `Skeleton` sob um único anúncio de carregamento
 * (`role="status"`, WCAG 4.1.3) — evita que leitor de tela anuncie "carregando"
 * uma vez por barra.
 */
export function SkeletonGroup({
  label = "Carregando…",
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={cn(styles.group, className)}>
      {children}
    </div>
  );
}
