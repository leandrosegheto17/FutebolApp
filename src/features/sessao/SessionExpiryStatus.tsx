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
 *
 * **Auditoria FE-R12** (`TASK.md` Parte II, Seção 3.2 — reestimativa de
 * `FE-12` pós-`FE-R00`): `InternalShell` monta este componente como irmão do
 * `AppNav`, antes dele (`<SessionExpiryStatus /><AppNav .../>`), dentro do
 * fundo claro (`--color-bg`) da própria casca — nunca dentro do `TopNav`/hero
 * navy. Confirmado por varredura de código em 2026-09-04 (nenhum uso de
 * `--color-brand-navy`/`--color-brand-navy-strong` fora de `tokens.css` e do
 * preenchimento interno do SVG de `BrandCrest`): nenhuma tela real hoje expõe
 * este banner sobre chrome navy, então nenhuma mudança de
 * `--color-focus-ring` para `--color-focus-ring-on-dark` foi necessária aqui
 * (ver detalhe em `AlertBanner.tsx`, componente usado por baixo deste). Se o
 * futuro repintado de `AppNav`/`TopNav` para navy (UX-SPEC.md Parte II Seção
 * 6.2-R) vier a mover este banner para dentro do chrome navy, esta nota deixa
 * de valer e o par precisa ser recalculado (UX-SPEC.md Parte II Seção 5.3,
 * regra 2).
 */
export function SessionExpiryStatus() {
  const { warningVisible, dismissWarning } = useSessionExpiryWarning();
  return <SessionExpiryBanner visible={warningVisible} onDismiss={dismissWarning} />;
}
