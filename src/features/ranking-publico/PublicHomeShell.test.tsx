import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PublicHomeShell } from "./PublicHomeShell";
import { fetchRankingPublico } from "./rankingApi";

vi.mock("./rankingApi", () => ({
  fetchRankingPublico: vi.fn(),
}));

describe("PublicHomeShell", () => {
  beforeEach(() => {
    vi.mocked(fetchRankingPublico).mockReset();
    vi.mocked(fetchRankingPublico).mockResolvedValue([]);
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

  it("troca para a aba Presença Mensal (placeholder, FE-03 ainda não implementada)", async () => {
    render(<PublicHomeShell />);
    await userEvent.click(screen.getByRole("tab", { name: "Presença Mensal" }));
    expect(screen.getByText("Presença mensal em breve")).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<PublicHomeShell />);
    await screen.findByText("Nenhum atleta cadastrado ainda");
    expect(await axe(container)).toHaveNoViolations();
  });
});
