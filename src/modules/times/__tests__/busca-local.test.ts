// @vitest-environment node
/**
 * Teste unitário de BE-11 (TASK.md Seção 3.1) — Fase 2 (ADR-007, busca
 * local): rebalanceio de tamanho + swap iterativo minimizando a diferença
 * agregada de nível técnico/idade (RF-05.3), sempre preservando as
 * restrições obrigatórias. Sem banco — lógica pura.
 */
import { describe, expect, it } from "vitest";
import {
  calcularCapacidades,
  calcularCusto,
  otimizarEquilibrio,
  rebalancearTamanhos,
  type AtletaParaMontagem,
} from "../busca-local";
import { Deadline } from "../timeout";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

function deadlineFolgado(): Deadline {
  return new Deadline(60_000);
}

function atleta(
  atletaId: string,
  nivelTecnico: number,
  idade: number | null = 25,
): AtletaParaMontagem {
  return { atletaId, apelidoExibicao: atletaId.slice(0, 4), nivelTecnico, idade };
}

describe("calcularCapacidades", () => {
  it("divide igualmente quando o total é múltiplo de N", () => {
    expect(calcularCapacidades(18, 2)).toEqual([9, 9]);
    expect(calcularCapacidades(9, 3)).toEqual([3, 3, 3]);
  });

  it("distribui o resto entre os primeiros times quando não divide igualmente", () => {
    expect(calcularCapacidades(19, 2)).toEqual([10, 9]);
    expect(calcularCapacidades(7, 3)).toEqual([3, 2, 2]);
  });
});

describe("rebalancearTamanhos", () => {
  it("move jogadores livres (sem restrição) de um time sobrecarregado para um vazio até bater a capacidade", () => {
    const times: string[][] = [[A, B, C, D], []];
    const capacidades = [2, 2];
    const adjacenciaGlobal = new Map<string, Set<string>>();
    rebalancearTamanhos(times, capacidades, adjacenciaGlobal, deadlineFolgado());
    expect(times[0]).toHaveLength(2);
    expect(times[1]).toHaveLength(2);
  });

  it("nunca move um atleta para um time onde ele tem uma restrição obrigatória ativa com um membro já presente", () => {
    // A está restrito a C. Time 0 = [A, B] (2, acima da capacidade 1), Time 1 = [C] (1, na capacidade).
    // Não deveria mover A para o time 1 (colidiria com C) — deve mover B em vez disso.
    const times: string[][] = [[A, B], [C]];
    const capacidades = [1, 2];
    const adjacenciaGlobal = new Map<string, Set<string>>([
      [A, new Set([C])],
      [C, new Set([A])],
    ]);
    rebalancearTamanhos(times, capacidades, adjacenciaGlobal, deadlineFolgado());
    expect(times[1]).not.toContain(A);
    expect(times[0]).toContain(A);
    expect(times[1]).toContain(B);
  });

  it("com o deadline já vencido, retorna imediatamente sem lançar (Fase 2 nunca é falha técnica)", () => {
    const times: string[][] = [[A, B, C, D], []];
    const capacidades = [2, 2];
    const deadlineVencido = new Deadline(-1);
    expect(() =>
      rebalancearTamanhos(times, capacidades, new Map(), deadlineVencido),
    ).not.toThrow();
  });
});

describe("calcularCusto", () => {
  it("é menor (mais equilibrado) quando as médias de nível técnico entre os times são mais próximas", () => {
    const atletasPorId = new Map<string, AtletaParaMontagem>([
      [A, atleta(A, 8)],
      [B, atleta(B, 8)],
      [C, atleta(C, 2)],
      [D, atleta(D, 2)],
    ]);
    const varianciaPop = 9; // variância de [8,8,2,2] em torno da média 5 = ((3)^2*4)/4 = 9

    const desequilibrado = [
      [A, B],
      [C, D],
    ]; // médias 8 e 2 — máximo desequilíbrio
    const equilibrado = [
      [A, C],
      [B, D],
    ]; // médias 5 e 5 — perfeitamente equilibrado

    const custoDesequilibrado = calcularCusto(
      desequilibrado,
      atletasPorId,
      varianciaPop,
      0,
    );
    const custoEquilibrado = calcularCusto(equilibrado, atletasPorId, varianciaPop, 0);
    expect(custoEquilibrado).toBeLessThan(custoDesequilibrado);
    expect(custoEquilibrado).toBe(0);
  });

  it(
    "ignora completamente o eixo idade quando nenhum atleta tem data_nascimento " +
      "(idade=null) — custo idêntico qualquer que seja a variância populacional de idade",
    () => {
      const atletasPorId = new Map<string, AtletaParaMontagem>([
        [A, atleta(A, 8, null)],
        [B, atleta(B, 2, null)],
      ]);
      const custoComVarianciaIdadeBaixa = calcularCusto([[A], [B]], atletasPorId, 9, 1);
      const custoComVarianciaIdadeAlta = calcularCusto([[A], [B]], atletasPorId, 9, 1000);
      expect(custoComVarianciaIdadeBaixa).toBe(custoComVarianciaIdadeAlta);
    },
  );
});

