import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  RestricaoApiError,
  RestricaoAtletaNaoEncontradoError,
  RestricaoNaoEncontradaError,
  RestricaoValidationError,
  atualizarRestricao,
  criarRestricao,
  desativarRestricao,
  listarRestricoes,
  reativarRestricao,
} from "./restricoesApi";
import type { Restricao, RestricaoBody } from "./types";

const RESTRICAO: Restricao = {
  id: "restricao-1",
  atleta_a_id: "atleta-1",
  atleta_a_nome: "João Pedro",
  atleta_b_id: "atleta-2",
  atleta_b_nome: "Carlinhos",
  ativo: true,
  desativado_em: null,
  criado_em: "2026-09-01T00:00:00.000Z",
};

const BODY: RestricaoBody = { atleta_a_id: "atleta-1", atleta_b_id: "atleta-2" };

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("restricoesApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listarRestricoes", () => {
    it("devolve a lista em sucesso (200)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, [RESTRICAO]));
      const result = await listarRestricoes();
      expect(result).toEqual([RESTRICAO]);
      expect(fetch).toHaveBeenCalledWith("/api/restricoes", undefined);
    });

    it("lança SessionExpiredError em 401 (GET também exige sessão)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(listarRestricoes()).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança RestricaoApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(listarRestricoes()).rejects.toBeInstanceOf(RestricaoApiError);
    });

    it("lança RestricaoApiError em 5xx", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(listarRestricoes()).rejects.toBeInstanceOf(RestricaoApiError);
    });
  });

  describe("criarRestricao", () => {
    it("devolve a restrição criada em sucesso (201)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(201, RESTRICAO));
      const result = await criarRestricao(BODY);
      expect(result).toEqual(RESTRICAO);
      expect(fetch).toHaveBeenCalledWith(
        "/api/restricoes",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BODY),
        }),
      );
    });

    it("lança RestricaoValidationError com detalhes em 400 (par igual)", async () => {
      const body = {
        error: "Requisição inválida.",
        detalhes: [
          { path: ["atleta_b_id"], message: "Deve ser diferente de atleta_a_id." },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(400, body));
      const error = await criarRestricao(BODY).catch((e) => e);
      expect(error).toBeInstanceOf(RestricaoValidationError);
      expect((error as RestricaoValidationError).detalhes).toEqual(body.detalhes);
    });

    it("lança RestricaoAtletaNaoEncontradoError em 404 com atleta_id", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Atleta não encontrado.", atleta_id: "atleta-1" }),
      );
      await expect(criarRestricao(BODY)).rejects.toBeInstanceOf(
        RestricaoAtletaNaoEncontradoError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(criarRestricao(BODY)).rejects.toBeInstanceOf(SessionExpiredError);
    });
  });

  describe("atualizarRestricao", () => {
    it("devolve a restrição atualizada em sucesso (200)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, RESTRICAO));
      const result = await atualizarRestricao("restricao-1", BODY);
      expect(result).toEqual(RESTRICAO);
      expect(fetch).toHaveBeenCalledWith(
        "/api/restricoes/restricao-1",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("lança RestricaoNaoEncontradaError em 404 sem atleta_id (restrição inexistente)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Restrição obrigatória não encontrada." }),
      );
      await expect(atualizarRestricao("id-inexistente", BODY)).rejects.toBeInstanceOf(
        RestricaoNaoEncontradaError,
      );
    });

    it("lança RestricaoAtletaNaoEncontradoError em 404 com atleta_id", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Atleta não encontrado.", atleta_id: "atleta-2" }),
      );
      await expect(atualizarRestricao("restricao-1", BODY)).rejects.toBeInstanceOf(
        RestricaoAtletaNaoEncontradoError,
      );
    });
  });

  describe("desativarRestricao", () => {
    it("devolve a restrição desativada em sucesso (200, idempotente)", async () => {
      const desativada = {
        ...RESTRICAO,
        ativo: false,
        desativado_em: "2026-09-04T12:00:00Z",
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, desativada));
      const result = await desativarRestricao("restricao-1");
      expect(result).toEqual(desativada);
      expect(fetch).toHaveBeenCalledWith("/api/restricoes/restricao-1/desativar", {
        method: "POST",
      });
    });

    it("lança RestricaoNaoEncontradaError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(404, {}));
      await expect(desativarRestricao("id-inexistente")).rejects.toBeInstanceOf(
        RestricaoNaoEncontradaError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(desativarRestricao("restricao-1")).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });
  });

  describe("reativarRestricao", () => {
    it("devolve a restrição reativada em sucesso (200, idempotente)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, RESTRICAO));
      const result = await reativarRestricao("restricao-1");
      expect(result).toEqual(RESTRICAO);
      expect(fetch).toHaveBeenCalledWith("/api/restricoes/restricao-1/reativar", {
        method: "POST",
      });
    });

    it("lança RestricaoNaoEncontradaError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(404, {}));
      await expect(reativarRestricao("id-inexistente")).rejects.toBeInstanceOf(
        RestricaoNaoEncontradaError,
      );
    });

    it("lança RestricaoApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(reativarRestricao("restricao-1")).rejects.toBeInstanceOf(
        RestricaoApiError,
      );
    });
  });
});
