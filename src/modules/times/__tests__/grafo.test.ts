// @vitest-environment node
/**
 * Teste unitário de BE-11 (TASK.md Seção 3.1) — decomposição em componentes
 * conexos (union-find, ADR-010 passo 2), sem banco.
 */
import { describe, expect, it } from "vitest";
import { calcularComponentesConexos, type ArestaConflito } from "../grafo";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const E = "55555555-5555-4555-8555-555555555555";

function aresta(id: string, a: string, b: string): ArestaConflito {
  return { restricaoId: id, atletaAId: a, atletaBId: b };
}

describe("calcularComponentesConexos", () => {
  it("sem nenhuma aresta, cada vértice é seu próprio componente (singleton)", () => {
    const componentes = calcularComponentesConexos([A, B, C], []);
    expect(componentes).toHaveLength(3);
    for (const componente of componentes) {
      expect(componente.vertices).toHaveLength(1);
      expect(componente.arestas).toHaveLength(0);
    }
  });

  it("uma aresta une dois vértices no mesmo componente; o resto permanece isolado", () => {
    const componentes = calcularComponentesConexos([A, B, C], [aresta("r1", A, B)]);
    expect(componentes).toHaveLength(2);
    const comAB = componentes.find((c) => c.vertices.includes(A));
    expect(comAB!.vertices.sort()).toEqual([A, B].sort());
    expect(comAB!.arestas).toHaveLength(1);
    const isolado = componentes.find((c) => c.vertices.includes(C));
    expect(isolado!.vertices).toEqual([C]);
  });

  it("arestas em cadeia (A-B, B-C) unem os três num único componente (transitividade)", () => {
    const componentes = calcularComponentesConexos(
      [A, B, C, D],
      [aresta("r1", A, B), aresta("r2", B, C)],
    );
    expect(componentes).toHaveLength(2); // {A,B,C} e {D}
    const grande = componentes.find((c) => c.vertices.length === 3)!;
    expect(grande.vertices.sort()).toEqual([A, B, C].sort());
    expect(grande.arestas).toHaveLength(2);
  });

  it("dois pares de restrição desconexos entre si formam dois componentes distintos", () => {
    const componentes = calcularComponentesConexos(
      [A, B, C, D, E],
      [aresta("r1", A, B), aresta("r2", C, D)],
    );
    expect(componentes).toHaveLength(3); // {A,B}, {C,D}, {E}
    expect(
      componentes.some((c) => c.vertices.length === 2 && c.vertices.includes(A)),
    ).toBe(true);
    expect(
      componentes.some((c) => c.vertices.length === 2 && c.vertices.includes(C)),
    ).toBe(true);
    expect(
      componentes.some((c) => c.vertices.length === 1 && c.vertices.includes(E)),
    ).toBe(true);
  });

  it("é determinístico: a mesma entrada sempre produz a mesma ordem de componentes/vértices", () => {
    const arestas = [aresta("r1", C, A), aresta("r2", D, B)];
    const resultado1 = calcularComponentesConexos([A, B, C, D], arestas);
    const resultado2 = calcularComponentesConexos([A, B, C, D], arestas);
    expect(resultado1).toEqual(resultado2);
  });

  it("nunca inclui, num componente, uma aresta cujas pontas pertencem a outro componente", () => {
    const componentes = calcularComponentesConexos(
      [A, B, C, D],
      [aresta("r1", A, B), aresta("r2", C, D)],
    );
    for (const componente of componentes) {
      for (const a of componente.arestas) {
        expect(componente.vertices).toContain(a.atletaAId);
        expect(componente.vertices).toContain(a.atletaBId);
      }
    }
  });
});
