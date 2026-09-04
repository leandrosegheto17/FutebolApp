// @vitest-environment node
/**
 * Teste unitário de BE-11 (TASK.md Seção 3.1) — montagem do payload de
 * resposta, incluindo o contrato de dado EXATO do ADR-010 para o caso de
 * conflito (`restricoes_conflitantes`/`grupos_conflito`). Sem banco.
 */
import { describe, expect, it } from "vitest";
import type { AtletaParaMontagem } from "../busca-local";
import type { Componente } from "../grafo";
import { paraSugestaoConflitoResponse, paraSugestaoOkResponse } from "../presenter";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function atleta(
  atletaId: string,
  apelidoExibicao: string,
  nivelTecnico: number,
  idade: number | null,
): AtletaParaMontagem {
  return { atletaId, apelidoExibicao, nivelTecnico, idade };
}

describe("paraSugestaoOkResponse", () => {
  it("monta um item por time, com médias de nível técnico/idade calculadas corretamente", () => {
    const times: AtletaParaMontagem[][] = [
      [atleta(A, "joao", 8, 20), atleta(B, "carlos", 6, 30)],
      [atleta(C, "marcos", 4, null)],
    ];
    const resposta = paraSugestaoOkResponse(times, 2);
    expect(resposta.status).toBe("ok");
    expect(resposta.quantidade_times_solicitada).toBe(2);
    expect(resposta.times).toHaveLength(2);
    expect(resposta.times[0]!.indice).toBe(0);
    expect(resposta.times[0]!.nivel_tecnico_medio).toBe(7); // (8+6)/2
    expect(resposta.times[0]!.idade_media).toBe(25); // (20+30)/2
    expect(resposta.times[1]!.nivel_tecnico_medio).toBe(4);
    // idade_media é null quando nenhum atleta do time tem data_nascimento.
    expect(resposta.times[1]!.idade_media).toBeNull();
  });

  it("nunca inclui o campo restricoes_conflitantes (só aparece no caso de conflito, ADR-010)", () => {
    const resposta = paraSugestaoOkResponse([[atleta(A, "joao", 5, 20)]], 1);
    expect("restricoes_conflitantes" in resposta).toBe(false);
  });
});

describe("paraSugestaoConflitoResponse", () => {
  it("segue o contrato exato do ADR-010: restricoes_conflitantes + grupos_conflito", () => {
    const grupos: Componente[] = [
      {
        vertices: [A, B, C].sort(),
        arestas: [
          { restricaoId: "r1", atletaAId: A, atletaBId: B },
          { restricaoId: "r2", atletaAId: B, atletaBId: C },
        ],
      },
    ];
    const apelidos = new Map([
      [A, "joao"],
      [B, "carlos"],
      [C, "marcos"],
    ]);
    const resposta = paraSugestaoConflitoResponse(grupos, 2, apelidos);

    expect(resposta.status).toBe("conflito");
    expect(resposta.restricoes_conflitantes).toHaveLength(2);
    for (const item of resposta.restricoes_conflitantes) {
      expect(item).toHaveProperty("restricao_id");
      expect(item).toHaveProperty("atleta_a_id");
      expect(item).toHaveProperty("atleta_a_nome");
      expect(item).toHaveProperty("atleta_b_id");
      expect(item).toHaveProperty("atleta_b_nome");
      expect(item.motivo).toBe("restricao_obrigatoria_ativa");
      expect(item.grupo_conflito).toBe(1);
    }
    expect(resposta.restricoes_conflitantes[0]!.atleta_a_nome).toBe("joao");
    expect(resposta.restricoes_conflitantes[0]!.atleta_b_nome).toBe("carlos");

    expect(resposta.grupos_conflito).toHaveLength(1);
    const grupo = resposta.grupos_conflito[0]!;
    expect(grupo.grupo_conflito).toBe(1);
    expect(grupo.atletas_ids.sort()).toEqual([A, B, C].sort());
    expect(grupo.quantidade_times_solicitada).toBe(2);
    expect(grupo.mensagem).toContain("3 atletas");
    expect(grupo.mensagem).toContain("2 time(s)");
  });

  it("numera grupo_conflito 1-based, na ordem dos componentes recebidos", () => {
    const grupos: Componente[] = [
      { vertices: [A, B], arestas: [{ restricaoId: "r1", atletaAId: A, atletaBId: B }] },
      { vertices: [B, C], arestas: [{ restricaoId: "r2", atletaAId: B, atletaBId: C }] },
    ];
    const resposta = paraSugestaoConflitoResponse(grupos, 2, new Map());
    expect(resposta.grupos_conflito.map((g) => g.grupo_conflito)).toEqual([1, 2]);
    expect(resposta.restricoes_conflitantes.map((r) => r.grupo_conflito)).toEqual([1, 2]);
  });

  it("usa um placeholder quando o apelido do atleta não está no mapa (defensivo, nunca 500)", () => {
    const grupos: Componente[] = [
      { vertices: [A, B], arestas: [{ restricaoId: "r1", atletaAId: A, atletaBId: B }] },
    ];
    const resposta = paraSugestaoConflitoResponse(grupos, 2, new Map());
    expect(resposta.restricoes_conflitantes[0]!.atleta_a_nome).toBe(
      "Atleta desconhecido",
    );
  });

  it("nunca inclui o campo times (só aparece no caso ok)", () => {
    const resposta = paraSugestaoConflitoResponse([], 2, new Map());
    expect("times" in resposta).toBe(false);
  });
});
