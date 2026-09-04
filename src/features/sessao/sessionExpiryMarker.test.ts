import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_TTL_MS } from "@/modules/autenticacao/constants";
import {
  clearEstimatedSessionExpiry,
  getEstimatedSessionExpiry,
} from "./sessionExpiryMarker";

describe("sessionExpiryMarker", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("cria o marcador (now + SESSION_TTL_MS) na primeira leitura", () => {
    const now = 1_000_000;
    expect(getEstimatedSessionExpiry(now)).toBe(now + SESSION_TTL_MS);
  });

  it("persiste o marcador — leituras subsequentes na mesma aba devolvem o mesmo valor", () => {
    const now = 1_000_000;
    const first = getEstimatedSessionExpiry(now);
    const second = getEstimatedSessionExpiry(now + 60_000);
    expect(second).toBe(first);
  });

  it("recria o marcador se o valor armazenado já expirou (não fica preso no passado)", () => {
    const now = 1_000_000;
    getEstimatedSessionExpiry(now);
    const muitoDepois = now + SESSION_TTL_MS + 1;
    expect(getEstimatedSessionExpiry(muitoDepois)).toBe(muitoDepois + SESSION_TTL_MS);
  });

  it("recria o marcador se o valor armazenado estiver corrompido", () => {
    window.sessionStorage.setItem("sessao_interna:expira_em_estimado", "não-é-número");
    const now = 1_000_000;
    expect(getEstimatedSessionExpiry(now)).toBe(now + SESSION_TTL_MS);
  });

  it("clearEstimatedSessionExpiry remove o marcador, próxima leitura recomeça do zero", () => {
    const now = 1_000_000;
    getEstimatedSessionExpiry(now);
    clearEstimatedSessionExpiry();

    const depois = now + 60_000;
    expect(getEstimatedSessionExpiry(depois)).toBe(depois + SESSION_TTL_MS);
  });

  it("clearEstimatedSessionExpiry nunca lança mesmo sem marcador prévio", () => {
    expect(() => clearEstimatedSessionExpiry()).not.toThrow();
  });

  it("degrada graciosamente (nunca lança) se sessionStorage lançar ao ler/escrever", () => {
    const getItemSpy = vi
      .spyOn(window.sessionStorage.__proto__, "getItem")
      .mockImplementation(() => {
        throw new Error("bloqueado (navegação privada)");
      });

    const now = 1_000_000;
    expect(() => getEstimatedSessionExpiry(now)).not.toThrow();
    expect(getEstimatedSessionExpiry(now)).toBe(now + SESSION_TTL_MS);

    getItemSpy.mockRestore();
  });
});
