import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAnonClient } from "@/lib/supabase/anon-client";
import { fetchPresencaMensal } from "./presencaMensalApi";

vi.mock("@/lib/supabase/anon-client", () => ({
  getAnonClient: vi.fn(),
}));

/**
 * Builder falso compatível com a cadeia
 * `.from().select().eq().eq().order()` do `@supabase/supabase-js` — mesmo
 * padrão de `rankingApi.test.ts` (FE-02).
 */
function createQueryBuilder(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const builder = {
    select: vi.fn((_columns: string) => builder),
    eq: vi.fn((_column: string, _value: unknown) => builder),
    order: vi.fn((_column: string, _opts: { ascending: boolean }) => builder),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return builder;
}

describe("fetchPresencaMensal", () => {
  beforeEach(() => {
    vi.mocked(getAnonClient).mockReset();
  });

  it("nunca solicita contato/data_nascimento — seleciona só a lista literal de colunas do contrato", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const from = vi.fn(() => builder);
    vi.mocked(getAnonClient).mockReturnValue({ from } as never);

    await fetchPresencaMensal(2026, 9);

    expect(from).toHaveBeenCalledWith("presenca_mensal_publica");
    const selectedColumns = builder.select.mock.calls[0]![0] as string;
    expect(selectedColumns).not.toMatch(/contato/);
    expect(selectedColumns).not.toMatch(/data_nascimento/);
    expect(selectedColumns).toBe(
      "ano, mes, rodada_id, rodada_data, total_presentes, nomes_presentes",
    );
  });

  it("filtra por ano/mes civil (RN-09) via .eq(), conforme documentado em API-CONTRACT.yaml", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await fetchPresencaMensal(2026, 9);

    expect(builder.eq).toHaveBeenNthCalledWith(1, "ano", 2026);
    expect(builder.eq).toHaveBeenNthCalledWith(2, "mes", 9);
  });

  it("reforça explicitamente a ordenação por data da rodada via .order()", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await fetchPresencaMensal(2026, 9);

    expect(builder.order).toHaveBeenCalledWith("rodada_data", { ascending: true });
  });

  it("retorna os itens quando a consulta é bem-sucedida", async () => {
    const items = [
      {
        ano: 2026,
        mes: 9,
        rodada_id: "1",
        rodada_data: "2026-09-05",
        total_presentes: 18,
        nomes_presentes: ["Carlinhos", "João Pedro"],
      },
    ];
    const builder = createQueryBuilder({ data: items, error: null });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchPresencaMensal(2026, 9)).resolves.toEqual(items);
  });

  it("lança erro legível quando a consulta falha (nunca engole o erro em silêncio)", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "conexão recusada" },
    });
    vi.mocked(getAnonClient).mockReturnValue({ from: () => builder } as never);

    await expect(fetchPresencaMensal(2026, 9)).rejects.toThrow("conexão recusada");
  });
});
