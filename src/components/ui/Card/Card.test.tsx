import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Card, CardHeader, CardFooter } from "./Card";

describe("Card", () => {
  it("renderiza conteúdo como container simples (default, não interativo)", () => {
    render(<Card>Conteúdo do card</Card>);
    expect(screen.getByText("Conteúdo do card")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("com onClick, expõe role=button, é focável e responde a Enter/Espaço", async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Rodada 05/09/2026</Card>);
    const card = screen.getByRole("button", { name: "Rodada 05/09/2026" });
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("Header/Footer renderizam dentro do card", () => {
    render(
      <Card>
        <CardHeader>Título</CardHeader>
        <CardFooter>Rodapé</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Rodapé")).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<Card>Conteúdo</Card>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
