import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider, useToast } from "./ToastProvider";
import { AlertBanner } from "./AlertBanner";

function Trigger() {
  const { showToast } = useToast();
  return (
    <div>
      <button
        onClick={() =>
          showToast({ variant: "success", message: "Atleta salvo com sucesso" })
        }
      >
        Salvar (sucesso)
      </button>
      <button
        onClick={() =>
          showToast({
            variant: "danger",
            message: "Não foi possível salvar. Tente novamente.",
          })
        }
      >
        Salvar (erro)
      </button>
    </div>
  );
}

describe("Toast", () => {
  it("toast de sucesso aparece em região aria-live=polite", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar (sucesso)" }));
    const message = await screen.findByText("Atleta salvo com sucesso");
    const politeRegion = message.closest('[aria-live="polite"]');
    expect(politeRegion).not.toBeNull();
  });

  it("toast de erro crítico aparece em região aria-live=assertive", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar (erro)" }));
    const message = await screen.findByText("Não foi possível salvar. Tente novamente.");
    const assertiveRegion = message.closest('[aria-live="assertive"]');
    expect(assertiveRegion).not.toBeNull();
  });

  it("botão de fechar remove o toast", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar (sucesso)" }));
    await screen.findByText("Atleta salvo com sucesso");
    await userEvent.click(screen.getByRole("button", { name: "Fechar notificação" }));
    await waitFor(() =>
      expect(screen.queryByText("Atleta salvo com sucesso")).not.toBeInTheDocument(),
    );
  });

  it("useToast fora do provider lança erro claro", () => {
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
  });
});

describe("AlertBanner", () => {
  it("variant danger usa role=alert", () => {
    render(
      <AlertBanner variant="danger">Sessão expirada, faça login novamente.</AlertBanner>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Sessão expirada");
  });

  it("variant info usa role=status (polite)", () => {
    render(<AlertBanner variant="info">Sua sessão expira em breve.</AlertBanner>);
    expect(screen.getByRole("status")).toHaveTextContent("expira em breve");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <AlertBanner variant="warning">Já existe rodada nesta data.</AlertBanner>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
