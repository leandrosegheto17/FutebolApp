import type { Metadata } from "next";
import { PublicHomeShell } from "@/features/ranking-publico/PublicHomeShell";

// Título específico da tela (herda o restante de `app/layout.tsx`) — T02 é
// o ponto de entrada público (UX-SPEC.md Seção 1.2, site map).
export const metadata: Metadata = {
  title: "Ranking — Turma do Rola - Comary",
};

/**
 * `/` — T02 Ranking Público (entrada pública, sem autenticação — TASK.md
 * FE-02). Server Component fino: só existe para poder exportar `metadata`
 * (não pode conviver com "use client" no mesmo arquivo); toda a lógica de
 * estado (aba ativa, busca de dados) fica em `PublicHomeShell`/`RankingList`.
 */
export default function RankingPublicoPage() {
  return <PublicHomeShell />;
}
