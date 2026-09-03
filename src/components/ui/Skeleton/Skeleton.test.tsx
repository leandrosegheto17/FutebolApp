import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Skeleton, SkeletonGroup } from "./Skeleton";

describe("Skeleton", () => {
  it("barra individual é decorativa (aria-hidden) — default", () => {
    render(<Skeleton data-testid="bar" />);
    const bar = document.querySelector('[aria-hidden="true"]');
    expect(bar).toBeInTheDocument();
  });

  it("SkeletonGroup anuncia carregamento uma única vez via role=status", () => {
    render(
      <SkeletonGroup label="Carregando ranking">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(
      screen.getByRole("status", { name: "Carregando ranking" }),
    ).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
