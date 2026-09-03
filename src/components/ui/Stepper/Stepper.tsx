import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "../Button/Button";
import styles from "./Stepper.module.css";

export interface StepperProps {
  /** Rótulo de cada etapa, ex.: ["Presença", "Eventos", "Revisão e Confirmação"] */
  steps: string[];
  /** Índice (0-based) da etapa atual. */
  currentStep: number;
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Stepper (wizard de etapas) — UX-SPEC.md Seção 3.2 (T05: Lançamento de
 * Rodada). Cabeçalho "Etapa X/3" (anunciado via texto real, não só posição
 * visual) + navegação linear "voltar"/"continuar" padronizada. O conteúdo de
 * cada etapa é responsabilidade da tela consumidora (`children`) — este
 * componente não decide o que cada etapa contém, só a moldura e a navegação.
 */
export function Stepper({
  steps,
  currentStep,
  onBack,
  onNext,
  backLabel = "← Voltar",
  nextLabel = "Continuar →",
  nextDisabled,
  nextLoading,
  children,
  className,
}: StepperProps) {
  const total = steps.length;
  const stepLabel = steps[currentStep] ?? "";

  return (
    <div className={className}>
      <div className={styles.header}>
        <p className={styles.label}>
          Etapa {currentStep + 1}/{total}: {stepLabel}
        </p>
        <ol className={styles.track} aria-hidden="true">
          {steps.map((step, index) => (
            <li
              key={step}
              className={cn(
                styles.step,
                index < currentStep && styles.stepDone,
                index === currentStep && styles.stepCurrent,
              )}
            />
          ))}
        </ol>
      </div>

      <div aria-current="step">{children}</div>

      <div className={styles.actions}>
        {onBack ? (
          <Button variant="ghost" onClick={onBack} disabled={currentStep === 0}>
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
        {onNext && (
          <Button onClick={onNext} disabled={nextDisabled} loading={nextLoading}>
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
