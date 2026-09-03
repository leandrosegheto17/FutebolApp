import { afterEach, describe, expect, it, vi } from "vitest";
import { login, LoginError } from "./loginApi";
import { LOGIN_GENERIC_ERROR_MESSAGE, LOGIN_TECHNICAL_ERROR_MESSAGE } from "./constants";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolve sem lançar quando a senha está correta (200)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { status: "ok" })),
    );

    await expect(login("senha-correta")).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: "senha-correta" }),
      }),
    );
  });

  it("lança LoginError com a mensagem exata do servidor em 401 (RF-07.3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { error: "Senha incorreta." })),
    );

    await expect(login("errada")).rejects.toThrow(LoginError);
    await expect(login("errada")).rejects.toThrow("Senha incorreta.");
  });

  it(
    "resposta 401 idêntica sob rate limiting continua exibindo a mesma " +
      "mensagem genérica — o cliente nunca distingue os dois casos (RF-07.3)",
    async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(401, { error: "Senha incorreta." })),
      );

      await expect(login("qualquer")).rejects.toThrow("Senha incorreta.");
    },
  );

  it("usa a mensagem genérica de fallback se o corpo do 401 vier malformado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => {
          throw new Error("corpo inválido");
        },
      } as unknown as Response),
    );

    await expect(login("errada")).rejects.toThrow(LOGIN_GENERIC_ERROR_MESSAGE);
  });

  it("lança erro técnico genérico (classe diferente de RF-07.3) em 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { error: "Requisição inválida." })),
    );

    await expect(login("")).rejects.toThrow(LOGIN_TECHNICAL_ERROR_MESSAGE);
  });

  it("lança erro técnico genérico em falha de rede (nunca engole o erro em silêncio)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(login("qualquer")).rejects.toThrow(LOGIN_TECHNICAL_ERROR_MESSAGE);
  });
});
