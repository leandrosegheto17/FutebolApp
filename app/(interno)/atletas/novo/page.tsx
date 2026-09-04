import type { Metadata } from "next";
import { AtletaForm } from "@/features/atletas/AtletaForm";

export const metadata: Metadata = {
  title: "Novo atleta — Turma do Rola - Comary",
};

/** `/atletas/novo` — T04 (criação, RF-01.1) — TASK.md FE-04. */
export default function NovoAtletaPage() {
  return <AtletaForm />;
}
