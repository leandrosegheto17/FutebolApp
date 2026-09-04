import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  CORRECAO_ERROR_MESSAGE,
  CorrecaoRodadaApiError,
  ParticipacaoNaoEncontradaError,
  RodadaJaExcluidaError,
  RodadaNaoEncontradaError,
  corrigirParticipacao,
  detalharRodada,
  simularCorrecao,
} from "./correcaoApi";
import type { CorrigirParticipacaoBody, RodadaDetalhe } from "./types";

const RODADA_DETALHE: RodadaDetalhe = {
  id: "rodada-1",
  data: "2026-09-05",
  status: "lancada",
  criado_em: "2026-09-05T20:00:00.000Z",
  participacoes: [
    {
      atleta_id: "atleta-1",
      apelido_exibicao: "Carlinhos",
      status: "presente",
      eventos: [{ tipo: "gol", quantidade: 1 }],
      pontos_delta: 8,
    },
  ],
};

const CORRECAO_BODY: CorrigirParticipacaoBody = {
  status: "ausente",
  eventos: [],
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("correcaoApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("detalharRodada (GET /api/rodadas/{id}, BE-16 — endpoint real)", () => {
    it("devolve o detalhe exatamente como o contrato publica (RodadaDetalheResponse)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, RODADA_DETALHE));

      const result = await detalharRodada("rodada-1");

      expect(result).toEqual(RODADA_DETALHE);
      expect(fetch).toHaveBeenCalledWith("/api/rodadas/rodada-1", undefined);
    });

    it("lança RodadaNaoEncontradaError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Rodada não encontrada." }),
      );
      await expect(detalharRodada("rodada-x")).rejects.toBeInstanceOf(
        RodadaNaoEncontradaError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(detalharRodada("rodada-1")).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });

    it("lança CorrecaoRodadaApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(detalharRodada("rodada-1")).rejects.toBeInstanceOf(
        CorrecaoRodadaApiError,
      );
    });

    it("lança CorrecaoRodadaApiError em falha técnica (5xx)", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      await expect(detalharRodada("rodada-1")).rejects.toBeInstanceOf(
        CorrecaoRodadaApiError,
      );
    });
  });

  describe("simularCorrecao (POST .../simular-correcao, BE-10 — preview read-only, endpoint real)", () => {
    it("chama o endpoint de simulação (nunca o PATCH real) e devolve o preview calculado", async () => {
      const preview = {
        atleta_id: "atleta-1",
        status_atual: "presente",
        eventos_atuais: [{ tipo: "gol", quantidade: 1 }],
        novo_status: "ausente",
        novos_eventos: [],
        pontos_antes: 8,
        pontos_depois: 0,
        pontos_delta: -8,
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, preview));

      const result = await simularCorrecao("rodada-1", "atleta-1", CORRECAO_BODY);

      expect(result).toEqual(preview);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas/rodada-1/participacoes/atleta-1/simular-correcao",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(CORRECAO_BODY),
        }),
      );
    });

    it("lança RodadaNaoEncontradaError em 404 de rodada", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Rodada não encontrada." }),
      );
      await expect(
        simularCorrecao("rodada-x", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(RodadaNaoEncontradaError);
    });

    it("lança ParticipacaoNaoEncontradaError em 404 de participação", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Este atleta não participou desta rodada." }),
      );
      await expect(
        simularCorrecao("rodada-1", "atleta-x", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(ParticipacaoNaoEncontradaError);
    });

    it("lança RodadaJaExcluidaError em 409 (rodada já excluída)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, {
          error:
            "Esta rodada já foi excluída — não é possível simular uma correção sobre ela.",
        }),
      );
      await expect(
        simularCorrecao("rodada-1", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(RodadaJaExcluidaError);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(
        simularCorrecao("rodada-1", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança CorrecaoRodadaApiError em 400 (defesa em profundidade — UI já bloqueia eventos para ausente)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(400, { error: "Requisição inválida." }),
      );
      await expect(
        simularCorrecao("rodada-1", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(CorrecaoRodadaApiError);
    });

    it("lança CorrecaoRodadaApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(
        simularCorrecao("rodada-1", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(CorrecaoRodadaApiError);
    });
  });

  describe("corrigirParticipacao (PATCH .../participacoes/{atletaId}, BE-09 — correção real, endpoint real)", () => {
    it("chama o PATCH real e devolve a participação corrigida", async () => {
      const corrigida = {
        atleta_id: "atleta-1",
        status: "ausente",
        eventos: [],
        pontos_delta: 0,
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, corrigida));

      const result = await corrigirParticipacao("rodada-1", "atleta-1", CORRECAO_BODY);

      expect(result).toEqual(corrigida);
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas/rodada-1/participacoes/atleta-1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(CORRECAO_BODY),
        }),
      );
    });

    it("lança RodadaJaExcluidaError em 409", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, {
          error: "Esta rodada já foi excluída — não é possível corrigi-la.",
        }),
      );
      await expect(
        corrigirParticipacao("rodada-1", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(RodadaJaExcluidaError);
    });

    it("lança ParticipacaoNaoEncontradaError em 404 de participação", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Este atleta não participou desta rodada." }),
      );
      await expect(
        corrigirParticipacao("rodada-1", "atleta-x", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(ParticipacaoNaoEncontradaError);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(
        corrigirParticipacao("rodada-1", "atleta-1", CORRECAO_BODY),
      ).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança CorrecaoRodadaApiError em falha técnica (5xx) — nunca sugere salvamento parcial", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));
      const error = await corrigirParticipacao(
        "rodada-1",
        "atleta-1",
        CORRECAO_BODY,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(CorrecaoRodadaApiError);
      expect((error as Error).message).toBe(CORRECAO_ERROR_MESSAGE);
    });
  });
});
