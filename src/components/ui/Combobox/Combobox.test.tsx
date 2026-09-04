import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Combobox } from "./Combobox";

const OPTIONS = [
  { value: "1", label: "João Pedro" },
  { value: "2", label: "Carlinhos" },
  { value: "3", label: "Rafa" },
];

describe("Combobox", () => {
  it("associa label ao campo (WCAG 1.3.1) com role=combobox", () => {
    render(<Combobox label="Atleta A" options={OPTIONS} value="" onChange={() => {}} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    expect(field).toHaveAttribute("aria-autocomplete", "list");
    expect(field).toHaveAttribute("aria-expanded", "false");
  });

  it("digitar filtra as opções por nome (tolerante a acento/caixa) e abre a lista", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Atleta A" options={OPTIONS} value="" onChange={() => {}} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    await user.type(field, "joao");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "João Pedro",
    ]);
  });

  it("clicar numa opção seleciona (commit) e fecha a lista", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox label="Atleta A" options={OPTIONS} value="" onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    await user.type(field, "carl");
    await user.click(screen.getByRole("option", { name: "Carlinhos" }));
    expect(onChange).toHaveBeenCalledWith("2");
    expect(field).toHaveValue("Carlinhos");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("navegação por teclado (ArrowDown + Enter) seleciona a opção destacada", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox label="Atleta A" options={OPTIONS} value="" onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    await user.click(field);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("2");
    expect(field).toHaveValue("Carlinhos");
  });

  it("digitar invalida a seleção anterior até uma nova escolha", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox label="Atleta A" options={OPTIONS} value="1" onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    await user.type(field, "x");
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("perder o foco sem seleção válida limpa o texto digitado (nunca um rótulo órfão)", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Atleta A" options={OPTIONS} value="" onChange={() => {}} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    await user.type(field, "xyz não existe");
    await user.tab();
    expect(field).toHaveValue("");
  });

  it("nenhuma opção corresponde ao texto digitado: mensagem de 'nenhum atleta encontrado'", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Atleta A" options={OPTIONS} value="" onChange={() => {}} />);
    const field = screen.getByRole("combobox", { name: "Atleta A" });
    await user.type(field, "zzz");
    expect(screen.getByText("Nenhum atleta encontrado")).toBeInTheDocument();
  });

  it("associa erro via aria-describedby e aria-invalid (WCAG 3.3.1/3.3.3)", () => {
    render(
      <Combobox
        label="Atleta B"
        options={OPTIONS}
        error="Escolha um atleta."
        value=""
        onChange={() => {}}
      />,
    );
    const field = screen.getByRole("combobox", { name: "Atleta B" });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha um atleta.");
  });

  it("estado disabled bloqueia interação", () => {
    render(
      <Combobox
        label="Atleta A"
        options={OPTIONS}
        disabled
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Atleta A" })).toBeDisabled();
  });

  it("reflete `value` pré-selecionado externamente (pré-preenchimento em edição)", () => {
    render(<Combobox label="Atleta A" options={OPTIONS} value="3" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Atleta A" })).toHaveValue("Rafa");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <Combobox
        label="Atleta A"
        options={OPTIONS}
        helpText="Digite o nome do atleta"
        value=""
        onChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
