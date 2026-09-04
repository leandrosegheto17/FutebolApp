import { describe, expect, it } from "vitest";
import { calcularIdade, exigeConsentimentoResponsavel, idadeValida } from "./idade";

describe("idadeValida", () => {
  it("aceita data AAAA-MM-DD parseável", () => {
    expect(idadeValida("2010-05-20")).toBe(true);
  });

  it("rejeita formato fora de AAAA-MM-DD", () => {
    expect(idadeValida("20/05/2010")).toBe(false);
    expect(idadeValida("")).toBe(false);
  });

  it("rejeita data com formato correto mas inválida (ex.: mês 13)", () => {
    expect(idadeValida("2010-13-40")).toBe(false);
  });
});

describe("calcularIdade", () => {
  it("calcula idade em anos completos quando o aniversário já passou no ano de referência", () => {
    const referencia = new Date("2026-09-03T12:00:00.000Z");
    expect(calcularIdade("2010-05-20", referencia)).toBe(16);
  });

  it("calcula idade em anos completos quando o aniversário ainda não chegou no ano de referência", () => {
    const referencia = new Date("2026-09-03T12:00:00.000Z");
    expect(calcularIdade("2010-12-25", referencia)).toBe(15);
  });

  it("considera o próprio dia do aniversário como já completado", () => {
    const referencia = new Date("2026-09-03T12:00:00.000Z");
    expect(calcularIdade("2008-09-03", referencia)).toBe(18);
  });

  it("data no futuro produz idade negativa (sinal para o chamador tratar como inválida)", () => {
    const referencia = new Date("2026-09-03T12:00:00.000Z");
    expect(calcularIdade("2027-01-01", referencia)).toBeLessThan(0);
  });
});

describe("exigeConsentimentoResponsavel", () => {
  it("exige consentimento para idade < 18", () => {
    expect(exigeConsentimentoResponsavel(17)).toBe(true);
    expect(exigeConsentimentoResponsavel(0)).toBe(true);
  });

  it("não exige consentimento para idade >= 18", () => {
    expect(exigeConsentimentoResponsavel(18)).toBe(false);
    expect(exigeConsentimentoResponsavel(30)).toBe(false);
  });
});
