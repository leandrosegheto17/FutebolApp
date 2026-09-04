import type { Metadata } from "next";
import { LancamentoRodadaForm } from "@/features/rodadas/LancamentoRodadaForm";

export const metadata: Metadata = {
  title: "Lançar rodada — Turma do Rola - Comary",
};

/** `/rodadas/nova` — T05 (lançamento de rodada, RF-02) — TASK.md FE-05. */
export default function NovaRodadaPage() {
  return <LancamentoRodadaForm />;
}
