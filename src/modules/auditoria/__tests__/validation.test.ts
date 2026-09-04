// @vitest-environment node
/**
 * Teste unitário de BE-09 (TASK.md Secao 3.1, RF-04.5) — lógica pura de
 * validação do parâmetro opcional `limit` de `GET /api/log-auditoria`
 * (`src/modules/auditoria/validation.ts`). A ordenação em si (mais recente
 * → mais antigo) depende de Supabase real e é coberta pelo teste de
 * integração (`app/api/log-auditoria/__tests__/log-auditoria.integration.test.ts`).
 */
import { describe, expect, it } from "vitest";
import {
  LOG_AUDITORIA_LIMIT_DEFAULT,
  LOG_AUDITORIA_LIMIT_MAXIMO,
  logAuditoriaQuerySchema,
} from "../validation";

describe("logAuditoriaQuerySchema", () => {
  it("usa o default quando limit está ausente", () => {
    const result = logAuditoriaQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(LOG_AUDITORIA_LIMIT_DEFAULT);
    }
  });

  it("aceita um limit numérico válido dentro do teto", () => {
    const result = logAuditoriaQuerySchema.safeParse({ limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("faz coerção de string numérica (query string sempre chega como string)", () => {
    const result = logAuditoriaQuerySchema.safeParse({ limit: "25" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });

  it("recusa limit acima do teto máximo", () => {
    const result = logAuditoriaQuerySchema.safeParse({
      limit: LOG_AUDITORIA_LIMIT_MAXIMO + 1,
    });
    expect(result.success).toBe(false);
  });

  it("recusa limit zero ou negativo", () => {
    expect(logAuditoriaQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(logAuditoriaQuerySchema.safeParse({ limit: -5 }).success).toBe(false);
  });

  it("recusa limit não numérico", () => {
    const result = logAuditoriaQuerySchema.safeParse({ limit: "abc" });
    expect(result.success).toBe(false);
  });
});
