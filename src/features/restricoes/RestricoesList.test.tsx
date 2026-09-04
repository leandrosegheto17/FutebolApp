import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import type { Atleta } from "@/features/atletas/types";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import { RestricoesList } from "./RestricoesList";
import {
  criarRestricao,
  desativarRestricao,
  listarRestricoes,
  reativarRestricao,
} from "./restricoesApi";
import type { Restricao } from "./types";

vi.mock("./restricoesApi", async () => {
  const actual =
    await vi.importActual<typeof import("./restricoesApi")>("./restricoesApi");
  return {
    ...actual,
    listarRestricoes: vi.fn(),
    criarRestricao: vi.fn(),
    atualizarRestricao: vi.fn(),
    desativarRestricao: vi.fn(),
    reativarRestricao: vi.fn(),
  };
});

vi.mock("@/features/atletas/atletasApi", () => ({ fetchAtletas: vi.fn() }));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => "/restricoes",
}));

function atleta(overrides: Partial<Atleta> = {}): Atleta {
  return {
    id: "1",
    nome_completo: "João Pedro Silva",
    apelido_exibicao: "João Pedro",
    contato: null,
    data_nascimento: null,
    consentimento_responsavel_obtido: false,
    pontuacao_inicial: 0,
    ativo: true,
    anonimizado_em: null,
    criado_em: "2026-01-01T00:00:00Z",
    nivel_tecnico: 5,
    rodadas_presentes: 10,
    ...overrides,
  };
}

const ATLETAS: Atleta[] = [
  atleta({ id: "1", apelido_exibicao: "João Pedro" }),
  atleta({ id: "2", apelido_exibicao: "Carlinhos" }),
];

const RESTRICAO_ATIVA: Restricao = {
  id: "restricao-1",
  atleta_a_id: "1",
  atleta_a_nome: "João Pedro",
  atleta_b_id: "2",
  atleta_b_nome: "Carlinhos",
  ativo: true,
  desativado_em: null,
  criado_em: "2026-01-01T00:00:00Z",
};

const RESTRICAO_DESATIVADA: Restricao = {
  id: "restricao-2",
  atleta_a_id: "1",
  atleta_a_nome: "Rafa",
  atleta_b_id: "2",
  atleta_b_nome: "Marquinhos",
  ativo: false,
  desativado_em: "2026-08-20T12:00:00Z",
  criado_em: "2026-01-01T00:00:00Z",
};

/**
 * `<p>` do par ("Nome A ⚡ Nome B") é composto por vários nós de texto/`span`
 * (o ícone precisa ficar isolado num `<span aria-hidden>` próprio, WCAG
 * 1.1.1) — `getByText`/`findByText` não casam texto que atravessa fronteira
 * de elemento por padrão, então usamos um matcher de função que confere o
 * `textContent` completo do próprio `<p>`.
 */
function pairMatcher(nomeA: string, nomeB: string) {
  const esperado = `${nomeA} ⚡ ${nomeB}`;
  return (_: string, element: Element | null) =>
    element?.tagName.toLowerCase() === "p" && element.textContent === esperado;
}

function renderList() {
  return render(
    <ToastProvider>
      <RestricoesList />
    </ToastProvider>,
  );
}

