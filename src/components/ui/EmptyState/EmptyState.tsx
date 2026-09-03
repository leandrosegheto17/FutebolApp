import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Ilustração/ícone decorativo — sempre acompanhado de `title` textual
   * (WCAG 1.1.1), nunca a tela some sem explicação. */
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState — UX-SPEC.md Seção 3.2 (T02, T03, T06, T08, T09, T10).
 * Ilustração textual + call-to-action, nunca uma tela em branco sem
 * explicação.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(styles.wrapper, className)}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  );
}
