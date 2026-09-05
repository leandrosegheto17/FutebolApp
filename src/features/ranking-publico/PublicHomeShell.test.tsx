import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PublicHomeShell } from "./PublicHomeShell";
import { fetchRankingPublico } from "./rankingApi";
import { fetchRankingPublicoRecentes } from "./rankingRecentesApi";
import { fetchPresencaMensal } from "@/features/presenca-mensal/presencaMensalApi";

vi.mock("./rankingApi", () => ({
  fetchRankingPublico: vi.fn(),
}));

vi.mock("./rankingRecentesApi", () => ({
  fetchRankingPublicoRecentes: vi.fn(),
}));

vi.mock("@/features/presenca-mensal/presencaMensalApi", () => ({
  fetchPresencaMensal: vi.fn(),
}));

/**
 * `PublicHomeShell.module.css` esconde `.accessPill` (pill "Acesso interno"
 * do hero) via `@media (min-width: 1024px)` real — mesma limitação de jsdom
 * (não avalia `@media`) já documentada em `AppNav.test.tsx`/`RankingList.test.tsx`.
 * Mock do CSS Module para testar o link isoladamente; a alternância
 * responsiva real é validada visualmente, não por este teste unitário.
 */
vi.mock("./PublicHomeShell.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop: string) => prop }),
}));

describe("PublicHomeShell", () => {
  beforeEach(() => {
    vi.mocked(fetchRankingPublico).mockReset();
    vi.mocked(fetchRankingPublico).mockResolvedValue([]);
    vi.mocked(fetchRankingPublicoRecentes).mockReset();
    vi.mocked(fetchRankingPublicoRecentes).mockResolvedValue([]);
    vi.mocked(fetchPresencaMensal).mockReset();
    vi.mocked(fetchPresencaMensal).mockResolvedValue([]);
  });

  it("mostra o hero (BrandCrest + marca) e a aba Ranking selecionada por padrão", async () => {
    render(<PublicHomeShell />);

    expect(screen.getByRole("link", { name: /Turma do Rola — Comary/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("tab", { name: "Ranking" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Nenhum atleta cadastrado ainda")).toBeInTheDocument();
  });

  it("link discreto de acesso interno no rodapé (sempre presente, todo breakpoint)", async () => {
    render(<PublicHomeShell />);
    await screen.findByText("Nenhum atleta cadastrado ainda");
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Acesso interno" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("pill 'Acesso interno' do hero (desktop, UX-SPEC.md Seção 2.2) também aponta para /login", async () => {
    render(<PublicHomeShell />);
    await screen.findByText("Nenhum atleta cadastrado ainda");
    const hero = screen.getByRole("banner");
    expect(within(hero).getByRole("link", { name: "Acesso interno" })).toHaveAttribute(
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
