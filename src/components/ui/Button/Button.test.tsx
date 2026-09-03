import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza o texto e responde a clique (estado default)", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Entrar</Button>);
    const button = screen.getByRole("button", { name: "Entrar" });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fica focável e recebe foco visível via teclado (focus-visible)", async () => {
    render(<Button>Salvar</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveFocus();
  });

  it("estado disabled bloqueia interação e não dispara onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Confirmar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Confirmar" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("estado loading mantém o texto visível junto ao spinner e marca aria-busy", () => {
    render(<Button loading>Confirmar Lançamento</Button>);
    const button = screen.getByRole("button", { name: "Confirmar Lançamento" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it.each(["primary", "secondary", "danger", "ghost"] as const)(
    "variante %s não tem violação de acessibilidade (axe)",
    async (variant) => {
      const { container } = render(<Button variant={variant}>Ação</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    },
  );

  it("alvo de toque mínimo: min-height/min-width aplicados via classe base", () => {
    render(<Button>Ação</Button>);
    // Verificação estrutural — a garantia visual (44x44px) vem de
    // Button.module.css (--tap-target-min); aqui garantimos que a classe
    // base (portadora da regra) está presente.
    expect(screen.getByRole("button").className).toMatch(/button/);
  });
});
