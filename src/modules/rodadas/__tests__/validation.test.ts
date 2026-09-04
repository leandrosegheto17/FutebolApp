// @vitest-environment node
/**
 * Teste unitário de BE-08 (TASK.md Secao 3.1) — parte do critério de aceite
 * literal coberta aqui (lógica pura, sem banco): "tentar lançar gol/cartão
 * para atleta ausente retorna erro bloqueante" (RF-02.6, primeira linha de
 * defesa — a função PL/pgSQL `app.lancar_rodada` repete a mesma checagem
 * como defesa em profundidade, coberta pelo teste de integração
 * `app/api/rodadas/__tests__/rodadas.integration.test.ts`). Os outros três
 * itens do critério ("pontos corretos por evento", "duplicidade de data
 * exige confirmação", "atomicidade") dependem de Supabase real e são
 * cobertos exclusivamente pelo teste de integração.
 *
 * A partir daqui também cobre `corrigirParticipacaoBodySchema` (BE-09,
 * RF-04.2) — mesma lógica de bloqueio de RF-02.6, reaproveitada para o
 * corpo de `PATCH /api/rodadas/:id/participacoes/:atletaId`.
 */
import { describe, expect, it } from "vitest";
import {
  corrigirParticipacaoBodySchema,
  lancarRodadaBodySchema,
  LISTAR_RODADAS_LIMIT_DEFAULT,
  LISTAR_RODADAS_LIMIT_MAXIMO,
  listarRodadasQuerySchema,
} from "../validation";

// Formato v4 válido de propósito (nibble de versão "4", nibble de variante
// "8") — o `z.uuid()` do zod 4.x valida contra o formato RFC 4122
// versionado, não apenas "16 bytes em hex com hífens"; os `uuid`s reais
// gerados por `gen_random_uuid()` (Postgres, BE-02) já satisfazem isso
// naturalmente, então os fixtures de teste precisam do mesmo formato.

const ATLETA_A = "11111111-1111-4111-8111-111111111111";
const ATLETA_B = "22222222-2222-4222-8222-222222222222";

function issuePaths(result: ReturnType<typeof lancarRodadaBodySchema.safeParse>) {
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

describe("lancarRodadaBodySchema — forma básica", () => {
  it("aceita um corpo mínimo válido (uma participação, sem eventos)", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [{ atleta_id: ATLETA_A, status: "presente" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmar_duplicidade).toBe(false);
      expect(result.data.participacoes[0]?.eventos).toEqual([]);
    }
  });

  it("recusa data fora do formato AAAA-MM-DD", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "05/09/2026",
      participacoes: [{ atleta_id: ATLETA_A, status: "presente" }],
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("data");
  });

  it("recusa participacoes vazio (nenhum atleta)", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [],
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("participacoes");
  });

  it("recusa status de participação fora do enum", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [{ atleta_id: ATLETA_A, status: "convocado" }],
    });
    expect(result.success).toBe(false);
  });

  it("recusa tipo de evento fora do enum", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        {
          atleta_id: ATLETA_A,
          status: "presente",
          eventos: [{ tipo: "pênalti perdido" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("recusa quantidade de evento zero ou negativa", () => {
    const zero = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        {
          atleta_id: ATLETA_A,
          status: "presente",
          eventos: [{ tipo: "gol", quantidade: 0 }],
        },
      ],
    });
    expect(zero.success).toBe(false);

    const negativa = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        {
          atleta_id: ATLETA_A,
          status: "presente",
          eventos: [{ tipo: "gol", quantidade: -1 }],
        },
      ],
    });
    expect(negativa.success).toBe(false);
  });

  it("quantidade de evento assume 1 por padrão quando omitida", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        { atleta_id: ATLETA_A, status: "presente", eventos: [{ tipo: "gol" }] },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participacoes[0]?.eventos[0]?.quantidade).toBe(1);
    }
  });
});

