"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import styles from "./Toast.module.css";

export type ToastVariant = "success" | "warning" | "danger" | "info";

export interface ToastOptions {
  variant: ToastVariant;
  message: string;
  /** ms até auto-dispensar; `null` mantém até fechamento manual (recomendado
   * para `danger`, onde o organizador precisa confirmar que leu). */
  duration?: number | null;
}

interface ToastEntry extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  success: 5000,
  info: 5000,
  warning: 7000,
  danger: null,
};

/**
 * Toast — UX-SPEC.md Seção 3.2. Não-modal, `aria-live="polite"` para
 * sucesso/info/aviso, `aria-live="assertive"` para erro crítico (`danger`) —
 * duas regiões vivas persistentes no DOM (Seção 5.1, critério 4.1.3), nunca
 * exigindo foco manual do usuário para o anúncio acontecer.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ variant, message, duration }: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const effectiveDuration =
        duration === undefined ? DEFAULT_DURATION[variant] : duration;

      setToasts((current) => [...current, { id, variant, message, duration }]);

      if (effectiveDuration !== null) {
        const timer = setTimeout(() => dismiss(id), effectiveDuration);
        timers.current.set(id, timer);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const politeToasts = toasts.filter((toast) => toast.variant !== "danger");
  const assertiveToasts = toasts.filter((toast) => toast.variant === "danger");

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            <div className={styles.viewport} aria-live="polite" aria-atomic="false">
              {politeToasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
              ))}
            </div>
            <div className={styles.viewport} aria-live="assertive" aria-atomic="false">
              {assertiveToasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
              ))}
            </div>
          </>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className={cn(styles.toast, styles[toast.variant])}>
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Fechar notificação"
        onClick={() => onDismiss(toast.id)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  }
  return context;
}
