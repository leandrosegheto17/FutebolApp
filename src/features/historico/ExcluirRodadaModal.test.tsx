import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { ExcluirRodadaModal } from "./ExcluirRodadaModal";
import { excluirRodada } from "./historicoApi";

vi.mock("./historicoApi", async () => {
  const actual = await vi.importActual<typeof import("./historicoApi")>("./historicoApi");
  return { ...actual, excluirRodada: vi.fn() };
});

function renderModal(overrides: Partial<Parameters<typeof ExcluirRodadaModal>[0]> = {}) {
  const onClose = vi.fn();
  const onExcluida = vi.fn();
  const onSessionExpired = vi.fn();
  const utils = render(
    <ToastProvider>
      <ExcluirRodadaModal
        open
        rodadaId="rodada-1"
        rodadaDataExibida="05/09/2026"
        onClose={onClose}
        onExcluida={onExcluida}
        onSessionExpired={onSessionExpired}
        {...overrides}
      />
    </ToastProvider>,
  );
  return { ...utils, onClose, onExcluida, onSessionExpired };
}

describe("ExcluirRodadaModal", () => {
  beforeEach(() => {
    vi.mocked(excluirRodada).mockReset();
  });

  it("não renderiza nada quando open=false", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explica o efeito de estorno em cascata antes de confirmar (RN-04) e foca 'Cancelar' por padrão", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Excluir rodada 05/09/2026?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/reverte automaticamente TODOS os pontos/),
    ).toBeInTheDocument();
    expect(screen.getByText(/não pode ser desfeita/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("'Cancelar' chama onClose sem chamar a API", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(excluirRodada).not.toHaveBeenCalled();
  });

  it("confirmação bem-sucedida: chama DELETE, mostra toast com a contagem real e propaga onExcluida", async () => {
    vi.mocked(excluirRodada).mockResolvedValue({
      id: "rodada-1",
      data: "2026-09-05",
      status: "excluida",
      atletas_afetados: 20,
    });
    const user = userEvent.setup();
    const { onExcluida } = renderModal();

    await user.click(screen.getByRole("button", { name: "Sim, excluir e estornar" }));

    expect(excluirRodada).toHaveBeenCalledWith("rodada-1");
    await screen.findByText("Rodada excluída — pontos revertidos para 20 atleta(s).");
    expect(onExcluida).toHaveBeenCalledWith({ id: "rodada-1", atletasAfetados: 20 });
  });

  it("erro (404/409/técnico): mesma mensagem genérica literal do UX-SPEC (T07) e fecha o modal", async () => {
    vi.mocked(excluirRodada).mockRejectedValue(new Error("Rodada não encontrada."));
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Sim, excluir e estornar" }));

    await screen.findByText(
      "Não foi possível aplicar a correção. Nenhuma alteração foi salva.",
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("401: chama onSessionExpired, não mostra toast de erro genérico", async () => {
    vi.mocked(excluirRodada).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    const { onSessionExpired } = renderModal();

    await user.click(screen.getByRole("button", { name: "Sim, excluir e estornar" }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(
        "Não foi possível aplicar a correção. Nenhuma alteração foi salva.",
      ),
    ).not.toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderModal();
    expect(await axe(container)).toHaveNoViolations();
  });
});
