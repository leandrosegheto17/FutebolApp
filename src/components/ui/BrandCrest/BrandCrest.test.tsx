import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { BrandCrest } from "./BrandCrest";

describe("BrandCrest", () => {
  it("por padrão é a fonte da identidade visual — role=img + aria-label (default 'Grupo Rola Futebol')", () => {
    const { container } = render(<BrandCrest />);
    const crest = container.querySelector('[role="img"]');
    expect(crest).toBeInTheDocument();
    expect(crest).toHaveAttribute("aria-label", "Grupo Rola Futebol");
  });

  it("aceita título acessível customizado", () => {
    const { container } = render(<BrandCrest title="Turma do Rola" />);
    expect(container.querySelector('[role="img"]')).toHaveAttribute(
      "aria-label",
      "Turma do Rola",
    );
  });

  it("modo decorativo (texto adjacente já identifica a marca) é aria-hidden, sem role=img", () => {
    const { container } = render(<BrandCrest decorative />);
    expect(container.querySelector('[role="img"]')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it.each(["large", "compact"] as const)(
    "tamanho %s sem violação de acessibilidade (axe)",
    async (size) => {
      const { container } = render(<BrandCrest size={size} />);
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it("modo decorativo também sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<BrandCrest decorative />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
