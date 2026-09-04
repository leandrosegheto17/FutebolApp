import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError } from "@/features/sessao";
import { MontagemTimesShell } from "./MontagemTimesShell";
import {
  RodadaNaoEncontradaError,
  SubstituicaoExistenteError,
  TimesApiError,
  TimesFalhaTecnicaError,
  buscarPresentesDaRodada,
  buscarRodadaAtual,
  confirmarTimes,
  gerarSugestao,
} from "./timesApi";

vi.mock("./timesApi", async () => {
  const actual = await vi.importActual<typeof import("./timesApi")>("./timesApi");
  return {
    ...actual,
    buscarRodadaAtual: vi.fn(),
    buscarPresentesDaRodada: vi.fn(),
    gerarSugestao: vi.fn(),
    confirmarTimes: vi.fn(),
  };
});

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/times",
}));

const RODADA = {
  id: "rodada-1",
  data: "2026-09-19",
  status: "lancada" as const,
  criado_em: "2026-09-19T20:00:00Z",
};

const PRESENTES = [
  { atleta_id: "1", apelido_exibicao: "João" },
  { atleta_id: "2", apelido_exibicao: "Carlinhos" },
  { atleta_id: "3", apelido_exibicao: "Rafa" },
];

function renderShell() {
  return render(
    <ToastProvider>
      <MontagemTimesShell />
    </ToastProvider>,
  );
}

async function renderReady() {
  vi.mocked(buscarRodadaAtual).mockResolvedValue(RODADA);
  vi.mocked(buscarPresentesDaRodada).mockResolvedValue(PRESENTES);
  const user = userEvent.setup();
  renderShell();
  await screen.findByRole("heading", { name: "Times — Rodada 19/09/2026" });
  return user;
}

