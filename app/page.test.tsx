import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RankingPublicoPage, { metadata } from "./page";
import { fetchRankingPublico } from "@/features/ranking-publico/rankingApi";

vi.mock("@/features/ranking-publico/rankingApi", () => ({
  fetchRankingPublico: vi.fn(),
}));

describe("/ (T02 — Ranking Público)", () => {
  beforeEach(() => {
    vi.mocked(fetchRankingPublico).mockReset();
    vi.mocked(fetchRankingPublico).mockResolvedValue([]);
  });

  it("define um título de página específico (WCAG 2.4.2)", () => {
    expect(metadata.title).toBe("Ranking — Turma do Rola - Comary");
  });

  it("renderiza o shell público com a aba Ranking ativa", async () => {
    render(<RankingPublicoPage />);
    expect(screen.getByRole("tab", { name: "Ranking" })).toBeInTheDocument();
    expect(await screen.findByText("Nenhum atleta cadastrado ainda")).toBeInTheDocument();
  });
});
