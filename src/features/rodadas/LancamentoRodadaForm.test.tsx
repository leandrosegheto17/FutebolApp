import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import type { Atleta } from "@/features/atletas/types";
import { LancamentoRodadaForm } from "./LancamentoRodadaForm";
import {
  RodadaDuplicidadeError,
  RodadaValidationError,
  lancarRodada,
  RODADA_SUBMIT_ERROR_MESSAGE,
} from "./rodadasApi";
import type { RodadaResponse } from "./types";

vi.mock("@/features/atletas/atletasApi", () => ({
  fetchAtletas: vi.fn(),
}));

vi.mock("./rodadasApi", async () => {
  const actual = await vi.importActual<typeof import("./rodadasApi")>("./rodadasApi");
  return {
    ...actual,
    lancarRodada: vi.fn(),
  };
});

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/rodadas/nova",
}));

function atleta(overrides: Partial<Atleta> = {}): Atleta {
  return {
    id: "atleta-1",
    nome_completo: "Carlinhos Silva",
    apelido_exibicao: "Carlinhos",
    contato: null,
    data_nascimento: "1990-01-01",
    consentimento_responsavel_obtido: false,
    pontuacao_inicial: 0,
    ativo: true,
    anonimizado_em: null,
    criado_em: "2026-01-01T00:00:00.000Z",
    nivel_tecnico: 2,
    rodadas_presentes: 5,
    ...overrides,
  };
}

const CARLINHOS = atleta();
const JOAO_PEDRO = atleta({
  id: "atleta-2",
  nome_completo: "João Pedro",
  apelido_exibicao: "João Pedro",
});

function renderForm() {
  return render(
    <ToastProvider>
      <LancamentoRodadaForm />
    </ToastProvider>,
  );
}

/** Preenche a data e abre o modal de confirmação final. */
async function abrirConfirmacao(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("Registro de presença");
  await user.type(screen.getByLabelText(/Data da rodada/), "2026-09-05");
  await user.click(screen.getByRole("button", { name: "Salvar rodada" }));
  return screen.findByRole("dialog", { name: "Confirmar lançamento da rodada" });
}

