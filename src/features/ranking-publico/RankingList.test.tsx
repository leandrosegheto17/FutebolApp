import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { RankingList } from "./RankingList";
import { fetchRankingPublico } from "./rankingApi";
import { fetchRankingPublicoRecentes } from "./rankingRecentesApi";
import type { RankingPublicoItem, RankingPublicoRecentesItem } from "./types";

vi.mock("./rankingApi", () => ({
  fetchRankingPublico: vi.fn(),
}));

vi.mock("./rankingRecentesApi", () => ({
  fetchRankingPublicoRecentes: vi.fn(),
}));

/**
 * `RankingList.module.css` esconde `.summaryPanel` (painel "Resumo da
 * temporada") via `@media (min-width: 1024px)` real — jsdom não avalia
 * condição de `@media` alguma ao calcular estilo computado (limitação
 * conhecida do próprio jsdom, mesma nota já documentada em
 * `AppNav.test.tsx`/FE-R00), então a regra incondicional `display: none`
 * "vence" sempre em teste e o painel some da árvore de acessibilidade
 * mesmo em viewport >= 1024px. Mock do CSS Module para testar o conteúdo
 * do painel isoladamente — a alternância responsiva real (visível só a
 * partir de `lg`) é validada visualmente, não por este teste unitário.
 */
vi.mock("./RankingList.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop: string) => prop }),
}));

const ITEMS: RankingPublicoItem[] = [
  {
    atleta_id: "1",
    nome_exibicao: "João Pedro",
    pontuacao_acumulada: 42,
    presencas: 12,
    cartoes: 1,
  },
  {
    atleta_id: "2",
    nome_exibicao: "Carlinhos",
    pontuacao_acumulada: 38,
    presencas: 10,
    cartoes: 0,
  },
  {
    atleta_id: "3",
    nome_exibicao: "Rafa Foguinho",
    pontuacao_acumulada: 35,
    presencas: 11,
    cartoes: 2,
  },
  {
    atleta_id: "4",
    nome_exibicao: "Marquinhos",
    pontuacao_acumulada: 20,
    presencas: 5,
    cartoes: 0,
  },
];

const RECENTES: RankingPublicoRecentesItem[] = [
  {
    atleta_id: "1",
    nome_exibicao: "João Pedro",
    rodadas_recentes: [
      { rodada_id: "r2", data: "2026-09-05", status: "presente" },
      { rodada_id: "r1", data: "2026-08-29", status: "lesionado" },
    ],
    rodadas_jogadas: 21,
    media_presenca: 78.3,
  },
  {
    atleta_id: "2",
    nome_exibicao: "Carlinhos",
    rodadas_recentes: [
      { rodada_id: "r2", data: "2026-09-05", status: "ausente" },
      { rodada_id: "r1", data: "2026-08-29", status: "presente" },
    ],
    rodadas_jogadas: 21,
    media_presenca: 78.3,
  },
  {
    atleta_id: "3",
    nome_exibicao: "Rafa Foguinho",
    rodadas_recentes: [{ rodada_id: "r2", data: "2026-09-05", status: "presente" }],
    rodadas_jogadas: 21,
    media_presenca: 78.3,
  },
  {
    atleta_id: "4",
    nome_exibicao: "Marquinhos",
    rodadas_recentes: [],
    rodadas_jogadas: 21,
    media_presenca: 78.3,
  },
];

