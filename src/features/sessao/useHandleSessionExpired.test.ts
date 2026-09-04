import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/routes";
import { SESSION_TTL_MS } from "@/modules/autenticacao/constants";
import { SESSION_EXPIRED_MESSAGE, takeUnsavedData } from "./writeActionSession";
import { getEstimatedSessionExpiry } from "./sessionExpiryMarker";
import { useHandleSessionExpired } from "./useHandleSessionExpired";

const replaceMock = vi.fn();
const showToastMock = vi.fn();
let pathname = "/rodadas/nova";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathname,
}));

vi.mock("@/components/ui", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

describe("useHandleSessionExpired", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    showToastMock.mockReset();
    window.sessionStorage.clear();
    pathname = "/rodadas/nova";
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("exibe a mensagem literal do UX-SPEC.md via toast (variant warning)", () => {
    const { result } = renderHook(() => useHandleSessionExpired());

    act(() => {
      result.current();
    });

    expect(showToastMock).toHaveBeenCalledWith({
      variant: "warning",
      message: SESSION_EXPIRED_MESSAGE,
    });
  });

  it("redireciona para T01 com ?redirect= apontando para a tela de origem (pathname atual)", () => {
    pathname = "/historico";
    const { result } = renderHook(() => useHandleSessionExpired());

    act(() => {
      result.current();
    });

    expect(replaceMock).toHaveBeenCalledWith(`${ROUTES.login}?redirect=%2Fhistorico`);
  });

  it("preserva dados não salvos (quando fornecidos) antes de redirecionar", () => {
    pathname = "/atletas/novo";
    const { result } = renderHook(() => useHandleSessionExpired());
    const rascunho = { nome: "Fulano de Tal", nivelTecnico: 3 };

    act(() => {
      result.current({ unsavedData: rascunho });
    });

    expect(takeUnsavedData("/atletas/novo")).toEqual(rascunho);
    expect(replaceMock).toHaveBeenCalledWith(
      `${ROUTES.login}?redirect=%2Fatletas%2Fnovo`,
    );
  });

  it("usa unsavedDataKey explícita quando fornecida, em vez do pathname", () => {
    const { result } = renderHook(() => useHandleSessionExpired());

    act(() => {
      result.current({ unsavedData: { a: 1 }, unsavedDataKey: "chave-propria" });
    });

    expect(takeUnsavedData("chave-propria")).toEqual({ a: 1 });
  });

  it("não grava nada em sessionStorage quando nenhum unsavedData é fornecido", () => {
    const { result } = renderHook(() => useHandleSessionExpired());

    act(() => {
      result.current();
    });

    expect(takeUnsavedData("/rodadas/nova")).toBeNull();
  });

  it("limpa o marcador de expiração estimada (sessão seguinte recalcula do zero)", () => {
    const now = 1_000_000;
    getEstimatedSessionExpiry(now); // cria o marcador desta "sessão expirada"

    const { result } = renderHook(() => useHandleSessionExpired());
    act(() => {
      result.current();
    });

    // Marcador removido -> a próxima leitura cria um valor fresco ancorado
    // no novo `now`, nunca herda o valor antigo ancorado em `now` original.
    const depois = now + 60_000;
    expect(getEstimatedSessionExpiry(depois)).toBe(depois + SESSION_TTL_MS);
  });
});
