/**
 * Teste de integração da confirmação/persistência de times (escopo AMPLIADO
 * desta execução de BE-13 por decisão EXPLÍCITA do usuário — ver TASK.md,
 * nota de status de BE-13). Critério de aceite desta parte (definido pelo
 * enunciado da tarefa, não pelo `TASK.md` original — BE-13 original não
 * cobria isto): a divisão de times ajustada manualmente é gravada em
 * `app.time`/`app.time_atleta` numa única transação (todos os times de uma
 * rodada gravados juntos ou nenhum é); reconfirmar substitui a divisão
 * anterior, salvo se já existir `app.substituicao` registrada contra ela.
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
 * `app.time`/`app.time_atleta` presos por FK a `app.rodada`/`app.atleta`
 * (`on delete restrict`, BE-02) — mesmo padrão de "nunca limpo no
 * afterAll" já usado pelas demais suítes de integração deste projeto: cada
 * rodada/atleta criado por este teste usa uma `data`/`nome_completo`
 * derivados de `runId`, únicos por execução.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as postTimes } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildRequest(rodadaId: string, body?: unknown): Request {
  return new Request(`http://localhost:3000/api/rodadas/${rodadaId}/times`, {
    method: "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";

describe.skipIf(!podeRodar)(
  "BE-13 (escopo ampliado) — POST /api/rodadas/:id/times",
  () => {
    let service: SupabaseClient<any, any, any>;
    const runSeed = Date.now();
    const runId = `be13times-${runSeed}`;

    beforeAll(() => {
      service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    });

    function rodadaData(indice: number): string {
      const ancora = new Date("2032-01-01T00:00:00.000Z");
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
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    }

    async function criarRodada(
      indice: number,
      status: "lancada" | "excluida" = "lancada",
    ) {
      const { data, error } = await service
        .from("rodada")
        .insert({ data: rodadaData(indice), status })
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    }

    it(
      "confirma uma divisão de 2 times, grava app.time/app.time_atleta atomicamente e " +
        "aplica labels padrão 'Time A'/'Time B' quando não informados",
      async () => {
        const rodadaId = await criarRodada(1);
        const a1 = await criarAtleta("a1");
        const a2 = await criarAtleta("a2");
        const b1 = await criarAtleta("b1");
        const b2 = await criarAtleta("b2");

        const response = await postTimes(
          buildRequest(rodadaId, {
            times: [{ atletas_ids: [a1, a2] }, { atletas_ids: [b1, b2] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.rodada_id).toBe(rodadaId);
        expect(body.times).toHaveLength(2);
        expect(body.times[0].label).toBe("Time A");
        expect(body.times[1].label).toBe("Time B");
        expect(body.times[0].atletas.map((a: any) => a.atleta_id).sort()).toEqual(
          [a1, a2].sort(),
        );

        // Confirma diretamente no banco (não só na resposta HTTP).
        const { data: timesNoBanco } = await service
          .from("time")
          .select("id, label")
          .eq("rodada_id", rodadaId);
        expect(timesNoBanco).toHaveLength(2);

        const timeIds = timesNoBanco!.map((t: any) => t.id);
        const { data: associacoes } = await service
          .from("time_atleta")
          .select("time_id, atleta_id")
          .in("time_id", timeIds);
        expect(associacoes).toHaveLength(4);
      },
    );

    it("aceita label personalizado por time", async () => {
      const rodadaId = await criarRodada(2);
      const a1 = await criarAtleta("custom-a1");
      const b1 = await criarAtleta("custom-b1");

      const response = await postTimes(
        buildRequest(rodadaId, {
          times: [
            { label: "Amarelo", atletas_ids: [a1] },
            { label: "Azul", atletas_ids: [b1] },
          ],
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.times.map((t: any) => t.label).sort()).toEqual(["Amarelo", "Azul"]);
    });

    it("todos os times de uma rodada são gravados juntos ou nenhum é: atleta inexistente recusa com 404 e nada é persistido", async () => {
      const rodadaId = await criarRodada(3);
      const a1 = await criarAtleta("atomic-a1");
      const b1 = await criarAtleta("atomic-b1");

      const response = await postTimes(
        buildRequest(rodadaId, {
          times: [{ atletas_ids: [a1] }, { atletas_ids: [b1, ID_INEXISTENTE] }],
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.atleta_id).toBe(ID_INEXISTENTE);

      const { data: timesNoBanco } = await service
        .from("time")
        .select("id")
        .eq("rodada_id", rodadaId);
      expect(timesNoBanco).toHaveLength(0);
    });

    it("corpo malformado retorna 400", async () => {
      const rodadaId = await criarRodada(4);
      const response = await postTimes(
        new Request(`http://localhost:3000/api/rodadas/${rodadaId}/times`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{ nao-e-json-valido",
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(400);
    });

    it("menos de 2 times retorna 400", async () => {
      const rodadaId = await criarRodada(5);
      const a1 = await criarAtleta("min-a1");
      const response = await postTimes(
        buildRequest(rodadaId, { times: [{ atletas_ids: [a1] }] }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(400);
    });

    it("mesmo atleta em mais de um time retorna 400", async () => {
      const rodadaId = await criarRodada(6);
      const a1 = await criarAtleta("dup-a1");
      const response = await postTimes(
        buildRequest(rodadaId, {
          times: [{ atletas_ids: [a1] }, { atletas_ids: [a1] }],
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(400);
    });

    it("rodada inexistente retorna 404", async () => {
      const a1 = await criarAtleta("norodada-a1");
      const b1 = await criarAtleta("norodada-b1");
      const response = await postTimes(
        buildRequest(ID_INEXISTENTE, {
          times: [{ atletas_ids: [a1] }, { atletas_ids: [b1] }],
        }),
        { params: { id: ID_INEXISTENTE } },
      );
      expect(response.status).toBe(404);
    });

    it("rodada já excluída retorna 409", async () => {
      const rodadaId = await criarRodada(7, "excluida");
      const a1 = await criarAtleta("excluida-a1");
      const b1 = await criarAtleta("excluida-b1");
      const response = await postTimes(
        buildRequest(rodadaId, {
          times: [{ atletas_ids: [a1] }, { atletas_ids: [b1] }],
        }),
        { params: { id: rodadaId } },
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe("Esta rodada já foi excluída anteriormente.");
    });

    it(
      "reconfirmar substitui a divisão anterior por completo (times antigos removidos, " +
        "novos gravados)",
      async () => {
        const rodadaId = await criarRodada(8);
        const a1 = await criarAtleta("reconf-a1");
        const a2 = await criarAtleta("reconf-a2");
        const b1 = await criarAtleta("reconf-b1");
        const c1 = await criarAtleta("reconf-c1");

        const primeira = await postTimes(
          buildRequest(rodadaId, {
            times: [{ atletas_ids: [a1] }, { atletas_ids: [b1] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(primeira.status).toBe(200);
        const corpoPrimeira = await primeira.json();
        const timeIdsAntigos = corpoPrimeira.times.map((t: any) => t.time_id);

        const segunda = await postTimes(
          buildRequest(rodadaId, {
            times: [{ atletas_ids: [a1, a2] }, { atletas_ids: [c1] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(segunda.status).toBe(200);
        const corpoSegunda = await segunda.json();
        const timeIdsNovos = corpoSegunda.times.map((t: any) => t.time_id);

        // Times antigos não existem mais.
        for (const idAntigo of timeIdsAntigos) {
          expect(timeIdsNovos).not.toContain(idAntigo);
        }
        const { data: timesAntigosNoBanco } = await service
          .from("time")
          .select("id")
          .in("id", timeIdsAntigos);
        expect(timesAntigosNoBanco).toHaveLength(0);

        // Só a divisão nova existe para esta rodada.
        const { data: timesAtuais } = await service
          .from("time")
          .select("id")
          .eq("rodada_id", rodadaId);
        expect(timesAtuais).toHaveLength(2);
        expect(timesAtuais!.map((t: any) => t.id).sort()).toEqual(timeIdsNovos.sort());
      },
    );

    it(
      "reconfirmação é BLOQUEADA (409) quando já existe substituição registrada contra a " +
        "divisão atual — a divisão original permanece intacta",
      async () => {
        const rodadaId = await criarRodada(9);
        const a1 = await criarAtleta("block-a1");
        const b1 = await criarAtleta("block-b1");
        const banco = await criarAtleta("block-banco");

        const confirmacao = await postTimes(
          buildRequest(rodadaId, {
            times: [{ atletas_ids: [a1] }, { atletas_ids: [b1] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(confirmacao.status).toBe(200);
        const corpo = await confirmacao.json();
        const timeAId = corpo.times[0].time_id;

        const { error: erroSubstituicao } = await service.from("substituicao").insert({
          rodada_id: rodadaId,
          time_id: timeAId,
          atleta_sai_id: a1,
          atleta_entra_id: banco,
        });
        expect(erroSubstituicao).toBeNull();

        const reconfirmacao = await postTimes(
          buildRequest(rodadaId, {
            times: [{ atletas_ids: [banco] }, { atletas_ids: [b1] }],
          }),
          { params: { id: rodadaId } },
        );
        expect(reconfirmacao.status).toBe(409);
        const corpoErro = await reconfirmacao.json();
        expect(corpoErro.error).toBe("substituicao_existente");

        // Divisão original intacta.
        const { data: timesAtuais } = await service
          .from("time")
          .select("id")
          .eq("rodada_id", rodadaId);
        expect(timesAtuais!.map((t: any) => t.id).sort()).toEqual(
          corpo.times.map((t: any) => t.time_id).sort(),
        );
      },
    );
  },
);

if (!podeRodar) {
  describe("BE-13 (escopo ampliado) — POST /api/rodadas/:id/times (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
