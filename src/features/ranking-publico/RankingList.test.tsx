import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { RankingList } from "./RankingList";
import { fetchRankingPublico } from "./rankingApi";
import type { RankingPublicoItem } from "./types";

vi.mock("./rankingApi", () => ({
  fetchRankingPublico: vi.fn(),
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

describe("RankingList", () => {
  beforeEach(() => {
    vi.mocked(fetchRankingPublico).mockReset();
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

  it("estado de sucesso: renderiza a tabela ordenada, top 3 com destaque textual, e timestamp", async () => {
    vi.mocked(fetchRankingPublico).mockResolvedValue(ITEMS);
    render(<RankingList />);

    const table = await screen.findByRole("table", { name: "Ranking de atletas" });
    const rows = within(table).getAllByRole("row").slice(1); // ignora a linha de cabeçalho
    expect(rows).toHaveLength(4);

    // Ordem preservada exatamente como recebida (a ordenação em si é
    // responsabilidade de rankingApi/RN-08, reforçada no teste de
    // rankingApi.test.ts — aqui valida-se que a lista não é reordenada de
    // novo no componente).
    expect(within(rows[0]!).getByText("João Pedro")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Carlinhos")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Rafa Foguinho")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("Marquinhos")).toBeInTheDocument();

    // Top 3 com reforço textual (ordinal), não só ícone/cor.
    expect(within(rows[0]!).getByText("1º")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("2º")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("3º")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("4º")).toBeInTheDocument();

    // Nunca solicita/renderiza contato ou data de nascimento (RN-01).
    expect(screen.queryByText(/contato/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nascimento/i)).not.toBeInTheDocument();

    // Pontuação com concordância singular/plural. Colunas de presenças e
    // cartões removidas da tela principal a pedido do organizador
    // (divergência documentada de RF-03.1/UX-SPEC.md Seção 2/6.2, que ainda
    // pedem presenças/ausências visíveis — decisão de produto do organizador
    // prevalece sobre a especificação formal).
    expect(within(rows[0]!).getByText("42 pts")).toBeInTheDocument();
    expect(screen.queryByText(/presenç/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cart(ão|ões)/i)).not.toBeInTheDocument();

    // Timestamp de atualização visível.
    expect(screen.getByText(/Atualizado em: \d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument();
  });

  it("estado de erro: mensagem genérica com role=alert e botão de tentar novamente que recarrega", async () => {
    vi.mocked(fetchRankingPublico).mockRejectedValueOnce(new Error("timeout de rede"));
    render(<RankingList />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Não foi possível carregar o ranking agora. Tente novamente.",
    );
    // Nunca vaza detalhe técnico do erro real ao público.
    expect(alert).not.toHaveTextContent("timeout de rede");

    vi.mocked(fetchRankingPublico).mockResolvedValueOnce(ITEMS);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await screen.findByRole("table", { name: "Ranking de atletas" });
    expect(fetchRankingPublico).toHaveBeenCalledTimes(2);
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso", async () => {
    vi.mocked(fetchRankingPublico).mockResolvedValue(ITEMS);
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
