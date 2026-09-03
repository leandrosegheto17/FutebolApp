import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "lesionado", label: "Lesionado" },
];

describe("SegmentedControl", () => {
  it("expõe role=radiogroup e radio por opção (default)", () => {
    render(
      <SegmentedControl
        label="Presença de Carlinhos"
        options={options}
        value="presente"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "Presença de Carlinhos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Presente" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("clique seleciona a opção e dispara onChange", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Presença"
        options={options}
        value="presente"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Ausente" }));
    expect(onChange).toHaveBeenCalledWith("ausente");
  });

  it("navegação por seta move o foco entre as opções (roving tabindex)", async () => {
    render(
      <SegmentedControl
        label="Presença"
        options={options}
        value="presente"
        onChange={() => {}}
      />,
    );
    const presente = screen.getByRole("radio", { name: "Presente" });
    presente.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Ausente" })).toHaveFocus();
  });

  it("opção disabled não é selecionável e é anunciada como tal", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Eventos de João Pedro (ausente)"
        options={[{ value: "gol", label: "Gol", disabled: true }]}
        value={null}
        onChange={onChange}
      />,
    );
    const radio = screen.getByRole("radio", { name: "Gol" });
    expect(radio).toBeDisabled();
    await userEvent.click(radio);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <SegmentedControl
        label="Presença"
        options={options}
        value="presente"
        onChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
