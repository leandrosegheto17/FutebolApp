import { describe, expect, it } from "vitest";
import { formatDataDesativacao } from "./format";

describe("formatDataDesativacao", () => {
  it("formata timestamp ISO como DD/MM/AAAA (pt-BR, RNF-08)", () => {
    // Horário próximo ao meio-dia UTC — estável no fuso horário local da
    // máquina de teste (CI/desenvolvimento), evita virar o dia por causa de
    // fuso (mesmo cuidado já usado em `atletas/format.test.ts`).
    expect(formatDataDesativacao("2026-08-20T12:00:00.000Z")).toBe("20/08/2026");
  });
});
