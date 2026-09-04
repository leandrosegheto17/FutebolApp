import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { SESSION_TTL_MS } from "@/modules/autenticacao/constants";
import { SESSION_WARNING_BEFORE_EXPIRY_MS } from "./useSessionExpiryWarning";
import { SessionExpiryStatus } from "./SessionExpiryStatus";

describe("SessionExpiryStatus", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("não renderiza nenhum aviso visível antes da janela de expiração", () => {
    render(<SessionExpiryStatus />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renderiza o SessionExpiryBanner (role=status) ao atingir a janela de 2 min", () => {
    render(<SessionExpiryStatus />);

    act(() => {
      vi.advanceTimersByTime(SESSION_TTL_MS - SESSION_WARNING_BEFORE_EXPIRY_MS);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sua sessão expira em breve — salve o que estiver fazendo.",
    );
  });

  it('botão "Entendi" dispensa o aviso', () => {
    // `fireEvent` (síncrono) em vez de `userEvent` aqui — `userEvent`
    // depende internamente de timers reais mesmo com `delay: null`, o que
    // trava sob `vi.useFakeTimers()` (LoginForm.test.tsx, por comparação,
    // não precisa de fake timers e usa `userEvent` normalmente).
    render(<SessionExpiryStatus />);
    act(() => {
      vi.advanceTimersByTime(SESSION_TTL_MS - SESSION_WARNING_BEFORE_EXPIRY_MS);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe) com o aviso visível", async () => {
    const { container } = render(<SessionExpiryStatus />);
    act(() => {
      vi.advanceTimersByTime(SESSION_TTL_MS - SESSION_WARNING_BEFORE_EXPIRY_MS);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    // `jest-axe` roda checagens assíncronas reais (não mockadas pelos fake
    // timers) — trocar para timers reais só para a chamada do `axe` evita
    // que a Promise interna dele fique pendurada esperando um timer que os
    // fake timers nunca disparam sozinhos.
    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });
});
