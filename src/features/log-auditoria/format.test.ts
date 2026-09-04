import { describe, expect, it } from "vitest";
import { formatDataHora, truncateId } from "./format";

describe("formatDataHora", () => {
  it("formata timestamp ISO como 'DD/MM/AAAA HH:mm' (wireframe T08)", () => {
    // Meio-dia UTC evita qualquer risco de o teste rodar perto da virada do
    // dia em fusos negativos (mesmo cuidado de outros `format.test.ts`).
    expect(formatDataHora("2026-09-02T12:32:00.000Z")).toMatch(
      /^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/,
    );
  });

  it("nunca insere vírgula entre data e hora", () => {
    expect(formatDataHora("2026-09-02T12:32:00.000Z")).not.toContain(",");
  });
});

describe("truncateId", () => {
  it("devolve os 8 primeiros caracteres do id", () => {
    expect(truncateId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("a1b2c3d4");
  });
});
