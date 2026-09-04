import { describe, expect, it } from "vitest";
import { labelDoTime, rosterAtualDoTime } from "./substituicoes";
import type { Substituicao, TimeConfirmado } from "./types";

const TIME_A: TimeConfirmado = {
  time_id: "t1",
  label: "Time A",
  atletas: [
    { atleta_id: "1", apelido_exibicao: "João" },
    { atleta_id: "2", apelido_exibicao: "Carlinhos" },
  ],
};

const TIME_B: TimeConfirmado = {
  time_id: "t2",
  label: "Time B",
  atletas: [{ atleta_id: "3", apelido_exibicao: "Rafa" }],
};

function substituicao(overrides: Partial<Substituicao> = {}): Substituicao {
  return {
    id: "sub-1",
    rodada_id: "rodada-1",
    time_id: "t1",
    atleta_sai_id: "1",
    atleta_sai_nome: "João",
    atleta_entra_id: "4",
    atleta_entra_nome: "Bruno",
    criado_em: "2026-09-19T20:00:00Z",
    ...overrides,
  };
}

describe("rosterAtualDoTime", () => {
  it("sem nenhuma substituição, devolve o roster persistido sem alteração", () => {
    expect(rosterAtualDoTime(TIME_A, [])).toEqual(TIME_A.atletas);
  });

  it("ignora substituições de outro time", () => {
    const outraSubstituicao = substituicao({ id: "sub-2", time_id: "t2" });
    expect(rosterAtualDoTime(TIME_A, [outraSubstituicao])).toEqual(TIME_A.atletas);
  });

  it("aplica uma substituição: remove quem saiu, adiciona quem entrou", () => {
    const roster = rosterAtualDoTime(TIME_A, [substituicao()]);
    expect(roster).toEqual([
      { atleta_id: "2", apelido_exibicao: "Carlinhos" },
      { atleta_id: "4", apelido_exibicao: "Bruno" },
    ]);
  });

  it("aplica múltiplas substituições em ordem cronológica (uma substitui quem entrou na anterior)", () => {
    const primeira = substituicao();
    const segunda = substituicao({
      id: "sub-2",
      atleta_sai_id: "4",
      atleta_sai_nome: "Bruno",
      atleta_entra_id: "5",
      atleta_entra_nome: "Marcelo",
    });
    const roster = rosterAtualDoTime(TIME_A, [primeira, segunda]);
    expect(roster).toEqual([
      { atleta_id: "2", apelido_exibicao: "Carlinhos" },
      { atleta_id: "5", apelido_exibicao: "Marcelo" },
    ]);
  });

  it("nunca muta o array/objeto original de `TimeConfirmado.atletas`", () => {
    const copiaOriginal = [...TIME_A.atletas];
    rosterAtualDoTime(TIME_A, [substituicao()]);
    expect(TIME_A.atletas).toEqual(copiaOriginal);
  });
});

describe("labelDoTime", () => {
  it("resolve o rótulo do time pelo `time_id`", () => {
    expect(labelDoTime([TIME_A, TIME_B], "t2")).toBe("Time B");
  });

  it("devolve um fallback textual quando o `time_id` não é encontrado (defesa em profundidade)", () => {
    expect(labelDoTime([TIME_A, TIME_B], "inexistente")).toBe("Time");
  });
});
