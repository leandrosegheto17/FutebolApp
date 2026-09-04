import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  RodadaApiError,
  RodadaDuplicidadeError,
  RodadaValidationError,
  lancarRodada,
} from "./rodadasApi";
import type { LancarRodadaBody, RodadaResponse } from "./types";

const BODY: LancarRodadaBody = {
  data: "2026-09-05",
  confirmar_duplicidade: false,
  participacoes: [
    {
      atleta_id: "atleta-1",
      status: "presente",
      eventos: [{ tipo: "gol", quantidade: 1 }],
    },
    { atleta_id: "atleta-2", status: "ausente", eventos: [] },
  ],
};

const RESPONSE: RodadaResponse = {
  id: "rodada-1",
  data: "2026-09-05",
  status: "lancada",
  criado_em: "2026-09-05T12:00:00.000Z",
  participacoes: [
    {
      atleta_id: "atleta-1",
      status: "presente",
      eventos: [{ tipo: "gol", quantidade: 1 }],
      pontos_delta: 5,
    },
    { atleta_id: "atleta-2", status: "ausente", eventos: [], pontos_delta: 0 },
  ],
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("rodadasApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("lancarRodada", () => {
    it("devolve a rodada lançada em sucesso (201) — chamada única ao POST /api/rodadas", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(201, RESPONSE));
      const result = await lancarRodada(BODY);
      expect(result).toEqual(RESPONSE);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BODY),
        }),
      );
    });

    it("lança RodadaValidationError com detalhes em 400 (RF-02.6, defesa em profundidade)", async () => {
      const body = {
        error: "Requisição inválida.",
        detalhes: [
          {
            path: ["participacoes", 1, "eventos"],
            message: "Eventos não permitidos para atleta ausente.",
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(400, body));
      const error = await lancarRodada(BODY).catch((e) => e);
      expect(error).toBeInstanceOf(RodadaValidationError);
      expect((error as RodadaValidationError).detalhes).toEqual(body.detalhes);
    });

    it("lança RodadaDuplicidadeError com rodadas_duplicadas em 409 (RF-02.8)", async () => {
      const body = {
        error: "duplicidade",
        rodadas_duplicadas: [
          { id: "rodada-existente", data: "2026-09-05", status: "lancada" },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(409, body));
      const error = await lancarRodada(BODY).catch((e) => e);
      expect(error).toBeInstanceOf(RodadaDuplicidadeError);
      expect((error as RodadaDuplicidadeError).rodadasDuplicadas).toEqual(
        body.rodadas_duplicadas,
      );
    });

    it("resubmissão com confirmar_duplicidade: true é enviada no corpo", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(201, RESPONSE));
      await lancarRodada({ ...BODY, confirmar_duplicidade: true });
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas",
        expect.objectContaining({
          body: JSON.stringify({ ...BODY, confirmar_duplicidade: true }),
        }),
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(lancarRodada(BODY)).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança RodadaApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(lancarRodada(BODY)).rejects.toBeInstanceOf(RodadaApiError);
    });

    it("lança RodadaApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(lancarRodada(BODY)).rejects.toBeInstanceOf(RodadaApiError);
    });
  });
});
