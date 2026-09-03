import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("começa oculta por padrão (type=password) — default", () => {
    render(<PasswordInput label="Senha" />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });

  it("toggle alterna visibilidade e aria-pressed/rótulo textual", async () => {
    render(<PasswordInput label="Senha" />);
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("autocomplete padrão é current-password", () => {
    render(<PasswordInput label="Senha" />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("estado disabled bloqueia edição", () => {
    render(<PasswordInput label="Senha" disabled />);
    expect(screen.getByLabelText("Senha")).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<PasswordInput label="Senha" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
