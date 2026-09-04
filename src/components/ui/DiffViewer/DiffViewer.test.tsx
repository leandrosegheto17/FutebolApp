import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { DiffViewer } from "./DiffViewer";

describe("DiffViewer", () => {
  it("renderiza rótulo, valor antes e valor depois de cada item", () => {
    render(
      <DiffViewer
        items={[{ label: "Presença", before: "Presente", after: "Ausente" }]}
      />,
    );

    expect(screen.getByText("Presença")).toBeInTheDocument();
    expect(screen.getByText("Presente")).toBeInTheDocument();
    expect(screen.getByText("Ausente")).toBeInTheDocument();
  });

  it("marca item alterado com texto '(alterado)' — nunca só cor (WCAG 1.4.1)", () => {
    render(
      <DiffViewer items={[{ label: "Gols", before: "1", after: "2", changed: true }]} />,
    );
    expect(screen.getByText("(alterado)")).toBeInTheDocument();
  });

  it("item explicitamente não alterado não exibe o marcador", () => {
    render(
      <DiffViewer
        items={[{ label: "Cartões amarelos", before: "0", after: "0", changed: false }]}
      />,
    );
    expect(screen.queryByText("(alterado)")).not.toBeInTheDocument();
  });

  it("renderiza múltiplos itens", () => {
    render(
      <DiffViewer
        items={[
          { label: "Presença", before: "Presente", after: "Ausente" },
          { label: "Gols", before: "1", after: "2" },
        ]}
      />,
    );
    expect(screen.getAllByText("(alterado)")).toHaveLength(2);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <DiffViewer
        items={[
          { label: "Presença", before: "Presente", after: "Ausente" },
          { label: "Gols", before: "1", after: "2" },
        ]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
