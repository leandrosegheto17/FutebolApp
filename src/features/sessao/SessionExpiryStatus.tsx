"use client";

import { SessionExpiryBanner } from "@/components/ui";
import { useSessionExpiryWarning } from "./useSessionExpiryWarning";

/**
 * TASK.md FE-12 — casca pronta para consumo: liga o hook de temporização
 * (`useSessionExpiryWarning`) ao componente puro `SessionExpiryBanner`
 * (FE-00), que já implementa a apresentação (`AlertBanner variant="info"`,
 * `role="status"`/`aria-live="polite"`, botão "Entendi").
 *
 * Uso pretendido: montado **uma única vez**, no componente de casca da área
 * interna (`UX-SPEC.md` Seção 3.2: "`SessionExpiryBanner` — Todas as telas
 * internas") — quando a primeira tela interna (FE-04 em diante) existir.
 * Nenhuma tela individual deve montar este componente por conta própria
 * (evita timers duplicados e reforça GUARDRAILS.md regra 31 — um único
 * componente reutilizado, nunca uma variação paralela por tela).
 */
export function SessionExpiryStatus() {
  const { warningVisible, dismissWarning } = useSessionExpiryWarning();
  return <SessionExpiryBanner visible={warningVisible} onDismiss={dismissWarning} />;
}
