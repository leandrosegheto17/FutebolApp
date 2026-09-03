import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Tabs } from "./Tabs";

const items = [
  { value: "ranking", label: "Ranking", panel: <p>Lista de ranking</p> },
  { value: "presenca", label: "Presença Mensal", panel: <p>Lista de presença</p> },
];

describe("Tabs", () => {
  it("expõe tablist/tab/tabpanel e mostra o painel ativo (default)", () => {
    render(
      <Tabs
        label="Navegação pública"
        items={items}
        value="ranking"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("tablist", { name: "Navegação pública" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ranking" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Lista de ranking")).toBeVisible();
  });

  it("clique em outra aba dispara onChange", async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="Navegação pública"
        items={items}
        value="ranking"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Presença Mensal" }));
    expect(onChange).toHaveBeenCalledWith("presenca");
  });

  it("seta direita move o foco e seleciona a próxima aba", async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="Navegação pública"
        items={items}
        value="ranking"
        onChange={onChange}
      />,
    );
    screen.getByRole("tab", { name: "Ranking" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("presenca");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <Tabs
        label="Navegação pública"
        items={items}
        value="ranking"
        onChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
