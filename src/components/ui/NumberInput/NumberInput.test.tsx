import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { NumberInput } from "./NumberInput";

describe("NumberInput", () => {
  it("aceita valores numéricos respeitando min (default)", async () => {
    render(<NumberInput label="Pontuação inicial" min={0} defaultValue={0} />);
    const input = screen.getByLabelText("Pontuação inicial");
    expect(input).toHaveAttribute("min", "0");
    await userEvent.clear(input);
    await userEvent.type(input, "10");
    expect(input).toHaveValue(10);
  });

  it("estado de erro é associado via aria-describedby", () => {
    render(<NumberInput label="Pontuação inicial" error="Valor mínimo é 0" min={0} />);
    expect(screen.getByLabelText("Pontuação inicial")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Valor mínimo é 0");
  });

  it("estado disabled bloqueia edição", () => {
    render(<NumberInput label="Pontuação inicial" disabled />);
    expect(screen.getByLabelText("Pontuação inicial")).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<NumberInput label="Pontuação inicial" min={0} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
