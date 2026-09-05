import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError, takeUnsavedData } from "@/features/sessao";
import { AtletaForm } from "./AtletaForm";
import {
  AtletaDuplicidadeError,
  AtletaNaoEncontradoError,
  AtletaValidationError,
  anonimizarAtleta,
  createAtleta,
  fetchAtletaPorId,
  updateAtleta,
} from "./atletasApi";
import type { Atleta } from "./types";

vi.mock("./atletasApi", () => ({
  createAtleta: vi.fn(),
  updateAtleta: vi.fn(),
  fetchAtletaPorId: vi.fn(),
  anonimizarAtleta: vi.fn(),
  AtletaValidationError: class AtletaValidationError extends Error {
    detalhes: { path: PropertyKey[]; message: string }[];
    constructor(
      message: string,
      detalhes: { path: PropertyKey[]; message: string }[] = [],
    ) {
      super(message);
      this.name = "AtletaValidationError";
      this.detalhes = detalhes;
    }
  },
  AtletaDuplicidadeError: class AtletaDuplicidadeError extends Error {
    atletasDuplicados: { id: string; nome_completo: string }[];
    constructor(atletasDuplicados: { id: string; nome_completo: string }[]) {
      super("duplicidade");
      this.name = "AtletaDuplicidadeError";
      this.atletasDuplicados = atletasDuplicados;
    }
  },
  AtletaNaoEncontradoError: class AtletaNaoEncontradoError extends Error {},
  AtletaJaAnonimizadoError: class AtletaJaAnonimizadoError extends Error {},
  AtletaApiError: class AtletaApiError extends Error {},
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
// Referência estável entre renders — ver nota em AtletasList.test.tsx (evita
// laço infinito de re-render via identidade instável de `useRouter()`).
const routerMock = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/atletas/atleta-1",
}));

const ATLETA_ADULTO: Atleta = {
  id: "atleta-1",
  nome_completo: "Carlinhos Silva",
  apelido_exibicao: "Carlinhos",
  contato: "11999990000",
  data_nascimento: "1990-04-10",
  consentimento_responsavel_obtido: false,
  pontuacao_inicial: 10,
  ativo: true,
  anonimizado_em: null,
  criado_em: "2026-01-01T00:00:00.000Z",
  nivel_tecnico: 3.5,
  rodadas_presentes: 10,
};

function renderForm(atletaId?: string) {
  return render(
    <ToastProvider>
      <AtletaForm atletaId={atletaId} />
    </ToastProvider>,
  );
}

async function fillMinimalCreateForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nome completo/), "João Pedro");
  await user.type(screen.getByLabelText(/Data de nascimento/), "1990-05-20");
  const pontuacao = screen.getByLabelText(/Pontuação inicial/);
  await user.clear(pontuacao);
  await user.type(pontuacao, "5");
}

