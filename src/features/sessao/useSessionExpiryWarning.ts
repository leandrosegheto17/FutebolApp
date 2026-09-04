"use client";

import { useEffect, useRef, useState } from "react";
import { getEstimatedSessionExpiry } from "./sessionExpiryMarker";

/** UX-SPEC.md Seção 1.3: "Aos 2 minutos antes da expiração estimada". */
export const SESSION_WARNING_BEFORE_EXPIRY_MS = 2 * 60 * 1000;

export interface UseSessionExpiryWarningResult {
  /** `true` a partir de 2 min antes da expiração estimada até ser dispensado. */
  warningVisible: boolean;
  /** Handler para o botão "Entendi" do `SessionExpiryBanner`. */
  dismissWarning: () => void;
}

/**
 * Agenda a exibição do aviso não-bloqueante de expiração de sessão — TASK.md
 * FE-12 / UX-SPEC.md Seção 1.3 ("evitando perda de trabalho em formulário
 * longo, T04/T05/T07"). Um único `setTimeout` (não polling por intervalo) é
 * suficiente porque o instante-alvo é conhecido antecipadamente pelo
 * marcador (`sessionExpiryMarker.ts`).
 *
 * Pensado para ser usado uma única vez, no componente de casca que a futura
 * tarefa de layout da área interna (FE-04 em diante) montar ao redor de toda
 * tela interna — ver `SessionExpiryStatus.tsx`, que já embrulha este hook e
 * o componente `SessionExpiryBanner` (FE-00) prontos para reuso, mesmo
 * padrão de "infraestrutura pronta para consumo futuro" já usado por FE-01
 * em `redirectTarget.ts`.
 */
export function useSessionExpiryWarning(): UseSessionExpiryWarningResult {
  const [warningVisible, setWarningVisible] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    const expiresAt = getEstimatedSessionExpiry(now);
    const warnAt = expiresAt - SESSION_WARNING_BEFORE_EXPIRY_MS;
    const delay = warnAt - now;

    if (dismissedRef.current) {
      return;
    }

    if (delay <= 0) {
      setWarningVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      if (!dismissedRef.current) {
        setWarningVisible(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  function dismissWarning() {
    dismissedRef.current = true;
    setWarningVisible(false);
  }

  return { warningVisible, dismissWarning };
}
