import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { EmptyState } from "./EmptyState";
import { Button } from "../Button/Button";

describe("EmptyState", () => {
  it("renderiza título e descrição (default)", () => {
    render(
      <EmptyState
        title="Nenhuma rodada lançada ainda"
        description="Lance a primeira rodada para começar o histórico."
      />,
    );
    expect(screen.getByText("Nenhuma rodada lançada ainda")).toBeInTheDocument();
    expect(
      screen.getByText("Lance a primeira rodada para começar o histórico."),
    ).toBeInTheDocument();
  });

  it("aceita call-to-action (botão) opcional", () => {
    render(
      <EmptyState
        title="Nenhuma restrição obrigatória cadastrada"
        action={<Button>Nova restrição</Button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Nova restrição" })).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <EmptyState title="Nenhum atleta cadastrado ainda" icon={<span>⚽</span>} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
