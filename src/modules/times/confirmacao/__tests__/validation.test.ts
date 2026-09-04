// @vitest-environment node
/**
 * Teste unitário do escopo AMPLIADO desta execução de BE-13 (ver TASK.md,
 * nota de status de BE-13) — lógica pura de validação do corpo de
 * `POST /api/rodadas/:id/times`, sem banco. O restante do critério de
 * aceite (persistência atômica, reconfirmação, bloqueio quando já existe
 * substituição) depende de Supabase real e é coberto exclusivamente pelo
 * teste de integração
 * (`app/api/rodadas/[id]/times/__tests__/times.integration.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { confirmarTimesBodySchema } from "../validation";

const A1 = "11111111-1111-4111-8111-111111111111";
const A2 = "22222222-2222-4222-8222-222222222222";
const B1 = "33333333-3333-4333-8333-333333333333";
const B2 = "44444444-4444-4444-8444-444444444444";

describe("confirmarTimesBodySchema", () => {
  it("aceita 2 times sem label (default aplicado depois em mutate.ts, não aqui)", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ atletas_ids: [A1, A2] }, { atletas_ids: [B1, B2] }],
    });
    expect(result.success).toBe(true);
  });

  it("aceita times com label personalizado", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [
        { label: "Amarelo", atletas_ids: [A1] },
        { label: "Azul", atletas_ids: [B1] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("recusa menos de 2 times", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ atletas_ids: [A1] }],
    });
    expect(result.success).toBe(false);
  });

  it("recusa mais de 10 times (MAX_QUANTIDADE_TIMES)", () => {
    const times = Array.from({ length: 11 }, (_, i) => ({
      atletas_ids: [`11111111-1111-4111-8111-11111111111${i}`.slice(0, 36)],
    }));
    const result = confirmarTimesBodySchema.safeParse({ times });
    expect(result.success).toBe(false);
  });

  it("recusa time com atletas_ids vazio", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ atletas_ids: [] }, { atletas_ids: [B1] }],
    });
    expect(result.success).toBe(false);
  });

  it("recusa uuid inválido em atletas_ids", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ atletas_ids: ["nao-e-uuid"] }, { atletas_ids: [B1] }],
    });
    expect(result.success).toBe(false);
  });

  it("recusa id repetido dentro do mesmo time", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ atletas_ids: [A1, A1] }, { atletas_ids: [B1] }],
    });
    expect(result.success).toBe(false);
  });

  it("recusa o mesmo atleta aparecendo em mais de um time", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ atletas_ids: [A1] }, { atletas_ids: [A1] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("aparece em mais de um time"),
        ),
      ).toBe(true);
    }
  });

  it("recusa label vazio quando informado", () => {
    const result = confirmarTimesBodySchema.safeParse({
      times: [{ label: "", atletas_ids: [A1] }, { atletas_ids: [B1] }],
    });
    expect(result.success).toBe(false);
  });

  it("recusa corpo vazio", () => {
    const result = confirmarTimesBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
