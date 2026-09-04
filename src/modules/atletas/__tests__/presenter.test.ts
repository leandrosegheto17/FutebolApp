// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { AtletaRow, NivelTecnicoRow } from "../repository";
import { paraAtletaResponse } from "../presenter";

const ATLETA_BASE: AtletaRow = {
  id: "atleta-1",
  nome_completo: "Atleta Teste",
  apelido_exibicao: "Atleta",
  contato: "11999999999",
  data_nascimento: "1990-01-01",
  consentimento_responsavel_obtido: false,
  pontuacao_inicial: 7,
  ativo: true,
  anonimizado_em: null,
  criado_em: "2026-09-03T00:00:00.000Z",
};

describe("paraAtletaResponse (BE-06, RN-03 fallback)", () => {
  it("usa o nível técnico calculado quando a linha da view existe", () => {
    const nivelTecnico: NivelTecnicoRow = {
      atleta_id: "atleta-1",
      rodadas_presentes: 4,
      nivel_tecnico: 2.5,
    };
    const resposta = paraAtletaResponse(ATLETA_BASE, nivelTecnico);
    expect(resposta.nivel_tecnico).toBe(2.5);
    expect(resposta.rodadas_presentes).toBe(4);
  });

  it("cai para pontuacao_inicial quando não há linha de nível técnico (atleta sem presença)", () => {
    const resposta = paraAtletaResponse(ATLETA_BASE, undefined);
    expect(resposta.nivel_tecnico).toBe(ATLETA_BASE.pontuacao_inicial);
    expect(resposta.rodadas_presentes).toBe(0);
  });

  it("nunca inclui campo diferente do contrato (sem vazamento de coluna interna nova)", () => {
    const resposta = paraAtletaResponse(ATLETA_BASE, undefined);
    expect(Object.keys(resposta).sort()).toEqual(
      [
        "id",
        "nome_completo",
        "apelido_exibicao",
        "contato",
        "data_nascimento",
        "consentimento_responsavel_obtido",
        "pontuacao_inicial",
        "ativo",
        "anonimizado_em",
        "criado_em",
        "nivel_tecnico",
        "rodadas_presentes",
      ].sort(),
    );
  });
});
