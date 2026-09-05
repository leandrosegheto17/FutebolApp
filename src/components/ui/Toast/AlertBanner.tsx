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
 *
 * **Auditoria FE-R12 (TASK.md Parte II, Seção 3.2)**: este componente sempre
 * renderiza sobre seu próprio fundo opaco (`--color-{variant}-bg`, claro em
 * todas as 4 variantes — ver `Toast.module.css`), nunca diretamente sobre
 * `--color-brand-navy`. O anel de foco padrão (`--color-focus-ring`, verde,
 * `app/globals.css`) permanece correto aqui — a regra de
 * `--color-focus-ring-on-dark` (UX-SPEC.md Parte II Seção 5.3, regra 2) só se
 * aplica quando o elemento é composto diretamente sobre chrome navy, o que
 * não é o caso deste componente. Se um uso futuro vier a remover o fundo
 * opaco da variante (ex.: uma versão "ghost" transparente dentro de um hero
 * navy), este comentário deixa de valer e o par precisa ser recalculado.
 */
export function AlertBanner({ variant, children, className }: AlertBannerProps) {
  const role = variant === "danger" ? "alert" : "status";
  return (
    <div role={role} className={cn(styles.banner, styles[variant], className)}>
      {children}
    </div>
  );
}
