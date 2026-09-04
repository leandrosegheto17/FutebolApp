// @vitest-environment node
/**
 * Teste unitário de BE-13 (TASK.md Secao 3.1) — lógica pura de validação do
 * corpo de `POST /api/rodadas/:id/substituicoes`, sem banco. O restante do
 * critério de aceite literal ("não altera saldo", "múltiplas substituições
 * sem limite") depende de Supabase real e é coberto exclusivamente pelo
 * teste de integração
 * (`app/api/rodadas/[id]/substituicoes/__tests__/substituicoes.integration.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { substituicaoBodySchema } from "../validation";

const TIME_ID = "11111111-1111-4111-8111-111111111111";
const ATLETA_SAI = "22222222-2222-4222-8222-222222222222";
const ATLETA_ENTRA = "33333333-3333-4333-8333-333333333333";

describe("substituicaoBodySchema", () => {
  it("aceita time_id/atleta_sai_id/atleta_entra_id válidos e distintos", () => {
    const result = substituicaoBodySchema.safeParse({
      time_id: TIME_ID,
      atleta_sai_id: ATLETA_SAI,
      atleta_entra_id: ATLETA_ENTRA,
    });
    expect(result.success).toBe(true);
  });

  it("recusa quando atleta_sai_id === atleta_entra_id, com mensagem clara (critério de aceite literal)", () => {
    const result = substituicaoBodySchema.safeParse({
      time_id: TIME_ID,
      atleta_sai_id: ATLETA_SAI,
      atleta_entra_id: ATLETA_SAI,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("atleta_entra_id")),
      ).toBe(true);
      expect(
        result.error.issues.some((issue) => issue.message.includes("diferentes")),
      ).toBe(true);
    }
  });

  it("recusa time_id inválido", () => {
    const result = substituicaoBodySchema.safeParse({
      time_id: "nao-e-uuid",
      atleta_sai_id: ATLETA_SAI,
      atleta_entra_id: ATLETA_ENTRA,
    });
    expect(result.success).toBe(false);
  });

  it("recusa atleta_sai_id ausente", () => {
    const result = substituicaoBodySchema.safeParse({
      time_id: TIME_ID,
      atleta_entra_id: ATLETA_ENTRA,
    });
    expect(result.success).toBe(false);
  });

  it("recusa corpo vazio", () => {
    const result = substituicaoBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
