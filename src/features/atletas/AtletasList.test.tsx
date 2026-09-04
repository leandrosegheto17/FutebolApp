import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { AtletasList } from "./AtletasList";
import { fetchAtletas } from "./atletasApi";
import type { Atleta } from "./types";

vi.mock("./atletasApi", () => ({
  fetchAtletas: vi.fn(),
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
// Objeto estável entre renders (mesma referência) — mimetiza o
// comportamento real de `useRouter()` do `next/navigation`, que memoiza a
// instância do router. Um mock que devolvesse um objeto literal novo a
// cada chamada quebraria a estabilidade de identidade de
// `useHandleSessionExpired` (que depende de `router` em seu próprio
// `useCallback`), disparando um laço de re-render/novo fetch infinito no
// `useEffect([load])` deste componente — armadilha específica de teste,
// não um bug do componente em produção.
const routerMock = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/atletas",
}));

const ATIVO: Atleta = {
  id: "atleta-1",
  nome_completo: "Carlinhos Silva",
  apelido_exibicao: "Carlinhos",
  contato: "11999990000",
  data_nascimento: "1995-04-10",
  consentimento_responsavel_obtido: false,
  pontuacao_inicial: 0,
  ativo: true,
  anonimizado_em: null,
  criado_em: "2026-01-01T00:00:00.000Z",
  nivel_tecnico: 3.5,
  rodadas_presentes: 10,
};

const ANONIMIZADO: Atleta = {
  ...ATIVO,
  id: "atleta-2",
  nome_completo: "Atleta anonimizado",
  apelido_exibicao: "Atleta #atleta-2",
  contato: null,
  data_nascimento: null,
  ativo: false,
  anonimizado_em: "2026-08-01T00:00:00.000Z",
};

function renderList() {
  return render(
    <ToastProvider>
      <AtletasList />
    </ToastProvider>,
  );
}

describe("AtletasList", () => {
  beforeEach(() => {
    vi.mocked(fetchAtletas).mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("mostra o skeleton de carregamento antes da resposta chegar", async () => {
    let resolvePromise: (items: Atleta[]) => void = () => {};
    vi.mocked(fetchAtletas).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    renderList();

    expect(
      screen.getByRole("status", { name: "Carregando atletas" }),
    ).toBeInTheDocument();
    resolvePromise([]);
    await screen.findByText("Nenhum atleta cadastrado ainda");
  });

  it("estado vazio: nenhum atleta cadastrado ainda", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    renderList();
    expect(await screen.findByText("Nenhum atleta cadastrado ainda")).toBeInTheDocument();
  });

  it("estado de sucesso: lista os atletas com nível técnico e navega para edição ao clicar", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([ATIVO]);
    renderList();

    expect(await screen.findByText("Carlinhos Silva")).toBeInTheDocument();
    expect(screen.getByText("Nível técnico: 3.50")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Carlinhos Silva/ })).toHaveAttribute(
      "href",
      "/atletas/atleta-1",
    );
  });

  it("atleta anonimizado mostra badge 'Anonimizado' (nunca só cor)", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([ANONIMIZADO]);
    renderList();
    expect(await screen.findByText("Anonimizado")).toBeInTheDocument();
  });

  it("estado de erro: mensagem genérica + botão de tentar novamente refaz a busca", async () => {
    vi.mocked(fetchAtletas).mockRejectedValueOnce(new Error("falhou"));
    const user = userEvent.setup();
    renderList();

    expect(
      await screen.findByText(
        "Não foi possível carregar os atletas agora. Tente novamente.",
      ),
    ).toBeInTheDocument();

    vi.mocked(fetchAtletas).mockResolvedValueOnce([ATIVO]);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Carlinhos Silva")).toBeInTheDocument();
  });

  it("401 na busca inicial: redireciona para o login (FE-12), sem mostrar a mensagem de erro genérica", async () => {
    vi.mocked(fetchAtletas).mockRejectedValue(new SessionExpiredError());
    renderList();

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fatletas"),
    );
    expect(
      screen.queryByText("Não foi possível carregar os atletas agora. Tente novamente."),
    ).not.toBeInTheDocument();
  });

  it("botão 'Novo atleta' navega para /atletas/novo", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([]);
    const user = userEvent.setup();
    renderList();

    await screen.findByText("Nenhum atleta cadastrado ainda");
    await user.click(screen.getByRole("button", { name: "Novo atleta" }));

    expect(pushMock).toHaveBeenCalledWith("/atletas/novo");
  });

  it("sem violação de acessibilidade (axe) no estado de sucesso", async () => {
    vi.mocked(fetchAtletas).mockResolvedValue([ATIVO]);
    const { container } = renderList();
    await screen.findByText("Carlinhos Silva");
    expect(await axe(container)).toHaveNoViolations();
  });
});
