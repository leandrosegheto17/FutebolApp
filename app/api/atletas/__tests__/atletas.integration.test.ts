/**
 * Teste de integração de BE-06 (TASK.md Secao 3.1) — critério de aceite
 * literal: "cadastro com idade <18 anos bloqueia salvar sem checkbox de
 * consentimento marcado; nome duplicado dispara alerta antes de confirmar;
 * nível técnico calculado corretamente com fallback de pontuação inicial
 * para atleta sem presença".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02/03/04:
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * `app.atleta` é append-only para exclusão física (GUARDRAILS.md regra 9) —
 * mesmo padrão de BE-03/04: cada atleta criado por este teste recebe um
 * `nome_completo`/`apelido_exibicao` prefixado com um `runId` único por
 * execução, nunca limpo no `afterAll` (não pode ser), e toda asserção
 * filtra por id/prefixo conhecido, nunca por "a tabela está vazia".
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as getAtletaById, PUT as putAtleta } from "../[id]/route";
import { GET as listAtletas, POST as postAtleta } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost:3000/api/atletas", {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe.skipIf(!podeRodar)("BE-06 — /api/atletas", () => {
  let service: SupabaseClient<any, any, any>;
  // Prefixo único por execução — nunca colide com dado de execuções
  // anteriores do mesmo banco local (atleta não pode ser fisicamente
  // apagado, ver comentário do topo do arquivo).
  const runId = `be06-${Date.now()}`;
  const idsCriados: string[] = [];

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  // Nenhum `afterAll` de limpeza aqui: `atleta` nunca pode ser fisicamente
  // apagado (GUARDRAILS.md regra 9) — cada asserção já filtra por id/nome
  // prefixado conhecido (mesmo padrão de BE-03/04). O único cenário que cria
  // dado fisicamente removível (`evento_jogo`/`participacao_rodada`/
  // `rodada`/`configuracao_pontuacao`, teste de nível técnico abaixo) já
  // limpa tudo no próprio bloco `finally`.

  it(
    "POST cria atleta adulto sem exigir consentimento (RF-01.1); GET devolve nível " +
      "técnico = pontuação inicial (fallback, RN-03 — atleta sem presença)",
    async () => {
      const response = await postAtleta(
        buildRequest("POST", {
          nome_completo: `${runId} Adulto Sem Presenca`,
          apelido_exibicao: `${runId}-adulto`,
          contato: "11999990000",
          data_nascimento: "1990-05-20",
          pontuacao_inicial: 8,
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeTruthy();
      expect(body.pontuacao_inicial).toBe(8);
      expect(body.nivel_tecnico).toBe(8); // fallback RN-03: sem presença = pontuação inicial
      expect(body.rodadas_presentes).toBe(0);
      expect(body.consentimento_responsavel_obtido).toBe(false);
      idsCriados.push(body.id);
    },
  );

  it("POST deriva apelido_exibicao do primeiro nome quando em branco (RF-01.2/RN-06)", async () => {
    const response = await postAtleta(
      buildRequest("POST", {
        nome_completo: `${runId} Carlos Roberto Souza`,
        data_nascimento: "1985-03-10",
        pontuacao_inicial: 0,
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.apelido_exibicao).toBe(runId); // primeiro "token" do nome prefixado
    idsCriados.push(body.id);
  });

  it("POST bloqueia cadastro de menor de 18 anos sem checkbox de consentimento marcado (RF-01.3)", async () => {
    const response = await postAtleta(
      buildRequest("POST", {
        nome_completo: `${runId} Menor Sem Consentimento`,
        data_nascimento: "2015-01-01",
        pontuacao_inicial: 0,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(
      body.detalhes.some((d: any) => d.path.includes("consentimento_responsavel_obtido")),
    ).toBe(true);

    // Confirma que nada foi persistido — não deve existir atleta com esse nome.
    const { data } = await service
      .from("atleta")
      .select("id")
      .eq("nome_completo", `${runId} Menor Sem Consentimento`);
    expect(data).toHaveLength(0);
  });

  it("POST permite cadastro de menor de 18 anos quando o consentimento vem marcado (RF-01.3)", async () => {
    const response = await postAtleta(
      buildRequest("POST", {
        nome_completo: `${runId} Menor Com Consentimento`,
        data_nascimento: "2015-01-01",
        consentimento_responsavel_obtido: true,
        pontuacao_inicial: 0,
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.consentimento_responsavel_obtido).toBe(true);
    idsCriados.push(body.id);
  });

  it(
    "POST com nome_completo duplicado retorna 409 (alerta) e NÃO cria o registro; " +
      "reenvio com confirmar_duplicidade=true cria normalmente (RF-01.5)",
    async () => {
      const nomeDuplicado = `${runId} Duplicado Teste`;
      const primeira = await postAtleta(
        buildRequest("POST", {
          nome_completo: nomeDuplicado,
          data_nascimento: "1992-02-02",
          pontuacao_inicial: 1,
        }),
      );
      expect(primeira.status).toBe(201);
      const primeiroBody = await primeira.json();
      idsCriados.push(primeiroBody.id);

      // Mesmo nome, com variação de caixa/espaçamento — ainda deve ser
      // detectado como duplicata (normalização, RF-01.5).
      const segunda = await postAtleta(
        buildRequest("POST", {
          nome_completo: `  ${nomeDuplicado.toUpperCase()}  `,
          data_nascimento: "1993-03-03",
          pontuacao_inicial: 2,
        }),
      );
      expect(segunda.status).toBe(409);
      const segundoBody = await segunda.json();
      expect(segundoBody.error).toBe("duplicidade");
      expect(segundoBody.atletas_duplicados).toHaveLength(1);
      expect(segundoBody.atletas_duplicados[0].id).toBe(primeiroBody.id);

      const { data: apenasUmRegistro } = await service
        .from("atleta")
        .select("id")
        .ilike("nome_completo", nomeDuplicado);
      expect(apenasUmRegistro).toHaveLength(1);

      const terceira = await postAtleta(
        buildRequest("POST", {
          nome_completo: `${nomeDuplicado.toUpperCase()} `,
          data_nascimento: "1993-03-03",
          pontuacao_inicial: 2,
          confirmar_duplicidade: true,
        }),
      );
      expect(terceira.status).toBe(201);
      const terceiroBody = await terceira.json();
      idsCriados.push(terceiroBody.id);
      expect(terceiroBody.id).not.toBe(primeiroBody.id);
    },
  );

  it("POST com corpo malformado retorna 400", async () => {
    const response = await postAtleta(
      new Request("http://localhost:3000/api/atletas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ nao-e-json-valido",
      }),
    );
    expect(response.status).toBe(400);
  });

  it(
    "nível técnico (RN-03) = média de pontos de eventos de jogo (gol/cartão, valor " +
      "vigente em configuracao_pontuacao) por rodada com presença; ignora rodada excluída",
    async () => {
      // Atleta dedicado a este cenário, criado direto via service_role
      // (não via POST) para não depender de outro teste.
      const { data: atletaData, error: atletaError } = await service
        .from("atleta")
        .insert({
          nome_completo: `${runId} Nivel Tecnico`,
          apelido_exibicao: `${runId}-nivel`,
          data_nascimento: "1995-01-01",
          pontuacao_inicial: 3,
        })
        .select("id")
        .single();
      if (atletaError) throw atletaError;
      const atletaId = atletaData!.id as string;
      idsCriados.push(atletaId);

      // `configuracao_pontuacao.evento` precisa casar por igualdade de texto
      // com `evento_jogo.tipo` (`gol`/`cartao_amarelo`, CHECK fechado de
      // BE-02) para a view `atleta_nivel_tecnico` resolver o valor vigente —
      // por isso os dois nomes de evento aqui são os valores reais do CHECK,
      // não prefixados por `runId`. Datado bem antes de qualquer rodada do
      // cenário para garantir que seja a configuração vigente.
      const rodadasCriadas: string[] = [];
      const participacoesCriadas: string[] = [];
      try {
        // Vigência propositalmente mais recente que o seed permanente de
        // RN-05 (BE-08, `20260903120000_seed_configuracao_pontuacao.sql`,
        // `vigente_desde = '2000-01-01'`) — "order by vigente_desde desc
        // limit 1" sempre resolve para ESTA linha (2020-01-01 > 2000-01-01),
        // então este teste continua determinístico independente do seed
        // permanente existir ou não.
        const { error: configError } = await service
          .from("configuracao_pontuacao")
          .insert([
            { evento: "gol", pontos: 3, vigente_desde: "2020-01-01" },
            { evento: "cartao_amarelo", pontos: -1, vigente_desde: "2020-01-01" },
          ]);
        if (configError) throw configError;

        // Duas rodadas lançadas com presença (1 gol na primeira, 1 cartão
        // amarelo na segunda, atleta lesionado — conta igual a presente,
        // RF-02.3) e uma rodada excluída com um gol que NUNCA deve contar —
        // nível técnico esperado = (3 + (-1)) / 2 = 1.
        const { data: rodadas, error: rodadasError } = await service
          .from("rodada")
          .insert([
            { data: "2026-08-01", status: "lancada" },
            { data: "2026-08-08", status: "lancada" },
            { data: "2026-08-15", status: "excluida" },
          ])
          .select("id, data, status");
        if (rodadasError) throw rodadasError;
        const rodadaGol = rodadas!.find((r: any) => r.data === "2026-08-01")!.id;
        const rodadaCartao = rodadas!.find((r: any) => r.data === "2026-08-08")!.id;
        const rodadaExcluida = rodadas!.find((r: any) => r.data === "2026-08-15")!.id;
        rodadasCriadas.push(rodadaGol, rodadaCartao, rodadaExcluida);

        const { data: participacoes, error: participacoesError } = await service
          .from("participacao_rodada")
          .insert([
            { rodada_id: rodadaGol, atleta_id: atletaId, status: "presente" },
            { rodada_id: rodadaCartao, atleta_id: atletaId, status: "lesionado" },
            { rodada_id: rodadaExcluida, atleta_id: atletaId, status: "presente" },
          ])
          .select("id, rodada_id");
        if (participacoesError) throw participacoesError;
        participacoesCriadas.push(...participacoes!.map((p: any) => p.id));
        const participacaoGol = participacoes!.find(
          (p: any) => p.rodada_id === rodadaGol,
        )!.id;
        const participacaoCartao = participacoes!.find(
          (p: any) => p.rodada_id === rodadaCartao,
        )!.id;
        const participacaoExcluida = participacoes!.find(
          (p: any) => p.rodada_id === rodadaExcluida,
        )!.id;

        const { error: eventosError } = await service.from("evento_jogo").insert([
          { participacao_id: participacaoGol, tipo: "gol", quantidade: 1 },
          { participacao_id: participacaoCartao, tipo: "cartao_amarelo", quantidade: 1 },
          // Gol na rodada excluída — nunca deve contar.
          { participacao_id: participacaoExcluida, tipo: "gol", quantidade: 5 },
        ]);
        if (eventosError) throw eventosError;

        const response = await getAtletaById(
          new Request(`http://localhost:3000/api/atletas/${atletaId}`),
          { params: { id: atletaId } },
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.rodadas_presentes).toBe(2); // presente + lesionado (rodada excluída não conta)
        expect(body.nivel_tecnico).toBe(1); // (3 + (-1)) / 2
      } finally {
        // Limpeza garantida (try/finally) — `configuracao_pontuacao.evento`
        // usado aqui NÃO é prefixado por `runId` (precisa casar com o CHECK
        // de `evento_jogo.tipo`), então uma execução que falhasse sem
        // limpar quebraria a constraint `UNIQUE(evento, vigente_desde)` da
        // próxima execução — risco maior que o padrão de limpeza
        // best-effort já aceito em BE-03/04 para dado sempre prefixado.
        if (participacoesCriadas.length > 0) {
          await service
            .from("evento_jogo")
            .delete()
            .in("participacao_id", participacoesCriadas);
        }
        if (rodadasCriadas.length > 0) {
          await service
            .from("participacao_rodada")
            .delete()
            .in("rodada_id", rodadasCriadas);
          await service.from("rodada").delete().in("id", rodadasCriadas);
        }
        // Escopado também por `vigente_desde` (achado incidental corrigido
        // em BE-08, TASK.md Secao 1.0 — "nunca lacuna silenciosa"): a partir
        // de BE-08, `app.configuracao_pontuacao` passou a ter uma semeadura
        // PERMANENTE de RN-05 para os mesmos `evento` ("gol"/"cartao_amarelo",
        // `vigente_desde = '2000-01-01'`, ver migration citada acima) — um
        // `.delete().in("evento", [...])` sem filtrar por `vigente_desde`
        // apagaria também essas linhas permanentes a cada execução deste
        // teste, quebrando o cálculo de pontos de qualquer rodada real
        // lançada depois. Escopar a limpeza à vigência específica que este
        // bloco insere evita esse efeito colateral, sem mudar o
        // comportamento deste teste.
        await service
          .from("configuracao_pontuacao")
          .delete()
          .eq("vigente_desde", "2020-01-01")
          .in("evento", ["gol", "cartao_amarelo"]);
      }
    },
  );

  it("GET /api/atletas lista atletas criados, cada um com nivel_tecnico presente", async () => {
    const response = await listAtletas();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    const criados = body.filter((a: any) => idsCriados.includes(a.id));
    expect(criados.length).toBe(idsCriados.length);
    for (const atleta of criados) {
      expect(typeof atleta.nivel_tecnico).toBe("number");
    }
  });

  it("GET /api/atletas/:id retorna 404 para id inexistente", async () => {
    const idInexistente = "00000000-0000-0000-0000-000000000000";
    const response = await getAtletaById(
      new Request(`http://localhost:3000/api/atletas/${idInexistente}`),
      { params: { id: idInexistente } },
    );
    expect(response.status).toBe(404);
  });

  it("PUT /api/atletas/:id atualiza campos e reaplica a checagem de consentimento (RF-01.6)", async () => {
    const criacao = await postAtleta(
      buildRequest("POST", {
        nome_completo: `${runId} Editar Depois`,
        data_nascimento: "1988-04-04",
        pontuacao_inicial: 4,
      }),
    );
    const criado = await criacao.json();
    idsCriados.push(criado.id);

    // Edição muda a data de nascimento para tornar o atleta menor de 18 —
    // sem marcar consentimento, deve bloquear (mesma regra de RF-01.3).
    const putSemConsentimento = await putAtleta(
      new Request(`http://localhost:3000/api/atletas/${criado.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome_completo: `${runId} Editar Depois`,
          data_nascimento: "2015-01-01",
          pontuacao_inicial: 4,
        }),
      }),
      { params: { id: criado.id } },
    );
    expect(putSemConsentimento.status).toBe(400);

    const putComConsentimento = await putAtleta(
      new Request(`http://localhost:3000/api/atletas/${criado.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome_completo: `${runId} Editar Depois`,
          apelido_exibicao: `${runId}-editado`,
          data_nascimento: "2015-01-01",
          consentimento_responsavel_obtido: true,
          pontuacao_inicial: 4,
        }),
      }),
      { params: { id: criado.id } },
    );
    expect(putComConsentimento.status).toBe(200);
    const editado = await putComConsentimento.json();
    expect(editado.apelido_exibicao).toBe(`${runId}-editado`);
    expect(editado.consentimento_responsavel_obtido).toBe(true);
  });

  it("PUT /api/atletas/:id retorna 404 para id inexistente", async () => {
    const idInexistente = "00000000-0000-0000-0000-000000000000";
    const response = await putAtleta(
      new Request(`http://localhost:3000/api/atletas/${idInexistente}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome_completo: "Não existe",
          data_nascimento: "1990-01-01",
          pontuacao_inicial: 0,
        }),
      }),
      { params: { id: idInexistente } },
    );
    expect(response.status).toBe(404);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-06 — /api/atletas (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
