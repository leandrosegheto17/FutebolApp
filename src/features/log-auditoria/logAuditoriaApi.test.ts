import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  LOG_AUDITORIA_ERROR_MESSAGE,
  LogAuditoriaApiError,
  fetchLogAuditoria,
} from "./logAuditoriaApi";
import type { LogAuditoriaItem } from "./types";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("logAuditoriaApi", () => {
  describe("fetchLogAuditoria (GET /api/log-auditoria, BE-09 — endpoint real)", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("devolve a lista exatamente como o contrato publica (LogAuditoriaItem[]), sem enviar limit", async () => {
      const items: LogAuditoriaItem[] = [
        {
          id: "log-1",
          rodada_id: "rodada-1",
          atleta_id: "atleta-1",
          tipo_evento: "correcao",
          ocorrido_em: "2026-09-02T14:32:00.000Z",
          valores_antes: { status: "presente", eventos: [], pontos_acumulados: 10 },
          valores_depois: {
            status: "ausente",
            eventos: [],
            pontos_acumulados: 8,
            ajuste_aplicado: -2,
          },
        },
      ];
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, items));

      const result = await fetchLogAuditoria();

      expect(result).toEqual(items);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith("/api/log-auditoria");
    });

    it("devolve lista vazia quando não há nenhuma correção/exclusão/anonimização registrada", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, []));
      await expect(fetchLogAuditoria()).resolves.toEqual([]);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(fetchLogAuditoria()).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança LogAuditoriaApiError em 400 (limit inválido — nunca enviado por este cliente, mas tratado defensivamente)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(400, { error: "Requisição inválida." }),
      );
      await expect(fetchLogAuditoria()).rejects.toBeInstanceOf(LogAuditoriaApiError);
      await expect(fetchLogAuditoria()).rejects.toThrow(LOG_AUDITORIA_ERROR_MESSAGE);
    });

    it("lança LogAuditoriaApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(fetchLogAuditoria()).rejects.toBeInstanceOf(LogAuditoriaApiError);
    });

    it("lança LogAuditoriaApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(fetchLogAuditoria()).rejects.toBeInstanceOf(LogAuditoriaApiError);
    });
  });
});
