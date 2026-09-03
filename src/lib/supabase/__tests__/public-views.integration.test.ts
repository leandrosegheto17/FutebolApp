/**
 * Teste de integração de BE-03 (TASK.md Secao 3.1) — critério de aceite
 * literal: "view `ranking_publico` nunca retorna `contato`/`data_nascimento`
 * mesmo com `SELECT *`; view `presenca_mensal_publica` agrupa por mês civil
 * (RN-09); teste automatizado consulta ambas as views com a chave `anon` e
 * falha se qualquer coluna sensível aparecer".
 *
 * Incremento (resolução de `BLOCKER-005`, SDD.md Seção 5.1, migration
 * `20260903091500_add_ausencias_to_ranking_publico.sql`): cobre também o
 * campo `ausencias` de `ranking_publico` — contagem direta e simétrica de
 * `participacao_rodada.status = 'ausente'` (sem subtração), com `lesionado`
 * tratado como terceira categoria que não conta em `presencas` nem em
 * `ausencias`.
 *
 * Exige um Supabase local rodando (`supabase start`, ver
 * `supabase/config.toml`) — mesmo procedimento de BE-02
 * (`app-schema-rls.integration.test.ts`):
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * Este teste NUNCA assume que as tabelas base estão vazias: `app.atleta` e
 * `app.lancamento_pontos` são append-only (nenhuma linha criada aqui pode
 * ser fisicamente removida no `afterAll` — GUARDRAILS.md regras 8/9), então
 * cada asserção filtra explicitamente pelos IDs que o próprio teste criou
 * (prefixo único por execução), nunca por "a view tem N linhas no total".
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

/** Colunas sensíveis que NUNCA podem aparecer em nenhuma view pública
 * (RN-01/ADR-005, TASK.md Secao 1.5). */
const COLUNAS_SENSIVEIS = ["contato", "data_nascimento"] as const;

function assertSemColunaSensivel(linhas: readonly Record<string, unknown>[]) {
  for (const linha of linhas) {
    const chaves = Object.keys(linha);
    for (const coluna of COLUNAS_SENSIVEIS) {
      expect(chaves).not.toContain(coluna);
    }
  }
}