describe("lancarRodadaBodySchema — RF-02.6 (bloqueio de evento para atleta ausente)", () => {
  it("recusa evento de gol para atleta ausente", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        {
          atleta_id: ATLETA_A,
          status: "ausente",
          eventos: [{ tipo: "gol", quantidade: 1 }],
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("participacoes.0.eventos");
  });

  it("recusa evento de cartão para atleta ausente", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        {
          atleta_id: ATLETA_A,
          status: "ausente",
          eventos: [{ tipo: "cartao_amarelo", quantidade: 1 }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("aceita atleta ausente sem nenhum evento", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [{ atleta_id: ATLETA_A, status: "ausente" }],
    });
    expect(result.success).toBe(true);
  });

  it("aceita evento de jogo para atleta lesionado (RF-02.3 trata lesionado como presente)", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        {
          atleta_id: ATLETA_A,
          status: "lesionado",
          eventos: [{ tipo: "gol", quantidade: 1 }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("lancarRodadaBodySchema — atleta_id repetido", () => {
  it("recusa o mesmo atleta_id em mais de uma participação da mesma rodada", () => {
    const result = lancarRodadaBodySchema.safeParse({
      data: "2026-09-05",
      participacoes: [
        { atleta_id: ATLETA_A, status: "presente" },
        { atleta_id: ATLETA_B, status: "ausente" },
        { atleta_id: ATLETA_A, status: "lesionado" },
      ],
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("participacoes.2.atleta_id");
  });
});

describe("corrigirParticipacaoBodySchema (BE-09, RF-04.2) — forma básica", () => {
  it("aceita um corpo mínimo válido (status + eventos vazio por padrão)", () => {
    const result = corrigirParticipacaoBodySchema.safeParse({ status: "presente" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventos).toEqual([]);
    }
  });

  it("recusa status fora do enum", () => {
    const result = corrigirParticipacaoBodySchema.safeParse({ status: "convocado" });
    expect(result.success).toBe(false);
  });

  it("aceita eventos para status presente/lesionado", () => {
    const presente = corrigirParticipacaoBodySchema.safeParse({
      status: "presente",
      eventos: [{ tipo: "gol", quantidade: 2 }],
    });
    expect(presente.success).toBe(true);

    const lesionado = corrigirParticipacaoBodySchema.safeParse({
      status: "lesionado",
      eventos: [{ tipo: "cartao_vermelho", quantidade: 1 }],
    });
    expect(lesionado.success).toBe(true);
  });
});

describe("corrigirParticipacaoBodySchema — RF-02.6 (bloqueio de evento para atleta ausente)", () => {
  it("recusa evento de gol quando o novo status é ausente", () => {
    const result = corrigirParticipacaoBodySchema.safeParse({
      status: "ausente",
      eventos: [{ tipo: "gol", quantidade: 1 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
        "eventos",
      );
    }
  });

  it("aceita status ausente sem nenhum evento", () => {
    const result = corrigirParticipacaoBodySchema.safeParse({ status: "ausente" });
    expect(result.success).toBe(true);
  });
});

/**
 * BE-16 (TASK.md Secao 3.1) — lógica pura de validação do parâmetro
 * opcional `limit` de `GET /api/rodadas`. Mesmo padrão de teste já usado
 * para `logAuditoriaQuerySchema` (`src/modules/auditoria/__tests__/validation.test.ts`,
 * BE-09) — a ordenação cronológica decrescente em si depende de Supabase
 * real e é coberta pelo teste de integração
 * (`app/api/rodadas/__tests__/listar.integration.test.ts`).
 */
describe("listarRodadasQuerySchema (BE-16)", () => {
  it("usa o default quando limit está ausente", () => {
    const result = listarRodadasQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(LISTAR_RODADAS_LIMIT_DEFAULT);
    }
  });

  it("aceita um limit numérico válido dentro do teto", () => {
    const result = listarRodadasQuerySchema.safeParse({ limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("faz coerção de string numérica (query string sempre chega como string)", () => {
    const result = listarRodadasQuerySchema.safeParse({ limit: "25" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });

  it("recusa limit acima do teto máximo", () => {
    const result = listarRodadasQuerySchema.safeParse({
      limit: LISTAR_RODADAS_LIMIT_MAXIMO + 1,
    });
    expect(result.success).toBe(false);
  });

  it("recusa limit zero ou negativo", () => {
    expect(listarRodadasQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listarRodadasQuerySchema.safeParse({ limit: -5 }).success).toBe(false);
  });

  it("recusa limit não numérico", () => {
    const result = listarRodadasQuerySchema.safeParse({ limit: "abc" });
    expect(result.success).toBe(false);
  });
});
