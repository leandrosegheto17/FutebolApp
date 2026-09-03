import type { ElementType, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  onClick?: () => void;
  children: ReactNode;
}

/**
 * Card — UX-SPEC.md Seção 3.2. Substitui tabela densa em mobile (T02, T06,
 * T09). Quando a tela precisa de semântica de tabela real (ex.: T02 em
 * `lg`, Seção 5.1/6.2 do UX-SPEC.md: "usar <table>/<th scope=col> reais
 * mesmo quando visualmente exibida como card"), a tela correspondente (FE-02)
 * usa elementos de tabela nativos estilizados como card via CSS, não este
 * componente — `Card` aqui é o container genérico para os demais casos
 * (T06, T09), não uma alternativa a `<table>` para dado tabular público.
 */
export function Card({
  as: Tag = "div",
  onClick,
  className,
  children,
  onKeyDown,
  ...rest
}: CardProps) {
  const interactive = Boolean(onClick);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (interactive && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick?.();
    }
  }

  return (
    <Tag
      className={cn(styles.card, interactive && styles.interactive, className)}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.header, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.footer, className)} {...rest}>
      {children}
    </div>
  );
}
