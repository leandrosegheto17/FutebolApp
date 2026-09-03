import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { BottomTabBar, TopNav } from "./AppNav";

/**
 * `AppNav.module.css` alterna `BottomTabBar`/`TopNav` via `@media
 * (min-width: 640px)` real (Seção 6.1/6.2 do UX-SPEC.md) — CSS puro, sem
 * JS de resize (decisão documentada em `AppNav.tsx`). jsdom, porém, não
 * tem motor de layout e **não avalia condição de `@media` alguma** ao
 * calcular estilo computado (limitação conhecida do próprio jsdom, não do
 * componente nem de `window.matchMedia`) — na prática, só a regra
 * incondicional de cada seletor "vale" em teste (`.bottomTabBar` sempre
 * visível, `.topNav { display: none }` sempre aplicado, nunca substituído
 * pela regra dentro do `@media`). Resultado: em jsdom, `TopNav` sempre
 * herda `display:none` e some inteiro da árvore de acessibilidade — comportamento
 * correto de um elemento `display:none` (WCAG), não um bug do componente.
 * Para testar o conteúdo de `TopNav` isoladamente, mockamos o import do
 * CSS Module deste arquivo de teste (a real alternância responsiva já é
 * validada visualmente/manualmente, não é o que este teste unitário cobre).
 */
vi.mock("./AppNav.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop: string) => prop }),
}));

const items = [
  { href: "/atletas", label: "Atletas", active: true },
  { href: "/rodada", label: "Rodada" },
  { href: "/historico", label: "Histórico" },
  { href: "/times", label: "Times" },
  { href: "/restricoes", label: "Restrições" },
];

describe("BottomTabBar", () => {
  it("expõe nav com landmark rotulado e item ativo via aria-current (default, viewport base)", () => {
    render(<BottomTabBar items={items} />);
    expect(
      screen.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atletas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<BottomTabBar items={items} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TopNav", () => {
  it("renderiza links e botão de logout", async () => {
    const onLogout = vi.fn();
    render(<TopNav items={items} onLogout={onLogout} brand="Turma do Rola - Comary" />);
    expect(
      screen.getByRole("link", { name: "Turma do Rola - Comary" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<TopNav items={items} onLogout={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
