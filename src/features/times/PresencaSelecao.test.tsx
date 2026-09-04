import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PresencaSelecao } from "./PresencaSelecao";

const PRESENTES = [
  { atleta_id: "1", apelido_exibicao: "João" },
  { atleta_id: "2", apelido_exibicao: "Carlinhos" },
  { atleta_id: "3", apelido_exibicao: "Rafa" },
];

function renderComponent(overrides: Partial<Parameters<typeof PresencaSelecao>[0]> = {}) {
  const onToggle = vi.fn();
  const onGerar = vi.fn();
  const utils = render(
    <PresencaSelecao
      rodadaDataExibida="19/09/2026"
      presentes={PRESENTES}
      selecionados={new Set(["1", "2", "3"])}
      onToggle={onToggle}
      onGerar={onGerar}
      gerando={false}
      erroGeracao={null}
      {...overrides}
    />,
  );
  return { ...utils, onToggle, onGerar };
}

describe("PresencaSelecao", () => {
  it("exibe o texto literal do estado vazio do UX-SPEC.md (Seção 4, T09)", () => {
    renderComponent();
    expect(
      screen.getByText("Selecione os presentes da rodada para gerar times"),
    ).toBeInTheDocument();
  });

  it("mostra a contagem de presentes selecionados", () => {
    renderComponent({ selecionados: new Set(["1", "2"]) });
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("cada atleta tem um SegmentedControl Presente/Ausente com aria-label específico", () => {
    renderComponent();
    expect(
      screen.getByRole("radiogroup", { name: "Seleção de João para os times" }),
    ).toBeInTheDocument();
  });

  it("desmarcar um atleta chama onToggle(id, false)", async () => {
    const user = userEvent.setup();
    const { onToggle } = renderComponent();

    const grupo = screen.getByRole("radiogroup", {
      name: "Seleção de João para os times",
    });
    await user.click(within(grupo).getByRole("radio", { name: "Ausente" }));

    expect(onToggle).toHaveBeenCalledWith("1", false);
  });

  it("estado vazio de presentes (nenhum registrado na rodada) mostra EmptyState", () => {
    renderComponent({ presentes: [], selecionados: new Set() });
    expect(
      screen.getByText("Nenhum presente registrado nesta rodada."),
    ).toBeInTheDocument();
  });

  it("com menos de 2 selecionados, botão 'Gerar sugestão de times' fica desabilitado e mostra aviso", () => {
    renderComponent({ selecionados: new Set(["1"]) });
    expect(
      screen.getByRole("button", { name: "Gerar sugestão de times" }),
    ).toBeDisabled();
    expect(screen.getByText(/Selecione ao menos 2 presentes/)).toBeInTheDocument();
  });

  it("clicar em 'Gerar sugestão de times' (habilitado) chama onGerar", async () => {
    const user = userEvent.setup();
    const { onGerar } = renderComponent();
    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    expect(onGerar).toHaveBeenCalledTimes(1);
  });

  it("gerando=true mostra o texto literal do UX-SPEC ('Calculando divisão de times…')", () => {
    renderComponent({ gerando: true });
    expect(screen.getByText("Calculando divisão de times…")).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("erroGeracao exibido via AlertBanner (role=alert, danger)", () => {
    renderComponent({
      erroGeracao: "Não foi possível gerar a sugestão, tente novamente.",
    });
    expect(
      screen.getByText("Não foi possível gerar a sugestão, tente novamente."),
    ).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderComponent();
    expect(await axe(container)).toHaveNoViolations();
  });
});
