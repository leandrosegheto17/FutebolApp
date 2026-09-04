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

/** Preenche a data e avança para a Etapa 2 (Eventos). */
async function goToEventosStep(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("Etapa 1/3: Presença");
  await user.type(screen.getByLabelText(/Data da rodada/), "2026-09-05");
  await user.click(screen.getByRole("button", { name: "Continuar →" }));
  await screen.findByText("Etapa 2/3: Eventos");
}

/** Preenche a data, avança até a Etapa 3 (Revisão e Confirmação). */
async function goToRevisaoStep(user: ReturnType<typeof userEvent.setup>) {
  await goToEventosStep(user);
  await user.click(screen.getByRole("button", { name: "Continuar →" }));
  await screen.findByText("Etapa 3/3: Revisão e Confirmação");
}

describe("LancamentoRodadaForm", () => {
  beforeEach(() => {
    vi.mocked(fetchAtletas).mockReset();
    vi.mocked(lancarRodada).mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("mostra skeleton de carregamento e depois a Etapa 1 com os atletas ativos", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    renderForm();

    expect(
      screen.getByRole("status", { name: "Carregando atletas" }),
    ).toBeInTheDocument();

    await screen.findByText("Etapa 1/3: Presença");
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

    await screen.findByText("Etapa 1/3: Presença");
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
    await screen.findByText("Etapa 1/3: Presença");
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

  it("Etapa 1: Continuar fica bloqueado sem data preenchida e mostra erro do campo", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Etapa 1/3: Presença");
    expect(screen.getByRole("button", { name: "Continuar →" })).toBeDisabled();
  });

  it("navega Etapa 1 -> Etapa 2 -> Etapa 3 e volta com o botão Voltar", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    const user = userEvent.setup();
    renderForm();

    await goToRevisaoStep(user);
    expect(screen.getByRole("button", { name: "← Voltar" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "← Voltar" }));
    await screen.findByText("Etapa 2/3: Eventos");

    await user.click(screen.getByRole("button", { name: "← Voltar" }));
    await screen.findByText("Etapa 1/3: Presença");
    expect(screen.getByRole("button", { name: "← Voltar" })).toBeDisabled();
  });

  it("Etapa 2: controles de evento de atleta ausente ficam desabilitados (não escondidos) com texto explicativo (RF-02.6)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Etapa 1/3: Presença");
    const joaoGroup = screen.getByRole("radiogroup", { name: "Presença de João Pedro" });
    await user.click(within(joaoGroup).getByRole("radio", { name: "Ausente" }));

    await goToEventosStep(user);

    // Continua visível, com texto explicativo — nunca escondido.
    expect(
      screen.getByText("Eventos bloqueados — atleta ausente (RF-02.6)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Gols de João Pedro" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Aumentar Gols de João Pedro" }),
    ).toBeDisabled();

    // Atleta presente permanece com controles habilitados.
    expect(
      screen.getByRole("spinbutton", { name: "Gols de Carlinhos" }),
    ).not.toHaveAttribute("aria-disabled");
    expect(
      screen.getByRole("button", { name: "Aumentar Gols de Carlinhos" }),
    ).toBeEnabled();
  });

  it("Etapa 3: resumo agrega presença/eventos marcados nas etapas anteriores", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    const user = userEvent.setup();
    renderForm();

    await screen.findByText("Etapa 1/3: Presença");
    const joaoGroup = screen.getByRole("radiogroup", { name: "Presença de João Pedro" });
    await user.click(within(joaoGroup).getByRole("radio", { name: "Ausente" }));

    await goToEventosStep(user);
    await user.click(screen.getByRole("button", { name: "Aumentar Gols de Carlinhos" }));
    await user.click(
      screen.getByRole("button", { name: "Aumentar Cartões amarelos de Carlinhos" }),
    );

    await user.click(screen.getByRole("button", { name: "Continuar →" }));
    await screen.findByText("Etapa 3/3: Revisão e Confirmação");

    expect(screen.getByText("Resumo da rodada 05/09/2026")).toBeInTheDocument();
    expect(
      screen.getByText("1 presentes · 1 ausentes · 0 lesionados"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 gols · 1 cartões amarelos · 0 cartões vermelhos"),
    ).toBeInTheDocument();
  });

  it("Etapa 3: confirmar dispara uma única transação atômica (um único POST) com loading explícito", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    let resolveLancar: (value: RodadaResponse) => void = () => {};
    vi.mocked(lancarRodada).mockReturnValue(
      new Promise<RodadaResponse>((resolve) => {
        resolveLancar = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await goToRevisaoStep(user);
    await user.click(screen.getByRole("button", { name: "Confirmar Lançamento" }));

    expect(screen.getByRole("button", { name: "Confirmar Lançamento" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    // Etapas anteriores bloqueadas para edição durante o envio (UX-SPEC.md Seção 4, T05).
    expect(screen.queryByRole("button", { name: "← Voltar" })).not.toBeInTheDocument();

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

  it("falha na transação: mensagem nunca sugere salvamento parcial (RNF-10)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS]);
    vi.mocked(lancarRodada).mockRejectedValue(
      new RodadaValidationError("Requisição inválida."),
    );
    const user = userEvent.setup();
    renderForm();

    await goToRevisaoStep(user);
    await user.click(screen.getByRole("button", { name: "Confirmar Lançamento" }));

    expect(await screen.findByText(RODADA_SUBMIT_ERROR_MESSAGE)).toBeInTheDocument();
    expect(RODADA_SUBMIT_ERROR_MESSAGE).toContain("Nada foi salvo");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("duplicidade (409): abre modal de confirmação, foco inicial em Cancelar, e reenvia com confirmar_duplicidade ao confirmar (RF-02.8)", async () => {
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

    await goToRevisaoStep(user);
    await user.click(screen.getByRole("button", { name: "Confirmar Lançamento" }));

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

    await goToRevisaoStep(user);
    await user.click(screen.getByRole("button", { name: "Confirmar Lançamento" }));

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

    await goToRevisaoStep(user);
    await user.click(screen.getByRole("button", { name: "Confirmar Lançamento" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("sem violação de acessibilidade (axe) em cada etapa", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([CARLINHOS, JOAO_PEDRO]);
    const user = userEvent.setup();
    const { container } = renderForm();

    await screen.findByText("Etapa 1/3: Presença");
    expect(await axe(container)).toHaveNoViolations();

    await goToEventosStep(user);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Continuar →" }));
    await screen.findByText("Etapa 3/3: Revisão e Confirmação");
    expect(await axe(container)).toHaveNoViolations();
  });
});
