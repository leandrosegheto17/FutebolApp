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

  it("recusa vetor de barra invertida (BUG-QA-FE01-01) e cai no padrão", () => {
    // `new URL("/\\evil.example.com", origemInterna)` resolve para a origem
    // de `evil.example.com` (esquemas especiais tratam `\` como `/` no
    // parsing) — é exatamente assim que o `next/navigation` resolve o
    // `href` antes de decidir se a navegação é interna ou externa.
    expect(getSafeRedirectTarget("/\\evil.example.com")).toBe(ROUTES.lancamentoRodada);
  });

  it("recusa variante com barra dupla após a barra invertida e cai no padrão", () => {
    expect(getSafeRedirectTarget("/\\/evil.example.com")).toBe(ROUTES.lancamentoRodada);
  });

  it("aceita barra invertida codificada como caminho interno legítimo (não é bypass)", () => {
    // `%5c` permanece codificado no componente de caminho (não é
    // renormalizado para host pelo parser de URL), então resolve para a
    // mesma origem interna — não é o vetor de open redirect, é apenas um
    // caractere incomum dentro de um path relativo.
    expect(getSafeRedirectTarget("/%5cevil.example.com")).toBe("/%5cevil.example.com");
  });
});
