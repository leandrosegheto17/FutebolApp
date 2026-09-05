import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MedalBadge } from "./MedalBadge";

describe("MedalBadge", () => {
  it("renderiza o emoji de medalha correto por posição (decorativo)", () => {
    const { container, rerender } = render(<MedalBadge position={1} />);
    expect(container).toHaveTextContent("🥇");
    rerender(<MedalBadge position={2} />);
    expect(container).toHaveTextContent("🥈");
    rerender(<MedalBadge position={3} />);
    expect(container).toHaveTextContent("🥉");
  });

  it("o emoji é aria-hidden (não é a fonte do nome acessível)", () => {
    const { container } = render(<MedalBadge position={1} />);
    const emojiEl = container.querySelector('[aria-hidden="true"]');
    expect(emojiEl).toHaveTextContent("🥇");
  });

  it("correção de a11y obrigatória (UX-SPEC.md Seção 2.2/5.4): sempre expõe o texto ordinal equivalente, mesmo visualmente oculto", () => {
    render(<MedalBadge position={1} />);
    expect(screen.getByText("1º lugar")).toBeInTheDocument();
    expect(screen.getByText("1º lugar")).toHaveClass("sr-only");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<MedalBadge position={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
