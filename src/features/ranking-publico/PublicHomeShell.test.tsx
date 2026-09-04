import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PublicHomeShell } from "./PublicHomeShell";
import { fetchRankingPublico } from "./rankingApi";
import { fetchPresencaMensal } from "@/features/presenca-mensal/presencaMensalApi";

vi.mock("./rankingApi", () => ({
  fetchRankingPublico: vi.fn(),
}));

vi.mock("@/features/presenca-mensal/presencaMensalApi", () => ({
  fetchPresencaMensal: vi.fn(),
}));

describe("PublicHomeShell", () => {
  beforeEach(() => {
    vi.mocked(fetchRankingPublico).mockReset();
    vi.mocked(fetchRankingPublico).mockResolvedValue([]);
    vi.mocked(fetchPresencaMensal).mockReset();
    vi.mocked(fetchPresencaMensal).mockResolvedValue([]);
  });

  it("mostra a aba Ranking selecionada por padrão e o link discreto de acesso interno", async () => {
    render(<PublicHomeShell />);

    expect(screen.getByRole("tab", { name: "Ranking" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Nenhum atleta cadastrado ainda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acesso interno" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("troca para a aba Presença Mensal (T03, FE-03) e carrega o conteúdo real", async () => {
    render(<PublicHomeShell />);
    await userEvent.click(screen.getByRole("tab", { name: "Presença Mensal" }));
    expect(
      await screen.findByText("Nenhuma rodada lançada neste mês"),
    ).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<PublicHomeShell />);
    await screen.findByText("Nenhum atleta cadastrado ainda");
    expect(await axe(container)).toHaveNoViolations();
  });
});