describe("RankingList", () => {
  beforeEach(() => {
    vi.mocked(fetchRankingPublico).mockReset();
    vi.mocked(fetchRankingPublicoRecentes).mockReset();
    vi.mocked(fetchRankingPublicoRecentes).mockResolvedValue([]);
  });

  it("mostra o skeleton de carregamento antes da resposta chegar", async () => {
    let resolvePromise: (items: RankingPublicoItem[]) => void = () => {};
    vi.mocked(fetchRankingPublico).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(<RankingList />);

    expect(
      screen.getByRole("status", { name: "Carregando ranking" }),
    ).toBeInTheDocument();

    resolvePromise([]);
    await screen.findByText("Nenhum atleta cadastrado ainda");
  });

  it("estado vazio: nenhum atleta cadastrado ainda", async () => {
    vi.mocked(fetchRankingPublico).mockResolvedValue([]);
    render(<RankingList />);
    expect(await screen.findByText("Nenhum atleta cadastrado ainda")).toBeInTheDocument();
  });

  it("estado de sucesso: matriz atleta × últimas rodadas, ordem preservada, MedalBadge no top 3 com texto ordinal equivalente (a11y)", async () => {
    vi.mocked(fetchRankingPublico).mockResolvedValue(ITEMS);
    vi.mocked(fetchRankingPublicoRecentes).mockResolvedValue(RECENTES);
    render(<RankingList />);

    const table = await screen.findByRole("table", { name: "Ranking de atletas" });
    const rows = within(table).getAllByRole("row").slice(1); // ignora cabeçalho
    expect(rows).toHaveLength(4);

    // Ordem preservada exatamente como recebida de `ranking_publico` (a
    // ordenação em si é responsabilidade de `rankingApi`/RN-08).
    expect(within(rows[0]!).getByText("João Pedro")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Carlinhos")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Rafa Foguinho")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("Marquinhos")).toBeInTheDocument();

    // Correção de a11y obrigatória (UX-SPEC.md Seção 2.2/5.4): top 3 mostram
    // a medalha (emoji, aria-hidden) + texto ordinal equivalente (sr-only).
    expect(within(rows[0]!).getByText("1º lugar")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("2º lugar")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("3º lugar")).toBeInTheDocument();
    // Posições 4+: ordinal visível como texto simples (sem medalha).
    expect(within(rows[3]!).getByText("4º")).toBeInTheDocument();

    // Nunca solicita/renderiza contato ou data de nascimento (RN-01).
    expect(screen.queryByText(/contato/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nascimento/i)).not.toBeInTheDocument();

    // Coluna de pontos.
    expect(within(rows[0]!).getByText("42 pts")).toBeInTheDocument();

    // Matriz: colunas de data construídas pela união das rodadas de todos
    // os atletas (matrix.ts), ordem cronológica ascendente.
    expect(screen.getByRole("columnheader", { name: "29/08" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "05/09" })).toBeInTheDocument();

    // Dots com rótulo por extenso (nunca só a letra solta por voz).
    expect(within(rows[0]!).getByRole("img", { name: "Lesionado" })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("img", { name: "Ausente" })).toBeInTheDocument();

    // Atleta sem registro numa rodada em que outros já tinham entrado no
    // grupo (Rafa Foguinho, r1) mostra placeholder textual, nunca célula
    // muda sem explicação (WCAG 1.4.1).
    expect(
      within(rows[2]!).getByRole("img", { name: "Sem registro nesta rodada" }),
    ).toBeInTheDocument();

    // Legenda com rótulo textual (nunca só cor/símbolo).
    expect(screen.getByText("Presente")).toBeInTheDocument();
    expect(screen.getByText("Ausente")).toBeInTheDocument();
    expect(screen.getByText("Lesionado")).toBeInTheDocument();

    // Painel "Resumo da temporada" — estatísticas de GRUPO (BE-R01), só as
    // 2 métricas em escopo ("Próxima rodada" excluída, TASK.md Seção 6.1-R
    // item 1).
    const summary = screen.getByRole("complementary", { name: "Resumo da temporada" });
    expect(within(summary).getByText("Rodadas jogadas")).toBeInTheDocument();
    expect(within(summary).getByText("21")).toBeInTheDocument();
    expect(within(summary).getByText("Média de presença")).toBeInTheDocument();
    expect(within(summary).getByText("78,3%")).toBeInTheDocument();
    expect(screen.queryByText(/próxima rodada/i)).not.toBeInTheDocument();

    // Linha "Atualizado ... N atletas" (UX-SPEC.md Seção 2.2).
    expect(
      screen.getByText(/Atualizado hoje às \d{2}:\d{2} · 4 atletas/),
    ).toBeInTheDocument();
  });

  it("estado de erro: mensagem genérica com role=alert e botão de tentar novamente que recarrega (mesmo se só a matriz de rodadas recentes falhar)", async () => {
    vi.mocked(fetchRankingPublico).mockResolvedValueOnce(ITEMS);
    vi.mocked(fetchRankingPublicoRecentes).mockRejectedValueOnce(
      new Error("timeout de rede"),
    );
    render(<RankingList />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Não foi possível carregar o ranking agora. Tente novamente.",
    );
    expect(alert).not.toHaveTextContent("timeout de rede");

    vi.mocked(fetchRankingPublico).mockResolvedValueOnce(ITEMS);
    vi.mocked(fetchRankingPublicoRecentes).mockResolvedValueOnce(RECENTES);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await screen.findByRole("table", { name: "Ranking de atletas" });
    expect(fetchRankingPublico).toHaveBeenCalledTimes(2);
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso", async () => {
    vi.mocked(fetchRankingPublico).mockResolvedValue(ITEMS);
    vi.mocked(fetchRankingPublicoRecentes).mockResolvedValue(RECENTES);
    const { container } = render(<RankingList />);
    await screen.findByRole("table", { name: "Ranking de atletas" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado de erro", async () => {
    vi.mocked(fetchRankingPublico).mockRejectedValue(new Error("falha"));
    const { container } = render(<RankingList />);
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
