import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { LoginForm } from "./LoginForm";
import { login, LoginError } from "./loginApi";
import { LOGIN_TECHNICAL_ERROR_MESSAGE } from "./constants";
import { ROUTES } from "@/lib/routes";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => searchParams,
}));

vi.mock("./loginApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./loginApi")>();
  return { ...actual, login: vi.fn() };
});

describe("LoginForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    vi.mocked(login).mockReset();
    searchParams = new URLSearchParams();
  });

  it("estado inicial: campo único de senha, botão Entrar e link de retorno ao ranking sempre visíveis", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/^Senha/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← Voltar ao ranking público" }),
    ).toHaveAttribute("href", ROUTES.rankingPublico);

    // Não há segundo campo (usuário/e-mail) — RN-12/ADR-004, senha única.
    expect(screen.queryByLabelText(/usu[aá]rio|e-?mail/i)).not.toBeInTheDocument();
    // Sem erro no estado inicial.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it(
    "FE-R01: hero navy com título real 'Acesso interno' (h1, não o wordmark) e " +
      "`BrandCrest` decorativo (subtítulo adjacente já identifica a marca por extenso)",
    () => {
      const { container } = render(<LoginForm />);

      expect(
        screen.getByRole("heading", { level: 1, name: "Acesso interno" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Organização · Turma do Rola")).toBeInTheDocument();

      // Não repete o wordmark completo "Turma do Rola" como título grande
      // dentro do cartão (UX-SPEC.md Parte II Seção 2.1, correção da
      // revisão 2 — esse wordmark fica reservado para T02/T03/`TopNav`).
      expect(
        screen.queryByRole("heading", { name: /^turma do rola$/i }),
      ).not.toBeInTheDocument();

      // `BrandCrest` grande é decorativo aqui (o subtítulo já identifica a
      // marca por extenso) — nenhum `role="img"` duplicado no cartão.
      expect(container.querySelector('[role="img"]')).not.toBeInTheDocument();
      expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    },
  );

  it("toggle de mostrar/ocultar senha é acessível (aria-pressed + rótulo textual, não só ícone)", async () => {
    render(<LoginForm />);
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);

    expect(screen.getByLabelText(/^Senha/)).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("não envia a requisição se a senha estiver vazia (defesa em profundidade além do `required` nativo)", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(login).not.toHaveBeenCalled();
  });

  it("estado de carregando: botão em loading e campo desabilitado durante o envio", async () => {
    let resolveLogin: () => void = () => {};
    vi.mocked(login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = () => resolve(undefined);
      }),
    );

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^Senha/), "qualquer-senha");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("button", { name: "Entrar" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByLabelText(/^Senha/)).toBeDisabled();

    resolveLogin();
    await screen.findByRole("button", { name: "Entrar" });
  });

  it(
    "estado de erro: mensagem genérica anunciada via região viva assertiva " +
      "(role=alert, aria-live implícito) — link de retorno ao ranking continua visível",
    async () => {
      vi.mocked(login).mockRejectedValue(new LoginError("Senha incorreta."));

      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/^Senha/), "senha-errada");
      await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Senha incorreta.");

      // Idêntico esteja a falha por senha incorreta ou por bloqueio de rate
      // limiting (RF-07.3) — o componente nunca exibe nada além do texto
      // devolvido pelo servidor, não inventa um rótulo "bloqueado" à parte.
      expect(screen.queryByText(/bloquead/i)).not.toBeInTheDocument();

      expect(
        screen.getByRole("link", { name: "← Voltar ao ranking público" }),
      ).toBeInTheDocument();

      // Envio não é bem-sucedido -> nenhum redirecionamento ocorre.
      expect(replaceMock).not.toHaveBeenCalled();
      // Botão volta ao estado normal, permitindo nova tentativa.
      expect(screen.getByRole("button", { name: "Entrar" })).not.toHaveAttribute(
        "aria-busy",
      );
    },
  );

  it("erro técnico (classe diferente de RF-07.3) usa mensagem própria, nunca a de senha incorreta", async () => {
    vi.mocked(login).mockRejectedValue(new Error("falha inesperada"));

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^Senha/), "qualquer");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(LOGIN_TECHNICAL_ERROR_MESSAGE);
  });

  it("sucesso sem parâmetro de redirect: navega para o destino padrão (T05)", async () => {
    vi.mocked(login).mockResolvedValue(undefined);

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^Senha/), "senha-correta");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(ROUTES.lancamentoRodada);
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it('sucesso com "?redirect=" válido: retorna à última tela interna acessada', async () => {
    searchParams = new URLSearchParams({ redirect: "/historico" });
    vi.mocked(login).mockResolvedValue(undefined);

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^Senha/), "senha-correta");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/historico");
    });
  });

  it('sucesso com "?redirect=" malicioso (open redirect): ignora e usa o destino padrão', async () => {
    searchParams = new URLSearchParams({ redirect: "https://evil.example.com" });
    vi.mocked(login).mockResolvedValue(undefined);

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^Senha/), "senha-correta");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(ROUTES.lancamentoRodada);
    });
  });

  it("sem violação de acessibilidade (axe) no estado inicial", async () => {
    const { container } = render(<LoginForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violação de acessibilidade (axe) no estado de erro", async () => {
    vi.mocked(login).mockRejectedValue(new LoginError("Senha incorreta."));
    const { container } = render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^Senha/), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByRole("alert");

    expect(await axe(container)).toHaveNoViolations();
  });
});
