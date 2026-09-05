import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAnonClient } from "@/lib/supabase/anon-client";
import { fetchRankingPublicoRecentes } from "./rankingRecentesApi";

vi.mock("@/lib/supabase/anon-client", () => ({
  getAnonClient: vi.fn(),
}));

/** Mesmo builder falso de `rankingApi.test.ts`, sem `.order()` (este
 * endpoint não precisa reforçar ordenação — a ordem de classificação
 * continua vindo de `ranking_publico`). */
function createQueryBuilder(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const builder = {
    select: vi.fn((_columns: string) => builder),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return builder;
}

describe("fetchRankingPublicoRecentes", () => {
  beforeEach(() => {
    vi.mocked(getAnonClient).mockReset();
  });

  it("nunca solicita contato/data_nascimento — seleciona só a lista literal de colunas do contrato", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const from = vi.fn(() => builder);
    vi.mocked(getAnonClient).mockReturnValue({ from } as never);

    await fetchRankingPublicoRecentes();

    expect(from).toHaveBeenCalledWith("ranking_publico_recentes");
    const selectedColumns = builder.select.mock.calls[0]![0] as string;
    expect(selectedColumns).not.toMatch(/contato/);
    expect(selectedColumns).not.toMatch(/data_nascimento/);
    expect(selectedColumns).toBe(
      "atleta_id, nome_exibicao, rodadas_recentes, rodadas_jogadas, media_presenca",
    );
  });

  it("retorna os itens quando a consulta é bem-sucedida", async () => {
    const items = [
      {
        atleta_id: "1",
        nome_exibicao: "João Pedro",
        rodadas_recentes: [
          { rodada_id: "r1", data: "2026-09-05", status: "presente" },
        ],
        rodadas_jogadas: 21,
        media_presenca: 78.3,
      },
    ];
    const builder = createQueryBuilder({ data: items, error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchRankingPublicoRecentes()).resolves.toEqual(items);
  });

  it("retorna array vazio quando a consulta não tem dado (nunca null)", async () => {
    const builder = createQueryBuilder({ data: null, error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchRankingPublicoRecentes()).resolves.toEqual([]);
  });

  it("lança erro legível quando a consulta falha (nunca engole o erro em silêncio)", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "conexão recusada" },
    });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchRankingPublicoRecentes()).rejects.toThrow("conexão recusada");
  });
});
