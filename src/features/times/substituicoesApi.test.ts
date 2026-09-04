import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  SubstituicaoApiError,
  listarSubstituicoes,
  registrarSubstituicao,
} from "./substituicoesApi";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("substituicoesApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listarSubstituicoes (GET /api/rodadas/{id}/substituicoes, BE-13)", () => {
    it("devolve a lista de substituições (200)", async () => {
      const lista = [
        {
          id: "sub-1",
          rodada_id: "r1",
          time_id: "t1",
          atleta_sai_id: "1",
          atleta_sai_nome: "João",
          atleta_entra_id: "2",
          atleta_entra_nome: "Bruno",
          criado_em: "2026-09-19T20:00:00Z",
        },
      ];
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, lista));

      await expect(listarSubstituicoes("r1")).resolves.toEqual(lista);
      expect(fetch).toHaveBeenCalledWith("/api/rodadas/r1/substituicoes", undefined);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(listarSubstituicoes("r1")).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança SubstituicaoApiError em falha técnica/rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(listarSubstituicoes("r1")).rejects.toBeInstanceOf(
        SubstituicaoApiError,
      );
    });
  });

  describe("registrarSubstituicao (POST /api/rodadas/{id}/substituicoes, BE-13)", () => {
    const body = { time_id: "t1", atleta_sai_id: "1", atleta_entra_id: "2" };

    it("envia o corpo e devolve a substituição registrada (201)", async () => {
      const response = {
        id: "sub-1",
        rodada_id: "r1",
        time_id: "t1",
        atleta_sai_id: "1",
        atleta_sai_nome: "João",
        atleta_entra_id: "2",
        atleta_entra_nome: "Bruno",
        criado_em: "2026-09-19T20:00:00Z",
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(201, response));

      await expect(registrarSubstituicao("r1", body)).resolves.toEqual(response);
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas/r1/substituicoes",
        expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
      );
    });

    it("lança SubstituicaoApiError com a mensagem literal do UX-SPEC.md em 400 (ex.: mesmo atleta em 'sai'/'entra')", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(400, { error: "Requisição inválida." }),
      );
      const promessa = registrarSubstituicao("r1", body);
      await expect(promessa).rejects.toBeInstanceOf(SubstituicaoApiError);
      await expect(promessa).rejects.toThrow(
        "Não foi possível registrar — verifique se o atleta já está em outro time.",
      );
    });

    it("lança SubstituicaoApiError em 404 (time_id/atleta inexistente) com a mesma mensagem genérica", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Time não encontrado nesta rodada." }),
      );
      await expect(registrarSubstituicao("r1", body)).rejects.toBeInstanceOf(
        SubstituicaoApiError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(registrarSubstituicao("r1", body)).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });

    it("lança SubstituicaoApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(registrarSubstituicao("r1", body)).rejects.toBeInstanceOf(
        SubstituicaoApiError,
      );
    });
  });
});