describe("MontagemTimesShell", () => {
  beforeEach(() => {
    vi.mocked(buscarRodadaAtual).mockReset();
    vi.mocked(buscarPresentesDaRodada).mockReset();
    vi.mocked(gerarSugestao).mockReset();
    vi.mocked(confirmarTimes).mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("mostra skeleton de carregamento e depois o cabeçalho com a rodada atual", async () => {
    vi.mocked(buscarRodadaAtual).mockResolvedValue(RODADA);
    vi.mocked(buscarPresentesDaRodada).mockResolvedValue(PRESENTES);
    renderShell();

    expect(
      screen.getByRole("status", { name: "Carregando rodada atual" }),
    ).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Times — Rodada 19/09/2026" });
  });

  it("nenhuma rodada lançada: avisa e redireciona para T05 (mesmo padrão de dependência de FE-05)", async () => {
    vi.mocked(buscarRodadaAtual).mockResolvedValue(null);
    renderShell();

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(ROUTES.lancamentoRodada),
    );
    await screen.findByText("Lance uma rodada antes de montar os times.");
  });

  it("erro ao carregar: mostra AlertBanner com retry", async () => {
    vi.mocked(buscarRodadaAtual).mockRejectedValue(
      new TimesApiError("Falha ao carregar."),
    );
    renderShell();

    await screen.findByText("Falha ao carregar.");
    vi.mocked(buscarRodadaAtual).mockResolvedValue(RODADA);
    vi.mocked(buscarPresentesDaRodada).mockResolvedValue(PRESENTES);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("heading", { name: "Times — Rodada 19/09/2026" });
  });

  it("401 ao carregar: redireciona para o login preservando a origem", async () => {
    vi.mocked(buscarRodadaAtual).mockRejectedValue(new SessionExpiredError());
    renderShell();

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(`${ROUTES.login}?redirect=%2Ftimes`),
    );
  });

  it("estado pronto: presentes da rodada pré-selecionados", async () => {
    await renderReady();
    expect(screen.getByText("3")).toBeInTheDocument(); // "Presentes selecionados: 3"
    const radiosPresente = screen.getAllByRole("radio", { name: "Presente" });
    expect(radiosPresente).toHaveLength(PRESENTES.length);
    radiosPresente.forEach((radio) =>
      expect(radio).toHaveAttribute("aria-checked", "true"),
    );
  });

  it("gerar sugestão com sucesso (status='ok') mostra os times lado a lado", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "ok",
      quantidade_times_solicitada: 2,
      times: [
        {
          indice: 0,
          atletas: [
            { atleta_id: "1", apelido_exibicao: "João", nivel_tecnico: 6, idade: 22 },
          ],
          nivel_tecnico_medio: 6,
          idade_media: 22,
        },
        {
          indice: 1,
          atletas: [
            {
              atleta_id: "2",
              apelido_exibicao: "Carlinhos",
              nivel_tecnico: 4,
              idade: 30,
            },
            { atleta_id: "3", apelido_exibicao: "Rafa", nivel_tecnico: 5, idade: 25 },
          ],
          nivel_tecnico_medio: 4.5,
          idade_media: 27.5,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));

    expect(gerarSugestao).toHaveBeenCalledWith(["1", "2", "3"], 2);
    await screen.findByRole("heading", { name: "Time A" });
    expect(screen.getByRole("heading", { name: "Time B" })).toBeInTheDocument();
  });

  it("respeita a desmarcação manual de um presente antes de gerar", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "ok",
      quantidade_times_solicitada: 2,
      times: [
        { indice: 0, atletas: [], nivel_tecnico_medio: null, idade_media: null },
        { indice: 1, atletas: [], nivel_tecnico_medio: null, idade_media: null },
      ],
    });

    const linhaRafa = screen.getByText("Rafa").closest("li")!;
    await user.click(within(linhaRafa).getByRole("radio", { name: "Ausente" }));
    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));

    expect(gerarSugestao).toHaveBeenCalledWith(["1", "2"], 2);
  });

  it("falha técnica real (500/timeout) mostra a mensagem literal do UX-SPEC e permanece na seleção", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockRejectedValue(new TimesFalhaTecnicaError());

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));

    await screen.findByText("Não foi possível gerar a sugestão, tente novamente.");
    // continua na fase de seleção — o botão "Gerar sugestão de times" ainda está lá.
    expect(
      screen.getByRole("button", { name: "Gerar sugestão de times" }),
    ).toBeInTheDocument();
  });

  it("401 ao gerar sugestão: aciona o fluxo de sessão expirada", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockRejectedValue(new SessionExpiredError());

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(`${ROUTES.login}?redirect=%2Ftimes`),
    );
  });

  it("conflito: mostra ConflictList (role=alert) com o contrato exato do ADR-010", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "conflito",
      restricoes_conflitantes: [
        {
          restricao_id: "res-1",
          atleta_a_id: "1",
          atleta_a_nome: "João",
          atleta_b_id: "2",
          atleta_b_nome: "Carlinhos",
          motivo: "restricao_obrigatoria_ativa",
          grupo_conflito: 1,
        },
      ],
      grupos_conflito: [
        {
          grupo_conflito: 1,
          atletas_ids: ["1", "2", "3"],
          quantidade_times_solicitada: 2,
          mensagem:
            "Com 2 time(s) disponível(is), não é possível separar os 3 atletas...",
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));

    const alerta = await screen.findByRole("alert");
    expect(
      within(alerta).getByText(
        (_, node) =>
          node?.tagName === "LI" &&
          node.textContent === "João ⚡ Carlinhos (não podem ficar juntos)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ajustar lista de presentes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gerar mesmo assim, ciente do conflito" }),
    ).toBeInTheDocument();
  });

  it("'Ajustar lista de presentes' volta para a fase de seleção", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "conflito",
      restricoes_conflitantes: [],
      grupos_conflito: [],
    });
    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Ajustar lista de presentes" }));

    expect(
      screen.getByText("Selecione os presentes da rodada para gerar times"),
    ).toBeInTheDocument();
  });

  it("'Gerar mesmo assim, ciente do conflito' monta uma divisão local (round-robin) e avisa que ignora restrições", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "conflito",
      restricoes_conflitantes: [],
      grupos_conflito: [],
    });
    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    await screen.findByRole("alert");

    await user.click(
      screen.getByRole("button", { name: "Gerar mesmo assim, ciente do conflito" }),
    );

    await screen.findByRole("heading", { name: "Time A" });
    expect(
      screen.getByText(/ignorando as restrições obrigatórias em conflito/),
    ).toBeInTheDocument();
    expect(gerarSugestao).toHaveBeenCalledTimes(1); // nenhuma nova chamada de rede
  });

  it("Confirmar Times com sucesso mostra toast de sucesso", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "ok",
      quantidade_times_solicitada: 2,
      times: [
        {
          indice: 0,
          atletas: [
            { atleta_id: "1", apelido_exibicao: "João", nivel_tecnico: 6, idade: 22 },
          ],
          nivel_tecnico_medio: 6,
          idade_media: 22,
        },
        {
          indice: 1,
          atletas: [
            {
              atleta_id: "2",
              apelido_exibicao: "Carlinhos",
              nivel_tecnico: 4,
              idade: 30,
            },
          ],
          nivel_tecnico_medio: 4,
          idade_media: 30,
        },
      ],
    });
    vi.mocked(confirmarTimes).mockResolvedValue({
      rodada_id: "rodada-1",
      times: [
        {
          time_id: "t1",
          label: "Time A",
          atletas: [{ atleta_id: "1", apelido_exibicao: "João" }],
        },
        {
          time_id: "t2",
          label: "Time B",
          atletas: [{ atleta_id: "2", apelido_exibicao: "Carlinhos" }],
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    await screen.findByRole("heading", { name: "Time A" });

    await user.click(screen.getByRole("button", { name: "Confirmar Times" }));

    expect(confirmarTimes).toHaveBeenCalledWith("rodada-1", [
      { label: "Time A", atletas_ids: ["1"] },
      { label: "Time B", atletas_ids: ["2"] },
    ]);
    await screen.findByText("Divisão de times confirmada.");
  });

  it("Confirmar Times com erro (409 substituição existente) mostra a mensagem do servidor via toast", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "ok",
      quantidade_times_solicitada: 2,
      times: [
        {
          indice: 0,
          atletas: [
            { atleta_id: "1", apelido_exibicao: "João", nivel_tecnico: 6, idade: 22 },
          ],
          nivel_tecnico_medio: 6,
          idade_media: 22,
        },
        {
          indice: 1,
          atletas: [
            {
              atleta_id: "2",
              apelido_exibicao: "Carlinhos",
              nivel_tecnico: 4,
              idade: 30,
            },
          ],
          nivel_tecnico_medio: 4,
          idade_media: 30,
        },
      ],
    });
    vi.mocked(confirmarTimes).mockRejectedValue(
      new SubstituicaoExistenteError("Já existe substituição registrada."),
    );

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    await screen.findByRole("heading", { name: "Time A" });
    await user.click(screen.getByRole("button", { name: "Confirmar Times" }));

    await screen.findByText("Já existe substituição registrada.");
  });

  it("Confirmar Times com 401 aciona o fluxo de sessão expirada (sem toast de erro genérico)", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "ok",
      quantidade_times_solicitada: 2,
      times: [
        {
          indice: 0,
          atletas: [
            { atleta_id: "1", apelido_exibicao: "João", nivel_tecnico: 6, idade: 22 },
          ],
          nivel_tecnico_medio: 6,
          idade_media: 22,
        },
        {
          indice: 1,
          atletas: [
            {
              atleta_id: "2",
              apelido_exibicao: "Carlinhos",
              nivel_tecnico: 4,
              idade: 30,
            },
          ],
          nivel_tecnico_medio: 4,
          idade_media: 30,
        },
      ],
    });
    vi.mocked(confirmarTimes).mockRejectedValue(new SessionExpiredError());

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    await screen.findByRole("heading", { name: "Time A" });
    await user.click(screen.getByRole("button", { name: "Confirmar Times" }));

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(`${ROUTES.login}?redirect=%2Ftimes`),
    );
  });

  it("404 (rodada não encontrada) ao confirmar mostra mensagem genérica de falha", async () => {
    const user = await renderReady();
    vi.mocked(gerarSugestao).mockResolvedValue({
      status: "ok",
      quantidade_times_solicitada: 2,
      times: [
        {
          indice: 0,
          atletas: [
            { atleta_id: "1", apelido_exibicao: "João", nivel_tecnico: 6, idade: 22 },
          ],
          nivel_tecnico_medio: 6,
          idade_media: 22,
        },
        {
          indice: 1,
          atletas: [
            {
              atleta_id: "2",
              apelido_exibicao: "Carlinhos",
              nivel_tecnico: 4,
              idade: 30,
            },
          ],
          nivel_tecnico_medio: 4,
          idade_media: 30,
        },
      ],
    });
    vi.mocked(confirmarTimes).mockRejectedValue(new RodadaNaoEncontradaError());

    await user.click(screen.getByRole("button", { name: "Gerar sugestão de times" }));
    await screen.findByRole("heading", { name: "Time A" });
    await user.click(screen.getByRole("button", { name: "Confirmar Times" }));

    await screen.findByText("Rodada não encontrada.");
  });

  it("sem violação de acessibilidade (axe) no estado pronto", async () => {
    vi.mocked(buscarRodadaAtual).mockResolvedValue(RODADA);
    vi.mocked(buscarPresentesDaRodada).mockResolvedValue(PRESENTES);
    const { container } = renderShell();
    await screen.findByRole("heading", { name: "Times — Rodada 19/09/2026" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