describe("RestricoesList (T10, FE-10)", () => {
  beforeEach(() => {
    vi.mocked(listarRestricoes).mockReset();
    vi.mocked(criarRestricao).mockReset();
    vi.mocked(desativarRestricao).mockReset();
    vi.mocked(reativarRestricao).mockReset();
    vi.mocked(fetchAtletas).mockReset();
    replaceMock.mockReset();
  });

  it("mostra skeleton de carregamento e depois a lista vazia (texto literal do UX-SPEC.md)", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderList();

    expect(
      screen.getByRole("status", { name: "Carregando restrições" }),
    ).toBeInTheDocument();
    await screen.findByText("Nenhuma restrição obrigatória cadastrada");
  });

  it("renderiza cada par com o texto explicativo literal e o status correto (ativa/desativada com data)", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([
      RESTRICAO_ATIVA,
      RESTRICAO_DESATIVADA,
    ]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    renderList();

    await screen.findByText(pairMatcher("João Pedro", "Carlinhos"));
    expect(screen.getAllByText("(não podem ficar no mesmo time)")).toHaveLength(2);
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("Desativada em 20/08/2026")).toBeInTheDocument();
    // Nunca remove do histórico visual (RN-11) — as duas linhas continuam
    // presentes simultaneamente.
    expect(screen.getByText(pairMatcher("Rafa", "Marquinhos"))).toBeInTheDocument();
  });

  it("restrição ativa mostra 'Editar'/'Desativar'; desativada mostra só 'Reativar'", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([
      RESTRICAO_ATIVA,
      RESTRICAO_DESATIVADA,
    ]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    renderList();

    await screen.findByText(pairMatcher("João Pedro", "Carlinhos"));
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reativar" })).toBeInTheDocument();
  });

  it("'+ Nova restrição' abre a modal em modo criação", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    const user = userEvent.setup();
    renderList();

    await screen.findByText("Nenhuma restrição obrigatória cadastrada");
    await user.click(screen.getByRole("button", { name: "+ Nova restrição" }));
    expect(screen.getByRole("dialog", { name: "Nova restrição" })).toBeInTheDocument();
  });

  it("criar com sucesso adiciona o novo par à lista e mostra toast", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    vi.mocked(criarRestricao).mockResolvedValue(RESTRICAO_ATIVA);
    const user = userEvent.setup();
    renderList();

    await screen.findByText("Nenhuma restrição obrigatória cadastrada");
    await user.click(screen.getByRole("button", { name: "+ Nova restrição" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta A" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta B" }), "Carl");
    await user.click(screen.getByRole("option", { name: "Carlinhos" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await screen.findByText(pairMatcher("João Pedro", "Carlinhos"));
    await screen.findByText("Restrição criada.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Editar' abre a modal pré-preenchida com o par atual", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([RESTRICAO_ATIVA]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    const user = userEvent.setup();
    renderList();

    await screen.findByText(pairMatcher("João Pedro", "Carlinhos"));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar restrição" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Atleta A" })).toHaveValue("João Pedro");
  });

  it("'Desativar' chama a API, atualiza a linha (soft-delete visível, nunca remove) e mostra toast", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([RESTRICAO_ATIVA]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    const desativada = {
      ...RESTRICAO_ATIVA,
      ativo: false,
      desativado_em: "2026-09-04T12:00:00Z",
    };
    vi.mocked(desativarRestricao).mockResolvedValue(desativada);
    const user = userEvent.setup();
    renderList();

    await screen.findByText(pairMatcher("João Pedro", "Carlinhos"));
    await user.click(screen.getByRole("button", { name: "Desativar" }));

    expect(desativarRestricao).toHaveBeenCalledWith("restricao-1");
    await screen.findByText("Desativada em 04/09/2026");
    // A linha permanece na lista (nunca removida — RN-11).
    expect(screen.getByText(pairMatcher("João Pedro", "Carlinhos"))).toBeInTheDocument();
    await screen.findByText("Restrição desativada.");
    expect(screen.getByRole("button", { name: "Reativar" })).toBeInTheDocument();
  });

  it("'Reativar' chama a API e atualiza a linha de volta para ativa", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([RESTRICAO_DESATIVADA]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    const reativada = { ...RESTRICAO_DESATIVADA, ativo: true, desativado_em: null };
    vi.mocked(reativarRestricao).mockResolvedValue(reativada);
    const user = userEvent.setup();
    renderList();

    await screen.findByText(pairMatcher("Rafa", "Marquinhos"));
    await user.click(screen.getByRole("button", { name: "Reativar" }));

    expect(reativarRestricao).toHaveBeenCalledWith("restricao-2");
    await waitFor(() => expect(screen.getByText("Ativa")).toBeInTheDocument());
    await screen.findByText("Restrição reativada.");
  });

  it("401 ao carregar aciona o fluxo de sessão expirada", async () => {
    vi.mocked(listarRestricoes).mockRejectedValue(new SessionExpiredError());
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderList();

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("erro ao carregar mostra banner com retry", async () => {
    vi.mocked(listarRestricoes).mockRejectedValueOnce(new Error("falha técnica"));
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    const user = userEvent.setup();
    renderList();

    await screen.findByText(
      "Não foi possível carregar as restrições agora. Tente novamente.",
    );

    vi.mocked(listarRestricoes).mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByText("Nenhuma restrição obrigatória cadastrada");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    vi.mocked(listarRestricoes).mockResolvedValue([
      RESTRICAO_ATIVA,
      RESTRICAO_DESATIVADA,
    ]);
    vi.mocked(fetchAtletas).mockResolvedValue(ATLETAS);
    const { container } = renderList();
    await screen.findByText(pairMatcher("João Pedro", "Carlinhos"));
    expect(await axe(container)).toHaveNoViolations();
  });
});
