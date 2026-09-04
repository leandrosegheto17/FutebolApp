import { describe, expect, it } from "vitest";
import { formatDataAnonimizacao, formatNivelTecnico } from "./format";

describe("formatDataAnonimizacao", () => {
  it("formata timestamp ISO como DD/MM/AAAA (pt-BR)", () => {
    // Horário próximo ao meio-dia UTC — estável no fuso horário local da
    // máquina de teste (CI/desenvolvimento), evita virar o dia por causa de
    // fuso (mesma decisão de robustez já usada por outros `format.test.ts`
    // deste projeto, que também nunca fixam `timeZone` no formatter).
    expect(formatDataAnonimizacao("2026-09-02T12:00:00.000Z")).toBe("02/09/2026");
  });
});

describe("formatNivelTecnico", () => {
  it("mostra inteiro sem casas decimais", () => {
    expect(formatNivelTecnico(5)).toBe("5");
  });

  it("mostra fracionário com 2 casas decimais", () => {
    expect(formatNivelTecnico(3.3333)).toBe("3.33");
  });
});
