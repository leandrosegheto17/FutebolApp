// @vitest-environment node
/**
 * Teste unitário de BE-11 (TASK.md Seção 3.1) — forma do corpo de
 * `POST /api/times/sugestao`, sem banco. O restante do critério de aceite
 * literal (geração respeitando restrições, contrato de conflito, soft
 * constraint, timeout) depende de Supabase real e é coberto pelos testes de
 * integração (`app/api/times/sugestao/__tests__/sugestao.integration.test.ts`
 * e `src/modules/times/__tests__/montar.integration.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { sugestaoTimesBodySchema } from "../validation";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("sugestaoTimesBodySchema", () => {
  it("aceita atletas_ids com ao menos 2 uuids distintos e quantidade_times válida", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A, B, C],
      quantidade_times: 2,
    });
    expect(result.success).toBe(true);
  });

  it("recusa atletas_ids com menos de 2 elementos", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A],
      quantidade_times: 2,
    });
    expect(result.success).toBe(false);
  });

  it("recusa atletas_ids ausente", () => {
    const result = sugestaoTimesBodySchema.safeParse({ quantidade_times: 2 });
    expect(result.success).toBe(false);
  });

  it("recusa um item de atletas_ids que não é um uuid válido", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A, "nao-e-uuid"],
      quantidade_times: 2,
    });
    expect(result.success).toBe(false);
  });

  it("recusa atletas_ids com ids repetidos", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A, B, A],
      quantidade_times: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("atletas_ids")),
      ).toBe(true);
    }
  });

  it("recusa quantidade_times < 2", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A, B],
      quantidade_times: 1,
    });
    expect(result.success).toBe(false);
  });

  it("recusa quantidade_times não inteiro", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A, B],
      quantidade_times: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("recusa quantidade_times acima do teto (MAX_QUANTIDADE_TIMES)", () => {
    const digitosHex = "0123456789ab"; // 12 valores distintos
    const muitosIds = Array.from(
      { length: 12 },
      (_, i) => `11111111-1111-4111-8111-11111111111${digitosHex[i]}`,
    );
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: muitosIds,
      quantidade_times: 11,
    });
    expect(result.success).toBe(false);
  });

  it("recusa quantidade_times maior que a quantidade de atletas_ids (não há o que dividir)", () => {
    const result = sugestaoTimesBodySchema.safeParse({
      atletas_ids: [A, B],
      quantidade_times: 3,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("quantidade_times")),
      ).toBe(true);
    }
  });

  it("recusa corpo vazio", () => {
    const result = sugestaoTimesBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
