import { describe, expect, it } from "vitest";
import { formatMesCivil, formatRodadaDiaMes, shiftMesCivil } from "./format";

describe("formatMesCivil", () => {
  it("formata mês/ano civil em pt-BR (RN-09)", () => {
    expect(formatMesCivil({ ano: 2026, mes: 9 })).toBe("Setembro/2026");
    expect(formatMesCivil({ ano: 2026, mes: 1 })).toBe("Janeiro/2026");
    expect(formatMesCivil({ ano: 2025, mes: 12 })).toBe("Dezembro/2025");
  });
});

describe("formatRodadaDiaMes", () => {
  it("formata data ISO (YYYY-MM-DD) como DD/MM, sem shift de fuso horário", () => {
    expect(formatRodadaDiaMes("2026-09-05")).toBe("05/09");
    expect(formatRodadaDiaMes("2026-01-01")).toBe("01/01");
    expect(formatRodadaDiaMes("2026-12-31")).toBe("31/12");
  });
});

describe("shiftMesCivil", () => {
  it("avança um mês dentro do mesmo ano", () => {
    expect(shiftMesCivil({ ano: 2026, mes: 9 }, 1)).toEqual({ ano: 2026, mes: 10 });
  });

  it("retrocede um mês dentro do mesmo ano", () => {
    expect(shiftMesCivil({ ano: 2026, mes: 9 }, -1)).toEqual({ ano: 2026, mes: 8 });
  });

  it("faz rollover de ano ao avançar de dezembro", () => {
    expect(shiftMesCivil({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
  });

  it("faz rollover de ano ao retroceder de janeiro", () => {
    expect(shiftMesCivil({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
  });

  it("suporta deltas maiores que 12 meses (rollover múltiplo)", () => {
    expect(shiftMesCivil({ ano: 2026, mes: 6 }, 13)).toEqual({ ano: 2027, mes: 7 });
  });
});
