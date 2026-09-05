import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Icon, type IconName } from "./Icon";

const ALL_NAMES: IconName[] = [
  "lock",
  "alert-triangle",
  "eye",
  "eye-off",
  "zap",
  "more-vertical",
  "menu",
];

describe("Icon", () => {
  it("é aria-hidden por padrão — decorativo, texto adjacente é a fonte da informação (UX-SPEC.md Seção 3.4)", () => {
    const { container } = render(<Icon name="lock" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("expõe role=img e aria-label quando não há texto adjacente equivalente", () => {
    const { container } = render(<Icon name="eye" aria-label="Mostrar senha" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Mostrar senha");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("nunca fica focável diretamente (o elemento interativo pai é que recebe foco)", () => {
    const { container } = render(<Icon name="menu" />);
    expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
  });

  it("herda a cor do texto ao redor via currentColor (não define cor própria)", () => {
    const { container } = render(<Icon name="zap" />);
    expect(container.querySelector("svg")).toHaveAttribute("stroke", "currentColor");
  });

  it.each(ALL_NAMES)(
    "glifo %s sem violação de acessibilidade (axe), decorativo",
    async (name) => {
      const { container } = render(<Icon name={name} />);
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it.each(ALL_NAMES)(
    "glifo %s sem violação de acessibilidade (axe), com aria-label",
    async (name) => {
      const { container } = render(<Icon name={name} aria-label="Rótulo de teste" />);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
