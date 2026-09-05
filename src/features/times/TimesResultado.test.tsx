import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { TimesResultado } from "./TimesResultado";
import type { RestricaoAtivaConsulta } from "./times";
import type { TimeMontado, TimesConfirmados } from "./types";
import { listarSubstituicoes } from "./substituicoesApi";
import { fetchAtletas } from "@/features/atletas/atletasApi";

vi.mock("./substituicoesApi", async () => {
  const actual =
    await vi.importActual<typeof import("./substituicoesApi")>("./substituicoesApi");
  return { ...actual, listarSubstituicoes: vi.fn(), registrarSubstituicao: vi.fn() };
});

vi.mock("@/features/atletas/atletasApi", () => ({ fetchAtletas: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/times",
}));

const TIMES: TimeMontado[] = [
  {
    indice: 0,
    atletas: [
      { atleta_id: "1", apelido_exibicao: "João", nivel_tecnico: 6, idade: 22 },
      { atleta_id: "2", apelido_exibicao: "Carlinhos", nivel_tecnico: 4, idade: 30 },
    ],
    nivel_tecnico_medio: 5,
    idade_media: 26,
  },
  {
    indice: 1,
    atletas: [{ atleta_id: "3", apelido_exibicao: "Rafa", nivel_tecnico: 5, idade: 25 }],
    nivel_tecnico_medio: 5,
    idade_media: 25,
  },
];

const CONFIRMADOS: TimesConfirmados = {
  rodada_id: "rodada-1",
  times: [
    {
      time_id: "t1",
      label: "Colete",
      atletas: [
        { atleta_id: "1", apelido_exibicao: "João" },
        { atleta_id: "2", apelido_exibicao: "Carlinhos" },
      ],
    },
    {
      time_id: "t2",
      label: "Sem Colete",
      atletas: [{ atleta_id: "3", apelido_exibicao: "Rafa" }],
    },
  ],
};

function renderComponent(overrides: Partial<Parameters<typeof TimesResultado>[0]> = {}) {
  const onSwap = vi.fn();
  const onConfirmar = vi.fn();
  const onNovoSorteio = vi.fn();
  const utils = render(
    <ToastProvider>
      <TimesResultado
        times={TIMES}
        onSwap={onSwap}
        onConfirmar={onConfirmar}
        confirmando={false}
        origemFallback={false}
        rodadaId="rodada-1"
        confirmados={null}
        restricoes={[]}
        onNovoSorteio={onNovoSorteio}
        novoSorteioCarregando={false}
        {...overrides}
      />
    </ToastProvider>,
  );
  return { ...utils, onSwap, onConfirmar, onNovoSorteio };
}

