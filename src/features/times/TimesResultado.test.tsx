import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { TimesResultado } from "./TimesResultado";
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
      label: "Time A",
      atletas: [
        { atleta_id: "1", apelido_exibicao: "João" },
        { atleta_id: "2", apelido_exibicao: "Carlinhos" },
      ],
    },
    {
      time_id: "t2",
      label: "Time B",
      atletas: [{ atleta_id: "3", apelido_exibicao: "Rafa" }],
    },
  ],
};

function renderComponent(overrides: Partial<Parameters<typeof TimesResultado>[0]> = {}) {
  const onSwap = vi.fn();
  const onConfirmar = vi.fn();
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
        {...overrides}
      />
    </ToastProvider>,
  );
  return { ...utils, onSwap, onConfirmar };
}

describe("TimesResultado", () => {
  it("exibe os dois times lado a lado com indicadores de equilíbrio (nível técnico/idade médios)", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: "Time A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Time B" })).toBeInTheDocument();
    const cardTimeA = screen.getByRole("heading", { name: "Time A" }).closest("div")!;
    expect(
      within(cardTimeA).getByText(/Nível técnico médio: 5.00 · Idade média: 26.0/),
    ).toBeInTheDocument();
    const cardTimeB = screen.getByRole("heading", { name: "Time B" }).closest("div")!;
    expect(
      within(cardTimeB).getByText(/Nível técnico médio: 5.00 · Idade média: 25.0/),
    ).toBeInTheDocument();
  });

  it("indicadores `null` (fallback) são exibidos como '—', nunca um número inventado", () => {
    renderComponent({
      times: [
        { indice: 0, atletas: [], nivel_tecnico_medio: null, idade_media: null },
        { indice: 1, atletas: [], nivel_tecnico_medio: null, idade_media: null },
      ],
    });
    expect(screen.getAllByText(/Nível técnico médio: —/)).toHaveLength(2);
  });

  it("clicar em 'Trocar' abre o modal de seleção com candidatos do outro time", async () => {
    const user = userEvent.setup();
    renderComponent();

    const linhaJoao = screen.getByText("João").closest("li")!;
    await user.click(within(linhaJoao).getByRole("button", { name: "Trocar" }));

    expect(
      screen.getByRole("heading", { name: "Trocar João com quem?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rafa/ })).toBeInTheDocument();
    // Não lista atletas do mesmo time como candidato (Carlinhos está no Time A, junto com João).
    expect(screen.queryByRole("button", { name: /Carlinhos/ })).not.toBeInTheDocument();
  });

  it("selecionar um candidato chama onSwap com os dois ids e fecha o modal", async () => {
    const user = userEvent.setup();
    const { onSwap } = renderComponent();

    const linhaJoao = screen.getByText("João").closest("li")!;
    await user.click(within(linhaJoao).getByRole("button", { name: "Trocar" }));
    await user.click(screen.getByRole("button", { name: /Rafa/ }));

    expect(onSwap).toHaveBeenCalledWith("1", "3");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderComponent();
    expect(await axe(container)).toHaveNoViolations();
  });

  describe("T11 — acesso a partir de T09 (FE-11)", () => {
    it("sem `confirmados` (times ainda não persistidos), nenhum botão 'Substituições' aparece", () => {
      renderComponent();
      expect(
        screen.queryByRole("button", { name: "Substituições" }),
      ).not.toBeInTheDocument();
    });

    it("com `confirmados` casando por rótulo, mostra 'Substituições' por time e abre T11 ao clicar", async () => {
      vi.mocked(listarSubstituicoes).mockResolvedValue([]);
      vi.mocked(fetchAtletas).mockResolvedValue([]);
      const user = userEvent.setup();
      renderComponent({ confirmados: CONFIRMADOS });

      const botoes = screen.getAllByRole("button", { name: "Substituições" });
      expect(botoes).toHaveLength(2);

      await user.click(botoes[0]!);

      expect(
        screen.getByRole("dialog", { name: "Substituições — Time A" }),
      ).toBeInTheDocument();
    });
  });
});
