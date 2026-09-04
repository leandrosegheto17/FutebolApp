import type { Metadata } from "next";
import { AtletasList } from "@/features/atletas/AtletasList";

export const metadata: Metadata = {
  title: "Atletas — Turma do Rola - Comary",
};

/**
 * `/atletas` — T04 (lista, ponto de entrada) — TASK.md FE-04. Server
 * Component fino: só existe para poder exportar `metadata`, delegando todo
 * estado a `AtletasList` (mesmo padrão de `app/page.tsx`, FE-02).
 */
export default function AtletasPage() {
  return <AtletasList />;
}