describe("TimesResultado", () => {
  it("exibe os dois times ('Colete'/'Sem Colete', UX-SPEC.md Parte II Seção 2.6) com os jogadores como PlayerChip", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: "Colete" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sem Colete" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trocar João, nível técnico 6" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trocar Rafa, nível técnico 5" }),
    ).toBeInTheDocument();
  });

  it("cabeçalho de cada time mostra a soma (não a média) do nível técnico, em pts", () => {
    renderComponent();
    // Colete: 6 + 4 = 10 pts; Sem Colete: 5 pts.
    expect(screen.getByText("10 pts")).toBeInTheDocument();
    expect(screen.getByText("5 pts")).toBeInTheDocument();
  });

  it("painel de equilíbrio mostra 'diferença' (não duas médias) de pontos/idade + titulares", () => {
    renderComponent();
    expect(screen.getByText("Dif. pontos")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // |10 - 5|
    expect(screen.getByText("Dif. idade")).toBeInTheDocument();
    expect(screen.getByText("1,0a")).toBeInTheDocument(); // |26 - 25|
    expect(screen.getByText("Titulares")).toBeInTheDocument();
    expect(screen.getByText("2×1")).toBeInTheDocument();
  });

  it("indicadores `null` (fallback) são exibidos como '—', nunca um número inventado", () => {
    renderComponent({
      times: [
        { indice: 0, atletas: [], nivel_tecnico_medio: null, idade_media: null },
        { indice: 1, atletas: [], nivel_tecnico_medio: null, idade_media: null },
      ],
    });
    expect(screen.getAllByText("— pts")).toHaveLength(2);
    expect(screen.getByText("Dif. idade").nextSibling).toHaveTextContent("—");
  });

  it("clicar em um PlayerChip abre o modal de seleção com candidatos do outro time", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(
      screen.getByRole("button", { name: "Trocar João, nível técnico 6" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Trocar João com quem?" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Rafa/ })).toBeInTheDocument();
    // Não lista atletas do mesmo time como candidato (Carlinhos está no Colete, junto com João).
    expect(
      within(dialog).queryByRole("button", { name: /Carlinhos/ }),
    ).not.toBeInTheDocument();
  });

  it("selecionar um candidato no modal chama onSwap com os dois ids e fecha o modal", async () => {
    const user = userEvent.setup();
    const { onSwap } = renderComponent();

    await user.click(
      screen.getByRole("button", { name: "Trocar João, nível técnico 6" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Trocar João com quem?" });
    await user.click(within(dialog).getByRole("button", { name: /Rafa/ }));

    expect(onSwap).toHaveBeenCalledWith("1", "3");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("soltar um PlayerChip arrastado sobre outro (DnD nativo, atalho opcional) chama onSwap", () => {
    const { onSwap } = renderComponent();

    const chipJoao = screen.getByRole("button", { name: "Trocar João, nível técnico 6" });
    const dropTarget = chipJoao.closest("div")!;
    const dataTransfer = { getData: () => "3", setData: vi.fn() };
    dropTarget.dispatchEvent(
      Object.assign(new Event("drop", { bubbles: true, cancelable: true }), {
        dataTransfer,
      }),
    );

    expect(onSwap).toHaveBeenCalledWith("3", "1");
  });

  it("'Confirmar Times' chama onConfirmar", async () => {
    const user = userEvent.setup();
    const { onConfirmar } = renderComponent();
    await user.click(screen.getByRole("button", { name: "Confirmar Times" }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it("confirmando=true mostra o botão em estado de carregamento (aria-busy)", () => {
    renderComponent({ confirmando: true });
    expect(screen.getByRole("button", { name: "Confirmar Times" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("'🔄 Novo sorteio' chama onNovoSorteio (paridade mobile+desktop, sempre disponível)", async () => {
    const user = userEvent.setup();
    const { onNovoSorteio } = renderComponent();
    await user.click(screen.getByRole("button", { name: "Novo sorteio" }));
    expect(onNovoSorteio).toHaveBeenCalledTimes(1);
  });

  it("novoSorteioCarregando=true mostra 'Novo sorteio' em estado de carregamento", () => {
    renderComponent({ novoSorteioCarregando: true });
    expect(screen.getByRole("button", { name: "Novo sorteio" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("origemFallback=true mostra aviso de que a divisão ignora restrições obrigatórias", () => {
    renderComponent({ origemFallback: true });
    expect(
      screen.getByText(/ignorando as restrições obrigatórias em conflito/),
    ).toBeInTheDocument();
  });

  it("origemFallback=false não mostra o aviso", () => {
    renderComponent({ origemFallback: false });
    expect(
      screen.queryByText(/ignorando as restrições obrigatórias em conflito/),
    ).not.toBeInTheDocument();
  });

  describe("banner '✓ Restrição respeitada' (UX-SPEC.md Parte II Seção 2.6, correção 4)", () => {
    it("sem restrições ativas satisfeitas pela divisão atual, nenhum banner aparece", () => {
      renderComponent({ restricoes: [] });
      expect(screen.queryByText(/Restrição respeitada/)).not.toBeInTheDocument();
    });

    it("restrição ativa satisfeita (os dois atletas em times diferentes) mostra o banner com os nomes reais", () => {
      const restricoes: RestricaoAtivaConsulta[] = [
        {
          ativo: true,
          atleta_a_id: "1",
          atleta_a_nome: "João",
          atleta_b_id: "3",
          atleta_b_nome: "Rafa",
        },
      ];
      renderComponent({ restricoes });
      // `textContent` de um `<li>` inclui o "✓ " do `<span aria-hidden>` vizinho
      // (mesmo padrão já usado pelo teste de `ConflictList`/`MontagemTimesShell`
      // para o "⚡" decorativo) — comparação exata restrita ao `<li>` evita
      // múltiplos matches nos ancestrais (`ul`, `AlertBanner`).
      expect(
        screen.getByText(
          (_, node) =>
            node?.tagName === "LI" &&
            node.textContent ===
              "✓ Restrição respeitada: João e Rafa não jogam no mesmo time.",
        ),
      ).toBeInTheDocument();
    });

    it("restrição ativa violada (os dois atletas no MESMO time) não gera banner", () => {
      const restricoes: RestricaoAtivaConsulta[] = [
        {
          ativo: true,
          atleta_a_id: "1",
          atleta_a_nome: "João",
          atleta_b_id: "2",
          atleta_b_nome: "Carlinhos",
        },
      ];
      renderComponent({ restricoes });
      expect(screen.queryByText(/Restrição respeitada/)).not.toBeInTheDocument();
    });
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderComponent();
    expect(await axe(container)).toHaveNoViolations();
  });

  describe("T11 — acesso a partir de T09 (FE-11)", () => {
    it("sem `confirmados` (times ainda não persistidos), nenhum botão 'Substituições' aparece", () => {
      renderComponent();
      expect(
        screen.queryByRole("button", { name: /Substituições/ }),
      ).not.toBeInTheDocument();
    });

    it("com `confirmados`, mostra 'Substituições — {label real}' por time e abre T11 ao clicar", async () => {
      vi.mocked(listarSubstituicoes).mockResolvedValue([]);
      vi.mocked(fetchAtletas).mockResolvedValue([]);
      const user = userEvent.setup();
      renderComponent({ confirmados: CONFIRMADOS });

      const botaoColete = screen.getByRole("button", { name: "Substituições — Colete" });
      const botaoSemColete = screen.getByRole("button", {
        name: "Substituições — Sem Colete",
      });
      expect(botaoColete).toBeInTheDocument();
      expect(botaoSemColete).toBeInTheDocument();

      await user.click(botaoColete);

      expect(
        screen.getByRole("dialog", { name: "Substituições — Colete" }),
      ).toBeInTheDocument();
    });
  });
});
