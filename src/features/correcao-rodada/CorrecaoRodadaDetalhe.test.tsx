import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { CorrecaoRodadaDetalhe } from "./CorrecaoRodadaDetalhe";
import { RodadaNaoEncontradaError, detalharRodada } from "./correcaoApi";
import { excluirRodada } from "@/features/historico/historicoApi";
import type { RodadaDetalhe, ParticipacaoDetalheItem } from "./types";

vi.mock("./correcaoApi", async () => {
  const actual = await vi.importActual<typeof import("./correcaoApi")>("./correcaoApi");
  return { ...actual, detalharRodada: vi.fn() };
});

vi.mock("@/features/historico/historicoApi", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/historico/historicoApi")
  >("@/features/historico/historicoApi");
  return { ...actual, excluirRodada: vi.fn() };
});

// Stub simples — a lógica interna de `ParticipacaoCorrecaoRow` (preview
// inline BE-10, confirmação PATCH BE-09) já é coberta isoladamente em
// `ParticipacaoCorrecaoRow.test.tsx`; aqui só interessa a integração
// (uma linha por participação + o retorno a T06 via `onCorrigida`).
vi.mock("./ParticipacaoCorrecaoRow", () => ({
  ParticipacaoCorrecaoRow: ({
    participacao,
    onCorrigida,
  }: {
    participacao: ParticipacaoDetalheItem;
    onCorrigida: () => void;
  }) => (
    <li>
      <span>{participacao.apelido_exibicao}</span>
      <button type="button" onClick={onCorrigida}>
        Simular confirmação de {participacao.apelido_exibicao}
      </button>
    </li>
  ),
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/rodadas/rodada-1/corrigir",
}));

const RODADA_LANCADA: RodadaDetalhe = {
  id: "rodada-1",
  data: "2026-09-05",
  status: "lancada",
  criado_em: "2026-09-05T20:00:00.000Z",
  participacoes: [
    {
      atleta_id: "atleta-1",
      apelido_exibicao: "Carlinhos",
      status: "presente",
      eventos: [{ tipo: "gol", quantidade: 1 }],
      pontos_delta: 8,
    },
  ],
};

const RODADA_EXCLUIDA: RodadaDetalhe = {
  ...RODADA_LANCADA,
  status: "excluida",
};

function renderTela() {
  return render(
    <ToastProvider>
      <CorrecaoRodadaDetalhe rodadaId="rodada-1" />
    </ToastProvider>,
  );
}

describe("CorrecaoRodadaDetalhe", () => {
  beforeEach(() => {
    vi.mocked(detalharRodada).mockReset();
    vi.mocked(excluirRodada).mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("mostra skeleton enquanto carrega e chama GET /api/rodadas/{id} (BE-16)", () => {
    vi.mocked(detalharRodada).mockReturnValue(new Promise(() => {}));
    renderTela();

    expect(screen.getByRole("status", { name: "Carregando rodada" })).toBeInTheDocument();
    expect(detalharRodada).toHaveBeenCalledWith("rodada-1");
  });

  it("sucesso: título com a data formatada e uma linha por participação", async () => {
    vi.mocked(detalharRodada).mockResolvedValue(RODADA_LANCADA);
    renderTela();

    expect(
      await screen.findByRole("heading", { name: "Corrigir rodada 05/09/2026" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Carlinhos")).toBeInTheDocument();
  });

  it("404 (rodada inexistente): mensagem dedicada, sem retry genérico escondendo o motivo", async () => {
    vi.mocked(detalharRodada).mockRejectedValue(new RodadaNaoEncontradaError());
    renderTela();

    expect(await screen.findByText("Rodada não encontrada.")).toBeInTheDocument();
  });

  it("erro técnico: mensagem genérica + retry recarrega", async () => {
    vi.mocked(detalharRodada).mockRejectedValueOnce(new Error("falha"));
    const user = userEvent.setup();
    renderTela();

    await screen.findByText("Não foi possível carregar o histórico");

    vi.mocked(detalharRodada).mockResolvedValueOnce(RODADA_LANCADA);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByRole("heading", { name: "Corrigir rodada 05/09/2026" }),
    ).toBeInTheDocument();
    expect(detalharRodada).toHaveBeenCalledTimes(2);
  });

  it("rodada já excluída: participações somente-leitura, sem controles de correção nem Zona de risco", async () => {
    vi.mocked(detalharRodada).mockResolvedValue(RODADA_EXCLUIDA);
    renderTela();

    await screen.findByText(/já foi excluída/);
    expect(screen.getByText("Carlinhos")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Simular confirmação/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Zona de risco")).not.toBeInTheDocument();
  });

  it("correção confirmada (via ParticipacaoCorrecaoRow) retorna a T06", async () => {
    vi.mocked(detalharRodada).mockResolvedValue(RODADA_LANCADA);
    const user = userEvent.setup();
    renderTela();

    await user.click(
      await screen.findByRole("button", { name: "Simular confirmação de Carlinhos" }),
    );

    expect(pushMock).toHaveBeenCalledWith("/historico");
  });

  it("Zona de risco abre o ExcluirRodadaModal reaproveitado de FE-06, com foco inicial em Cancelar", async () => {
    vi.mocked(detalharRodada).mockResolvedValue(RODADA_LANCADA);
    const user = userEvent.setup();
    renderTela();

    await user.click(await screen.findByRole("button", { name: "Excluir rodada" }));

    expect(
      screen.getByRole("heading", { name: "Excluir rodada 05/09/2026?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("exclusão confirmada retorna a T06 (histórico)", async () => {
    vi.mocked(detalharRodada).mockResolvedValue(RODADA_LANCADA);
    vi.mocked(excluirRodada).mockResolvedValue({
      id: "rodada-1",
      data: "2026-09-05",
      status: "excluida",
      atletas_afetados: 1,
    });
    const user = userEvent.setup();
    renderTela();

    await user.click(await screen.findByRole("button", { name: "Excluir rodada" }));
    await user.click(screen.getByRole("button", { name: "Sim, excluir e estornar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/historico"));
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso", async () => {
    vi.mocked(detalharRodada).mockResolvedValue(RODADA_LANCADA);
    const { container } = renderTela();

    await screen.findByRole("heading", { name: "Corrigir rodada 05/09/2026" });

    expect(await axe(container)).toHaveNoViolations();
  });
});
