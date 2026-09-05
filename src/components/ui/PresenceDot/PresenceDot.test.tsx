import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { PresenceDot } from "./PresenceDot";

describe("PresenceDot", () => {
  it("mostra a letra visível dentro do dot (paridade com o mockup real)", () => {
    render(<PresenceDot status="presente" />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("expõe o rótulo por extenso via aria-label (nunca só a letra solta por voz)", () => {
    render(<PresenceDot status="presente" />);
    expect(screen.getByRole("img", { name: "Presente" })).toBeInTheDocument();
  });

  it("cobre os 3 status com rótulo correto", () => {
    const { rerender } = render(<PresenceDot status="ausente" />);
    expect(screen.getByRole("img", { name: "Ausente" })).toBeInTheDocument();
    rerender(<PresenceDot status="lesionado" />);
    expect(screen.getByRole("img", { name: "Lesionado" })).toBeInTheDocument();
  });

  it("modo decorativo: aria-hidden, sem role=img (usado quando um texto adjacente já anuncia o status)", () => {
    render(<PresenceDot status="presente" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("P")).toHaveAttribute("aria-hidden", "true");
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(<PresenceDot status="lesionado" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
