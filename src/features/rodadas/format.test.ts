import { describe, expect, it } from "vitest";
import { formatDataExibicao } from "./format";

describe("formatDataExibicao", () => {
  it("converte AAAA-MM-DD para DD/MM/AAAA sem passar por Date (evita deslocamento de fuso)", () => {
    expect(formatDataExibicao("2026-09-05")).toBe("05/09/2026");
    expect(formatDataExibicao("2026-01-01")).toBe("01/01/2026");
  });

  it("devolve a string original se não estiver no formato esperado (nunca lança)", () => {
    expect(formatDataExibicao("")).toBe("");
    expect(formatDataExibicao("data-invalida")).toBe("data-invalida");
  });
});
