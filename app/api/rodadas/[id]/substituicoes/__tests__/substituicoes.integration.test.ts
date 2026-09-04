/**
 * Teste de integração de BE-13 (TASK.md Secao 3.1) — critério de aceite
 * literal: "Registrar substituição não altera saldo de nenhum atleta;
 * múltiplas substituições na mesma rodada sem limite (RF-06.2); tentar usar
 * o mesmo atleta em 'sai' e 'entra' é bloqueado com mensagem clara".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02 a BE-12:
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * `time`/`app.time_atleta` são gravados diretamente pelo teste via
 * `service_role` (não passa pelo endpoint de confirmação de
 * `../../times/route.ts`) — decisão de detalhe: isola este teste do
 * comportamento daquele endpoint, cobrindo apenas o que é responsabilidade
 * de BE-13 em si (a integração ponta a ponta confirmar→substituir já é
 * coberta por `../../times/__tests__/times.integration.test.ts`, caso
 * "reconfirmação é BLOQUEADA... quando já existe substituição registrada").
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as listSubstituicoes, POST as postSubstituicao } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildRequest(rodadaId: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost:3000/api/rodadas/${rodadaId}/substituicoes`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";

describe.skipIf(!podeRodar)("BE-13 — /api/rodadas/:id/substituicoes", () => {
  let service: SupabaseClient<any, any, any>;
  const runSeed = Date.now();
  const runId = `be13sub-${runSeed}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  function rodadaData(indice: number): string {
    const ancora = new Date("2033-01-01T00:00:00.000Z");
    const diasOffset = (runSeed % 100000) + indice;
    return new Date(ancora.getTime() + diasOffset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  async function criarAtleta(sufixo: string): Promise<string> {
    const { data, error } = await service
      .from("atleta")
      .insert({
        nome_completo: `${runId} ${sufixo}`,
        apelido_exibicao: `${runId}-${sufixo}`,
        data_nascimento: "1990-01-01",
        pontuacao_inicial: 0,
      })
      .select("id, apelido_exibicao")
      .single();
    if (error) throw error;
    return data!.id as string;
  }

  async function criarRodadaComTime(
    indice: number,
    label: string,
    atletasIds: string[],
  ): Promise<{ rodadaId: string; timeId: string }> {
    const { data: rodada, error: erroRodada } = await service
      .from("rodada")
      .insert({ data: rodadaData(indice), status: "lancada" })
      .select("id")
      .single();
    if (erroRodada) throw erroRodada;
    const rodadaId = rodada!.id as string;

    const { data: time, error: erroTime } = await service
      .from("time")
      .insert({ rodada_id: rodadaId, label })
      .select("id")
      .single();
    if (erroTime) throw erroTime;
    const timeId = time!.id as string;

    if (atletasIds.length > 0) {
      const { error: erroAssociacao } = await service
        .from("time_atleta")
        .insert(atletasIds.map((atletaId) => ({ time_id: timeId, atleta_id: atletaId })));
      if (erroAssociacao) throw erroAssociacao;
    }

    return { rodadaId, timeId };
  }

  it(
    "registra uma substituição vinculada a rodada/time (RF-06.1), sem alterar saldo de " +
      "nenhum atleta (RF-06.3) — nenhuma linha nova em app.lancamento_pontos",
    async () => {
      const saiId = await criarAtleta("sai-1");
      const entraId = await criarAtleta("entra-1");
      const { rodadaId, timeId } = await criarRodadaComTime(1, "Time A", [saiId]);

      const response = await postSubstituicao(
        buildRequest(rodadaId, "POST", {
          time_id: timeId,
          atleta_sai_id: saiId,
          atleta_entra_id: entraId,
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeTruthy();
      expect(body.rodada_id).toBe(rodadaId);
      expect(body.time_id).toBe(timeId);
      expect(body.atleta_sai_id).toBe(saiId);
      expect(body.atleta_sai_nome).toBe(`${runId}-sai-1`);
      expect(body.atleta_entra_id).toBe(entraId);
      expect(body.atleta_entra_nome).toBe(`${runId}-entra-1`);

      // Confirma diretamente no banco: a linha existe...
      const { data: linhaNoBanco } = await service
        .from("substituicao")
        .select("id, rodada_id, time_id, atleta_sai_id, atleta_entra_id")
        .eq("id", body.id)
        .single();
      expect(linhaNoBanco).toBeTruthy();

      // ...e NENHUM lançamento de pontos foi criado para esta rodada — prova
      // negativa direta do critério de aceite "não altera saldo de nenhum
      // atleta", não só ausência de um efeito colateral óbvio.
      const { data: lancamentos } = await service
        .from("lancamento_pontos")
        .select("id")
        .eq("rodada_id", rodadaId);
      expect(lancamentos).toHaveLength(0);
    },
  );

  it(
    "permite múltiplas substituições na mesma rodada sem limite fixo (RF-06.2) — " +
      "GET lista todas, mais antiga primeiro",
    async () => {
      const banco1 = await criarAtleta("banco-1");
      const banco2 = await criarAtleta("banco-2");
      const banco3 = await criarAtleta("banco-3");
      const banco4 = await criarAtleta("banco-4");
      const banco5 = await criarAtleta("banco-5");
      const titular = await criarAtleta("titular-multi");
      const { rodadaId, timeId } = await criarRodadaComTime(2, "Time Multi", [titular]);

      const entrantes = [banco1, banco2, banco3, banco4, banco5];
      for (const entrante of entrantes) {
        const response = await postSubstituicao(
          buildRequest(rodadaId, "POST", {
            time_id: timeId,
            atleta_sai_id: titular,
            atleta_entra_id: entrante,
          }),
          { params: { id: rodadaId } },
        );
        expect(response.status).toBe(201);
      }

      const listagem = await listSubstituicoes(new Request("http://localhost:3000"), {
        params: { id: rodadaId },
      });
      expect(listagem.status).toBe(200);
      const lista = await listagem.json();
      expect(lista).toHaveLength(5);
      expect(lista.every((s: any) => s.rodada_id === rodadaId)).toBe(true);
      expect(lista.map((s: any) => s.atleta_entra_id)).toEqual(entrantes);
    },
  );

  it(
    "tentar usar o mesmo atleta em 'sai' e 'entra' é bloqueado com 400 e mensagem clara, " +
      "e nada é persistido",
    async () => {
      const atletaId = await criarAtleta("mesmo-atleta");
      const { rodadaId, timeId } = await criarRodadaComTime(3, "Time Igual", [atletaId]);

      const response = await postSubstituicao(
        buildRequest(rodadaId, "POST", {
          time_id: timeId,
          atleta_sai_id: atletaId,
          atleta_entra_id: atletaId,
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
      const mensagens = (body.detalhes ?? []).map((d: any) => d.message).join(" ");
      expect(mensagens.toLowerCase()).toContain("diferentes");

      const { data: linhas } = await service
        .from("substituicao")
        .select("id")
        .eq("rodada_id", rodadaId);
      expect(linhas).toHaveLength(0);
    },
  );

  it("time_id que não pertence à rodada informada retorna 404", async () => {
    const sai = await criarAtleta("outra-rodada-sai");
    const entra = await criarAtleta("outra-rodada-entra");
    const { timeId } = await criarRodadaComTime(4, "Time Rodada 1", [sai]);
    const { rodadaId: outraRodadaId } = await criarRodadaComTime(5, "Time Rodada 2", []);

    const response = await postSubstituicao(
      buildRequest(outraRodadaId, "POST", {
        time_id: timeId,
        atleta_sai_id: sai,
        atleta_entra_id: entra,
      }),
      { params: { id: outraRodadaId } },
    );
    expect(response.status).toBe(404);
  });

  it("time_id inexistente retorna 404", async () => {
    const sai = await criarAtleta("timeinexistente-sai");
    const entra = await criarAtleta("timeinexistente-entra");
    const { rodadaId } = await criarRodadaComTime(6, "Time Existe", [sai]);

    const response = await postSubstituicao(
      buildRequest(rodadaId, "POST", {
        time_id: ID_INEXISTENTE,
        atleta_sai_id: sai,
        atleta_entra_id: entra,
      }),
      { params: { id: rodadaId } },
    );
    expect(response.status).toBe(404);
  });

  it("atleta_sai_id/atleta_entra_id inexistente retorna 404 (não estoura erro genérico de FK)", async () => {
    const sai = await criarAtleta("atletainexistente-sai");
    const { rodadaId, timeId } = await criarRodadaComTime(7, "Time Existe 2", [sai]);

    const respostaSai = await postSubstituicao(
      buildRequest(rodadaId, "POST", {
        time_id: timeId,
        atleta_sai_id: ID_INEXISTENTE,
        atleta_entra_id: sai,
      }),
      { params: { id: rodadaId } },
    );
    expect(respostaSai.status).toBe(404);

    const respostaEntra = await postSubstituicao(
      buildRequest(rodadaId, "POST", {
        time_id: timeId,
        atleta_sai_id: sai,
        atleta_entra_id: ID_INEXISTENTE,
      }),
      { params: { id: rodadaId } },
    );
    expect(respostaEntra.status).toBe(404);
  });

  it("corpo malformado retorna 400", async () => {
    const { rodadaId } = await criarRodadaComTime(8, "Time Malformado", []);
    const response = await postSubstituicao(
      new Request(`http://localhost:3000/api/rodadas/${rodadaId}/substituicoes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ nao-e-json-valido",
      }),
      { params: { id: rodadaId } },
    );
    expect(response.status).toBe(400);
  });

  it("GET de rodada sem substituições retorna lista vazia", async () => {
    const { rodadaId } = await criarRodadaComTime(9, "Time Vazio", []);
    const response = await listSubstituicoes(new Request("http://localhost:3000"), {
      params: { id: rodadaId },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });
});

if (!podeRodar) {
  describe("BE-13 — /api/rodadas/:id/substituicoes (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
