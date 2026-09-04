import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { SubstituicoesModal } from "./SubstituicoesModal";
import { listarSubstituicoes, registrarSubstituicao } from "./substituicoesApi";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import type { Substituicao, TimeConfirmado } from "./types";
import type { Atleta } from "@/features/atletas/types";

vi.mock("./substituicoesApi", async () => {
  const actual =
    await vi.importActual<typeof import("./substituicoesApi")>("./substituicoesApi");
  return { ...actual, listarSubstituicoes: vi.fn(), registrarSubstituicao: vi.fn() };
});

vi.mock("@/features/atletas/atletasApi", () => ({ fetchAtletas: vi.fn() }));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => "/times",
}));

const TIME_A: TimeConfirmado = {
  time_id: "t1",
  label: "Time A",
  atletas: [
    { atleta_id: "1", apelido_exibicao: "João" },
    { atleta_id: "2", apelido_exibicao: "Carlinhos" },
  ],
};

const TIME_B: TimeConfirmado = {
  time_id: "t2",
  label: "Time B",
  atletas: [{ atleta_id: "3", apelido_exibicao: "Rafa" }],
};

function atleta(overrides: Partial<Atleta> = {}): Atleta {
  return {
    id: "4",
    nome_completo: "Bruno Souza",
    apelido_exibicao: "Bruno",
    contato: null,
    data_nascimento: null,
    consentimento_responsavel_obtido: false,
    pontuacao_inicial: 0,
    ativo: true,
    anonimizado_em: null,
    criado_em: "2026-09-01T00:00:00Z",
    nivel_tecnico: 5,
    rodadas_presentes: 3,
    ...overrides,
  };
}

function renderModal(overrides: Partial<Parameters<typeof SubstituicoesModal>[0]> = {}) {
  return render(
    <ToastProvider>
      <SubstituicoesModal
        open
        rodadaId="rodada-1"
        timeAtual={TIME_A}
        times={[TIME_A, TIME_B]}
        onClose={vi.fn()}
        {...overrides}
      />
    </ToastProvider>,
  );
}

