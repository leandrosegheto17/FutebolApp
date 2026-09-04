import type { Metadata } from "next";
import { HistoricoRodadasList } from "@/features/historico/HistoricoRodadasList";

export const metadata: Metadata = {
  title: "Histórico — Turma do Rola - Comary",
};

/** `/historico` — T06 (histórico de rodadas, RF-04) — TASK.md FE-06. */
export default function HistoricoPage() {
  return <HistoricoRodadasList />;
}
