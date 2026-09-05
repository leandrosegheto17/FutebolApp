/**
 * Teste unitário de DEBT-05 (SECURITY-REVIEW.md Secao 12, resolvido) —
 * cobre a equalização de custo entre o caminho "bloqueado por rate limit" e
 * o caminho normal de verificação de senha em `POST /api/auth/login`.
 *
 * Medir tempo real de execução é frágil em CI (ruído de agendamento do
 * processo) — em vez disso, este teste faz asserção de COMPORTAMENTO:
 * `verifyPasswordOrDummy` (o trabalho de CPU que equaliza o tempo, já que
 * `argon2id.verify` é lento por desenho) é chamado exatamente uma vez em
 * AMBOS os caminhos, com o mesmo hash vigente e a mesma senha submetida —
 * nunca pulado no caminho bloqueado.
 *
 * Todas as dependências de I/O (Supabase, repository, rate-limit) são
 * mockadas — este teste não exige Supabase local (ao contrário de
 * `auth.integration.test.ts`, que cobre o comportamento fim-a-fim contra o
 * banco real).
 *
 * Nomes de variável prefixados com `mock` (não sufixados) por exigência do
 * mecanismo de hoisting do `vi.mock` (variáveis referenciadas dentro da
 * factory precisam começar com "mock" para o Vitest permitir o acesso antes
 * da inicialização real do módulo).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetHashSenhaVigente = vi.fn();
const mockGetTentativasRecentes = vi.fn();
const mockRegistrarTentativaLogin = vi.fn();
const mockEvaluateLoginRateLimit = vi.fn();
const mockVerifyPasswordOrDummy = vi.fn();
const mockSetSessionCookie = vi.fn();

vi.mock("@/lib/supabase/server-client", () => ({
  getServiceRoleClient: () => ({}) as unknown,
}));

vi.mock("@/modules/autenticacao/repository", () => ({
  getHashSenhaVigente: (...args: unknown[]) => mockGetHashSenhaVigente(...args),
  getTentativasRecentes: (...args: unknown[]) => mockGetTentativasRecentes(...args),
  registrarTentativaLogin: (...args: unknown[]) => mockRegistrarTentativaLogin(...args),
}));

vi.mock("@/modules/autenticacao/rate-limit", () => ({
  evaluateLoginRateLimit: (...args: unknown[]) => mockEvaluateLoginRateLimit(...args),
}));

vi.mock("@/modules/autenticacao/password", () => ({
  verifyPasswordOrDummy: (...args: unknown[]) => mockVerifyPasswordOrDummy(...args),
}));

vi.mock("@/modules/autenticacao/session-cookie", () => ({
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}));

function buildLoginRequest(senha: unknown, ip = "203.0.113.10"): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ senha }),
  });
}

describe("POST /api/auth/login — equalização de timing (DEBT-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTentativasRecentes.mockResolvedValue([]);
    mockGetHashSenhaVigente.mockResolvedValue("hash-vigente-fake");
    mockRegistrarTentativaLogin.mockResolvedValue(undefined);
  });

  it(
    "chama verifyPasswordOrDummy com o hash vigente e a senha submetida " +
      "MESMO quando rateLimit.bloqueado === true, nunca pulando a verificação",
    async () => {
      mockEvaluateLoginRateLimit.mockReturnValue({
        bloqueado: true,
        tentativasFalhasConsecutivas: 5,
        desbloqueiaEm: new Date(),
      });
      mockVerifyPasswordOrDummy.mockResolvedValue(true); // mesmo se "true", bloqueado nunca autentica.

      const { POST } = await import("../login/route");
      const response = await POST(buildLoginRequest("qualquer-coisa"));

      expect(mockVerifyPasswordOrDummy).toHaveBeenCalledTimes(1);
      expect(mockVerifyPasswordOrDummy).toHaveBeenCalledWith(
        "hash-vigente-fake",
        "qualquer-coisa",
      );
      // Bloqueado nunca autentica, mesmo que verifyPasswordOrDummy (mockado
      // acima) retorne true — a resposta e o cookie precisam refletir isso.
      expect(response.status).toBe(401);
      expect(mockSetSessionCookie).not.toHaveBeenCalled();
      const body = await response.json();
      expect(body).toEqual({ error: "Senha incorreta." });
      expect(mockRegistrarTentativaLogin).toHaveBeenCalledWith(
        {},
        { ip: "203.0.113.10", sucesso: false },
      );
    },
  );

  it("chama verifyPasswordOrDummy também no caminho não bloqueado (comportamento pré-existente)", async () => {
    mockEvaluateLoginRateLimit.mockReturnValue({
      bloqueado: false,
      tentativasFalhasConsecutivas: 0,
    });
    mockVerifyPasswordOrDummy.mockResolvedValue(false);

    const { POST } = await import("../login/route");
    const response = await POST(buildLoginRequest("senha-errada"));

    expect(mockVerifyPasswordOrDummy).toHaveBeenCalledTimes(1);
    expect(mockVerifyPasswordOrDummy).toHaveBeenCalledWith(
      "hash-vigente-fake",
      "senha-errada",
    );
    expect(response.status).toBe(401);
  });

  it(
    "os dois caminhos (bloqueado e não bloqueado) chamam verifyPasswordOrDummy " +
      "exatamente o mesmo número de vezes (1) — equalização de custo de CPU",
    async () => {
      const { POST } = await import("../login/route");

      mockEvaluateLoginRateLimit.mockReturnValue({
        bloqueado: false,
        tentativasFalhasConsecutivas: 0,
      });
      mockVerifyPasswordOrDummy.mockResolvedValue(false);
      await POST(buildLoginRequest("senha-errada", "203.0.113.11"));
      const chamadasNaoBloqueado = mockVerifyPasswordOrDummy.mock.calls.length;

      vi.clearAllMocks();
      mockGetTentativasRecentes.mockResolvedValue([]);
      mockGetHashSenhaVigente.mockResolvedValue("hash-vigente-fake");
      mockRegistrarTentativaLogin.mockResolvedValue(undefined);
      mockEvaluateLoginRateLimit.mockReturnValue({
        bloqueado: true,
        tentativasFalhasConsecutivas: 5,
        desbloqueiaEm: new Date(),
      });
      mockVerifyPasswordOrDummy.mockResolvedValue(false);
      await POST(buildLoginRequest("senha-errada", "203.0.113.12"));
      const chamadasBloqueado = mockVerifyPasswordOrDummy.mock.calls.length;

      expect(chamadasNaoBloqueado).toBe(1);
      expect(chamadasBloqueado).toBe(1);
      expect(chamadasBloqueado).toBe(chamadasNaoBloqueado);
    },
  );
});
