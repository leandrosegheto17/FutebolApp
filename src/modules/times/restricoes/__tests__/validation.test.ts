// @vitest-environment node
/**
 * Teste unitário de BE-12 (TASK.md Secao 3.1) — lógica pura de validação do
 * corpo de `POST /api/restricoes`/`PUT /api/restricoes/:id`, sem banco. O
 * restante do critério de aceite literal ("desativar preserva
 * `desativado_em`, nunca exclui fisicamente"; "qualquer sessão válida pode
 * criar/editar/desativar") depende de Supabase real e é coberto
 * exclusivamente pelo teste de integração
 * (`app/api/restricoes/__tests__/restricoes.integration.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { restricaoBodySchema } from "../validation";

// Mesmo formato v4 válido de propósito já usado em
// `src/modules/rodadas/__tests__/validation.test.ts` (o `z.uuid()` do zod
// 4.x valida contra o formato RFC 4122 versionado, não só "16 bytes hex").
const ATLETA_A = "11111111-1111-4111-8111-111111111111";
const ATLETA_B = "22222222-2222-4222-8222-222222222222";

describe("restricaoBodySchema", () => {
  it("aceita um par de uuids válidos e distintos", () => {
    const result = restricaoBodySchema.safeParse({
      atleta_a_id: ATLETA_A,
      atleta_b_id: ATLETA_B,
    });
    expect(result.success).toBe(true);
  });

  it("recusa quando atleta_a_id não é um uuid válido", () => {
    const result = restricaoBodySchema.safeParse({
      atleta_a_id: "nao-e-uuid",
      atleta_b_id: ATLETA_B,
    });
    expect(result.success).toBe(false);
  });

  it("recusa quando atleta_b_id está ausente", () => {
    const result = restricaoBodySchema.safeParse({ atleta_a_id: ATLETA_A });
    expect(result.success).toBe(false);
  });

  it("recusa quando atleta_a_id === atleta_b_id (par precisa de dois atletas distintos)", () => {
    const result = restricaoBodySchema.safeParse({
      atleta_a_id: ATLETA_A,
      atleta_b_id: ATLETA_A,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("atleta_b_id")),
      ).toBe(true);
    }
  });

  it("recusa corpo vazio", () => {
    const result = restricaoBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