describe("SubstituicoesModal (T11, FE-11)", () => {
  beforeEach(() => {
    vi.mocked(listarSubstituicoes).mockReset();
    vi.mocked(registrarSubstituicao).mockReset();
    vi.mocked(fetchAtletas).mockReset();
    replaceMock.mockReset();
  });

  it("mostra skeleton de carregamento e depois o formulário/lista vazia", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([atleta()]);
    renderModal();

    expect(
      screen.getByRole("status", { name: "Carregando substituições" }),
    ).toBeInTheDocument();
    await screen.findByText("Nenhuma substituição registrada nesta rodada");
  });

  it("título do modal reflete o time em contexto ('← Substituições — Time A')", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderModal();
    expect(
      await screen.findByRole("dialog", { name: "Substituições — Time A" }),
    ).toBeInTheDocument();
  });

  it("reforço textual: 'Substituição não altera pontos, apenas registro histórico' (RF-06.3)", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderModal();
    expect(
      screen.getByText("Substituição não altera pontos, apenas registro histórico."),
    ).toBeInTheDocument();
    // Aguarda o carregamento assentar antes do fim do teste (evita
    // atualização de estado fora de `act` depois que a asserção já rodou).
    await screen.findByText("Nenhuma substituição registrada nesta rodada");
  });

  it("'Sai' lista o roster ao vivo do time; 'Entra' lista todo atleta ativo (inclui o 'banco')", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([
      atleta({ id: "4", apelido_exibicao: "Bruno" }),
    ]);
    renderModal();

    await screen.findByLabelText("Sai");
    const saiSelect = screen.getByLabelText("Sai") as HTMLSelectElement;
    expect(
      within(saiSelect)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecione quem sai", "João", "Carlinhos"]);

    const entraSelect = screen.getByLabelText("Entra") as HTMLSelectElement;
    expect(
      within(entraSelect)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecione quem entra", "Bruno"]);
  });

  it("bloqueia de forma acessível selecionar o mesmo atleta em 'Sai' e 'Entra'", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([
      atleta({ id: "1", apelido_exibicao: "João" }),
    ]);
    const user = userEvent.setup();
    renderModal();

    await screen.findByLabelText("Sai");
    // "João" está nos dois seletores (roster do time + "ativos" — cenário
    // artificial só para exercitar o bloqueio; na prática o filtro de roster
    // já reduz a sobreposição, mas o bloqueio deve valer sempre).
    await user.selectOptions(screen.getByLabelText("Sai"), "1");
    await user.selectOptions(screen.getByLabelText("Entra"), "1");

    expect(
      screen.getByText("Escolha um atleta diferente do que já está saindo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar Substituição" })).toBeDisabled();
  });

  it("registra com sucesso: envia o corpo correto, atualiza a lista e limpa o formulário", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([atleta()]);
    const nova: Substituicao = {
      id: "sub-1",
      rodada_id: "rodada-1",
      time_id: "t1",
      atleta_sai_id: "1",
      atleta_sai_nome: "João",
      atleta_entra_id: "4",
      atleta_entra_nome: "Bruno",
      criado_em: "2026-09-19T21:00:00Z",
    };
    vi.mocked(registrarSubstituicao).mockResolvedValue(nova);
    const user = userEvent.setup();
    renderModal();

    await screen.findByLabelText("Sai");
    await user.selectOptions(screen.getByLabelText("Sai"), "1");
    await user.selectOptions(screen.getByLabelText("Entra"), "4");
    await user.click(screen.getByRole("button", { name: "Registrar Substituição" }));

    expect(registrarSubstituicao).toHaveBeenCalledWith("rodada-1", {
      time_id: "t1",
      atleta_sai_id: "1",
      atleta_entra_id: "4",
    });
    await screen.findByText("João ↔ Bruno (Time A)");
    expect(screen.getByLabelText("Sai")).toHaveValue("");
    expect(screen.getByLabelText("Entra")).toHaveValue("");
    await screen.findByText("Substituição registrada.");
  });

  it("'+ Registrar outra' está sempre disponível (RF-06.2 — sem limite de quantidade)", async () => {
    const existente: Substituicao = {
      id: "sub-0",
      rodada_id: "rodada-1",
      time_id: "t1",
      atleta_sai_id: "2",
      atleta_sai_nome: "Carlinhos",
      atleta_entra_id: "5",
      atleta_entra_nome: "Marcelo",
      criado_em: "2026-09-19T20:30:00Z",
    };
    vi.mocked(listarSubstituicoes).mockResolvedValue([existente]);
    vi.mocked(fetchAtletas).mockResolvedValue([atleta()]);
    renderModal();

    expect(
      await screen.findByRole("button", { name: "+ Registrar outra" }),
    ).toBeEnabled();
    expect(screen.getByText("Carlinhos ↔ Marcelo (Time A)")).toBeInTheDocument();
  });

  it("erro de registro mostra a mensagem literal do UX-SPEC.md", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([atleta()]);
    vi.mocked(registrarSubstituicao).mockRejectedValue(
      new Error(
        "Não foi possível registrar — verifique se o atleta já está em outro time.",
      ),
    );
    const user = userEvent.setup();
    renderModal();

    await screen.findByLabelText("Sai");
    await user.selectOptions(screen.getByLabelText("Sai"), "1");
    await user.selectOptions(screen.getByLabelText("Entra"), "4");
    await user.click(screen.getByRole("button", { name: "Registrar Substituição" }));

    await screen.findByText(
      "Não foi possível registrar — verifique se o atleta já está em outro time.",
    );
  });

  it("401 ao carregar aciona o fluxo de sessão expirada", async () => {
    vi.mocked(listarSubstituicoes).mockRejectedValue(new SessionExpiredError());
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderModal();

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("erro ao carregar mostra banner com retry", async () => {
    vi.mocked(listarSubstituicoes).mockRejectedValueOnce(new Error("falha técnica"));
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    const user = userEvent.setup();
    renderModal();

    await screen.findByText(
      "Não foi possível carregar as substituições agora. Tente novamente.",
    );

    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByText("Nenhuma substituição registrada nesta rodada");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    vi.mocked(listarSubstituicoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([atleta()]);
    const { container } = renderModal();
    await screen.findByLabelText("Sai");
    expect(await axe(container)).toHaveNoViolations();
  });
});