describe("LancamentoRodadaForm", () => {
  beforeEach(() => {
    vi.mocked(fetchAtletas).mockReset();
    vi.mocked(lancarRodada).mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("mostra skeleton de carregamento e depois a lista contínua com os atletas ativos", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    renderForm();

    expect(
      screen.getByRole("status", { name: "Carregando atletas" }),
    ).toBeInTheDocument();

    await screen.findByText("Registro de presença");
    expect(screen.getByText("Carlinhos")).toBeInTheDocument();
    expect(screen.getByText("João Pedro")).toBeInTheDocument();
  });

  it("filtra atletas inativos/anonimizados da lista de presença", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([
      CARLINHOS,
      atleta({
        id: "atleta-3",
        nome_completo: "Inativo",
        apelido_exibicao: "Inativo",
        ativo: false,
      }),
    ]);
    renderForm();

    await screen.findByText("Registro de presença");
    expect(screen.queryByText("Inativo")).not.toBeInTheDocument();
  });

  it("erro ao carregar atletas mostra alerta com opção de tentar novamente", async () => {
    vi.mocked(fetchAtletas).mockRejectedValue(new Error("falha de rede"));
    renderForm();

    expect(
      await screen.findByText(
        "Não foi possível carregar os atletas agora. Tente novamente.",
      ),
    ).toBeInTheDocument();

    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByText("Registro de presença");
  });

  it("401 ao carregar atletas aciona o redirecionamento de sessão expirada (FE-12)", async () => {
    vi.mocked(fetchAtletas).mockRejectedValue(new SessionExpiredError());
    renderForm();

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("nenhum atleta ativo: redireciona para T04 (novo atleta) com aviso, tratado como dependência (UX-SPEC.md Seção 4)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderForm();

    await waitFor(() => expect(pushMock).not.toHaveBeenCalled());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/atletas/novo"));
    expect(
      await screen.findByText(
        "Cadastre ao menos um atleta ativo antes de lançar uma rodada.",
      ),
    ).toBeInTheDocument();
  });

  it("Salvar rodada sem data preenchida mostra erro do campo e não abre o modal de confirmação", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Registro de presença");
    await user.click(screen.getByRole("button", { name: "Salvar rodada" }));

    expect(screen.getByText("Informe a data da rodada.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stat-tiles refletem a presença ao vivo conforme o SegmentedControl muda (UX-SPEC.md Parte II Seção 2.4)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Registro de presença");
    const resumo = screen.getByRole("group", { name: "Resumo da rodada" });
    const tilesIniciais = within(resumo)
      .getAllByText(/^\d+$/)
      .map((el) => el.textContent);
    expect(tilesIniciais).toEqual(["2", "0", "0", "2"]); // Presentes/Lesionados/Ausentes/Total

    const joaoGroup = screen.getByRole("radiogroup", { name: "Presença de João Pedro" });
    await user.click(within(joaoGroup).getByRole("radio", { name: "Ausente" }));

    // Agora 1 presente, 1 ausente.
    const tiles = within(resumo)
      .getAllByText(/^\d+$/)
      .map((el) => el.textContent);
    expect(tiles).toEqual(["1", "0", "1", "2"]); // Presentes/Lesionados/Ausentes/Total
  });

  it("eventos de atleta ausente ficam desabilitados (não escondidos) com texto explicativo (RF-02.6)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Registro de presença");
    const joaoGroup = screen.getByRole("radiogroup", { name: "Presença de João Pedro" });
    await user.click(within(joaoGroup).getByRole("radio", { name: "Ausente" }));

    // Nunca escondido: texto explicativo aparece, controles de evento somem
    // (mockup real: "ausente... sem linha de evento").
    expect(
      screen.getByText("Eventos bloqueados — atleta ausente (RF-02.6)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: "Gols de João Pedro" }),
    ).not.toBeInTheDocument();

    // Atleta presente permanece com controles habilitados.
    expect(
      screen.getByRole("spinbutton", { name: "Gols de Carlinhos" }),
    ).not.toHaveAttribute("aria-disabled");
    expect(
      screen.getByRole("button", { name: "Aumentar Gols de Carlinhos" }),
    ).toBeEnabled();
  });

  it("atleta lesionado mantém eventos habilitados — RF-02.3/RF-02.4/RF-02.5 exigem registro de gol/cartão até o momento da lesão (divergência do texto do mockup sinalizada em BLOCKERS.md, não reproduzida)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Registro de presença");
    const group = screen.getByRole("radiogroup", { name: "Presença de Carlinhos" });
    await user.click(within(group).getByRole("radio", { name: "Lesionado" }));

    expect(
      screen.queryByText("Eventos bloqueados — atleta ausente (RF-02.6)"),
    ).not.toBeInTheDocument();
    const golButton = screen.getByRole("button", { name: "Aumentar Gols de Carlinhos" });
    expect(golButton).toBeEnabled();
    await user.click(golButton);
    expect(screen.getByRole("spinbutton", { name: "Gols de Carlinhos" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });

  it("Salvar rodada abre o modal de confirmação com o resumo agregado (preserva a intenção de RNF-10)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Registro de presença");
    const joaoGroup = screen.getByRole("radiogroup", { name: "Presença de João Pedro" });
    await user.click(within(joaoGroup).getByRole("radio", { name: "Ausente" }));
    await user.click(screen.getByRole("button", { name: "Aumentar Gols de Carlinhos" }));
    await user.click(
      screen.getByRole("button", { name: "Aumentar Cartões amarelos de Carlinhos" }),
    );

    const dialog = await abrirConfirmacao(user);

    expect(within(dialog).getByText("Resumo da rodada 05/09/2026")).toBeInTheDocument();
    expect(
      within(dialog).getByText("1 presentes · 1 ausentes · 0 lesionados"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("1 gols · 1 cartões amarelos · 0 cartões vermelhos"),
    ).toBeInTheDocument();
  });

  it("cancelar o modal de confirmação fecha sem enviar nada", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    const user = userEvent.setup();
    renderForm();

    const dialog = await abrirConfirmacao(user);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(lancarRodada).not.toHaveBeenCalled();
  });

  it("confirmar dentro do modal dispara uma única transação atômica (um único POST) com loading explícito, bloqueando Cancelar durante o envio", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    let resolveLancar: (value: RodadaResponse) => void = () => {};
    vi.mocked(lancarRodada).mockReturnValue(
      new Promise<RodadaResponse>((resolve) => {
        resolveLancar = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();

    const dialog = await abrirConfirmacao(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar lançamento" }),
    );

    expect(
      within(dialog).getByRole("button", { name: "Confirmar lançamento" }),
    ).toHaveAttribute("aria-busy", "true");
    // Equivalente ao antigo "etapas anteriores bloqueadas para edição
    // durante o envio" do Stepper: sem etapas, o modal bloqueia a edição
    // por trás e "Cancelar" fica desabilitado.
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled();

    resolveLancar({
      id: "rodada-1",
      data: "2026-09-05",
      status: "lancada",
      criado_em: "2026-09-05T00:00:00.000Z",
      participacoes: [],
    });

    await waitFor(() => expect(lancarRodada).toHaveBeenCalledTimes(1));
    expect(lancarRodada).toHaveBeenCalledWith(
      expect.objectContaining({
        data: "2026-09-05",
        confirmar_duplicidade: false,
        participacoes: [
          {
            atleta_id: "atleta-1",
            status: "presente",
            eventos: [],
          },
          {
            atleta_id: "atleta-2",
            status: "presente",
            eventos: [],
          },
        ],
      }),
    );

    expect(await screen.findByText("Rodada lançada com sucesso")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/historico");
  });

  it("falha na transação: mensagem nunca sugere salvamento parcial (RNF-10) e o modal permanece aberto para nova tentativa", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    vi.mocked(lancarRodada).mockRejectedValue(
      new RodadaValidationError("Requisição inválida."),
    );
    const user = userEvent.setup();
    renderForm();

    const dialog = await abrirConfirmacao(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar lançamento" }),
    );

    expect(await screen.findByText(RODADA_SUBMIT_ERROR_MESSAGE)).toBeInTheDocument();
    expect(RODADA_SUBMIT_ERROR_MESSAGE).toContain("Nada foi salvo");
    expect(pushMock).not.toHaveBeenCalled();
    // Nada foi perdido: o modal continua aberto, pronto para nova tentativa.
    expect(
      screen.getByRole("dialog", { name: "Confirmar lançamento da rodada" }),
    ).toBeInTheDocument();
  });

  it("duplicidade (409): substitui o modal de confirmação pelo modal de duplicidade, foco inicial em Cancelar, e reenvia com confirmar_duplicidade ao confirmar (RF-02.8)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    vi.mocked(lancarRodada).mockRejectedValueOnce(
      new RodadaDuplicidadeError([
        { id: "rodada-existente", data: "2026-09-05", status: "lancada" },
      ]),
    );
    vi.mocked(lancarRodada).mockResolvedValueOnce({
      id: "rodada-1",
      data: "2026-09-05",
      status: "lancada",
      criado_em: "2026-09-05T00:00:00.000Z",
      participacoes: [],
    });
    const user = userEvent.setup();
    renderForm();

    const confirmDialog = await abrirConfirmacao(user);
    await user.click(
      within(confirmDialog).getByRole("button", { name: "Confirmar lançamento" }),
    );

    expect(
      screen.queryByRole("dialog", { name: "Confirmar lançamento da rodada" }),
    ).not.toBeInTheDocument();
    const dialog = await screen.findByRole("dialog", {
      name: "Já existe rodada nesta data",
    });
    expect(within(dialog).getByText("05/09/2026")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    );

    await user.click(within(dialog).getByRole("button", { name: "Lançar mesmo assim" }));

    await waitFor(() => expect(lancarRodada).toHaveBeenCalledTimes(2));
    expect(lancarRodada).toHaveBeenLastCalledWith(
      expect.objectContaining({ confirmar_duplicidade: true }),
    );
    expect(await screen.findByText("Rodada lançada com sucesso")).toBeInTheDocument();
  });

  it("cancelar o modal de duplicidade não reenvia a requisição", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    vi.mocked(lancarRodada).mockRejectedValueOnce(
      new RodadaDuplicidadeError([
        { id: "rodada-existente", data: "2026-09-05", status: "lancada" },
      ]),
    );
    const user = userEvent.setup();
    renderForm();

    const confirmDialog = await abrirConfirmacao(user);
    await user.click(
      within(confirmDialog).getByRole("button", { name: "Confirmar lançamento" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Já existe rodada nesta data",
    });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(lancarRodada).toHaveBeenCalledTimes(1);
  });

  it("401 ao confirmar: preserva o rascunho e aciona o redirecionamento de sessão expirada (FE-12)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    vi.mocked(lancarRodada).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    renderForm();

    const dialog = await abrirConfirmacao(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar lançamento" }),
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("sem violação de acessibilidade (axe) na lista contínua e nos dois modais", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    vi.mocked(lancarRodada).mockRejectedValueOnce(
      new RodadaDuplicidadeError([
        { id: "rodada-existente", data: "2026-09-05", status: "lancada" },
      ]),
    );
    const user = userEvent.setup();
    const { container } = renderForm();

    await screen.findByText("Registro de presença");
    expect(await axe(container)).toHaveNoViolations();

    const confirmDialog = await abrirConfirmacao(user);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(
      within(confirmDialog).getByRole("button", { name: "Confirmar lançamento" }),
    );
    await screen.findByRole("dialog", { name: "Já existe rodada nesta data" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
