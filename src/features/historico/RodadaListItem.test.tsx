import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { RodadaListItem } from "./RodadaListItem";
import { excluirRodada } from "./historicoApi";
import type { RodadaHistoricoItem } from "./types";

vi.mock("./historicoApi", async () => {
  const actual = await vi.importActual<typeof import("./historicoApi")>("./historicoApi");
  return { ...actual, excluirRodada: vi.fn() };
});

const RODADA: RodadaHistoricoItem = {
  id: "rodada-1",
  data: "2026-09-05",
  status: "lancada",
  criado_em: "2026-09-05T20:00:00.000Z",
  presentes: 18,
};

function renderItem(
  onExcluida = vi.fn(),
  onSessionExpired = vi.fn(),
  rodada: RodadaHistoricoItem = RODADA,
) {
  return render(
    <ToastProvider>
      <ul>
        <RodadaListItem
          rodada={rodada}
          onExcluida={onExcluida}
          onSessionExpired={onSessionExpired}
        />
      </ul>
    </ToastProvider>,
  );
}

describe("RodadaListItem", () => {
  beforeEach(() => {
    vi.mocked(excluirRodada).mockReset();
  });

  it("mostra data formatada (DD/MM/AAAA) e contagem de presentes", () => {
    renderItem();
    expect(screen.getByText("05/09/2026")).toBeInTheDocument();
    expect(screen.getByText("18 presentes")).toBeInTheDocument();
    expect(screen.queryByText("Excluída")).not.toBeInTheDocument();
  });

  it("rodada excluída: exibe badge 'Excluída' (nunca escondida, nunca só cor)", () => {
    renderItem(vi.fn(), vi.fn(), { ...RODADA, status: "excluida" });
    expect(screen.getByText("05/09/2026")).toBeInTheDocument();
    expect(screen.getByText("Excluída")).toBeInTheDocument();
  });

  it("menu 'Corrigir' aponta para a rota reservada de T07 (ROUTES.corrigirRodada)", async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));

    expect(screen.getByRole("link", { name: "Corrigir" })).toHaveAttribute(
      "href",
      "/rodadas/rodada-1/corrigir",
    );
  });

  it("'Excluir rodada' no menu abre o modal de confirmação bloqueante", async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));
    await user.click(screen.getByRole("button", { name: "Excluir rodada" }));

    expect(
      screen.getByRole("heading", { name: "Excluir rodada 05/09/2026?" }),
    ).toBeInTheDocument();
  });

  it("confirmar exclusão chama DELETE e propaga onExcluida com a contagem real", async () => {
    vi.mocked(excluirRodada).mockResolvedValue({
      id: "rodada-1",
      data: "2026-09-05",
      status: "excluida",
      atletas_afetados: 18,
    });
    const user = userEvent.setup();
    const onExcluida = vi.fn();
    renderItem(onExcluida);

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));
    await user.click(screen.getByRole("button", { name: "Excluir rodada" }));
    await user.click(screen.getByRole("button", { name: "Sim, excluir e estornar" }));

    expect(excluirRodada).toHaveBeenCalledWith("rodada-1");
    expect(onExcluida).toHaveBeenCalledWith({ id: "rodada-1", atletasAfetados: 18 });
    expect(
      screen.queryByRole("heading", { name: "Excluir rodada 05/09/2026?" }),
    ).not.toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderItem();
    expect(await axe(container)).toHaveNoViolations();
  });
});
