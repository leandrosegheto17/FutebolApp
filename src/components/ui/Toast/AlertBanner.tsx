import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Toast.module.css";
import type { ToastVariant } from "./ToastProvider";

export interface AlertBannerProps {
  variant: ToastVariant;
  children: ReactNode;
  className?: string;
}

/**
 * AlertBanner — variante não-flutuante de "Toast/Alert banner"
 * (UX-SPEC.md Seção 3.2), para avisos persistentes embutidos no fluxo da
 * tela (ex.: "já existe rodada nesta data" em T05, aviso de rate limit
 * genérico em T01). `danger` usa `role="alert"` (assertivo por padrão do
 * navegador); as demais variantes usam `role="status"` (polite) — mesmo
 * critério de `aria-live` do Toast (Seção 5.1, WCAG 4.1.3).
 */
export function AlertBanner({ variant, children, className }: AlertBannerProps) {
  const role = variant === "danger" ? "alert" : "status";
  return (
    <div role={role} className={cn(styles.banner, styles[variant], className)}>
      {children}
    </div>
  );
}
