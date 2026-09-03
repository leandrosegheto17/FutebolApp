import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { StepperCounter } from "./StepperCounter";

describe("StepperCounter", () => {
  it("expõe aria-label específico do campo e valor via spinbutton (default)", () => {
    render(<StepperCounter label="Gols de Carlinhos" value={1} onChange={() => {}} />);
    const spin = screen.getByRole("spinbutton", { name: "Gols de Carlinhos" });
    expect(spin).toHaveAttribute("aria-valuenow", "1");
  });

  it("botão de aumentar chama onChange com valor incrementado", async () => {
    const onChange = vi.fn();
    render(<StepperCounter label="Gols de Carlinhos" value={1} onChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Aumentar Gols de Carlinhos" }),
    );
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("botão de diminuir é desabilitado no valor mínimo", () => {
    render(
      <StepperCounter label="Gols de Carlinhos" value={0} min={0} onChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Diminuir Gols de Carlinhos" }),
    ).toBeDisabled();
  });

  it("estado disabled bloqueia os dois botões e o spinbutton", () => {
    render(
      <StepperCounter
        label="Gols de João Pedro"
        value={0}
        disabled
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Aumentar Gols de João Pedro" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Diminuir Gols de João Pedro" }),
    ).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toHaveAttribute("tabindex", "-1");
  });

  it("seta para cima incrementa via teclado", async () => {
    const onChange = vi.fn();
    render(<StepperCounter label="Cartões amarelos" value={0} onChange={onChange} />);
    screen.getByRole("spinbutton").focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <StepperCounter label="Gols de Carlinhos" value={1} onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
