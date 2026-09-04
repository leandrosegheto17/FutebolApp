import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  AtletaApiError,
  AtletaDuplicidadeError,
  AtletaJaAnonimizadoError,
  AtletaNaoEncontradoError,
  AtletaValidationError,
  anonimizarAtleta,
  createAtleta,
  fetchAtletaPorId,
  fetchAtletas,
  updateAtleta,
} from "./atletasApi";
import type { Atleta, AtletaBody } from "./types";

const ATLETA: Atleta = {
  id: "atleta-1",
  nome_completo: "Carlinhos Silva",
  apelido_exibicao: "Carlinhos",
  contato: "11999990000",
  data_nascimento: "1995-04-10",
  consentimento_responsavel_obtido: false,
  pontuacao_inicial: 0,
  ativo: true,
  anonimizado_em: null,
  criado_em: "2026-01-01T00:00:00.000Z",
  nivel_tecnico: 3.5,
  rodadas_presentes: 10,
};

const BODY: AtletaBody = {
  nome_completo: "Carlinhos Silva",
  data_nascimento: "1995-04-10",
  pontuacao_inicial: 0,
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("atletasApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchAtletas", () => {
    it("devolve a lista em sucesso (200)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, [ATLETA]));
      const result = await fetchAtletas();
      expect(result).toEqual([ATLETA]);
      expect(fetch).toHaveBeenCalledWith("/api/atletas", undefined);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(401, { error: "Sessão inválida ou expirada." }),
      );
      await expect(fetchAtletas()).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança AtletaApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(fetchAtletas()).rejects.toBeInstanceOf(AtletaApiError);
    });

    it("lança AtletaApiError em 5xx", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(fetchAtletas()).rejects.toBeInstanceOf(AtletaApiError);
    });
  });

  describe("fetchAtletaPorId", () => {
    it("devolve o atleta em sucesso (200)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, ATLETA));
      const result = await fetchAtletaPorId("atleta-1");
      expect(result).toEqual(ATLETA);
      expect(fetch).toHaveBeenCalledWith("/api/atletas/atleta-1", undefined);
    });

    it("lança AtletaNaoEncontradoError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Atleta não encontrado." }),
      );
      await expect(fetchAtletaPorId("id-inexistente")).rejects.toBeInstanceOf(
        AtletaNaoEncontradoError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(fetchAtletaPorId("atleta-1")).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });
  });

  describe("createAtleta", () => {
    it("devolve o atleta criado em sucesso (201)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(201, ATLETA));
      const result = await createAtleta(BODY);
      expect(result).toEqual(ATLETA);
      expect(fetch).toHaveBeenCalledWith(
        "/api/atletas",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BODY),
        }),
      );
    });

    it("lança AtletaValidationError com detalhes em 400 (RF-01.3)", async () => {
      const body = {
        error: "Requisição inválida.",
        detalhes: [
          {
            path: ["consentimento_responsavel_obtido"],
            message: "Consentimento do responsável legal é obrigatório.",
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(400, body));
      const error = await createAtleta(BODY).catch((e) => e);
      expect(error).toBeInstanceOf(AtletaValidationError);
      expect((error as AtletaValidationError).detalhes).toEqual(body.detalhes);
    });

    it("lança AtletaDuplicidadeError com atletas_duplicados em 409 (RF-01.5)", async () => {
      const body = {
        error: "duplicidade",
        atletas_duplicados: [{ id: "outro-id", nome_completo: "Carlinhos Silva" }],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(409, body));
      const error = await createAtleta(BODY).catch((e) => e);
      expect(error).toBeInstanceOf(AtletaDuplicidadeError);
      expect((error as AtletaDuplicidadeError).atletasDuplicados).toEqual(
        body.atletas_duplicados,
      );
    });

    it("resubmissão com confirmar_duplicidade: true é enviada no corpo", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(201, ATLETA));
      await createAtleta({ ...BODY, confirmar_duplicidade: true });
      expect(fetch).toHaveBeenCalledWith(
        "/api/atletas",
        expect.objectContaining({
          body: JSON.stringify({ ...BODY, confirmar_duplicidade: true }),
        }),
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(createAtleta(BODY)).rejects.toBeInstanceOf(SessionExpiredError);
    });
  });

  describe("updateAtleta", () => {
    it("devolve o atleta atualizado em sucesso (200)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, ATLETA));
      const result = await updateAtleta("atleta-1", BODY);
      expect(result).toEqual(ATLETA);
      expect(fetch).toHaveBeenCalledWith(
        "/api/atletas/atleta-1",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("lança AtletaNaoEncontradoError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Atleta não encontrado." }),
      );
      await expect(updateAtleta("id-inexistente", BODY)).rejects.toBeInstanceOf(
        AtletaNaoEncontradoError,
      );
    });

    it("lança AtletaDuplicidadeError em 409", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, { error: "duplicidade", atletas_duplicados: [] }),
      );
      await expect(updateAtleta("atleta-1", BODY)).rejects.toBeInstanceOf(
        AtletaDuplicidadeError,
      );
    });
  });

  describe("anonimizarAtleta", () => {
    it("devolve o atleta anonimizado em sucesso (200)", async () => {
      const anonimizado: Atleta = {
        ...ATLETA,
        nome_completo: "Atleta anonimizado",
        apelido_exibicao: "Atleta #atleta-1",
        contato: null,
        data_nascimento: null,
        ativo: false,
        anonimizado_em: "2026-09-03T00:00:00.000Z",
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, anonimizado));
      const result = await anonimizarAtleta("atleta-1");
      expect(result).toEqual(anonimizado);
      expect(fetch).toHaveBeenCalledWith("/api/atletas/atleta-1/anonimizar", {
        method: "POST",
      });
    });

    it("lança AtletaJaAnonimizadoError em 409 (irreversibilidade, ADR-011)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, { error: "Este atleta já foi anonimizado anteriormente." }),
      );
      await expect(anonimizarAtleta("atleta-1")).rejects.toBeInstanceOf(
        AtletaJaAnonimizadoError,
      );
    });

    it("lança AtletaNaoEncontradoError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(404, {}));
      await expect(anonimizarAtleta("id-inexistente")).rejects.toBeInstanceOf(
        AtletaNaoEncontradoError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(anonimizarAtleta("atleta-1")).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });

    it("lança AtletaApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(anonimizarAtleta("atleta-1")).rejects.toBeInstanceOf(AtletaApiError);
    });
  });
});
