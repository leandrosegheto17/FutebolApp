import { describe, expect, it } from "vitest";
import { buildEntryViewModel } from "./entryPresenter";
import type { LookupMaps } from "./enrichment";
import type { LogAuditoriaItem } from "./types";

const EMPTY_LOOKUPS: LookupMaps = { rodadaData: new Map(), atletaNome: new Map() };

const LOOKUPS_COM_DADO: LookupMaps = {
  rodadaData: new Map([["rodada-1", "2026-09-05"]]),
  atletaNome: new Map([["atleta-1", "Carlinhos"]]),
};

const CORRECAO_ITEM: LogAuditoriaItem = {
  id: "log-1",
  rodada_id: "rodada-1",
  atleta_id: "atleta-1",
  tipo_evento: "correcao",
  ocorrido_em: "2026-09-02T14:32:00.000Z",
  valores_antes: {
    status: "presente",
    eventos: [{ tipo: "gol", quantidade: 1 }],
    pontos_acumulados: 10,
  },
  valores_depois: {
    status: "ausente",
    eventos: [],
    pontos_acumulados: 8,
    ajuste_aplicado: -2,
  },
};

const ESTORNO_ITEM: LogAuditoriaItem = {
  id: "log-2",
  rodada_id: "rodada-1",
  atleta_id: null,
  tipo_evento: "estorno",
  ocorrido_em: "2026-09-01T09:10:00.000Z",
  valores_antes: { status: "lancada" },
  valores_depois: { status: "excluida", atletas_afetados: 20, pontos_revertidos: -45 },
};

const ANONIMIZACAO_ITEM: LogAuditoriaItem = {
  id: "log-3",
  rodada_id: null,
  atleta_id: "atleta-1",
  tipo_evento: "anonimizacao",
  ocorrido_em: "2026-08-30T18:00:00.000Z",
  valores_antes: {
    nome_completo: "[REDACTED]",
    apelido_exibicao: "[REDACTED]",
    contato: "[REDACTED]",
    data_nascimento: "[REDACTED]",
  },
  valores_depois: {
    nome_completo: "Atleta anonimizado",
    apelido_exibicao: "Atleta #a1b2c3d4",
    contato: null,
    data_nascimento: null,
  },
};

/** Nenhum campo produzido por este módulo, em nenhum caso, deve mencionar autoria (RN-12/RN-07). */
function assertNuncaMencionaAutor(entry: ReturnType<typeof buildEntryViewModel>) {
  const textoCompleto = JSON.stringify(entry).toLowerCase();
  expect(textoCompleto).not.toMatch(/autor|organizador desconhecido|\bsistema\b/);
}

describe("buildEntryViewModel — tipo_evento: correcao", () => {
  it("monta título com rodada resolvida e subtítulo com o atleta resolvido", () => {
    const entry = buildEntryViewModel(CORRECAO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.titulo).toBe("Rodada 05/09/2026 — correção");
    expect(entry.subtitulo).toBe("Atleta: Carlinhos");
  });

  it("diff inclui presença e gols alterados, mas não pontos se pontos_acumulados também mudou", () => {
    const entry = buildEntryViewModel(CORRECAO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.diffItems).toContainEqual({
      label: "Presença",
      before: "Presente",
      after: "Ausente",
    });
    expect(entry.diffItems).toContainEqual({ label: "Gols", before: "1", after: "0" });
    expect(entry.diffItems).toContainEqual({
      label: "Pontos acumulados",
      before: "10",
      after: "8",
    });
  });

  it("resumo mostra o ajuste líquido aplicado", () => {
    const entry = buildEntryViewModel(CORRECAO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.resumoLinhas).toEqual(["Ajuste aplicado: -2 pts"]);
  });

  it("ajuste positivo recebe sinal '+' explícito", () => {
    const item: LogAuditoriaItem = {
      ...CORRECAO_ITEM,
      valores_depois: { ...(CORRECAO_ITEM.valores_depois as object), ajuste_aplicado: 3 },
    };
    const entry = buildEntryViewModel(item, LOOKUPS_COM_DADO);
    expect(entry.resumoLinhas).toEqual(["Ajuste aplicado: +3 pts"]);
  });

  it("sem dado de lookup, degrada para rótulo com id truncado — nunca quebra", () => {
    const entry = buildEntryViewModel(CORRECAO_ITEM, EMPTY_LOOKUPS);
    expect(entry.titulo).toBe("Rodada #rodada-1 — correção");
    expect(entry.subtitulo).toBe("Atleta: Atleta #atleta-1");
  });

  it("rodada_id/atleta_id nulos (dado malformado, defesa em profundidade): nunca lança", () => {
    const item: LogAuditoriaItem = { ...CORRECAO_ITEM, rodada_id: null, atleta_id: null };
    const entry = buildEntryViewModel(item, LOOKUPS_COM_DADO);
    expect(entry.titulo).toBe("Rodada rodada não identificada — correção");
    expect(entry.subtitulo).toBe("Atleta: atleta não identificado");
  });

  it("nenhum campo do resultado menciona autoria", () => {
    assertNuncaMencionaAutor(buildEntryViewModel(CORRECAO_ITEM, LOOKUPS_COM_DADO));
  });
});

