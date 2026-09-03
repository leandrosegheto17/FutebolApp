import { describe, expect, it } from "vitest";
import {
  formatCartoes,
  formatOrdinal,
  formatPontos,
  formatPresencas,
  formatUpdatedAt,
  pluralize,
} from "./format";

describe("formatOrdinal", () => {
  it("formata posição como ordinal em português", () => {
    expect(formatOrdinal(1)).toBe("1º");
    expect(formatOrdinal(2)).toBe("2º");
    expect(formatOrdinal(3)).toBe("3º");
    expect(formatOrdinal(12)).toBe("12º");
  });
});

describe("pluralize", () => {
  it("usa singular só quando count === 1", () => {
    expect(pluralize(1, "cartão", "cartões")).toBe("cartão");
  });

  it("usa plural para 0 e para >1 (concordância pt-BR)", () => {
    expect(pluralize(0, "cartão", "cartões")).toBe("cartões");
    expect(pluralize(2, "cartão", "cartões")).toBe("cartões");
  });
});

describe("formatPresencas / formatCartoes / formatPontos", () => {
  it("concorda singular/plural corretamente", () => {
    expect(formatPresencas(1)).toBe("1 presença");
    expect(formatPresencas(0)).toBe("0 presenças");
    expect(formatPresencas(12)).toBe("12 presenças");
    expect(formatCartoes(1)).toBe("1 cartão");
    expect(formatCartoes(0)).toBe("0 cartões");
    expect(formatCartoes(2)).toBe("2 cartões");
  });

  it("formata pontuação com sufixo pts", () => {
    expect(formatPontos(42)).toBe("42 pts");
  });
});

describe("formatUpdatedAt", () => {
  it("formata data em dia/mês/ano (RNF-08 — formato regional pt-BR)", () => {
    const date = new Date(2026, 8, 2); // 2026-09-02 (mês 0-indexado)
    expect(formatUpdatedAt(date)).toBe("02/09/2026");
  });
});
