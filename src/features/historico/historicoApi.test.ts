import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  HistoricoApiError,
  RodadaExclusaoApiError,
  RodadaJaExcluidaError,
  RodadaNaoEncontradaError,
  excluirRodada,
  listarRodadas,
} from "./historicoApi";
import type { RodadaExcluidaResponse } from "./historicoApi";
import type { RodadaHistoricoItem } from "./types";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("historicoApi", () => {
  describe("listarRodadas (GET /api/rodadas, BE-16 — endpoint real)", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("devolve a lista exatamente como o contrato publica (RodadaResumoItem[])", async () => {
      const items: RodadaHistoricoItem[] = [
        {
          id: "rodada-1",
          data: "2026-09-19",
          status: "lancada",
          criado_em: "2026-09-19T20:00:00.000Z",
          presentes: 18,
          confronto: { colete: 62, sem_colete: 59 },
          status_correcao: "encerrada",
        },
        {
          id: "rodada-2",
          data: "2026-09-12",
          status: "excluida",
          criado_em: "2026-09-12T20:00:00.000Z",
          presentes: 15,
          confronto: null,
          status_correcao: "corrigida",
        },
      ];
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, items));

      const result = await listarRodadas();

      expect(result).toEqual(items);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith("/api/rodadas", undefined);
    });

    it("devolve lista vazia quando não há nenhuma rodada lançada", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, []));
      await expect(listarRodadas()).resolves.toEqual([]);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(listarRodadas()).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança HistoricoApiError em 400 (limit inválido — nunca enviado por este cliente, mas tratado defensivamente)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(400, { error: "Requisição inválida." }),
      );
      await expect(listarRodadas()).rejects.toBeInstanceOf(HistoricoApiError);
    });

    it("lança HistoricoApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(listarRodadas()).rejects.toBeInstanceOf(HistoricoApiError);
    });

    it("lança HistoricoApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(listarRodadas()).rejects.toBeInstanceOf(HistoricoApiError);
    });
  });

  describe("excluirRodada", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("devolve a rodada excluída (200) — chamada única ao DELETE /api/rodadas/{id}", async () => {
      const response: RodadaExcluidaResponse = {
        id: "rodada-1",
        data: "2026-09-05",
        status: "excluida",
        atletas_afetados: 20,
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, response));

      const result = await excluirRodada("rodada-1");

      expect(result).toEqual(response);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas/rodada-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("lança RodadaNaoEncontradaError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Rodada não encontrada." }),
      );
      await expect(excluirRodada("rodada-x")).rejects.toBeInstanceOf(
        RodadaNaoEncontradaError,
      );
    });

    it("lança RodadaJaExcluidaError em 409 (idempotência, RD001)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, { error: "Esta rodada já foi excluída anteriormente." }),
      );
      await expect(excluirRodada("rodada-1")).rejects.toBeInstanceOf(
        RodadaJaExcluidaError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(excluirRodada("rodada-1")).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança RodadaExclusaoApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(excluirRodada("rodada-1")).rejects.toBeInstanceOf(
        RodadaExclusaoApiError,
      );
    });

    it("lança RodadaExclusaoApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(excluirRodada("rodada-1")).rejects.toBeInstanceOf(
        RodadaExclusaoApiError,
      );
    });
  });
});
