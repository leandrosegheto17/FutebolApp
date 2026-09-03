import { AlertBanner } from "../Toast/AlertBanner";
import { Button } from "../Button/Button";

export interface SessionExpiryBannerProps {
  visible: boolean;
  onDismiss?: () => void;
  message?: string;
}

/**
 * SessionExpiryBanner — UX-SPEC.md Seção 1.3/3.2. Aviso não-bloqueante de
 * expiração próxima de sessão (2 min antes do TTL estimado, ADR-004),
 * exibido em toda tela da área interna (WCAG 2.2.1 — tempo ajustável:
 * informa a tempo do usuário reagir, nunca expira em silêncio). Não modal —
 * é um `AlertBanner` (`role="status"`, `aria-live="polite"`) para não
 * interromper a tarefa em andamento.
 */
export function SessionExpiryBanner({
  visible,
  onDismiss,
  message = "Sua sessão expira em breve — salve o que estiver fazendo.",
}: SessionExpiryBannerProps) {
  if (!visible) return null;

  return (
    <AlertBanner variant="info">
      <span>{message}</span>
      {onDismiss && (
        <Button variant="ghost" onClick={onDismiss}>
          Entendi
        </Button>
      )}
    </AlertBanner>
  );
}
