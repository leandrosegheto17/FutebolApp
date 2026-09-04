import type { Metadata } from "next";
import { RestricoesList } from "@/features/restricoes/RestricoesList";

export const metadata: Metadata = {
  title: "Restrições — Turma do Rola - Comary",
};

/**
 * `/restricoes` — T10 (Gestão de Restrições Obrigatórias, RF-05.5) — TASK.md
 * FE-10. Server Component fino: só existe para poder exportar `metadata`,
 * delegando todo estado a `RestricoesList` (mesmo padrão de
 * `app/(interno)/atletas/page.tsx`/`app/(interno)/times/page.tsx`, FE-04/FE-09).
 */
export default function RestricoesPage() {
  return <RestricoesList />;
}
