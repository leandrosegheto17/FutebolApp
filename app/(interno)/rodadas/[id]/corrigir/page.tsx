import type { Metadata } from "next";
import { CorrecaoRodadaDetalhe } from "@/features/correcao-rodada/CorrecaoRodadaDetalhe";

export const metadata: Metadata = {
  title: "Corrigir rodada — Turma do Rola - Comary",
};

/**
 * `/rodadas/{id}/corrigir` — T07 (Correção/Estorno, detalhe de uma rodada,
 * RF-04) — TASK.md FE-07. Rota já reservada por `ROUTES.corrigirRodada` (FE-06).
 */
export default function CorrigirRodadaPage({ params }: { params: { id: string } }) {
  return <CorrecaoRodadaDetalhe rodadaId={params.id} />;
}
