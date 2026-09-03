import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { TextInput } from "./TextInput";

describe("TextInput", () => {
  it("associa label ao input (WCAG 1.3.1) e aceita digitação (default)", async () => {
    render(<TextInput label="Nome completo" />);
    const input = screen.getByLabelText("Nome completo");
    await userEvent.type(input, "Carlinhos");
    expect(input).toHaveValue("Carlinhos");
  });

  it("associa erro via aria-describedby e aria-invalid (WCAG 3.3.1/3.3.3)", () => {
    render(<TextInput label="Nome completo" error="Já existe um atleta com este nome" />);
    const input = screen.getByLabelText("Nome completo");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Já existe um atleta com este nome",
    );
  });

  it("estado disabled bloqueia edição", () => {
    render(<TextInput label="Nome completo" disabled />);
    expect(screen.getByLabelText("Nome completo")).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <TextInput label="Nome completo" helpText="Nome usado no cadastro" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
