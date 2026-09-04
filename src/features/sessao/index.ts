// Infraestrutura transversal de sessão/expiração — TASK.md FE-12,
// UX-SPEC.md Seção 1.3. Toda tela interna futura (FE-04 em diante) deve
// consumir daqui, nunca reimplementar o tratamento de expiração/401.

export { SessionExpiryStatus } from "./SessionExpiryStatus";
export {
  useSessionExpiryWarning,
  SESSION_WARNING_BEFORE_EXPIRY_MS,
  type UseSessionExpiryWarningResult,
} from "./useSessionExpiryWarning";
export {
  getEstimatedSessionExpiry,
  clearEstimatedSessionExpiry,
} from "./sessionExpiryMarker";
export {
  SESSION_EXPIRED_MESSAGE,
  SessionExpiredError,
  assertSessionAlive,
  buildSessionExpiredRedirectUrl,
  saveUnsavedData,
  takeUnsavedData,
} from "./writeActionSession";
export {
  useHandleSessionExpired,
  type HandleSessionExpiredOptions,
} from "./useHandleSessionExpired";
