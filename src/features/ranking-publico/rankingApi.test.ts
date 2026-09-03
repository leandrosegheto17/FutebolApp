import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAnonClient } from "@/lib/supabase/anon-client";
import { fetchRankingPublico } from "./rankingApi";

vi.mock("@/lib/supabase/anon-client", () => ({
  getAnonClient: vi.fn(),
}));

/**
 * Constrói um query builder falso compatível com a cadeia
 * `.from().select().order().order().order().order()` do
 * `@supabase/supabase-js` — cada método encadeável (`select`/`order`)
 * retorna o próprio builder (`this`), e o builder é "thenable" (resolve o
 * resultado ao ser aguardado), como o cliente real.
 */
function createQueryBuilder(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const builder = {
    select: vi.fn((_columns: string) => builder),
    order: vi.fn((_column: string, _opts: { ascending: boolean }) => builder),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return builder;
}

describe("fetchRankingPublico", () => {
  beforeEach(() => {
    vi.mocked(getAnonClient).mockReset();
  });

  it("nunca solicita contato/data_nascimento — seleciona só a lista literal de colunas do contrato", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const from = vi.fn(() => builder);
    vi.mocked(getAnonClient).mockReturnValue({ from } as never);

    await fetchRankingPublico();

    expect(from).toHaveBeenCalledWith("ranking_publico");
    const selectedColumns = builder.select.mock.calls[0]![0] as string;
    expect(selectedColumns).not.toMatch(/contato/);
    expect(selectedColumns).not.toMatch(/data_nascimento/);
    expect(selectedColumns).toBe(
      "atleta_id, nome_exibicao, pontuacao_acumulada, presencas, cartoes",
    );
  });

  it("reforça explicitamente a cascata de desempate completa de RN-08 via .order()", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await fetchRankingPublico();

    expect(builder.order).toHaveBeenNthCalledWith(1, "pontuacao_acumulada", {
      ascending: false,
    });
    expect(builder.order).toHaveBeenNthCalledWith(2, "presencas", { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(3, "cartoes", { ascending: true });
    expect(builder.order).toHaveBeenNthCalledWith(4, "nome_exibicao", {
      ascending: true,
    });
  });

  it("retorna os itens quando a consulta é bem-sucedida", async () => {
    const items = [
      {
        atleta_id: "1",
        nome_exibicao: "João Pedro",
        pontuacao_acumulada: 42,
        presencas: 12,
        cartoes: 1,
      },
    ];
    const builder = createQueryBuilder({ data: items, error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchRankingPublico()).resolves.toEqual(items);
  });

  it("lança erro legível quando a consulta falha (nunca engole o erro em silêncio)", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "conexão recusada" },
    });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchRankingPublico()).rejects.toThrow("conexão recusada");
  });
});
