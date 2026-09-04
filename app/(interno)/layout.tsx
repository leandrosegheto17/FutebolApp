import type { ReactNode } from "react";
import { InternalShell } from "@/features/shell/InternalShell";

/**
 * Layout da área interna (UX-SPEC.md Seção 1.2/1.3/3.2) — grupo de rota
 * `(interno)` (não afeta a URL, `app/(interno)/atletas` continua servindo
 * `/atletas`), montado por FE-04 como primeira tela interna real desta
 * trilha de execução (decisão já antecipada por FE-12 — "só a primeira
 * tela interna real tem contexto para decidir isso").
 *
 * `InternalShell` (client component) concentra a navegação fixa
 * (`AppNav`) e `SessionExpiryStatus` (montado uma única vez, nunca por
 * tela — GUARDRAILS.md regra 31); este arquivo permanece Server Component
 * só para poder crescer com metadata/data-fetching de layout no futuro sem
 * precisar de "use client" na raiz do grupo de rota.
 */
export default function InternalLayout({ children }: { children: ReactNode }) {
  return <InternalShell>{children}</InternalShell>;
}
