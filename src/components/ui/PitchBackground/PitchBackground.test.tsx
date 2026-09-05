import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { PitchBackground, PitchPlayerList, PitchTeamHeader } from "./PitchBackground";

describe("PitchBackground", () => {
  it("exibe o rótulo de formação decorativo (confirmado pelo organizador, UX-SPEC Seção 7.2 item 8)", () => {
    render(
      <PitchBackground
        formacao="4-3-3"
        colete={<span>Colete</span>}
        semColete={<span>Sem Colete</span>}
      />,
    );
    expect(screen.getByText("Formação 4-3-3")).toBeInTheDocument();
  });

  it("renderiza as duas áreas de time (Colete/Sem Colete) como conteúdo real, nunca escondido de AT", () => {
    render(
      <PitchBackground
        formacao="4-3-3"
        colete={<span>Conteúdo do Colete</span>}
        semColete={<span>Conteúdo do Sem Colete</span>}
      />,
    );
    expect(screen.getByText("Conteúdo do Colete")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo do Sem Colete")).toBeInTheDocument();
  });

  it("o divisor central é puramente decorativo (aria-hidden)", () => {
    const { container } = render(
      <PitchBackground formacao="4-3-3" colete={<span />} semColete={<span />} />,
    );
    const centerLine = container.querySelector('[aria-hidden="true"]');
    expect(centerLine).not.toBeNull();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <PitchBackground
        formacao="4-3-3"
        colete={
          <PitchPlayerList>
            <button type="button">Jogador 1</button>
          </PitchPlayerList>
        }
        semColete={
          <PitchPlayerList>
            <button type="button">Jogador 2</button>
          </PitchPlayerList>
        }
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("PitchTeamHeader", () => {
  it("exibe nome e pontos do time", () => {
    render(<PitchTeamHeader nome="Colete" pontos="62 pts" />);
    expect(screen.getByText("Colete")).toBeInTheDocument();
    expect(screen.getByText("62 pts")).toBeInTheDocument();
  });
});
