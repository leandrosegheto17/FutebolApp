import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { AnonimizacaoZona } from "./AnonimizacaoZona";
import { anonimizarAtleta } from "./atletasApi";
import type { Atleta } from "./types";

vi.mock("./atletasApi", () => ({
  anonimizarAtleta: vi.fn(),
}));

const ATLETA: Atleta = {
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

function renderZona(onAnonimizado = vi.fn(), onSessionExpired = vi.fn()) {
  render(
    <ToastProvider>
      <AnonimizacaoZona
        atleta={ATLETA}
        onAnonimizado={onAnonimizado}
        onSessionExpired={onSessionExpired}
      />
    </ToastProvider>,
  );
  return { onAnonimizado, onSessionExpired };
}

describe("AnonimizacaoZona", () => {
  beforeEach(() => {
    vi.mocked(anonimizarAtleta).mockReset();
  });

  it("abre o TypedConfirmationModal ao clicar em 'Solicitar anonimização', foco inicial em Cancelar", async () => {
    const user = userEvent.setup();
    renderZona();

    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));

    expect(
      screen.getByRole("dialog", { name: "Anonimizar dados de Carlinhos?" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    );
  });

  it("botão de confirmação fica aria-disabled até digitar ANONIMIZAR corretamente", async () => {
    const user = userEvent.setup();
    renderZona();
    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));

    const confirmButton = screen.getByRole("button", { name: "Confirmar anonimização" });
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");

    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "anonimizar",
    );
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
    expect(anonimizarAtleta).not.toHaveBeenCalled();
  });

  it("confirmação bem-sucedida: chama a API, fecha o modal, mostra toast de sucesso e propaga o atleta atualizado", async () => {
    const anonimizado: Atleta = {
      ...ATLETA,
      nome_completo: "Atleta anonimizado",
      apelido_exibicao: "Atleta #atleta-1",
      contato: null,
      data_nascimento: null,
      ativo: false,
      anonimizado_em: "2026-09-03T00:00:00.000Z",
    };
    vi.mocked(anonimizarAtleta).mockResolvedValue(anonimizado);
    const user = userEvent.setup();
    const { onAnonimizado } = renderZona();

    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));
    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar anonimização" }));

    await waitFor(() => expect(anonimizarAtleta).toHaveBeenCalledWith("atleta-1"));
    expect(await screen.findByText("Dados pessoais anonimizados")).toBeInTheDocument();
    expect(onAnonimizado).toHaveBeenCalledWith(anonimizado);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("falha na anonimização: fecha o modal e mostra toast de erro com o texto literal do UX-SPEC.md", async () => {
    vi.mocked(anonimizarAtleta).mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    renderZona();

    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));
    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar anonimização" }));

    expect(
      await screen.findByText(
        "Não foi possível anonimizar. Nenhuma alteração foi salva.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("401 durante a anonimização: chama onSessionExpired em vez de mostrar toast de erro", async () => {
    vi.mocked(anonimizarAtleta).mockRejectedValue(new SessionExpiredError());
    const user = userEvent.setup();
    const { onSessionExpired } = renderZona();

    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));
    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar anonimização" }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText("Não foi possível anonimizar. Nenhuma alteração foi salva."),
    ).not.toBeInTheDocument();
  });

  it("cancelar fecha o modal sem chamar a API", async () => {
    const user = userEvent.setup();
    renderZona();
    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(anonimizarAtleta).not.toHaveBeenCalled();
  });

  it("sem violação de acessibilidade (axe), inclusive com o modal aberto", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ToastProvider>
        <AnonimizacaoZona
          atleta={ATLETA}
          onAnonimizado={vi.fn()}
          onSessionExpired={vi.fn()}
        />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Solicitar anonimização" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
