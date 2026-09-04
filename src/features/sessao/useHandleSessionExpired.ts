"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import { clearEstimatedSessionExpiry } from "./sessionExpiryMarker";
import {
  SESSION_EXPIRED_MESSAGE,
  buildSessionExpiredRedirectUrl,
  saveUnsavedData,
} from "./writeActionSession";

export interface HandleSessionExpiredOptions<T> {
  /** Dados não salvos a preservar (o que for tecnicamente possível), se houver. */
  unsavedData?: T;
  /**
   * Chave de armazenamento para `unsavedData` — por padrão, o próprio
   * caminho da tela de origem (suficiente enquanto cada tela só preserva um
   * rascunho por vez; passe uma chave própria se a tela precisar de mais de
   * um rascunho simultâneo).
   */
  unsavedDataKey?: string;
}

/**
 * Hook central de reação a 401 em ação de escrita — TASK.md FE-12/
 * UX-SPEC.md Seção 1.3. Qualquer tela interna futura (T04…T11) que chame uma
 * API de escrita e capture `SessionExpiredError` (`writeActionSession.ts`)
 * deve reagir chamando a função devolvida por este hook, em vez de
 * reimplementar o fluxo em cada tela (mesmo racional de reuso de
 * `redirectTarget.ts`/`ROUTES` já estabelecido por FE-01).
 *
 * Ordem das ações, cada uma "o que for tecnicamente possível" isoladamente
 * (uma falha numa etapa não impede as seguintes):
 * 1. Preserva `unsavedData` (se fornecido) em `sessionStorage`.
 * 2. Limpa o marcador de expiração estimada (a sessão atual já não é mais
 *    válida — a próxima, pós-login, deve recalcular do zero).
 * 3. Exibe a mensagem "Sessão expirada, faça login novamente." via `Toast`
 *    global (`ToastProvider` montado em `app/layout.tsx`, sobrevive à
 *    navegação client-side para T01 porque vive no layout raiz, que não
 *    desmonta entre rotas do App Router — por isso o aviso aparece já na
 *    tela de login, sem precisar tocar em `src/features/login/*`).
 * 4. Redireciona para T01 com `?redirect=<tela de origem>`, consumido pelo
 *    `getSafeRedirectTarget` já existente de FE-01 para retornar à tela de
 *    origem após o novo login.
 */
export function useHandleSessionExpired() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  return useCallback(
    function handleSessionExpired<T>(options?: HandleSessionExpiredOptions<T>) {
      const originPath = pathname ?? "/";

      if (options && "unsavedData" in options && options.unsavedData !== undefined) {
        saveUnsavedData(options.unsavedDataKey ?? originPath, options.unsavedData);
      }

      clearEstimatedSessionExpiry();

      showToast({ variant: "warning", message: SESSION_EXPIRED_MESSAGE });

      router.replace(buildSessionExpiredRedirectUrl(originPath));
    },
    [pathname, router, showToast],
  );
}
