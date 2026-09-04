import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { TrocarJogadorModal } from "./TrocarJogadorModal";
import type { AtletaMontado } from "./types";

function atleta(id: string, nome: string): AtletaMontado {
  return { atleta_id: id, apelido_exibicao: nome, nivel_tecnico: 5, idade: 20 };
}

describe("TrocarJogadorModal", () => {
  it("não renderiza nada quando open=false", () => {
    render(
      <TrocarJogadorModal
        open={false}
        atleta={atleta("1", "João")}
        candidatos={[]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("título pergunta 'Trocar {nome} com quem?' — RF-05.4/UX-SPEC.md 'trocar com quem?'", () => {
    render(
      <TrocarJogadorModal
        open
        atleta={atleta("1", "João")}
        candidatos={[{ atleta: atleta("2", "Carlinhos"), indiceTime: 1 }]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Trocar João com quem?" }),
    ).toBeInTheDocument();
  });

  it("lista candidatos como botões acessíveis por teclado (nunca só drag-and-drop)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TrocarJogadorModal
        open
        atleta={atleta("1", "João")}
        candidatos={[
          { atleta: atleta("2", "Carlinhos"), indiceTime: 1 },
          { atleta: atleta("3", "Rafa"), indiceTime: 1 },
        ]}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const botaoCarlinhos = screen.getByRole("button", { name: /Carlinhos/ });
    expect(botaoCarlinhos.tagName).toBe("BUTTON");
    await user.click(botaoCarlinhos);

    expect(onSelect).toHaveBeenCalledWith("2");
  });

  it("mostra o time de cada candidato", () => {
    render(
      <TrocarJogadorModal
        open
        atleta={atleta("1", "João")}
        candidatos={[{ atleta: atleta("2", "Carlinhos"), indiceTime: 1 }]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Time B")).toBeInTheDocument();
  });

  it("sem candidatos, mostra mensagem em vez de lista vazia sem explicação", () => {
    render(
      <TrocarJogadorModal
        open
        atleta={atleta("1", "João")}
        candidatos={[]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Nenhum outro atleta disponível para troca."),
    ).toBeInTheDocument();
  });

  it("Esc fecha o modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TrocarJogadorModal
        open
        atleta={atleta("1", "João")}
        candidatos={[{ atleta: atleta("2", "Carlinhos"), indiceTime: 1 }]}
        onClose={onClose}
        onSelect={vi.fn()}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <TrocarJogadorModal
        open
        atleta={atleta("1", "João")}
        candidatos={[{ atleta: atleta("2", "Carlinhos"), indiceTime: 1 }]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