describe("buildEntryViewModel — tipo_evento: estorno (exclusão)", () => {
  it("monta título 'Rodada ... — exclusão', sem subtítulo (evento não é centrado em atleta)", () => {
    const entry = buildEntryViewModel(ESTORNO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.titulo).toBe("Rodada 05/09/2026 — exclusão");
    expect(entry.subtitulo).toBeUndefined();
  });

  it("diff mostra a mudança de status da rodada", () => {
    const entry = buildEntryViewModel(ESTORNO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.diffItems).toEqual([
      { label: "Status da rodada", before: "Lançada", after: "Excluída" },
    ]);
  });

  it("resumo mostra a contagem de atletas afetados (formato literal do wireframe) e o total revertido", () => {
    const entry = buildEntryViewModel(ESTORNO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.resumoLinhas).toEqual([
      "(20 atletas afetados)",
      "Total revertido: -45 pts",
    ]);
  });

  it("singular: '1 atleta afetado'", () => {
    const item: LogAuditoriaItem = {
      ...ESTORNO_ITEM,
      valores_depois: { status: "excluida", atletas_afetados: 1 },
    };
    const entry = buildEntryViewModel(item, LOOKUPS_COM_DADO);
    expect(entry.resumoLinhas[0]).toBe("(1 atleta afetado)");
  });

  it("nenhum campo do resultado menciona autoria", () => {
    assertNuncaMencionaAutor(buildEntryViewModel(ESTORNO_ITEM, LOOKUPS_COM_DADO));
  });
});

describe("buildEntryViewModel — tipo_evento: anonimizacao", () => {
  it("título fixo 'Anonimização de atleta', subtítulo com o atleta resolvido", () => {
    const entry = buildEntryViewModel(ANONIMIZACAO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.titulo).toBe("Anonimização de atleta");
    expect(entry.subtitulo).toBe("Atleta: Carlinhos");
  });

  it("diff mostra 'Dado redigido' como 'antes' para cada campo redigido — NUNCA o valor real", () => {
    const entry = buildEntryViewModel(ANONIMIZACAO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.diffItems).toContainEqual({
      label: "Nome completo",
      before: "Dado redigido",
      after: "Atleta anonimizado",
    });
    expect(entry.diffItems).toContainEqual({
      label: "Apelido de exibição",
      before: "Dado redigido",
      after: "Atleta #a1b2c3d4",
    });
    expect(entry.diffItems).toContainEqual({
      label: "Contato",
      before: "Dado redigido",
      after: "—",
    });
    expect(entry.diffItems).toContainEqual({
      label: "Data de nascimento",
      before: "Dado redigido",
      after: "—",
    });
  });

  it("defesa em profundidade: se valores_antes[chave] NÃO for exatamente '[REDACTED]' (ex.: bug hipotético do Backend vazando o dado real), a linha é omitida — nunca renderiza o valor real", () => {
    const item: LogAuditoriaItem = {
      ...ANONIMIZACAO_ITEM,
      valores_antes: { nome_completo: "João da Silva (vazamento hipotético)" },
    };
    const entry = buildEntryViewModel(item, LOOKUPS_COM_DADO);
    expect(entry.diffItems).toEqual([]);
    const textoCompleto = JSON.stringify(entry);
    expect(textoCompleto).not.toContain("João da Silva");
  });

  it("campo redigido sem chave conhecida usa a própria chave como rótulo (nunca lacuna silenciosa)", () => {
    const item: LogAuditoriaItem = {
      ...ANONIMIZACAO_ITEM,
      valores_antes: { campo_novo_desconhecido: "[REDACTED]" },
      valores_depois: { campo_novo_desconhecido: "valor novo" },
    };
    const entry = buildEntryViewModel(item, LOOKUPS_COM_DADO);
    expect(entry.diffItems).toEqual([
      { label: "campo_novo_desconhecido", before: "Dado redigido", after: "valor novo" },
    ]);
  });

  it("resumoLinhas sempre vazio para anonimização (nenhum resumo textual adicional definido)", () => {
    const entry = buildEntryViewModel(ANONIMIZACAO_ITEM, LOOKUPS_COM_DADO);
    expect(entry.resumoLinhas).toEqual([]);
  });

  it("nenhum campo do resultado menciona autoria", () => {
    assertNuncaMencionaAutor(buildEntryViewModel(ANONIMIZACAO_ITEM, LOOKUPS_COM_DADO));
  });
});

describe("buildEntryViewModel — robustez contra payload malformado (defesa em profundidade)", () => {
  it("valores_antes/valores_depois não sendo objetos: nunca lança, diff fica vazio", () => {
    const item: LogAuditoriaItem = {
      ...CORRECAO_ITEM,
      valores_antes: null,
      valores_depois: "string inesperada",
    };
    expect(() => buildEntryViewModel(item, LOOKUPS_COM_DADO)).not.toThrow();
    const entry = buildEntryViewModel(item, LOOKUPS_COM_DADO);
    expect(entry.diffItems).toEqual([]);
  });
});
