import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PlayerChip } from "./PlayerChip";

describe("PlayerChip", () => {
  it("é um <button> real, focável nativamente (ADR-014)", () => {
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={vi.fn()}
      />,
    );
    const chip = screen.getByRole("button");
    expect(chip.tagName).toBe("BUTTON");
  });

  it("nome acessível inclui o nome e o nível técnico (dado real de RN-03)", () => {
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7.5}
        posicao="ATA"
        onClick={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Trocar Rodrigo, nível técnico 7,5" }),
    ).toBeInTheDocument();
  });

  it("nivelTecnico `null` (fallback) nunca inventa um número no rótulo acessível", () => {
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={null}
        posicao="ATA"
        onClick={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Trocar Rodrigo, nível técnico não disponível",
      }),
    ).toBeInTheDocument();
  });

  it("o rótulo de posição decorativo é texto visível normal, não aria-hidden (WCAG 1.1.1)", () => {
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("ATA")).toBeInTheDocument();
  });

  it("clique dispara onClick (abre o seletor modal 'trocar com quem?')", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={onClick}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("sem onDropAtleta, não é arrastável (DnD é atalho opcional, nunca obrigatório)", () => {
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("draggable", "false");
  });

  it("com onDropAtleta, é arrastável e soltar um id diferente chama onDropAtleta", () => {
    const onDropAtleta = vi.fn();
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={vi.fn()}
        onDropAtleta={onDropAtleta}
      />,
    );
    const chip = screen.getByRole("button");
    expect(chip).toHaveAttribute("draggable", "true");

    const dataTransfer = {
      getData: () => "2",
      setData: vi.fn(),
      dropEffect: "",
      effectAllowed: "",
    };
    const dropTarget = chip.closest("div")!;
    dropTarget.dispatchEvent(
      Object.assign(new Event("dragover", { bubbles: true, cancelable: true }), {
        dataTransfer,
      }),
    );
    dropTarget.dispatchEvent(
      Object.assign(new Event("drop", { bubbles: true, cancelable: true }), {
        dataTransfer,
      }),
    );

    expect(onDropAtleta).toHaveBeenCalledWith("2");
  });

  it("soltar o próprio id (arrastar sobre si mesmo) não chama onDropAtleta", () => {
    const onDropAtleta = vi.fn();
    render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={vi.fn()}
        onDropAtleta={onDropAtleta}
      />,
    );
    const chip = screen.getByRole("button");
    const dataTransfer = { getData: () => "1", setData: vi.fn() };
    const dropTarget = chip.closest("div")!;
    dropTarget.dispatchEvent(
      Object.assign(new Event("drop", { bubbles: true, cancelable: true }), {
        dataTransfer,
      }),
    );
    expect(onDropAtleta).not.toHaveBeenCalled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <PlayerChip
        atletaId="1"
        nome="Rodrigo"
        nivelTecnico={7}
        posicao="ATA"
        onClick={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
