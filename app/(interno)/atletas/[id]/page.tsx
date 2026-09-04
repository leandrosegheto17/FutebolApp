import type { Metadata } from "next";
import { AtletaForm } from "@/features/atletas/AtletaForm";

export const metadata: Metadata = {
  title: "Editar atleta — Turma do Rola - Comary",
};

/** `/atletas/{id}` — T04 (edição, RF-01.6, + anonimização, ADR-011) — TASK.md FE-04. */
export default function EditarAtletaPage({ params }: { params: { id: string } }) {
  return <AtletaForm atletaId={params.id} />;
}
