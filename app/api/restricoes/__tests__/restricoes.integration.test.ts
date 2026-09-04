/**
 * Teste de integração de BE-12 (TASK.md Secao 3.1) — critério de aceite
 * literal: "Desativar uma restrição preserva o registro histórico com
 * `desativado_em`, nunca exclui fisicamente; qualquer sessão válida pode
 * criar/editar/desativar (sem hierarquia, RN-12)".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02/03/04/06:
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * `RN-12`/GUARDRAILS.md regra 18 (sem campo de autor individual, sem
 * hierarquia): nenhuma requisição deste arquivo carrega identidade alguma
 * além do que o middleware de sessão já garante de forma binária (sessão
 * válida ou não) — as chamadas aqui vão direto às funções de Route Handler
 * (mesmo padrão de `atletas.integration.test.ts`), então o próprio fato de
 * criar/editar/desativar/reativar funcionar sem NENHUM dado de "quem" já
 * demonstra RN-12 na prática (não há parâmetro de usuário em lugar nenhum
 * da assinatura de nenhuma função tocada por este teste).
 *
 * `app.atleta`/`app.restricao_obrigatoria` nunca são excluídos fisicamente
 * (GUARDRAILS.md regra 9 / RN-11) — mesmo padrão de BE-06: cada atleta
 * criado por este teste recebe `nome_completo`/`apelido_exibicao`
 * prefixados com um `runId` único por execução, nunca limpo no `afterAll`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as listRestricoes, POST as postRestricao } from "../route";
import { PUT as putRestricao } from "../[id]/route";
import { POST as postDesativar } from "../[id]/desativar/route";
import { POST as postReativar } from "../[id]/reativar/route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";

describe.skipIf(!podeRodar)("BE-12 — /api/restricoes", () => {
  let service: SupabaseClient<any, any, any>;
  const runId = `be12-${Date.now()}`;
  let atletaAId: string;
  let atletaBId: string;
  let atletaCId: string;

  beforeAll(async () => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await service
      .from("atleta")
      .insert([
        {
          nome_completo: `${runId} Atleta A`,
          apelido_exibicao: `${runId}-a`,
          data_nascimento: "1990-01-01",
          pontuacao_inicial: 0,
        },
        {
          nome_completo: `${runId} Atleta B`,
          apelido_exibicao: `${runId}-b`,
          data_nascimento: "1990-01-01",
          pontuacao_inicial: 0,
        },
        {
          nome_completo: `${runId} Atleta C`,
          apelido_exibicao: `${runId}-c`,
          data_nascimento: "1990-01-01",
          pontuacao_inicial: 0,
        },
      ])
      .select("id, apelido_exibicao");
    if (error) throw error;
    atletaAId = data!.find((a: any) => a.apelido_exibicao === `${runId}-a`)!.id;
    atletaBId = data!.find((a: any) => a.apelido_exibicao === `${runId}-b`)!.id;
    atletaCId = data!.find((a: any) => a.apelido_exibicao === `${runId}-c`)!.id;
  });

  // Nenhum `afterAll` de limpeza: nem `atleta` nem `restricao_obrigatoria`
  // podem ser fisicamente apagados (GUARDRAILS.md regra 9 / RN-11) — cada
  // asserção já filtra por id conhecido, mesmo padrão de BE-06.

  it("POST cria uma restrição ativa entre dois atletas existentes (RF-05.5 — cadastrar)", async () => {
    const response = await postRestricao(
      buildRequest("POST", "/api/restricoes", {
        atleta_a_id: atletaAId,
        atleta_b_id: atletaBId,
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.atleta_a_id).toBe(atletaAId);
    expect(body.atleta_b_id).toBe(atletaBId);
    expect(body.atleta_a_nome).toBe(`${runId}-a`);
    expect(body.atleta_b_nome).toBe(`${runId}-b`);
    expect(body.ativo).toBe(true);
    expect(body.desativado_em).toBeNull();
  });

  it("POST com atleta_a_id === atleta_b_id retorna 400 e não cria nada", async () => {
    const response = await postRestricao(
      buildRequest("POST", "/api/restricoes", {
        atleta_a_id: atletaAId,
        atleta_b_id: atletaAId,
      }),
    );
    expect(response.status).toBe(400);
  });

  it("POST com atleta inexistente retorna 404 (não estoura erro genérico de FK)", async () => {
    const response = await postRestricao(
      buildRequest("POST", "/api/restricoes", {
        atleta_a_id: atletaAId,
        atleta_b_id: ID_INEXISTENTE,
      }),
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.atleta_id).toBe(ID_INEXISTENTE);
  });

  it("POST com corpo malformado retorna 400", async () => {
    const response = await postRestricao(
      new Request("http://localhost:3000/api/restricoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ nao-e-json-valido",
      }),
    );
    expect(response.status).toBe(400);
  });

  it(
    "PUT edita o par de uma restrição já cadastrada (RF-05.5 — editar); PUT com id " +
      "inexistente retorna 404; PUT com atleta inexistente retorna 404",
    async () => {
      const criacao = await postRestricao(
        buildRequest("POST", "/api/restricoes", {
          atleta_a_id: atletaAId,
          atleta_b_id: atletaCId,
        }),
      );
      const criada = await criacao.json();

      const edicao = await putRestricao(
        buildRequest("PUT", `/api/restricoes/${criada.id}`, {
          atleta_a_id: atletaBId,
          atleta_b_id: atletaCId,
        }),
        { params: { id: criada.id } },
      );
      expect(edicao.status).toBe(200);
      const editada = await edicao.json();
      expect(editada.atleta_a_id).toBe(atletaBId);
      expect(editada.atleta_b_id).toBe(atletaCId);
      // Edição nunca mexe em ativo/desativado_em (repository.ts).
      expect(editada.ativo).toBe(true);
      expect(editada.desativado_em).toBeNull();

      const edicaoIdInexistente = await putRestricao(
        buildRequest("PUT", `/api/restricoes/${ID_INEXISTENTE}`, {
          atleta_a_id: atletaAId,
          atleta_b_id: atletaBId,
        }),
        { params: { id: ID_INEXISTENTE } },
      );
      expect(edicaoIdInexistente.status).toBe(404);

      const edicaoAtletaInexistente = await putRestricao(
        buildRequest("PUT", `/api/restricoes/${criada.id}`, {
          atleta_a_id: atletaAId,
          atleta_b_id: ID_INEXISTENTE,
        }),
        { params: { id: criada.id } },
      );
      expect(edicaoAtletaInexistente.status).toBe(404);
    },
  );

  it(
    "POST .../desativar marca ativo=false e grava desativado_em, sem excluir a linha " +
      "(RN-11); chamar de novo é idempotente e preserva o desativado_em original " +
      "(registro histórico); POST .../reativar volta ativo=true e limpa desativado_em; " +
      "restrição desativada continua aparecendo em GET /api/restricoes (nunca some da lista)",
    async () => {
      const criacao = await postRestricao(
        buildRequest("POST", "/api/restricoes", {
          atleta_a_id: atletaAId,
          atleta_b_id: atletaBId,
        }),
      );
      const criada = await criacao.json();

      const desativacao1 = await postDesativar(
        buildRequest("POST", `/api/restricoes/${criada.id}/desativar`),
        { params: { id: criada.id } },
      );
      expect(desativacao1.status).toBe(200);
      const desativada1 = await desativacao1.json();
      expect(desativada1.ativo).toBe(false);
      expect(desativada1.desativado_em).toBeTruthy();

      // Confirma no banco, direto (não só na resposta da API): a linha
      // continua existindo — RN-11 (nunca DELETE).
      const { data: linhaNoBanco } = await service
        .from("restricao_obrigatoria")
        .select("id, ativo, desativado_em")
        .eq("id", criada.id)
        .single();
      expect(linhaNoBanco).toBeTruthy();
      expect(linhaNoBanco!.ativo).toBe(false);

      // Chamar de novo (idempotência) — mesmo desativado_em, não é
      // sobrescrito.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const desativacao2 = await postDesativar(
        buildRequest("POST", `/api/restricoes/${criada.id}/desativar`),
        { params: { id: criada.id } },
      );
      expect(desativacao2.status).toBe(200);
      const desativada2 = await desativacao2.json();
      expect(desativada2.desativado_em).toBe(desativada1.desativado_em);

      // Continua na listagem (histórico visível, T10 do UX-SPEC.md).
      const listaComDesativada = await listRestricoes();
      const listaBody = await listaComDesativada.json();
      expect(listaBody.some((r: any) => r.id === criada.id)).toBe(true);

      const reativacao = await postReativar(
        buildRequest("POST", `/api/restricoes/${criada.id}/reativar`),
        { params: { id: criada.id } },
      );
      expect(reativacao.status).toBe(200);
      const reativada = await reativacao.json();
      expect(reativada.ativo).toBe(true);
      expect(reativada.desativado_em).toBeNull();
    },
  );

  it("POST .../desativar e POST .../reativar retornam 404 para id inexistente", async () => {
    const desativacao = await postDesativar(
      buildRequest("POST", `/api/restricoes/${ID_INEXISTENTE}/desativar`),
      { params: { id: ID_INEXISTENTE } },
    );
    expect(desativacao.status).toBe(404);

    const reativacao = await postReativar(
      buildRequest("POST", `/api/restricoes/${ID_INEXISTENTE}/reativar`),
      { params: { id: ID_INEXISTENTE } },
    );
    expect(reativacao.status).toBe(404);
  });

  it("GET /api/restricoes lista restrições com atleta_a_nome/atleta_b_nome resolvidos", async () => {
    const response = await listRestricoes();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    const doTeste = body.filter(
      (r: any) =>
        r.atleta_a_nome?.startsWith(runId) || r.atleta_b_nome?.startsWith(runId),
    );
    expect(doTeste.length).toBeGreaterThan(0);
    for (const restricao of doTeste) {
      expect(typeof restricao.atleta_a_nome).toBe("string");
      expect(typeof restricao.atleta_b_nome).toBe("string");
    }
  });

  it(
    "app.restricao_obrigatoria nunca é excluída fisicamente — DELETE direto no banco " +
      "(inclusive via service_role) é bloqueado por trigger (RN-11, defesa em profundidade)",
    async () => {
      const criacao = await postRestricao(
        buildRequest("POST", "/api/restricoes", {
          atleta_a_id: atletaAId,
          atleta_b_id: atletaCId,
        }),
      );
      const criada = await criacao.json();

      const { error } = await service
        .from("restricao_obrigatoria")
        .delete()
        .eq("id", criada.id);
      expect(error).toBeTruthy();
      expect(error!.message).toContain("nunca e excluida fisicamente");

      const { data: aindaExiste } = await service
        .from("restricao_obrigatoria")
        .select("id")
        .eq("id", criada.id)
        .maybeSingle();
      expect(aindaExiste).toBeTruthy();
    },
  );
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-12 — /api/restricoes (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
