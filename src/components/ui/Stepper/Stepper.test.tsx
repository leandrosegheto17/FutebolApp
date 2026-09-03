import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Stepper } from "./Stepper";

const steps = ["Presença", "Eventos", "Revisão e Confirmação"];

describe("Stepper", () => {
  it("anuncia 'Etapa X/3' com o rótulo da etapa atual (default)", () => {
    render(
      <Stepper steps={steps} currentStep={0} onNext={() => {}}>
        <p>Conteúdo da etapa 1</p>
      </Stepper>,
    );
    expect(screen.getByText("Etapa 1/3: Presença")).toBeInTheDocument();
  });

  it("botão Voltar desabilitado na primeira etapa", () => {
    render(
      <Stepper steps={steps} currentStep={0} onBack={() => {}} onNext={() => {}}>
        conteúdo
      </Stepper>,
    );
    expect(screen.getByRole("button", { name: "← Voltar" })).toBeDisabled();
  });

  it("botão Continuar chama onNext e respeita nextDisabled", async () => {
    const onNext = vi.fn();
    render(
      <Stepper steps={steps} currentStep={1} onNext={onNext} nextDisabled>
        conteúdo
      </Stepper>,
    );
    const nextButton = screen.getByRole("button", { name: "Continuar →" });
    expect(nextButton).toBeDisabled();
  });

  it("estado de carregamento no botão de avançar (etapa 3, transação atômica)", () => {
    render(
      <Stepper
        steps={steps}
        currentStep={2}
        onNext={() => {}}
        nextLabel="Confirmar Lançamento"
        nextLoading
      >
        conteúdo
      </Stepper>,
    );
    expect(screen.getByRole("button", { name: "Confirmar Lançamento" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <Stepper steps={steps} currentStep={0} onNext={() => {}}>
        conteúdo
      </Stepper>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