describe("otimizarEquilibrio", () => {
  it(
    "reduz a diferença de nível técnico agregado entre os times via swap, sem violar " +
      "nenhuma restrição obrigatória",
    () => {
      // Partição inicial desequilibrada: [A(8), B(7)] vs [C(2), D(1)].
      const times: string[][] = [
        [A, B],
        [C, D],
      ];
      const atletasPorId = new Map<string, AtletaParaMontagem>([
        [A, atleta(A, 8, 20)],
        [B, atleta(B, 7, 22)],
        [C, atleta(C, 2, 24)],
        [D, atleta(D, 1, 26)],
      ]);
      const adjacenciaGlobal = new Map<string, Set<string>>();

      const custoAntes = calcularCusto(
        times,
        atletasPorId,
        1, // valor qualquer > 0 só para o teste de redução relativa abaixo
        1,
      );
      otimizarEquilibrio(times, atletasPorId, adjacenciaGlobal, deadlineFolgado());
      const custoDepois = calcularCusto(times, atletasPorId, 1, 1);

      expect(custoDepois).toBeLessThanOrEqual(custoAntes);
      // Tamanho de cada time preservado (swap é sempre 1-para-1).
      expect(times[0]).toHaveLength(2);
      expect(times[1]).toHaveLength(2);
    },
  );

  it(
    "nunca produz um swap que junte dois atletas com restrição obrigatória ativa entre " +
      "si, mesmo quando essa troca seria a PRIMEIRA tentada pela busca (ordem dos times " +
      "escolhida de propósito para forçar o candidato inseguro a ser avaliado antes do " +
      "seguro) — a busca local pula o candidato inseguro e converge para um seguro",
    () => {
      // A e C têm restrição ativa. `times[0] = [A, B]`, `times[1] = [D, C]`: o primeiro
      // par avaliado por `otimizarEquilibrio` é (A, D) — trocar A(team0) com D(team1)
      // deixaria C e A juntos em team1 (D sai, A entra, C permanece) — deve ser recusado.
      const times: string[][] = [
        [A, B],
        [D, C],
      ];
      const atletasPorId = new Map<string, AtletaParaMontagem>([
        [A, atleta(A, 1, 20)],
        [B, atleta(B, 1, 20)],
        [C, atleta(C, 9, 20)],
        [D, atleta(D, 9, 20)],
      ]);
      const adjacenciaGlobal = new Map<string, Set<string>>([
        [A, new Set([C])],
        [C, new Set([A])],
      ]);
      otimizarEquilibrio(times, atletasPorId, adjacenciaGlobal, deadlineFolgado());
      const timeDoA = times.find((t) => t.includes(A))!;
      expect(timeDoA).not.toContain(C);
      const timeDoC = times.find((t) => t.includes(C))!;
      expect(timeDoC).not.toContain(A);
      // A busca ainda assim melhorou o equilíbrio (não travou parada só para evitar o
      // candidato inseguro) — as médias dos dois times ficam iguais (5 e 5).
      const custoFinal = calcularCusto(times, atletasPorId, 1, 0);
      expect(custoFinal).toBe(0);
    },
  );

  it("com o deadline já vencido, retorna imediatamente sem lançar e sem alterar os times", () => {
    const times: string[][] = [
      [A, B],
      [C, D],
    ];
    const original = times.map((t) => [...t]);
    const atletasPorId = new Map<string, AtletaParaMontagem>([
      [A, atleta(A, 9)],
      [B, atleta(B, 1)],
      [C, atleta(C, 9)],
      [D, atleta(D, 1)],
    ]);
    const deadlineVencido = new Deadline(-1);
    expect(() =>
      otimizarEquilibrio(times, atletasPorId, new Map(), deadlineVencido),
    ).not.toThrow();
    expect(times).toEqual(original);
  });
});
