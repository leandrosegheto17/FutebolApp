import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { ParticipacaoCorrecaoRow } from "./ParticipacaoCorrecaoRow";
import { corrigirParticipacao, simularCorrecao } from "./correcaoApi";
import type { ParticipacaoDetalheItem, PreviewCorrecaoParticipacao } from "./types";

vi.mock("./correcaoApi", async () => {
  const actual = await vi.importActual<typeof import("./correcaoApi")>("./correcaoApi");
  return { ...actual, simularCorrecao: vi.fn(), corrigirParticipacao: vi.fn() };
});

const PARTICIPACAO: ParticipacaoDetalheItem = {
  atleta_id: "atleta-1",
  apelido_exibicao: "Carlinhos",
  status: "presente",
  eventos: [{ tipo: "gol", quantidade: 1 }],
  pontos_delta: 8,
};

const PREVIEW_AUSENTE: PreviewCorrecaoParticipacao = {
  atleta_id: "atleta-1",
  status_atual: "presente",
  eventos_atuais: [{ tipo: "gol", quantidade: 1 }],
  novo_status: "ausente",
  novos_eventos: [],
  pontos_antes: 8,
  pontos_depois: 0,
  pontos_delta: -8,
};

function renderRow(
  overrides: Partial<Parameters<typeof ParticipacaoCorrecaoRow>[0]> = {},
) {
  const onCorrigida = vi.fn();
  const onSessionExpired = vi.fn();
  const utils = render(
    <ToastProvider>
      <ul>
        <ParticipacaoCorrecaoRow
          rodadaId="rodada-1"
          participacao={PARTICIPACAO}
          onCorrigida={onCorrigida}
          onSessionExpired={onSessionExpired}
          {...overrides}
        />
      </ul>
    </ToastProvider>,
  );
  return { ...utils, onCorrigida, onSessionExpired };
}

describe("ParticipacaoCorrecaoRow", () => {
  beforeEach(() => {
    vi.mocked(simularCorrecao).mockReset();
    vi.mocked(corrigirParticipacao).mockReset();
  });

  it("renderiza o nome do atleta e o status atual pré-selecionado, sem preview inicial", () => {
    renderRow();

    expect(screen.getByText("Carlinhos")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Presente" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.queryByText(/Pré-visualização do impacto/)).not.toBeInTheDocument();
    expect(simularCorrecao).not.toHaveBeenCalled();
  });

  it("Confirmar Correção começa desabilitado antes de qualquer alteração", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "Confirmar Correção" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("alterar o status dispara o preview inline (BE-10) sem chamar o PATCH real", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));

    expect(simularCorrecao).toHaveBeenCalledWith("rodada-1", "atleta-1", {
      status: "ausente",
      eventos: [],
    });
    expect(corrigirParticipacao).not.toHaveBeenCalled();

    await screen.findByText(/Pré-visualização do impacto/);
    expect(screen.getByText("Presença")).toBeInTheDocument();
    expect(screen.getByText("-8 pts líquido")).toBeInTheDocument();
  });

  it("eventos bloqueados quando status vira ausente (RF-02.6)", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));

    expect(
      screen.getByText("Eventos bloqueados — atleta ausente (RF-02.6)"),
    ).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Gols de Carlinhos" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("Cancelar reverte para os valores originais e some com o preview, sem chamar a API de correção", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));
    await screen.findByText(/Pré-visualização do impacto/);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("radio", { name: "Presente" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.queryByText(/Pré-visualização do impacto/)).not.toBeInTheDocument();
    expect(corrigirParticipacao).not.toHaveBeenCalled();
  });

  it("Confirmar Correção chama o PATCH real com o cenário atual e propaga onCorrigida", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    vi.mocked(corrigirParticipacao).mockResolvedValue({
      atleta_id: "atleta-1",
      status: "ausente",
      eventos: [],
      pontos_delta: 0,
    });
    const user = userEvent.setup();
    const { onCorrigida } = renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));
    await screen.findByText(/Pré-visualização do impacto/);

    await user.click(screen.getByRole("button", { name: "Confirmar Correção" }));

    expect(corrigirParticipacao).toHaveBeenCalledWith("rodada-1", "atleta-1", {
      status: "ausente",
      eventos: [],
    });
    await screen.findByText("Correção aplicada, log de auditoria atualizado");
    expect(onCorrigida).toHaveBeenCalledTimes(1);
  });

  it("erro na confirmação: mensagem genérica literal do UX-SPEC (T07), nunca sugere salvamento parcial", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    vi.mocked(corrigirParticipacao).mockRejectedValue(
      new Error("Rodada não encontrada."),
    );
    const user = userEvent.setup();
    const { onCorrigida } = renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));
    await screen.findByText(/Pré-visualização do impacto/);
    await user.click(screen.getByRole("button", { name: "Confirmar Correção" }));

    await screen.findByText(
      "Não foi possível aplicar a correção. Nenhuma alteração foi salva.",
    );
    expect(onCorrigida).not.toHaveBeenCalled();
  });

  it("401 no preview: chama onSessionExpired, não mostra erro de preview", async () => {
    vi.mocked(simularCorrecao).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    const { onSessionExpired } = renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText("Não foi possível calcular a pré-visualização do impacto."),
    ).not.toBeInTheDocument();
  });

  it("401 na confirmação: chama onSessionExpired, não mostra toast de erro genérico", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    vi.mocked(corrigirParticipacao).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    const { onSessionExpired } = renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));
    await screen.findByText(/Pré-visualização do impacto/);
    await user.click(screen.getByRole("button", { name: "Confirmar Correção" }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(
        "Não foi possível aplicar a correção. Nenhuma alteração foi salva.",
      ),
    ).not.toBeInTheDocument();
  });

  it("falha ao calcular o preview mostra erro dedicado e mantém Confirmar desabilitado", async () => {
    vi.mocked(simularCorrecao).mockRejectedValue(new Error("falha técnica"));
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));

    await screen.findByText("Não foi possível calcular a pré-visualização do impacto.");
    expect(screen.getByRole("button", { name: "Confirmar Correção" })).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe) com preview visível", async () => {
    vi.mocked(simularCorrecao).mockResolvedValue(PREVIEW_AUSENTE);
    const user = userEvent.setup();
    const { container } = renderRow();

    await user.click(screen.getByRole("radio", { name: "Ausente" }));
    await screen.findByText(/Pré-visualização do impacto/);

    expect(await axe(container)).toHaveNoViolations();
  });
});
