import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import type { Atleta } from "@/features/atletas/types";
import { RestricaoFormModal } from "./RestricaoFormModal";
import {
  RestricaoAtletaNaoEncontradoError,
  RestricaoNaoEncontradaError,
  RestricaoValidationError,
  atualizarRestricao,
  criarRestricao,
} from "./restricoesApi";
import type { Restricao } from "./types";

vi.mock("./restricoesApi", async () => {
  const actual =
    await vi.importActual<typeof import("./restricoesApi")>("./restricoesApi");
  return { ...actual, criarRestricao: vi.fn(), atualizarRestricao: vi.fn() };
});

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
  atleta({ id: "3", apelido_exibicao: "Rafa" }),
];

const RESTRICAO_EXISTENTE: Restricao = {
  id: "restricao-1",
  atleta_a_id: "1",
  atleta_a_nome: "João Pedro",
  atleta_b_id: "2",
  atleta_b_nome: "Carlinhos",
  ativo: true,
  desativado_em: null,
  criado_em: "2026-01-01T00:00:00Z",
};

function renderModal(overrides: Partial<Parameters<typeof RestricaoFormModal>[0]> = {}) {
  return render(
    <ToastProvider>
      <RestricaoFormModal
        open
        atletas={ATLETAS}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        {...overrides}
      />
    </ToastProvider>,
  );
}

describe("RestricaoFormModal (T10, FE-10)", () => {
  beforeEach(() => {
    vi.mocked(criarRestricao).mockReset();
    vi.mocked(atualizarRestricao).mockReset();
    replaceMock.mockReset();
  });

  it("modo criação: título 'Nova restrição', campos vazios", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Nova restrição" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Atleta A" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Atleta B" })).toHaveValue("");
  });

  it("modo edição: título 'Editar restrição', campos pré-preenchidos com os nomes atuais", () => {
    renderModal({ restricao: RESTRICAO_EXISTENTE });
    expect(screen.getByRole("dialog", { name: "Editar restrição" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Atleta A" })).toHaveValue("João Pedro");
    expect(screen.getByRole("combobox", { name: "Atleta B" })).toHaveValue("Carlinhos");
  });

  it("valida localmente: bloqueia envio com os dois campos vazios", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findAllByText("Selecione um atleta.")).toHaveLength(2);
    expect(criarRestricao).not.toHaveBeenCalled();
  });

  it("valida localmente: bloqueia par com o mesmo atleta nos dois campos", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("combobox", { name: "Atleta A" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta B" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Selecione dois atletas diferentes."),
    ).toBeInTheDocument();
    expect(criarRestricao).not.toHaveBeenCalled();
  });

  it("cria com sucesso: envia o corpo correto e chama onSaved", async () => {
    const onSaved = vi.fn();
    vi.mocked(criarRestricao).mockResolvedValue(RESTRICAO_EXISTENTE);
    const user = userEvent.setup();
    renderModal({ onSaved });

    await user.type(screen.getByRole("combobox", { name: "Atleta A" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta B" }), "Carl");
    await user.click(screen.getByRole("option", { name: "Carlinhos" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(criarRestricao).toHaveBeenCalledWith({ atleta_a_id: "1", atleta_b_id: "2" }),
    );
    expect(onSaved).toHaveBeenCalledWith(RESTRICAO_EXISTENTE);
  });

  it("edita com sucesso: chama atualizarRestricao com o id existente", async () => {
    const onSaved = vi.fn();
    const atualizada = {
      ...RESTRICAO_EXISTENTE,
      atleta_b_id: "3",
      atleta_b_nome: "Rafa",
    };
    vi.mocked(atualizarRestricao).mockResolvedValue(atualizada);
    const user = userEvent.setup();
    renderModal({ restricao: RESTRICAO_EXISTENTE, onSaved });

    const campoB = screen.getByRole("combobox", { name: "Atleta B" });
    await user.clear(campoB);
    await user.type(campoB, "Rafa");
    await user.click(screen.getByRole("option", { name: "Rafa" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(atualizarRestricao).toHaveBeenCalledWith("restricao-1", {
        atleta_a_id: "1",
        atleta_b_id: "3",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(atualizada);
  });

  it("erro de validação do servidor (400) é mapeado para o campo correto", async () => {
    vi.mocked(criarRestricao).mockRejectedValue(
      new RestricaoValidationError("Requisição inválida.", [
        { path: ["atleta_b_id"], message: "Deve ser diferente de atleta_a_id." },
      ]),
    );
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("combobox", { name: "Atleta A" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta B" }), "Carl");
    await user.click(screen.getByRole("option", { name: "Carlinhos" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Deve ser diferente de atleta_a_id."),
    ).toBeInTheDocument();
  });

  it("404 de atleta referenciado inexistente mostra a mensagem literal de erro do UX-SPEC.md", async () => {
    vi.mocked(criarRestricao).mockRejectedValue(new RestricaoAtletaNaoEncontradoError());
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("combobox", { name: "Atleta A" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta B" }), "Carl");
    await user.click(screen.getByRole("option", { name: "Carlinhos" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Não foi possível salvar a restrição"),
    ).toBeInTheDocument();
  });

  it("404 de restrição inexistente (edição) também usa o erro genérico literal", async () => {
    vi.mocked(atualizarRestricao).mockRejectedValue(new RestricaoNaoEncontradaError());
    const user = userEvent.setup();
    renderModal({ restricao: RESTRICAO_EXISTENTE });

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Não foi possível salvar a restrição"),
    ).toBeInTheDocument();
  });

  it("401 aciona o fluxo de sessão expirada", async () => {
    vi.mocked(criarRestricao).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("combobox", { name: "Atleta A" }), "João");
    await user.click(screen.getByRole("option", { name: "João Pedro" }));
    await user.type(screen.getByRole("combobox", { name: "Atleta B" }), "Carl");
    await user.click(screen.getByRole("option", { name: "Carlinhos" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("editar um par cujo atleta se tornou inativo ainda mostra o nome já resolvido pelo servidor", () => {
    const restricaoComInativo: Restricao = {
      ...RESTRICAO_EXISTENTE,
      atleta_b_id: "99",
      atleta_b_nome: "Ex-Atleta",
    };
    renderModal({ restricao: restricaoComInativo, atletas: ATLETAS });
    expect(screen.getByRole("combobox", { name: "Atleta B" })).toHaveValue("Ex-Atleta");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderModal();
    expect(await axe(container)).toHaveNoViolations();
  });
});
