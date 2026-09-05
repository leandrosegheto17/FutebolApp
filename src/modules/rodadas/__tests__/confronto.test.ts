/**
 * Testes unitários de `confronto.ts` (BE-R02, TASK.md Parte II Seção 3.1 —
 * Iniciativa de Redesenho Visual). Funções puras — sem Supabase, sem
 * `Request`/`NextResponse` (mesmo racional de `validation.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { calcularConfronto, valorPontosVigente } from "../confronto";

describe("valorPontosVigente", () => {
  it("retorna o valor da vigência mais recente que ainda seja <= a data informada", () => {
    const configuracao = [
      { pontos: 3, vigente_desde: "2000-01-01" },
      { pontos: 5, vigente_desde: "2026-06-01" },
    ];
    expect(valorPontosVigente(configuracao, "2026-01-01")).toBe(3);
    expect(valorPontosVigente(configuracao, "2026-06-01")).toBe(5);
    expect(valorPontosVigente(configuracao, "2030-01-01")).toBe(5);
  });

  it("ignora vigências futuras (vigente_desde > data da rodada)", () => {
    const configuracao = [
      { pontos: 3, vigente_desde: "2000-01-01" },
      { pontos: 99, vigente_desde: "2099-01-01" },
    ];
    expect(valorPontosVigente(configuracao, "2026-01-01")).toBe(3);
  });

  it("não depende da ordem de entrada do array de configuração", () => {
    const configuracao = [
      { pontos: 5, vigente_desde: "2026-06-01" },
      { pontos: 3, vigente_desde: "2000-01-01" },
    ];
    expect(valorPontosVigente(configuracao, "2026-12-31")).toBe(5);
  });

  it("retorna 0 (nunca lança) quando nenhuma vigência cobre a data informada", () => {
    const configuracao = [{ pontos: 3, vigente_desde: "2030-01-01" }];
    expect(valorPontosVigente(configuracao, "2026-01-01")).toBe(0);
    expect(valorPontosVigente([], "2026-01-01")).toBe(0);
  });
});

describe("calcularConfronto", () => {
  const VALOR_GOL = 3;

  it("retorna null quando não há nenhum time persistido (caso padrão de rodada legado, SPK-02)", () => {
    expect(calcularConfronto(undefined, undefined, VALOR_GOL)).toBeNull();
    expect(calcularConfronto([], undefined, VALOR_GOL)).toBeNull();
  });

  it("retorna null quando a contagem de times persistidos não é exatamente 2", () => {
    const umTimeSo = [{ id: "t1", atletaIds: ["a1"] }];
    expect(calcularConfronto(umTimeSo, undefined, VALOR_GOL)).toBeNull();

    const tresTimes = [
      { id: "t1", atletaIds: ["a1"] },
      { id: "t2", atletaIds: ["a2"] },
      { id: "t3", atletaIds: ["a3"] },
    ];
    expect(calcularConfronto(tresTimes, undefined, VALOR_GOL)).toBeNull();
  });

  it("soma pontos de gol por time — primeiro time confirmado = colete, segundo = sem_colete", () => {
    const times = [
      { id: "t1", atletaIds: ["a1", "a2"] },
      { id: "t2", atletaIds: ["b1"] },
    ];
    const golsPorAtleta = new Map([
      ["a1", 2],
      ["a2", 1],
      ["b1", 3],
    ]);
    // colete (t1): (2 + 1) gols * 3 pontos = 9; sem_colete (t2): 3 gols * 3 pontos = 9.
    expect(calcularConfronto(times, golsPorAtleta, VALOR_GOL)).toEqual({
      colete: 9,
      sem_colete: 9,
    });
  });

  it("atleta sem entrada no mapa de gols conta 0 (nunca lança)", () => {
    const times = [
      { id: "t1", atletaIds: ["a1"] },
      { id: "t2", atletaIds: ["b1"] },
    ];
    expect(calcularConfronto(times, undefined, VALOR_GOL)).toEqual({
      colete: 0,
      sem_colete: 0,
    });
    expect(calcularConfronto(times, new Map([["b1", 2]]), VALOR_GOL)).toEqual({
      colete: 0,
      sem_colete: 6,
    });
  });

  it("placar 0x0 é um confronto legítimo (nenhum gol na rodada), não null", () => {
    const times = [
      { id: "t1", atletaIds: ["a1"] },
      { id: "t2", atletaIds: ["b1"] },
    ];
    expect(calcularConfronto(times, new Map(), 0)).toEqual({ colete: 0, sem_colete: 0 });
  });
});
