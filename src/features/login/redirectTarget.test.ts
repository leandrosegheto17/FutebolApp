import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/routes";
import { getSafeRedirectTarget } from "./redirectTarget";

describe("getSafeRedirectTarget", () => {
  it("retorna o destino padrão (T05) quando não há parâmetro de redirect", () => {
    expect(getSafeRedirectTarget(null)).toBe(ROUTES.lancamentoRodada);
    expect(getSafeRedirectTarget(undefined)).toBe(ROUTES.lancamentoRodada);
    expect(getSafeRedirectTarget("")).toBe(ROUTES.lancamentoRodada);
  });

  it("aceita um caminho interno relativo válido", () => {
    expect(getSafeRedirectTarget("/rodadas/nova")).toBe("/rodadas/nova");
    expect(getSafeRedirectTarget("/historico/123")).toBe("/historico/123");
  });

  it("nunca redireciona de volta para o próprio login (evita loop)", () => {
    expect(getSafeRedirectTarget(ROUTES.login)).toBe(ROUTES.lancamentoRodada);
  });

  it("recusa URL absoluta (vetor clássico de open redirect) e cai no padrão", () => {
    expect(getSafeRedirectTarget("https://evil.example.com")).toBe(
      ROUTES.lancamentoRodada,
    );
    expect(getSafeRedirectTarget("http://evil.example.com/x")).toBe(
      ROUTES.lancamentoRodada,
    );
  });

  it("recusa caminho protocolo-relativo (`//host`) e cai no padrão", () => {
    expect(getSafeRedirectTarget("//evil.example.com")).toBe(ROUTES.lancamentoRodada);
  });

  it("recusa caminho que não começa com uma única barra e cai no padrão", () => {
    expect(getSafeRedirectTarget("rodadas/nova")).toBe(ROUTES.lancamentoRodada);
  });
});