describe.skipIf(!podeRodar)(
  "BE-03 — views públicas curadas (ranking_publico, presenca_mensal_publica)",
  () => {
    let anon: SupabaseClient<any, any, any>;
    let service: SupabaseClient<any, any, any>;

    // Prefixo único por execução — nunca colide com dado de execuções
    // anteriores do mesmo banco local (atleta/lancamento_pontos não podem
    // ser fisicamente apagados, ver comentário do topo do arquivo).
    const runId = `be03-${Date.now()}`;

    let atletaAtivoId: string;
    let atletaAnonimizadoId: string;
    let rodadaLancadaId: string;
    let rodadaExcluidaId: string;
    // Incremento BLOCKER-005 (`ausencias`): duas rodadas extras, ambas
    // `lancada`, para provar que `status='ausente'` conta em `ausencias` e
    // que `status='lesionado'` não conta nem em `presencas` nem em
    // `ausencias` (SDD.md Seção 5.1 — lesão só é equiparada à presença
    // para efeito de PONTOS, não desta métrica de exibição).
    let rodadaAusenteId: string;
    let rodadaLesionadoId: string;
    let participacaoIdsCriadas: string[] = [];
    const rodadaLancadaData = "2026-09-05";
    const rodadaExcluidaData = "2026-09-12";
    const rodadaAusenteData = "2026-09-19";
    const rodadaLesionadoData = "2026-09-26";

    beforeAll(async () => {
      anon = createClient(SUPABASE_URL!, ANON_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Dois atletas: um ativo (deve aparecer nas duas views públicas) e um
      // anonimizado/inativo (nunca deve aparecer — ADR-011, UX-SPEC.md T04:
      // "desaparece do ranking público e da presença mensal como identidade").
      // Nota: os dois objetos precisam declarar exatamente as mesmas chaves
      // — o PostgREST resolve o conjunto de colunas de um INSERT em lote a
      // partir da união das chaves do corpo da requisição; uma linha que
      // omitisse `ativo`/`anonimizado_em` receberia `NULL` explícito em vez
      // do `DEFAULT` da coluna, violando o `NOT NULL` de `ativo` (comportamento
      // verificado empiricamente contra o Supabase local, não apenas lido).
      const { data: atletas, error: atletasError } = await service
        .from("atleta")
        .insert([
          {
            nome_completo: `${runId} Zeta Ativo`,
            apelido_exibicao: `${runId}-zeta`,
            contato: "11999999999",
            data_nascimento: "1990-01-01",
            pontuacao_inicial: 10,
            ativo: true,
            anonimizado_em: null,
          },
          {
            nome_completo: `${runId} Alfa Anonimizado`,
            apelido_exibicao: `${runId}-alfa`,
            contato: "11988888888",
            data_nascimento: "1991-02-02",
            pontuacao_inicial: 100,
            ativo: false,
            anonimizado_em: new Date().toISOString(),
          },
        ])
        .select("id, apelido_exibicao");
      if (atletasError) throw atletasError;
      atletaAtivoId = atletas!.find(
        (a: any) => a.apelido_exibicao === `${runId}-zeta`,
      )!.id;
      atletaAnonimizadoId = atletas!.find(
        (a: any) => a.apelido_exibicao === `${runId}-alfa`,
      )!.id;

      // Uma rodada lançada (conta nas views), uma excluída/soft-deleted
      // (não deve contar em nenhuma das duas views — decisão de detalhe
      // documentada na migration de BE-03) e mais duas lançadas dedicadas
      // ao incremento BLOCKER-005 (`ausencias`): uma onde o atleta ativo
      // está `ausente`, outra onde está `lesionado`.
      const { data: rodadas, error: rodadasError } = await service
        .from("rodada")
        .insert([
          { data: rodadaLancadaData, status: "lancada" },
          { data: rodadaExcluidaData, status: "excluida" },
          { data: rodadaAusenteData, status: "lancada" },
          { data: rodadaLesionadoData, status: "lancada" },
        ])
        .select("id, data, status");
      if (rodadasError) throw rodadasError;
      rodadaLancadaId = rodadas!.find((r: any) => r.data === rodadaLancadaData)!.id;
      rodadaExcluidaId = rodadas!.find((r: any) => r.data === rodadaExcluidaData)!.id;
      rodadaAusenteId = rodadas!.find((r: any) => r.data === rodadaAusenteData)!.id;
      rodadaLesionadoId = rodadas!.find((r: any) => r.data === rodadaLesionadoData)!.id;

      // Atleta ativo presente nas duas rodadas originais (prova que só a
      // lançada conta), ausente na rodada dedicada de `ausencias` e
      // lesionado na rodada dedicada de `lesionado`; atleta anonimizado
      // presente na lançada (prova que mesmo presente ele nunca aparece
      // nas views públicas).
      const { data: participacoes, error: participacoesError } = await service
        .from("participacao_rodada")
        .insert([
          { rodada_id: rodadaLancadaId, atleta_id: atletaAtivoId, status: "presente" },
          { rodada_id: rodadaExcluidaId, atleta_id: atletaAtivoId, status: "presente" },
          { rodada_id: rodadaAusenteId, atleta_id: atletaAtivoId, status: "ausente" },
          { rodada_id: rodadaLesionadoId, atleta_id: atletaAtivoId, status: "lesionado" },
          {
            rodada_id: rodadaLancadaId,
            atleta_id: atletaAnonimizadoId,
            status: "presente",
          },
        ])
        .select("id, rodada_id, atleta_id");
      if (participacoesError) throw participacoesError;
      participacaoIdsCriadas = participacoes!.map((p: any) => p.id);

      const participacaoAtivoLancada = participacoes!.find(
        (p: any) => p.rodada_id === rodadaLancadaId && p.atleta_id === atletaAtivoId,
      )!.id;
      const participacaoAtivoExcluida = participacoes!.find(
        (p: any) => p.rodada_id === rodadaExcluidaId && p.atleta_id === atletaAtivoId,
      )!.id;

      // Cartão na rodada excluída não deve contar (mesma lógica de pontos
      // já revertidos via ledger append-only, ADR-006).
      const { error: eventosError } = await service.from("evento_jogo").insert([
        {
          participacao_id: participacaoAtivoLancada,
          tipo: "cartao_amarelo",
          quantidade: 1,
        },
        {
          participacao_id: participacaoAtivoExcluida,
          tipo: "cartao_vermelho",
          quantidade: 1,
        },
      ]);
      if (eventosError) throw eventosError;

      const { error: lancamentosError } = await service.from("lancamento_pontos").insert([
        {
          atleta_id: atletaAtivoId,
          rodada_id: rodadaLancadaId,
          origem: "lancamento",
          pontos_delta: 5,
        },
      ]);
      if (lancamentosError) throw lancamentosError;
    });

    afterAll(async () => {
      // `rodada`/`participacao_rodada`/`evento_jogo` não têm trigger de
      // bloqueio de DELETE (só `atleta`/`lancamento_pontos` têm, BE-02) —
      // limpeza best-effort do que é fisicamente removível, respeitando a
      // ordem de FK (`on delete restrict` em todas as três), para não
      // acumular lixo de execução em execução. `lancamento_pontos` e
      // `atleta` nunca são limpos aqui — não podem ser (ledger append-only /
      // proibição de exclusão física, GUARDRAILS.md regras 8/9), esperado e
      // aceitável para um teste que já filtra tudo por ID conhecido, nunca
      // por "a tabela está vazia".
      if (participacaoIdsCriadas.length > 0) {
        await service
          .from("evento_jogo")
          .delete()
          .in("participacao_id", participacaoIdsCriadas);
      }
      const rodadaIds = [
        rodadaLancadaId,
        rodadaExcluidaId,
        rodadaAusenteId,
        rodadaLesionadoId,
      ].filter(Boolean);
      if (rodadaIds.length > 0) {
        await service.from("participacao_rodada").delete().in("rodada_id", rodadaIds);
        await service.from("rodada").delete().in("id", rodadaIds);
      }
    });

    describe("ranking_publico", () => {
      it("nunca retorna contato/data_nascimento, mesmo com select *", async () => {
        const { data, error } = await anon.from("ranking_publico").select("*");
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.length).toBeGreaterThan(0);
        assertSemColunaSensivel(data!);
      });

      it("não inclui atleta anonimizado/inativo (ADR-011)", async () => {
        const { data, error } = await anon
          .from("ranking_publico")
          .select("*")
          .eq("atleta_id", atletaAnonimizadoId);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });

      it(
        "pontuacao_acumulada = pontuacao_inicial + soma de pontos_delta; " +
          "presencas/cartoes/ausencias ignoram rodada com status=excluida",
        async () => {
          const { data, error } = await anon
            .from("ranking_publico")
            .select("*")
            .eq("atleta_id", atletaAtivoId)
            .single();
          expect(error).toBeNull();
          expect(data!.pontuacao_acumulada).toBe(15); // 10 (inicial) + 5 (lancamento)
          expect(data!.presencas).toBe(1); // só a rodada lançada com status=presente conta
          expect(data!.cartoes).toBe(1); // só o cartão da rodada lançada conta
          expect(data!.ausencias).toBe(1); // só a rodada dedicada com status=ausente conta
          expect(data!.nome_exibicao).toBe(`${runId}-zeta`);
        },
      );

      it(
        "ausencias (BLOCKER-005, SDD.md Seção 5.1): contagem direta e simétrica de " +
          "status=ausente; status=lesionado não conta nem em presencas nem em ausencias",
        async () => {
          const { data, error } = await anon
            .from("ranking_publico")
            .select("presencas, ausencias")
            .eq("atleta_id", atletaAtivoId)
            .single();
          expect(error).toBeNull();
          // presencas (1) + ausencias (1) != total de participações do atleta (4:
          // presente/excluida não conta, presente/lancada, ausente/lancada,
          // lesionado/lancada) — a rodada lesionado fica de fora de ambas as
          // contagens, por desenho (RF-02.3/RN-05: lesão só equivale a presença
          // para efeito de PONTOS, nunca para esta métrica de exibição).
          expect(data!.presencas).toBe(1);
          expect(data!.ausencias).toBe(1);
        },
      );
    });

    describe("presenca_mensal_publica", () => {
      it("nunca retorna contato/data_nascimento, mesmo com select *", async () => {
        const { data, error } = await anon.from("presenca_mensal_publica").select("*");
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        assertSemColunaSensivel(data!);
      });

      it("agrupa por mês civil (RN-09): rodada de 2026-09-05 tem ano=2026/mes=9", async () => {
        const { data, error } = await anon
          .from("presenca_mensal_publica")
          .select("*")
          .eq("rodada_id", rodadaLancadaId)
          .single();
        expect(error).toBeNull();
        expect(data!.ano).toBe(2026);
        expect(data!.mes).toBe(9);
        expect(data!.total_presentes).toBe(1); // só o atleta ativo — anonimizado não conta
        expect(data!.nomes_presentes).toEqual([`${runId}-zeta`]);
      });

      it("não inclui rodada com status=excluida", async () => {
        const { data, error } = await anon
          .from("presenca_mensal_publica")
          .select("*")
          .eq("rodada_id", rodadaExcluidaId);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });
    });
  },
);

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada, em vez de uma lacuna
  // silenciosa (TASK.md Secao 1.0: "nunca esconder incerteza").
  describe("BE-03 — views públicas (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY/" +
        "TEST_SUPABASE_SERVICE_ROLE_KEY (ver `supabase status` após " +
        "`supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