describe("AtletaForm — criação (núcleo)", () => {
  beforeEach(() => {
    vi.mocked(createAtleta).mockReset();
    vi.mocked(updateAtleta).mockReset();
    vi.mocked(fetchAtletaPorId).mockReset();
    vi.mocked(anonimizarAtleta).mockReset();
    pushMock.mockReset();
  });

  it("mostra o aviso de privacidade e não mostra nível técnico/zona de risco na criação", () => {
    renderForm();
    expect(screen.getByText(/Aviso de privacidade/)).toBeInTheDocument();
    expect(screen.queryByText(/Nível técnico/)).not.toBeInTheDocument();
    expect(screen.queryByText("Zona de risco")).not.toBeInTheDocument();
  });

  it("bloco de consentimento aparece quando a idade calculada é < 18 (RF-01.3) e some se a data mudar para adulto", async () => {
    const user = userEvent.setup();
    renderForm();

    const hoje = new Date();
    const anoMenor = hoje.getFullYear() - 10;
    await user.type(screen.getByLabelText(/Data de nascimento/), `${anoMenor}-01-01`);

    expect(await screen.findByText("⚠ Menor de 18 anos detectado")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Confirmo que o consentimento do responsável legal foi obtido",
      ),
    ).toBeInTheDocument();

    const dataInput = screen.getByLabelText(/Data de nascimento/);
    await user.clear(dataInput);
    const anoAdulto = hoje.getFullYear() - 30;
    await user.type(dataInput, `${anoAdulto}-01-01`);

    await waitFor(() =>
      expect(screen.queryByText("⚠ Menor de 18 anos detectado")).not.toBeInTheDocument(),
    );
  });

  it("bloco de consentimento fica dentro de uma região aria-live (anunciado, não só display condicional)", () => {
    const { container } = renderForm();
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("bloquear submit localmente quando menor sem consentimento marcado (defesa em profundidade)", async () => {
    const user = userEvent.setup();
    renderForm();

    const hoje = new Date();
    const anoMenor = hoje.getFullYear() - 10;
    await user.type(screen.getByLabelText(/Nome completo/), "Joãozinho");
    await user.type(screen.getByLabelText(/Data de nascimento/), `${anoMenor}-01-01`);
    await screen.findByText("⚠ Menor de 18 anos detectado");

    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    expect(
      await screen.findByText(
        "Consentimento do responsável legal é obrigatório para atletas menores de 18 anos (RF-01.3/RN-02).",
      ),
    ).toBeInTheDocument();
    expect(createAtleta).not.toHaveBeenCalled();
  });

  it("submete com sucesso: mostra toast e volta para a lista", async () => {
    vi.mocked(createAtleta).mockResolvedValue(ATLETA_ADULTO);
    const user = userEvent.setup();
    renderForm();

    await fillMinimalCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    await waitFor(() => expect(createAtleta).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Atleta salvo com sucesso")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/atletas");
  });

  it("duplicidade (409): abre modal de confirmação, foco inicial em Cancelar, e reenvia com confirmar_duplicidade ao confirmar", async () => {
    vi.mocked(createAtleta).mockRejectedValueOnce(
      new AtletaDuplicidadeError([{ id: "outro-id", nome_completo: "João Pedro" }]),
    );
    vi.mocked(createAtleta).mockResolvedValueOnce(ATLETA_ADULTO);
    const user = userEvent.setup();
    renderForm();

    await fillMinimalCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    const dialog = await screen.findByRole("dialog", { name: "Nome já cadastrado" });
    expect(within(dialog).getByText("João Pedro")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    );

    await user.click(within(dialog).getByRole("button", { name: "Salvar mesmo assim" }));

    await waitFor(() => expect(createAtleta).toHaveBeenCalledTimes(2));
    expect(createAtleta).toHaveBeenLastCalledWith(
      expect.objectContaining({ confirmar_duplicidade: true }),
    );
    expect(await screen.findByText("Atleta salvo com sucesso")).toBeInTheDocument();
  });

  it("cancelar o modal de duplicidade não reenvia a requisição", async () => {
    vi.mocked(createAtleta).mockRejectedValueOnce(
      new AtletaDuplicidadeError([{ id: "outro-id", nome_completo: "João Pedro" }]),
    );
    const user = userEvent.setup();
    renderForm();

    await fillMinimalCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    const dialog = await screen.findByRole("dialog", { name: "Nome já cadastrado" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createAtleta).toHaveBeenCalledTimes(1);
  });

  it("erro de validação do servidor (400) é exibido associado ao campo correspondente", async () => {
    vi.mocked(createAtleta).mockRejectedValue(
      new AtletaValidationError("Requisição inválida.", [
        {
          path: ["consentimento_responsavel_obtido"],
          message: "Consentimento do responsável legal é obrigatório.",
        },
      ]),
    );
    const user = userEvent.setup();
    renderForm();
    await fillMinimalCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    expect(
      await screen.findByText("Consentimento do responsável legal é obrigatório."),
    ).toBeInTheDocument();
  });

  it("401 ao salvar: preserva o rascunho e aciona o redirecionamento de sessão expirada (FE-12)", async () => {
    vi.mocked(createAtleta).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    renderForm();
    await fillMinimalCreateForm(user);
    await user.type(screen.getByLabelText("Contato"), "11988887777");
    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(
      screen.getByText("Sessão expirada, faça login novamente."),
    ).toBeInTheDocument();
  });

  it("401 ao salvar: rascunho preservado nunca inclui contato/data_nascimento (DEBT-10, SECURITY-REVIEW.md)", async () => {
    vi.mocked(createAtleta).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    renderForm();
    await fillMinimalCreateForm(user);
    await user.type(screen.getByLabelText("Contato"), "11988887777");
    await user.click(screen.getByRole("button", { name: "Salvar Atleta" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    const rascunho = takeUnsavedData<Record<string, unknown>>("/atletas/atleta-1");
    expect(rascunho).not.toBeNull();
    expect(rascunho).not.toHaveProperty("contato");
    expect(rascunho).not.toHaveProperty("data_nascimento");
    expect(rascunho).toMatchObject({ nome_completo: "João Pedro" });
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderForm();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AtletaForm — edição (nível técnico somente-leitura + zona de risco)", () => {
  beforeEach(() => {
    vi.mocked(createAtleta).mockReset();
    vi.mocked(updateAtleta).mockReset();
    vi.mocked(fetchAtletaPorId).mockReset();
    vi.mocked(anonimizarAtleta).mockReset();
    pushMock.mockReset();
  });

  it("mostra skeleton de carregamento e depois o formulário preenchido", async () => {
    vi.mocked(fetchAtletaPorId).mockResolvedValue(ATLETA_ADULTO);
    renderForm("atleta-1");

    expect(screen.getByRole("status", { name: "Carregando atleta" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Carlinhos Silva")).toBeInTheDocument();
  });

  it("nível técnico exibido como somente-leitura (nunca um campo de entrada, RF-01.4)", async () => {
    vi.mocked(fetchAtletaPorId).mockResolvedValue(ATLETA_ADULTO);
    renderForm("atleta-1");

    expect(await screen.findByText(/Nível técnico:/)).toBeInTheDocument();
    expect(screen.getByText("3.50")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nível técnico/)).not.toBeInTheDocument();
  });

  it("mostra a Zona de risco com o botão de solicitar anonimização", async () => {
    vi.mocked(fetchAtletaPorId).mockResolvedValue(ATLETA_ADULTO);
    renderForm("atleta-1");

    expect(await screen.findByText("Zona de risco")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Solicitar anonimização" }),
    ).toBeInTheDocument();
  });

  it("atleta não encontrado (404) mostra mensagem de erro", async () => {
    vi.mocked(fetchAtletaPorId).mockRejectedValue(new AtletaNaoEncontradoError());
    renderForm("id-inexistente");
    expect(await screen.findByText("Atleta não encontrado.")).toBeInTheDocument();
  });

  it("estado pós-anonimização: campos aria-readonly com placeholder, sem zona de risco nem botão salvar", async () => {
    const anonimizado: Atleta = {
      ...ATLETA_ADULTO,
      nome_completo: "Atleta anonimizado",
      apelido_exibicao: "Atleta #atleta-1",
      contato: null,
      data_nascimento: null,
      ativo: false,
      anonimizado_em: "2026-09-02T12:00:00.000Z",
    };
    vi.mocked(fetchAtletaPorId).mockResolvedValue(anonimizado);
    renderForm("atleta-1");

    expect(
      await screen.findByText(
        /Este atleta foi anonimizado em 02\/09\/2026 e está inativo\./,
      ),
    ).toBeInTheDocument();

    const nomeInput = screen.getByLabelText("Nome completo") as HTMLInputElement;
    expect(nomeInput).toHaveValue("Atleta anonimizado");
    expect(nomeInput).toHaveAttribute("aria-readonly", "true");
    expect(nomeInput).toHaveAttribute("readonly");

    const apelidoInput = screen.getByLabelText("Apelido de exibição") as HTMLInputElement;
    expect(apelidoInput).toHaveValue("Atleta #atleta-1");
    expect(apelidoInput).toHaveAttribute("aria-readonly", "true");

    const contatoInput = screen.getByLabelText("Contato") as HTMLInputElement;
    expect(contatoInput).toHaveValue("—");

    const dataInput = screen.getByLabelText("Data de nascimento") as HTMLInputElement;
    expect(dataInput).toHaveValue("—");

    expect(screen.getByText(/Pontuação\/histórico: preservados/)).toBeInTheDocument();

    expect(screen.queryByText("Zona de risco")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Salvar Atleta" }),
    ).not.toBeInTheDocument();
  });

  it("fluxo completo de anonimização a partir do formulário: sucesso muda a tela para o estado somente-leitura", async () => {
    vi.mocked(fetchAtletaPorId).mockResolvedValue(ATLETA_ADULTO);
    const anonimizado: Atleta = {
      ...ATLETA_ADULTO,
      nome_completo: "Atleta anonimizado",
      apelido_exibicao: "Atleta #atleta-1",
      contato: null,
      data_nascimento: null,
      ativo: false,
      anonimizado_em: "2026-09-02T12:00:00.000Z",
    };
    vi.mocked(anonimizarAtleta).mockResolvedValue(anonimizado);
    const user = userEvent.setup();
    renderForm("atleta-1");

    await screen.findByText("Zona de risco");
    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));
    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar anonimização" }));

    expect(await screen.findByText("Dados pessoais anonimizados")).toBeInTheDocument();
    expect(
      await screen.findByText(/Este atleta foi anonimizado em 02\/09\/2026/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Zona de risco")).not.toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe) no formulário de edição carregado", async () => {
    vi.mocked(fetchAtletaPorId).mockResolvedValue(ATLETA_ADULTO);
    const { container } = renderForm("atleta-1");
    await screen.findByText("Zona de risco");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado pós-anonimização", async () => {
    const anonimizado: Atleta = {
      ...ATLETA_ADULTO,
      nome_completo: "Atleta anonimizado",
      apelido_exibicao: "Atleta #atleta-1",
      contato: null,
      data_nascimento: null,
      ativo: false,
      anonimizado_em: "2026-09-02T12:00:00.000Z",
    };
    vi.mocked(fetchAtletaPorId).mockResolvedValue(anonimizado);
    const { container } = renderForm("atleta-1");
    await screen.findByText(/Este atleta foi anonimizado em/);
    expect(await axe(container)).toHaveNoViolations();
  });
});
