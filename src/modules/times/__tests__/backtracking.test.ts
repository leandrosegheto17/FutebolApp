// @vitest-environment node
/**
 * Teste unitário de BE-11 (TASK.md Seção 3.1) — Fase 1 (ADR-007):
 * backtracking com poda por componente conexo (`colorirComponente`) e
 * orquestração multi-componente (`colorirGrafo`, ADR-010 passo 3-5),
 * incluindo o guard de timeout (TASK.md Seção 6.2 item 3). Sem banco —
 * `grafo.ts`/`backtracking.ts`/`timeout.ts` são lógica pura.
 */
import { describe, expect, it } from "vitest";
import { colorirComponente, colorirGrafo } from "../backtracking";
import {
  calcularComponentesConexos,
  type ArestaConflito,
  type Componente,
} from "../grafo";
import { Deadline, TimeoutError } from "../timeout";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

function aresta(id: string, a: string, b: string): ArestaConflito {
  return { restricaoId: id, atletaAId: a, atletaBId: b };
}

/** Deadline "infinito" para testes que não exercitam o timeout. */
function deadlineFolgado(): Deadline {
  return new Deadline(60_000);
}

function ordemColoresPadrao(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

describe("colorirComponente", () => {
  it("um par em conflito (A-B) com N=2 é sempre colorido em times diferentes", () => {
    const componente: Componente = { vertices: [A, B], arestas: [aresta("r1", A, B)] };
    const resultado = colorirComponente(
      componente,
      2,
      deadlineFolgado(),
      ordemColoresPadrao(2),
    );
    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.cores.get(A)).not.toBe(resultado.cores.get(B));
    }
  });

  it(
    "um triângulo (A-B, B-C, A-C — três atletas mutuamente restritos) com N=2 NÃO admite " +
      "coloração válida (impossível separar 3 em conflito mútuo em só 2 times)",
    () => {
      const componente: Componente = {
        vertices: [A, B, C],
        arestas: [aresta("r1", A, B), aresta("r2", B, C), aresta("r3", A, C)],
      };
      const resultado = colorirComponente(
        componente,
        2,
        deadlineFolgado(),
        ordemColoresPadrao(2),
      );
      expect(resultado.sucesso).toBe(false);
    },
  );

  it("o mesmo triângulo É colorível com N=3 (um atleta por time)", () => {
    const componente: Componente = {
      vertices: [A, B, C],
      arestas: [aresta("r1", A, B), aresta("r2", B, C), aresta("r3", A, C)],
    };
    const resultado = colorirComponente(
      componente,
      3,
      deadlineFolgado(),
      ordemColoresPadrao(3),
    );
    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      const cores = new Set(resultado.cores.values());
      expect(cores.size).toBe(3);
    }
  });

  it("um vértice isolado (sem aresta) é sempre colorível, qualquer N >= 1", () => {
    const componente: Componente = { vertices: [A], arestas: [] };
    const resultado = colorirComponente(
      componente,
      2,
      deadlineFolgado(),
      ordemColoresPadrao(2),
    );
    expect(resultado.sucesso).toBe(true);
  });

  it(
    "cadeia A-B-C-D (cada um só restrito ao vizinho, sem restrição direta A-C nem B-D) é " +
      "colorível com N=2 (grafo bipartido)",
    () => {
      const componente: Componente = {
        vertices: [A, B, C, D],
        arestas: [aresta("r1", A, B), aresta("r2", B, C), aresta("r3", C, D)],
      };
      const resultado = colorirComponente(
        componente,
        2,
        deadlineFolgado(),
        ordemColoresPadrao(2),
      );
      expect(resultado.sucesso).toBe(true);
      if (resultado.sucesso) {
        expect(resultado.cores.get(A)).not.toBe(resultado.cores.get(B));
        expect(resultado.cores.get(B)).not.toBe(resultado.cores.get(C));
        expect(resultado.cores.get(C)).not.toBe(resultado.cores.get(D));
      }
    },
  );

  it("com o deadline já vencido, lança TimeoutError em vez de devolver um resultado (falha técnica real)", () => {
    const componente: Componente = { vertices: [A, B], arestas: [aresta("r1", A, B)] };
    const deadlineVencido = new Deadline(-1);
    expect(() =>
      colorirComponente(componente, 2, deadlineVencido, ordemColoresPadrao(2)),
    ).toThrow(TimeoutError);
  });
});

describe("colorirGrafo", () => {
  it("todos os componentes coloríveis => sucesso com uma cor por vértice presente", () => {
    const componentes = calcularComponentesConexos([A, B, C, D], [aresta("r1", A, B)]);
    const resultado = colorirGrafo(componentes, 2, deadlineFolgado());
    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.cores.size).toBe(4);
      expect(resultado.cores.get(A)).not.toBe(resultado.cores.get(B));
    }
  });

  it(
    "reporta TODOS os componentes que falham (não só o primeiro) — dois triângulos " +
      "independentes, ambos inviáveis com N=2",
    () => {
      const E = "55555555-5555-4555-8555-555555555555";
      const F = "66666666-6666-4666-8666-666666666666";
      const G = "77777777-7777-4777-8777-777777777777";
      const componentes = calcularComponentesConexos(
        [A, B, C, E, F, G],
        [
          aresta("r1", A, B),
          aresta("r2", B, C),
          aresta("r3", A, C),
          aresta("r4", E, F),
          aresta("r5", F, G),
          aresta("r6", E, G),
        ],
      );
      const resultado = colorirGrafo(componentes, 2, deadlineFolgado());
      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.componentesFalhos).toHaveLength(2);
      }
    },
  );

  it(
    "um componente sem nenhuma restrição em conflito com um triângulo inviável ainda assim " +
      "só reporta o triângulo (componente sem aresta nunca falha)",
    () => {
      const componentes = calcularComponentesConexos(
        [A, B, C, D],
        [aresta("r1", A, B), aresta("r2", B, C), aresta("r3", A, C)],
      );
      const resultado = colorirGrafo(componentes, 2, deadlineFolgado());
      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.componentesFalhos).toHaveLength(1);
        expect(resultado.componentesFalhos[0]!.vertices.sort()).toEqual([A, B, C].sort());
      }
    },
  );

  it("com o deadline já vencido, propaga TimeoutError (nunca trava, nunca devolve resultado parcial)", () => {
    const componentes = calcularComponentesConexos([A, B], [aresta("r1", A, B)]);
    const deadlineVencido = new Deadline(-1);
    expect(() => colorirGrafo(componentes, 2, deadlineVencido)).toThrow(TimeoutError);
  });
});
