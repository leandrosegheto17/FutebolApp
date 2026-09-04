import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Select } from "./Select";

const OPTIONS = [
  { value: "1", label: "João" },
  { value: "2", label: "Carlinhos" },
];

describe("Select", () => {
  it("associa label ao select (WCAG 1.3.1) e permite escolher uma opção", async () => {
    const onChange = vi.fn();
    render(<Select label="Sai" options={OPTIONS} value="" onChange={onChange} />);
    const select = screen.getByLabelText("Sai");
    await userEvent.selectOptions(select, "Carlinhos");
    expect(onChange).toHaveBeenCalled();
  });

  it("renderiza o placeholder como primeira opção desabilitada", () => {
    render(
      <Select
        label="Sai"
        options={OPTIONS}
        placeholder="Selecione quem sai"
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("option", { name: "Selecione quem sai" })).toBeDisabled();
  });

  it("associa erro via aria-describedby e aria-invalid (WCAG 3.3.1/3.3.3)", () => {
    render(
      <Select
        label="Entra"
        options={OPTIONS}
        error="Escolha um atleta diferente do que já está saindo."
        value=""
        onChange={() => {}}
      />,
    );
    const select = screen.getByLabelText("Entra");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha um atleta diferente do que já está saindo.",
    );
  });

  it("estado disabled bloqueia seleção", () => {
    render(
      <Select label="Sai" options={OPTIONS} disabled value="" onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Sai")).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <Select
        label="Sai"
        options={OPTIONS}
        helpText="Quem está deixando o time"
        value=""
        onChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
