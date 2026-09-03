import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renderiza texto (nunca só cor/ícone) — default", () => {
    render(<Badge variant="success">Presente</Badge>);
    expect(screen.getByText("Presente")).toBeInTheDocument();
  });

  it("ícone decorativo é aria-hidden, texto continua a fonte da informação", () => {
    render(
      <Badge variant="danger" icon={<span>🟥</span>}>
        Ausente
      </Badge>,
    );
    expect(screen.getByText("Ausente")).toBeInTheDocument();
    const icon = document.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it.each(["success", "warning", "danger", "info", "neutral"] as const)(
    "variante %s sem violação de acessibilidade (axe)",
    async (variant) => {
      const { container } = render(<Badge variant={variant}>Status</Badge>);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
