import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { DateInput } from "./DateInput";

describe("DateInput", () => {
  it("associa label e aceita valor de data (default)", () => {
    render(<DateInput label="Data de nascimento" defaultValue="2000-05-10" />);
    const input = screen.getByLabelText("Data de nascimento") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "date");
    expect(input.value).toBe("2000-05-10");
  });

  it("estado de erro é anunciado e associado via aria-describedby", () => {
    render(<DateInput label="Data de nascimento" error="Data inválida" />);
    const input = screen.getByLabelText("Data de nascimento");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Data inválida");
  });

  it("estado disabled bloqueia edição", () => {
    render(<DateInput label="Data de nascimento" disabled />);
    expect(screen.getByLabelText("Data de nascimento")).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<DateInput label="Data de nascimento" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
