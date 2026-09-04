import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { LogAuditoriaList } from "./LogAuditoriaList";
import { fetchLogAuditoria } from "./logAuditoriaApi";
import { buildLookupMaps } from "./enrichment";
import type { LogAuditoriaItem } from "./types";

vi.mock("./logAuditoriaApi", async () => {
  const actual =
    await vi.importActual<typeof import("./logAuditoriaApi")>("./logAuditoriaApi");
  return { ...actual, fetchLogAuditoria: vi.fn() };
});

vi.mock("./enrichment", () => ({ buildLookupMaps: vi.fn() }));

const replaceMock = vi.fn();
const routerMock = { push: vi.fn(), replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/historico/auditoria",
}));

const LOOKUPS = {
  rodadaData: new Map([
    ["rodada-1", "2026-09-05"],
    ["rodada-2", "2026-08-29"],
  ]),
  atletaNome: new Map([["atleta-1", "Carlinhos"]]),
};

const CORRECAO: LogAuditoriaItem = {
  id: "log-1",
  rodada_id: "rodada-1",
  atleta_id: "atleta-1",
  tipo_evento: "correcao",
  ocorrido_em: "2026-09-02T14:32:00.000Z",
  valores_antes: { status: "presente", eventos: [], pontos_acumulados: 10 },
  valores_depois: {
    status: "ausente",
    eventos: [],
    pontos_acumulados: 8,
    ajuste_aplicado: -2,
  },
};

const ESTORNO: LogAuditoriaItem = {
  id: "log-2",
  rodada_id: "rodada-2",
  atleta_id: null,
  tipo_evento: "estorno",
  ocorrido_em: "2026-09-01T09:10:00.000Z",
  valores_antes: { status: "lancada" },
  valores_depois: { status: "excluida", atletas_afetados: 20 },
};

const ANONIMIZACAO: LogAuditoriaItem = {
  id: "log-3",
  rodada_id: null,
  atleta_id: "atleta-1",
  tipo_evento: "anonimizacao",
  ocorrido_em: "2026-08-30T18:00:00.000Z",
  valores_antes: { nome_completo: "[REDACTED]" },
  valores_depois: { nome_completo: "Atleta anonimizado" },
};

function renderList() {
  return render(
    <ToastProvider>
      <LogAuditoriaList />
    </ToastProvider>,
  );
}

describe("LogAuditoriaList", () => {
  beforeEach(() => {
    vi.mocked(fetchLogAuditoria).mockReset();
    vi.mocked(buildLookupMaps).mockReset().mockResolvedValue(LOOKUPS);
    replaceMock.mockReset();
  });

  it("mostra o skeleton de carregamento antes da resposta chegar", async () => {
    let resolvePromise: (items: LogAuditoriaItem[]) => void = () => {};
    vi.mocked(fetchLogAuditoria).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    renderList();

    expect(
      screen.getByRole("status", { name: "Carregando log de auditoria" }),
    ).toBeInTheDocument();
    resolvePromise([]);
    await screen.findByText("Nenhuma correção registrada até agora");
  });

  it("estado vazio: 'Nenhuma correção registrada até agora' — e não busca enriquecimento", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([]);
    renderList();
    expect(
      await screen.findByText("Nenhuma correção registrada até agora"),
    ).toBeInTheDocument();
    expect(buildLookupMaps).not.toHaveBeenCalled();
  });

  it("estado de sucesso: ordena mais recente -> mais antigo mesmo se a API devolver fora de ordem", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([ANONIMIZACAO, CORRECAO, ESTORNO]);
    renderList();

    const titulos = await screen.findAllByText(/^(Rodada|Anonimização)/);
    expect(titulos.map((el) => el.textContent)).toEqual([
      "Rodada 05/09/2026 — correção",
      "Rodada 29/08/2026 — exclusão",
      "Anonimização de atleta",
    ]);
  });

  it("renderiza corretamente uma entrada de correção (diff + resumo)", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([CORRECAO]);
    renderList();

    await screen.findByText("Rodada 05/09/2026 — correção");
    expect(screen.getByText("Atleta: Carlinhos")).toBeInTheDocument();
    expect(screen.getByText("Presença")).toBeInTheDocument();
    expect(screen.getByText("Ajuste aplicado: -2 pts")).toBeInTheDocument();
  });

  it("renderiza corretamente uma entrada de exclusão (estorno) — sem subtítulo de atleta", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([ESTORNO]);
    renderList();

    await screen.findByText("Rodada 29/08/2026 — exclusão");
    expect(screen.getByText("(20 atletas afetados)")).toBeInTheDocument();
  });

  it("renderiza corretamente uma entrada de anonimização — diff nunca expõe o dado real, só 'Dado redigido' -> placeholder", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([ANONIMIZACAO]);
    renderList();

    await screen.findByText("Anonimização de atleta");
    expect(screen.getByText("Dado redigido")).toBeInTheDocument();
    expect(screen.getByText("Atleta anonimizado")).toBeInTheDocument();
  });

  it("nenhum estado da tela (vazio/carregando/erro/sucesso com os 3 tipos de evento) exibe qualquer campo de autor", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([CORRECAO, ESTORNO, ANONIMIZACAO]);
    renderList();

    await screen.findByText("Rodada 05/09/2026 — correção");
    expect(screen.queryByText(/autor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/organizador desconhecido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bsistema\b/i)).not.toBeInTheDocument();
  });

  it("estado de erro genérico: mensagem + botão de tentar novamente refaz a busca", async () => {
    vi.mocked(fetchLogAuditoria).mockRejectedValueOnce(new Error("falhou"));
    const user = userEvent.setup();
    renderList();

    expect(
      await screen.findByText("Não foi possível carregar o log"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/autor/i)).not.toBeInTheDocument();

    vi.mocked(fetchLogAuditoria).mockResolvedValueOnce([CORRECAO]);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Rodada 05/09/2026 — correção")).toBeInTheDocument();
  });

  it("401 na busca inicial: redireciona para o login (FE-12), sem mostrar mensagem de erro", async () => {
    vi.mocked(fetchLogAuditoria).mockRejectedValue(new SessionExpiredError());
    renderList();

    await screen.findByText("Log de Auditoria");
    expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fhistorico%2Fauditoria");
    expect(screen.queryByText("Não foi possível carregar o log")).not.toBeInTheDocument();
  });

  it("falha do enriquecimento (rodada/atleta) não quebra a tela — degrada para rótulo com id truncado", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([CORRECAO]);
    vi.mocked(buildLookupMaps).mockResolvedValue({
      rodadaData: new Map(),
      atletaNome: new Map(),
    });
    renderList();

    expect(await screen.findByText("Rodada #rodada-1 — correção")).toBeInTheDocument();
    expect(screen.getByText("Atleta: Atleta #atleta-1")).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso com os 3 tipos de evento", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([CORRECAO, ESTORNO, ANONIMIZACAO]);
    const { container } = renderList();
    await screen.findByText("Rodada 05/09/2026 — correção");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado vazio", async () => {
    vi.mocked(fetchLogAuditoria).mockResolvedValue([]);
    const { container } = renderList();
    await screen.findByText("Nenhuma correção registrada até agora");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado de erro", async () => {
    vi.mocked(fetchLogAuditoria).mockRejectedValue(new Error("falhou"));
    const { container } = renderList();
    await screen.findByText("Não foi possível carregar o log");
    expect(await axe(container)).toHaveNoViolations();
  });
});
