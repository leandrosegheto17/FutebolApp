import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Badge.module.css";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  /** Ícone decorativo opcional — sempre acompanhado de `children` textual,
   * nunca a única forma de comunicar o status (WCAG 1.4.1). */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Badge/Tag — UX-SPEC.md Seção 3.2. Rótulo textual + cor, nunca só cor
 * (status de presença/cartões em T02/T05/T06).
 */
export function Badge({ variant = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[variant], className)}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
