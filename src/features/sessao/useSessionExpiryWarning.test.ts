import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_TTL_MS } from "@/modules/autenticacao/constants";
import {
  SESSION_WARNING_BEFORE_EXPIRY_MS,
  useSessionExpiryWarning,
} from "./useSessionExpiryWarning";

describe("useSessionExpiryWarning", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("não mostra aviso logo após montar (bem antes da janela de 2 min)", () => {
    const { result } = renderHook(() => useSessionExpiryWarning());
    expect(result.current.warningVisible).toBe(false);
  });

  it("mostra o aviso exatamente ao atingir 2 min antes da expiração estimada", () => {
    const { result } = renderHook(() => useSessionExpiryWarning());

    act(() => {
      vi.advanceTimersByTime(SESSION_TTL_MS - SESSION_WARNING_BEFORE_EXPIRY_MS - 1);
    });
    expect(result.current.warningVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.warningVisible).toBe(true);
  });

  it("mostra o aviso imediatamente se montado dentro da própria janela de 2 min (marcador herdado)", () => {
    // Simula uma segunda tela interna montando quando já falta menos de
    // 2 min pro marcador desta aba (ex.: usuário navegou entre telas perto
    // do fim do TTL) — o hook não deve esperar um novo timeout que já
    // passou do ponto de disparo.
    window.sessionStorage.setItem(
      "sessao_interna:expira_em_estimado",
      String(Date.now() + 30_000),
    );

    const { result } = renderHook(() => useSessionExpiryWarning());
    expect(result.current.warningVisible).toBe(true);
  });

  it("dismissWarning esconde o aviso e ele não reaparece sozinho depois", () => {
    const { result } = renderHook(() => useSessionExpiryWarning());

    act(() => {
      vi.advanceTimersByTime(SESSION_TTL_MS - SESSION_WARNING_BEFORE_EXPIRY_MS);
    });
    expect(result.current.warningVisible).toBe(true);

    act(() => {
      result.current.dismissWarning();
    });
    expect(result.current.warningVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SESSION_WARNING_BEFORE_EXPIRY_MS);
    });
    expect(result.current.warningVisible).toBe(false);
  });

  it("limpa o timeout ao desmontar (sem warning de timer pendente/leak)", () => {
    const clearSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = renderHook(() => useSessionExpiryWarning());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
