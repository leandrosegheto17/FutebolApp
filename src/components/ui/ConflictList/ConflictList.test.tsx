import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ConflictList } from "./ConflictList";

const PARES = [
  { id: "r1", atletaANome: "João Pedro", atletaBNome: "Carlinhos", grupoConflito: 1 },
  { id: "r2", atletaANome: "Carlinhos", atletaBNome: "Marquinhos", grupoConflito: 1 },
];

const GRUPOS = [
  {
    grupoConflito: 1,
    mensagem:
      "Com 2 time(s) disponível(is), não é possível separar os 3 atletas deste grupo sem que alguma restrição obrigatória fique violada.",
  },
];

describe("ConflictList", () => {
  it("anuncia como alerta (role='alert') ao aparecer", () => {
    render(<ConflictList pares={PARES} grupos={GRUPOS} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("lista cada par com texto explicando o motivo (nunca só o ícone)", () => {
    render(<ConflictList pares={PARES} grupos={GRUPOS} />);
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent === "João Pedro ⚡ Carlinhos (não podem ficar juntos)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent === "Carlinhos ⚡ Marquinhos (não podem ficar juntos)",
      ),
    ).toBeInTheDocument();
  });

  it("agrupa por grupoConflito e exibe a mensagem do grupo quando `grupos` é fornecido", () => {
    render(<ConflictList pares={PARES} grupos={GRUPOS} />);
    expect(screen.getByText(/não é possível separar os 3 atletas/)).toBeInTheDocument();
  });

  it("sem `grupos`, exibe lista plana de pares sem lançar", () => {
    render(<ConflictList pares={PARES} />);
    expect(screen.getAllByText(/não podem ficar juntos/)).toHaveLength(2);
  });

  it("o ícone ⚡ é decorativo (aria-hidden), nunca a única pista do motivo", () => {
    const { container } = render(<ConflictList pares={PARES} grupos={GRUPOS} />);
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<ConflictList pares={PARES} grupos={GRUPOS} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
