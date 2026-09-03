import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SessionExpiryBanner } from "./SessionExpiryBanner";

describe("SessionExpiryBanner", () => {
  it("não renderiza nada quando visible=false (default fora da janela de aviso)", () => {
    render(<SessionExpiryBanner visible={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mostra aviso não-bloqueante (role=status, aria-live polite) quando visible=true", () => {
    render(<SessionExpiryBanner visible />);
    expect(screen.getByRole("status")).toHaveTextContent("Sua sessão expira em breve");
  });

  it("botão de dispensar chama onDismiss", async () => {
    const onDismiss = vi.fn();
    render(<SessionExpiryBanner visible onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "Entendi" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<SessionExpiryBanner visible onDismiss={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
