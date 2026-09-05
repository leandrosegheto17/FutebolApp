import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { HistoricoRodadasList } from "./HistoricoRodadasList";
import { excluirRodada, listarRodadas } from "./historicoApi";
import type { RodadaHistoricoItem } from "./types";

vi.mock("./historicoApi", async () => {
  const actual = await vi.importActual<typeof import("./historicoApi")>("./historicoApi");
  return { ...actual, listarRodadas: vi.fn(), excluirRodada: vi.fn() };
});

const replaceMock = vi.fn();
const routerMock = { push: vi.fn(), replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/historico",
}));

const RODADA_1: RodadaHistoricoItem = {
  id: "rodada-1",
  data: "2026-09-19",
  status: "lancada",
  criado_em: "2026-09-19T20:00:00.000Z",
  presentes: 18,
  confronto: { colete: 62, sem_colete: 59 },
  status_correcao: "encerrada",
};
const RODADA_2: RodadaHistoricoItem = {
  id: "rodada-2",
  data: "2026-09-12",
  status: "lancada",
  criado_em: "2026-09-12T20:00:00.000Z",
  presentes: 15,
  confronto: null,
  status_correcao: "encerrada",
};
const RODADA_EXCLUIDA: RodadaHistoricoItem = {
  id: "rodada-3",
  data: "2026-09-05",
  status: "excluida",
  criado_em: "2026-09-05T20:00:00.000Z",
  presentes: 20,
  confronto: { colete: 49, sem_colete: 63 },
  status_correcao: "corrigida",
};

function renderList() {
  return render(
    <ToastProvider>
      <HistoricoRodadasList />
    </ToastProvider>,
  );
}

describe("HistoricoRodadasList", () => {
  beforeEach(() => {
    vi.mocked(listarRodadas).mockReset();
    vi.mocked(excluirRodada).mockReset();
    replaceMock.mockReset();
  });

  it("mostra o skeleton de carregamento antes da resposta chegar", async () => {
    let resolvePromise: (items: RodadaHistoricoItem[]) => void = () => {};
    vi.mocked(listarRodadas).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    renderList();

    expect(
      screen.getByRole("status", { name: "Carregando histórico" }),
    ).toBeInTheDocument();
    resolvePromise([]);
    await screen.findByText("Nenhuma rodada lançada ainda");
  });

  it("estado vazio: 'Nenhuma rodada lançada ainda'", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([]);
    renderList();
    expect(await screen.findByText("Nenhuma rodada lançada ainda")).toBeInTheDocument();
  });

  it("estado de sucesso: lista cronológica decrescente, mesmo se a API devolver fora de ordem", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA_2, RODADA_1]);
    renderList();

    const items = await screen.findAllByText(/presentes$/);
    expect(items[0]).toHaveTextContent("18 presentes");
    expect(items[1]).toHaveTextContent("15 presentes");
    expect(screen.getByText("19/09/2026")).toBeInTheDocument();
    expect(screen.getByText("12/09/2026")).toBeInTheDocument();
  });

  it("desempate de data civil (RF-02.8): mesma data, ordena por criado_em decrescente", async () => {
    const maisAntiga: RodadaHistoricoItem = {
      ...RODADA_1,
      id: "rodada-1a",
      criado_em: "2026-09-19T10:00:00.000Z",
      presentes: 10,
    };
    const maisRecente: RodadaHistoricoItem = {
      ...RODADA_1,
      id: "rodada-1b",
      criado_em: "2026-09-19T22:00:00.000Z",
      presentes: 20,
    };
    vi.mocked(listarRodadas).mockResolvedValue([maisAntiga, maisRecente]);
    renderList();

    const items = await screen.findAllByText(/presentes$/);
    expect(items[0]).toHaveTextContent("20 presentes");
    expect(items[1]).toHaveTextContent("10 presentes");
  });

  it("rodada excluída aparece na lista, nunca escondida, com badge distinguindo de uma rodada ativa", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA_1, RODADA_EXCLUIDA]);
    renderList();

    await screen.findByText("19/09/2026");
    expect(screen.getByText("05/09/2026")).toBeInTheDocument();
    expect(screen.getByText("Excluída")).toBeInTheDocument();
  });

  it("colunas 'Confronto'/'Status' (FE-R06/BE-R02): confronto formatado, placeholder '—' quando null, pill refletindo status_correcao", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA_1, RODADA_2, RODADA_EXCLUIDA]);
    renderList();

    await screen.findByText("19/09/2026");
    expect(screen.getByText("Colete 62 × 59 Sem Colete")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Confronto não disponível para esta rodada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Colete 49 × 63 Sem Colete")).toBeInTheDocument();
    expect(screen.getAllByText("Encerrada")).toHaveLength(2);
    expect(screen.getByText("Corrigida")).toBeInTheDocument();
  });

  it("estado de erro genérico: mensagem + botão de tentar novamente refaz a busca", async () => {
    vi.mocked(listarRodadas).mockRejectedValueOnce(new Error("falhou"));
    const user = userEvent.setup();
    renderList();

    expect(
      await screen.findByText("Não foi possível carregar o histórico"),
    ).toBeInTheDocument();

    vi.mocked(listarRodadas).mockResolvedValueOnce([RODADA_1]);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("19/09/2026")).toBeInTheDocument();
  });

  it("401 na busca inicial: redireciona para o login (FE-12), sem mostrar mensagem de erro", async () => {
    vi.mocked(listarRodadas).mockRejectedValue(new SessionExpiredError());
    renderList();

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fhistorico"),
    );
    expect(
      screen.queryByText("Não foi possível carregar o histórico"),
    ).not.toBeInTheDocument();
  });

  it("link 'Ver log de auditoria' é sempre visível, inclusive no estado de erro", async () => {
    vi.mocked(listarRodadas).mockRejectedValue(new Error("falhou"));
    renderList();

    await screen.findByText("Não foi possível carregar o histórico");
    expect(screen.getByRole("link", { name: "Ver log de auditoria" })).toHaveAttribute(
      "href",
      "/historico/auditoria",
    );
  });

  it("excluir uma rodada com sucesso remove o item da lista em memória", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA_1, RODADA_2]);
    vi.mocked(excluirRodada).mockResolvedValue({
      id: "rodada-1",
      data: "2026-09-19",
      status: "excluida",
      atletas_afetados: 18,
    });
    const user = userEvent.setup();
    renderList();

    await screen.findByText("19/09/2026");
    const menus = screen.getAllByRole("button", { name: /Mais ações/ });
    await user.click(menus[0]!);
    await user.click(screen.getByRole("button", { name: "Excluir rodada" }));
    await user.click(screen.getByRole("button", { name: "Sim, excluir e estornar" }));

    await waitFor(() => expect(screen.queryByText("19/09/2026")).not.toBeInTheDocument());
    expect(screen.getByText("12/09/2026")).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA_1]);
    const { container } = renderList();
    await screen.findByText("19/09/2026");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) com uma rodada excluída na lista", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA_1, RODADA_EXCLUIDA]);
    const { container } = renderList();
    await screen.findByText("Excluída");
    expect(await axe(container)).toHaveNoViolations();
  });
});
