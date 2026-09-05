import { describe, expect, it } from "vitest";
import {
  buildRankingColumns,
  firstMobileVisibleColumnIndex,
  statusForColumn,
  DESKTOP_COLUMN_LIMIT,
  MOBILE_COLUMN_LIMIT,
} from "./matrix";
import type { RankingPublicoRecentesItem } from "./types";

function item(
  atletaId: string,
  rodadas: Array<[string, string, "presente" | "ausente" | "lesionado"]>,
): RankingPublicoRecentesItem {
  return {
    atleta_id: atletaId,
    nome_exibicao: atletaId,
    rodadas_recentes: rodadas.map(([rodada_id, data, status]) => ({
      rodada_id,
      data,
      status,
    })),
    rodadas_jogadas: 10,
    media_presenca: 80,
  };
}

describe("buildRankingColumns", () => {
  it("constrói colunas a partir da união de rodada_id, ordenadas mais-antiga -> mais-recente", () => {
    const items = [
      item("a", [
        ["r3", "2026-09-05", "presente"],
        ["r2", "2026-08-29", "ausente"],
        ["r1", "2026-08-22", "presente"],
      ]),
    ];
    const columns = buildRankingColumns(items, 7);
    expect(columns.map((c) => c.rodadaId)).toEqual(["r1", "r2", "r3"]);
    expect(columns.map((c) => c.data)).toEqual([
      "2026-08-22",
      "2026-08-29",
      "2026-09-05",
    ]);
  });

  it("dedup por rodada_id entre atletas diferentes (mesma rodada aparece uma única vez)", () => {
    const items = [
      item("a", [["r1", "2026-09-05", "presente"]]),
      item("b", [["r1", "2026-09-05", "ausente"]]),
    ];
    const columns = buildRankingColumns(items, 7);
    expect(columns).toHaveLength(1);
  });

  it("caso de borda: atleta com histórico mais curto não perde a coluna que existe no atleta mais completo", () => {
    const completo = item("a", [
      ["r1", "2026-08-01", "presente"],
      ["r2", "2026-08-08", "presente"],
      ["r3", "2026-08-15", "presente"],
    ]);
    const novato = item("b", [["r3", "2026-08-15", "ausente"]]);
    const columns = buildRankingColumns([completo, novato], 7);
    expect(columns.map((c) => c.rodadaId)).toEqual(["r1", "r2", "r3"]);
  });

  it("corta em `limit`, preservando as rodadas mais recentes", () => {
    const rodadas: Array<[string, string, "presente"]> = Array.from(
      { length: 9 },
      (_, i) => [`r${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`, "presente"],
    );
    const columns = buildRankingColumns([item("a", rodadas)], DESKTOP_COLUMN_LIMIT);
    expect(columns).toHaveLength(7);
    // As 2 mais antigas (r0, r1) ficam de fora do corte.
    expect(columns.map((c) => c.rodadaId)).not.toContain("r0");
    expect(columns.map((c) => c.rodadaId)).not.toContain("r1");
    expect(columns[columns.length - 1]!.rodadaId).toBe("r8");
  });

  it("array vazio quando não há nenhuma rodada em nenhum atleta", () => {
    expect(buildRankingColumns([item("a", [])], 7)).toEqual([]);
  });
});

describe("firstMobileVisibleColumnIndex", () => {
  it("esconde as mais antigas, mantendo as MOBILE_COLUMN_LIMIT mais recentes", () => {
    expect(firstMobileVisibleColumnIndex(7)).toBe(7 - MOBILE_COLUMN_LIMIT);
    expect(firstMobileVisibleColumnIndex(5)).toBe(0);
    expect(firstMobileVisibleColumnIndex(3)).toBe(0);
  });
});

describe("statusForColumn", () => {
  it("retorna o status quando o atleta tem registro na rodada da coluna", () => {
    const a = item("a", [["r1", "2026-09-05", "lesionado"]]);
    expect(statusForColumn(a, { rodadaId: "r1", data: "2026-09-05" })).toBe("lesionado");
  });

  it("retorna undefined quando o atleta não tem registro (nunca inventa um status)", () => {
    const a = item("a", [["r1", "2026-09-05", "presente"]]);
    expect(statusForColumn(a, { rodadaId: "r2", data: "2026-08-29" })).toBeUndefined();
    expect(
      statusForColumn(undefined, { rodadaId: "r1", data: "2026-09-05" }),
    ).toBeUndefined();
  });
});
