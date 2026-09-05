import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PresencaMensal } from "./PresencaMensal";
import { fetchPresencaMensal } from "./presencaMensalApi";
import { formatMesCivil, shiftMesCivil } from "./format";
import type { PresencaMensalPublicaItem } from "./types";

vi.mock("./presencaMensalApi", () => ({
  fetchPresencaMensal: vi.fn(),
}));

// Mês civil corrente calculado da mesma forma que o componente (RN-09) —
// evita mockar `Date` (TASK.md Seção 1.0, solução mais simples) e mantém o
// teste determinístico em qualquer dia em que rodar.
const now = new Date();
const CURRENT = { ano: now.getFullYear(), mes: now.getMonth() + 1 };

const ITEMS: PresencaMensalPublicaItem[] = [
  {
    ano: CURRENT.ano,
    mes: CURRENT.mes,
    rodada_id: "rodada-1",
    rodada_data: `${String(CURRENT.ano).padStart(4, "0")}-${String(CURRENT.mes).padStart(2, "0")}-05`,
    total_presentes: 18,
    nomes_presentes: ["Carlinhos", "João Pedro"],
  },
  {
    ano: CURRENT.ano,
    mes: CURRENT.mes,
    rodada_id: "rodada-2",
    rodada_data: `${String(CURRENT.ano).padStart(4, "0")}-${String(CURRENT.mes).padStart(2, "0")}-12`,
    total_presentes: 0,
    nomes_presentes: [],
  },
];

describe("PresencaMensal", () => {
  beforeEach(() => {
    vi.mocked(fetchPresencaMensal).mockReset();
  });

  it("busca o mês civil corrente ao montar (RN-09)", async () => {
    vi.mocked(fetchPresencaMensal).mockResolvedValue([]);
    render(<PresencaMensal />);

    await screen.findByText("Nenhuma rodada lançada neste mês");
    expect(fetchPresencaMensal).toHaveBeenCalledWith(CURRENT.ano, CURRENT.mes);
    expect(screen.getByText(formatMesCivil(CURRENT))).toBeInTheDocument();
  });

  it("mostra o skeleton de carregamento antes da resposta chegar", async () => {
    let resolvePromise: (items: PresencaMensalPublicaItem[]) => void = () => {};
    vi.mocked(fetchPresencaMensal).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(<PresencaMensal />);

    expect(
      screen.getByRole("status", { name: "Carregando presença mensal" }),
    ).toBeInTheDocument();

    resolvePromise([]);
    await screen.findByText("Nenhuma rodada lançada neste mês");
  });

  it("estado vazio: nenhuma rodada lançada neste mês", async () => {
    vi.mocked(fetchPresencaMensal).mockResolvedValue([]);
    render(<PresencaMensal />);
    expect(
      await screen.findByText("Nenhuma rodada lançada neste mês"),
    ).toBeInTheDocument();
  });

  it("estado de sucesso: mostra a lista de presentes de cada rodada diretamente, sem accordion (UX-SPEC.md Parte II Seção 2.3)", async () => {
    vi.mocked(fetchPresencaMensal).mockResolvedValue(ITEMS);
    render(<PresencaMensal />);

    // As duas rodadas do mês aparecem de imediato, sem nenhum controle de
    // expandir/recolher (nenhum `button`/`aria-expanded` por rodada).
    expect(await screen.findByText("05/09")).toBeInTheDocument();
    expect(screen.getByText("Presentes: 18")).toBeInTheDocument();
    expect(screen.getByText("João Pedro")).toBeInTheDocument();
    expect(screen.getByText("Carlinhos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /05\/09/ })).not.toBeInTheDocument();

    // Rodada com zero presentes: seção trata explicitamente, não fica vazia.
    expect(screen.getByText("12/09")).toBeInTheDocument();
    expect(screen.getByText("Presentes: 0")).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum presente registrado nesta rodada."),
    ).toBeInTheDocument();

    // Cada presente é anunciado como "Presente" via o mesmo `PresenceDot`
    // reutilizado de T02 (FE-R02) — nome fica visível, o dot reforça
    // visualmente sem duplicar o rótulo por leitor de tela (decorativo).
    expect(screen.getAllByText("Presente").length).toBeGreaterThan(0);

    // Nunca solicita/renderiza contato ou data de nascimento (RN-01).
    expect(screen.queryByText(/contato/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nascimento/i)).not.toBeInTheDocument();
  });

  it("navegação por mês civil: 'Próximo mês' e 'Mês anterior' refazem a busca com ano/mes ajustados", async () => {
    vi.mocked(fetchPresencaMensal).mockResolvedValue([]);
    render(<PresencaMensal />);
    await screen.findByText("Nenhuma rodada lançada neste mês");
    expect(fetchPresencaMensal).toHaveBeenCalledTimes(1);

    const next = shiftMesCivil(CURRENT, 1);
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(await screen.findByText(formatMesCivil(next))).toBeInTheDocument();
    expect(fetchPresencaMensal).toHaveBeenLastCalledWith(next.ano, next.mes);

    const back = CURRENT;
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(await screen.findByText(formatMesCivil(back))).toBeInTheDocument();
    expect(fetchPresencaMensal).toHaveBeenLastCalledWith(back.ano, back.mes);
    expect(fetchPresencaMensal).toHaveBeenCalledTimes(3);
  });

  it("estado de erro: mensagem genérica com role=alert e botão de tentar novamente que recarrega", async () => {
    vi.mocked(fetchPresencaMensal).mockRejectedValueOnce(new Error("timeout de rede"));
    render(<PresencaMensal />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Não foi possível carregar a presença mensal agora. Tente novamente.",
    );
    // Nunca vaza detalhe técnico do erro real ao público.
    expect(alert).not.toHaveTextContent("timeout de rede");

    vi.mocked(fetchPresencaMensal).mockResolvedValueOnce([]);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await screen.findByText("Nenhuma rodada lançada neste mês");
    expect(fetchPresencaMensal).toHaveBeenCalledTimes(2);
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso", async () => {
    vi.mocked(fetchPresencaMensal).mockResolvedValue(ITEMS);
    const { container } = render(<PresencaMensal />);
    await screen.findByText("Presentes: 18");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado vazio", async () => {
    vi.mocked(fetchPresencaMensal).mockResolvedValue([]);
    const { container } = render(<PresencaMensal />);
    await screen.findByText("Nenhuma rodada lançada neste mês");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado de erro", async () => {
    vi.mocked(fetchPresencaMensal).mockRejectedValue(new Error("falha"));
    const { container } = render(<PresencaMensal />);
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
