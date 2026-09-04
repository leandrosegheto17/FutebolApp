import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionExpiredError } from "@/features/sessao";
import {
  RodadaJaExcluidaError,
  RodadaNaoEncontradaError,
  SubstituicaoExistenteError,
  TimesApiError,
  TimesFalhaTecnicaError,
  buscarPresentesDaRodada,
  buscarRodadaAtual,
  confirmarTimes,
  gerarSugestao,
} from "./timesApi";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("timesApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("buscarRodadaAtual (GET /api/rodadas, BE-16)", () => {
    it("devolve a primeira rodada com status 'lancada' (lista já vem data desc/criado_em desc)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(200, [
          {
            id: "r1",
            data: "2026-09-19",
            status: "excluida",
            criado_em: "2026-09-19T20:00:00Z",
          },
          {
            id: "r2",
            data: "2026-09-12",
            status: "lancada",
            criado_em: "2026-09-12T20:00:00Z",
          },
        ]),
      );
      const rodada = await buscarRodadaAtual();
      expect(rodada?.id).toBe("r2");
    });

    it("devolve null quando não há nenhuma rodada 'lancada' (tratado como dependência pela tela)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(200, [
          {
            id: "r1",
            data: "2026-09-19",
            status: "excluida",
            criado_em: "2026-09-19T20:00:00Z",
          },
        ]),
      );
      await expect(buscarRodadaAtual()).resolves.toBeNull();
    });

    it("devolve null quando a lista está vazia", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, []));
      await expect(buscarRodadaAtual()).resolves.toBeNull();
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(buscarRodadaAtual()).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it("lança TimesApiError em falha técnica/rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(buscarRodadaAtual()).rejects.toBeInstanceOf(TimesApiError);
    });
  });

  describe("buscarPresentesDaRodada (GET /api/rodadas/{id}, BE-16)", () => {
    it("filtra só participações status='presente' e devolve apelido já resolvido (RN-06)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(200, {
          id: "r1",
          data: "2026-09-19",
          status: "lancada",
          criado_em: "2026-09-19T20:00:00Z",
          participacoes: [
            {
              atleta_id: "1",
              apelido_exibicao: "João",
              status: "presente",
              eventos: [],
              pontos_delta: 2,
            },
            {
              atleta_id: "2",
              apelido_exibicao: "Carlinhos",
              status: "ausente",
              eventos: [],
              pontos_delta: 0,
            },
            {
              atleta_id: "3",
              apelido_exibicao: "Rafa",
              status: "lesionado",
              eventos: [],
              pontos_delta: 0,
            },
          ],
        }),
      );
      const presentes = await buscarPresentesDaRodada("r1");
      expect(presentes).toEqual([{ atleta_id: "1", apelido_exibicao: "João" }]);
    });

    it("lança RodadaNaoEncontradaError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Rodada não encontrada." }),
      );
      await expect(buscarPresentesDaRodada("r-x")).rejects.toBeInstanceOf(
        RodadaNaoEncontradaError,
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(buscarPresentesDaRodada("r1")).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });
  });

  describe("gerarSugestao (POST /api/times/sugestao, BE-11)", () => {
    it("envia atletas_ids/quantidade_times e devolve status='ok' com times", async () => {
      const okResponse = {
        status: "ok",
        quantidade_times_solicitada: 2,
        times: [
          { indice: 0, atletas: [], nivel_tecnico_medio: 5, idade_media: 20 },
          { indice: 1, atletas: [], nivel_tecnico_medio: 5, idade_media: 20 },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, okResponse));

      const resultado = await gerarSugestao(["1", "2"], 2);

      expect(resultado).toEqual(okResponse);
      expect(fetch).toHaveBeenCalledWith(
        "/api/times/sugestao",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ atletas_ids: ["1", "2"], quantidade_times: 2 }),
        }),
      );
    });

    it("devolve status='conflito' com o contrato exato do ADR-010, sem lançar (é um resultado válido)", async () => {
      const conflitoResponse = {
        status: "conflito",
        restricoes_conflitantes: [
          {
            restricao_id: "res-1",
            atleta_a_id: "1",
            atleta_a_nome: "João",
            atleta_b_id: "2",
            atleta_b_nome: "Carlinhos",
            motivo: "restricao_obrigatoria_ativa",
            grupo_conflito: 1,
          },
        ],
        grupos_conflito: [
          {
            grupo_conflito: 1,
            atletas_ids: ["1", "2", "3"],
            quantidade_times_solicitada: 2,
            mensagem: "...",
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, conflitoResponse));

      await expect(gerarSugestao(["1", "2", "3"], 2)).resolves.toEqual(conflitoResponse);
    });

    it("lança TimesFalhaTecnicaError em 500 (timeout do backtracking, TASK.md Seção 6.2 item 3) com a mensagem literal do UX-SPEC", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(500, { error: "falha_tecnica", message: "timeout interno" }),
      );
      const promessa = gerarSugestao(["1", "2"], 2);
      await expect(promessa).rejects.toBeInstanceOf(TimesFalhaTecnicaError);
      await expect(promessa).rejects.toThrow(
        "Não foi possível gerar a sugestão, tente novamente.",
      );
    });

    it("lança TimesApiError em 400 (validação)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(400, { error: "Requisição inválida." }),
      );
      await expect(gerarSugestao(["1"], 2)).rejects.toBeInstanceOf(TimesApiError);
    });

    it("lança TimesApiError em 404 (atleta referenciado inexistente)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Atleta não encontrado." }),
      );
      await expect(gerarSugestao(["1", "2"], 2)).rejects.toBeInstanceOf(TimesApiError);
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(gerarSugestao(["1", "2"], 2)).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });

    it("lança TimesApiError em falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("network down"));
      await expect(gerarSugestao(["1", "2"], 2)).rejects.toBeInstanceOf(TimesApiError);
    });
  });

  describe("confirmarTimes (POST /api/rodadas/{id}/times, BE-13)", () => {
    const times = [
      { label: "Time A", atletas_ids: ["1"] },
      { label: "Time B", atletas_ids: ["2"] },
    ];

    it("envia { times } e devolve a divisão persistida (200)", async () => {
      const response = {
        rodada_id: "r1",
        times: [
          {
            time_id: "t1",
            label: "Time A",
            atletas: [{ atleta_id: "1", apelido_exibicao: "João" }],
          },
          {
            time_id: "t2",
            label: "Time B",
            atletas: [{ atleta_id: "2", apelido_exibicao: "Carlinhos" }],
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValue(jsonResponse(200, response));

      const resultado = await confirmarTimes("r1", times);

      expect(resultado).toEqual(response);
      expect(fetch).toHaveBeenCalledWith(
        "/api/rodadas/r1/times",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ times }) }),
      );
    });

    it("lança RodadaNaoEncontradaError em 404", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(404, { error: "Rodada não encontrada." }),
      );
      await expect(confirmarTimes("r-x", times)).rejects.toBeInstanceOf(
        RodadaNaoEncontradaError,
      );
    });

    it("lança RodadaJaExcluidaError em 409 (RD001 — rodada já excluída)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, { error: "Esta rodada já foi excluída anteriormente." }),
      );
      await expect(confirmarTimes("r1", times)).rejects.toBeInstanceOf(
        RodadaJaExcluidaError,
      );
    });

    it("lança SubstituicaoExistenteError em 409 (TM001) com a mensagem do servidor", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(409, {
          error: "substituicao_existente",
          message: "Já existe substituição registrada para esta divisão de times.",
        }),
      );
      const promessa = confirmarTimes("r1", times);
      await expect(promessa).rejects.toBeInstanceOf(SubstituicaoExistenteError);
      await expect(promessa).rejects.toThrow(
        "Já existe substituição registrada para esta divisão de times.",
      );
    });

    it("lança SessionExpiredError em 401", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));
      await expect(confirmarTimes("r1", times)).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });

    it("lança TimesApiError em 400/falha técnica/rede", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(400, { error: "Requisição inválida." }),
      );
      await expect(confirmarTimes("r1", times)).rejects.toBeInstanceOf(TimesApiError);
    });
  });
});
