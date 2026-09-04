import { describe, expect, it } from "vitest";
import {
  QUANTIDADE_TIMES,
  buildConfirmarTimesInput,
  buildRoundRobinTimes,
  labelParaIndice,
  recomputeTeamStats,
  swapAtletas,
} from "./times";
import type { AtletaMontado, TimeMontado } from "./types";

function atleta(overrides: Partial<AtletaMontado> = {}): AtletaMontado {
  return {
    atleta_id: "a1",
    apelido_exibicao: "João",
    nivel_tecnico: 5,
    idade: 20,
    ...overrides,
  };
}

describe("QUANTIDADE_TIMES", () => {
  it("é 2 nesta release (decisão Seção 6 do TASK.md)", () => {
    expect(QUANTIDADE_TIMES).toBe(2);
  });
});

describe("labelParaIndice", () => {
  it("índice 0 -> 'Time A', índice 1 -> 'Time B'", () => {
    expect(labelParaIndice(0)).toBe("Time A");
    expect(labelParaIndice(1)).toBe("Time B");
  });

  it("continua a sequência de letras para índices maiores (Backend já paramétrico em N)", () => {
    expect(labelParaIndice(2)).toBe("Time C");
  });
});

describe("recomputeTeamStats", () => {
  it("calcula média de nível técnico e idade, arredondadas (2 e 1 casas)", () => {
    const stats = recomputeTeamStats([
      atleta({ nivel_tecnico: 5, idade: 20 }),
      atleta({ nivel_tecnico: 6, idade: 25 }),
    ]);
    expect(stats.nivel_tecnico_medio).toBeCloseTo(5.5, 2);
    expect(stats.idade_media).toBeCloseTo(22.5, 1);
  });

  it("exclui idade `null` do cálculo, nunca trata como 0", () => {
    const stats = recomputeTeamStats([
      atleta({ idade: 20 }),
      atleta({ idade: null }),
      atleta({ idade: 30 }),
    ]);
    expect(stats.idade_media).toBe(25);
  });

  it("devolve `null` quando nenhum atleta tem o dado (nunca inventa 0)", () => {
    const stats = recomputeTeamStats([
      atleta({ nivel_tecnico: null, idade: null }),
      atleta({ nivel_tecnico: null, idade: null }),
    ]);
    expect(stats.nivel_tecnico_medio).toBeNull();
    expect(stats.idade_media).toBeNull();
  });

  it("time vazio devolve `null`/`null`", () => {
    expect(recomputeTeamStats([])).toEqual({
      nivel_tecnico_medio: null,
      idade_media: null,
    });
  });
});

describe("buildRoundRobinTimes (fallback de 'Gerar mesmo assim')", () => {
  const presentes = [
    { atleta_id: "1", apelido_exibicao: "A" },
    { atleta_id: "2", apelido_exibicao: "B" },
    { atleta_id: "3", apelido_exibicao: "C" },
    { atleta_id: "4", apelido_exibicao: "D" },
  ];

  it("distribui por round-robin (posição % N) em N times", () => {
    const times = buildRoundRobinTimes(presentes, 2);
    expect(times).toHaveLength(2);
    expect(times[0]!.atletas.map((a) => a.atleta_id)).toEqual(["1", "3"]);
    expect(times[1]!.atletas.map((a) => a.atleta_id)).toEqual(["2", "4"]);
  });

  it("nunca inventa nivel_tecnico/idade — todos `null`, estatísticas do time também `null`", () => {
    const [timeA] = buildRoundRobinTimes(presentes, 2);
    expect(
      timeA!.atletas.every((a) => a.nivel_tecnico === null && a.idade === null),
    ).toBe(true);
    expect(timeA!.nivel_tecnico_medio).toBeNull();
    expect(timeA!.idade_media).toBeNull();
  });

  it("quantidade ímpar de presentes: um time fica com um atleta a mais (nunca perde um atleta)", () => {
    const times = buildRoundRobinTimes(presentes.slice(0, 3), 2);
    const total = times.reduce((soma, time) => soma + time.atletas.length, 0);
    expect(total).toBe(3);
  });
});

describe("swapAtletas", () => {
  const times: TimeMontado[] = [
    {
      indice: 0,
      atletas: [
        atleta({ atleta_id: "1", nivel_tecnico: 4 }),
        atleta({ atleta_id: "2", nivel_tecnico: 6 }),
      ],
      nivel_tecnico_medio: 5,
      idade_media: 20,
    },
    {
      indice: 1,
      atletas: [
        atleta({ atleta_id: "3", nivel_tecnico: 8 }),
        atleta({ atleta_id: "4", nivel_tecnico: 10 }),
      ],
      nivel_tecnico_medio: 9,
      idade_media: 20,
    },
  ];

  it("troca dois atletas de time (RF-05.4) e recalcula os indicadores dos dois times afetados", () => {
    const proximo = swapAtletas(times, "1", "3");
    expect(proximo[0]!.atletas.map((a) => a.atleta_id)).toEqual(["3", "2"]);
    expect(proximo[1]!.atletas.map((a) => a.atleta_id)).toEqual(["1", "4"]);
    expect(proximo[0]!.nivel_tecnico_medio).toBeCloseTo((8 + 6) / 2, 2);
    expect(proximo[1]!.nivel_tecnico_medio).toBeCloseTo((4 + 10) / 2, 2);
  });

  it("não altera o array original (imutabilidade)", () => {
    const original = JSON.stringify(times);
    swapAtletas(times, "1", "3");
    expect(JSON.stringify(times)).toBe(original);
  });

  it("id inexistente: devolve os times inalterados (defesa em profundidade)", () => {
    const proximo = swapAtletas(times, "1", "id-inexistente");
    expect(proximo).toBe(times);
  });

  it("dois atletas do mesmo time: devolve os times inalterados (nada a trocar)", () => {
    const proximo = swapAtletas(times, "1", "2");
    expect(proximo).toBe(times);
  });
});

describe("buildConfirmarTimesInput", () => {
  it("monta o corpo de POST /api/rodadas/{id}/times com label default e atletas_ids", () => {
    const input = buildConfirmarTimesInput([
      {
        indice: 0,
        atletas: [atleta({ atleta_id: "1" }), atleta({ atleta_id: "2" })],
        nivel_tecnico_medio: 5,
        idade_media: 20,
      },
      {
        indice: 1,
        atletas: [atleta({ atleta_id: "3" })],
        nivel_tecnico_medio: 5,
        idade_media: 20,
      },
    ]);
    expect(input).toEqual([
      { label: "Time A", atletas_ids: ["1", "2"] },
      { label: "Time B", atletas_ids: ["3"] },
    ]);
  });
});
