/**
 * Teste de integração de BE-R01 (TASK.md Parte II, Secao 3.1) — critério de
 * aceite literal: "view retorna, por atleta, os status
 * (presente/ausente/lesionado) das últimas N=7 rodadas lançadas +
 * rodadas_jogadas (contagem total do grupo) + media_presenca (%); nunca
 * expõe contato/data_nascimento; RLS herdada da política já aprovada da
 * schema app; não inclui 'próxima rodada'".
 *
 * `rodadas_jogadas`/`media_presenca` são estatísticas de GRUPO (UX-SPEC.md
 * Seção 2.2: "3 estatísticas agregadas do grupo, não do atleta individual"),
 * não uma razão por atleta — por isso repetem o MESMO valor em toda linha
 * da view. Isso tem uma consequência direta para este teste: como o
 * Supabase local deste harness é COMPARTILHADO entre todos os arquivos
 * `*.integration.test.ts` (`vitest.integration.config.ts`,
 * `fileParallelism: false` — mesmo Postgres, nunca resetado entre arquivos)
 * e `app.atleta` nunca é fisicamente excluído (GUARDRAILS.md regra 9), o
 * valor absoluto de `rodadas_jogadas`/`media_presenca` no momento em que
 * este arquivo roda depende de quanto dado outros arquivos já inseriram
 * (e não limparam) antes dele — não pode ser tratado como uma constante
 * conhecida. A técnica usada aqui é a mesma recomendada para testar
 * agregados sobre estado compartilhado mutável: capturar um snapshot
 * "antes" (via `service` role, direto nas tabelas base) logo no início do
 * `beforeAll`, e comparar contra o "depois" usando a fórmula exata da view
 * aplicada ao delta introduzido por este próprio teste — em vez de
 * hardcodar um valor absoluto esperado. `rodadas_recentes` (a única coluna
 * genuinamente por atleta) continua testada com valores absolutos, como em
 * BE-03, porque é isolada por `atleta_id` e não sofre esse problema.
 *
 * Mesmo procedimento de setup de `src/lib/supabase/__tests__/
 * public-views.integration.test.ts` (BE-03) — exige um Supabase local
 * rodando (`supabase start`):
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
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
  "BE-R01 — view pública curada ranking_publico_recentes",
  () => {
    let anon: SupabaseClient<any, any, any>;
    let service: SupabaseClient<any, any, any>;

    // Prefixo único por execução — nunca colide com dado de execuções
    // anteriores do mesmo banco local (atleta/lancamento_pontos não podem
    // ser fisicamente apagados, ver comentário do topo do arquivo).
    const runId = `ber01-${Date.now()}`;

    let atletaComOitoRodadasId: string;
    let atletaAnonimizadoId: string;
    let atletaSemRodadaId: string;
    let rodadaExcluidaId: string;
    // 8 rodadas lançadas para o atleta principal — prova que só as 7 mais
    // recentes aparecem em `rodadas_recentes` (N=7, TASK.md Secao 6.2-R
    // item 2), na ordem mais-recente-primeiro.
    const datasRodadasLancadas = [
      "2026-01-03",
      "2026-01-10",
      "2026-01-17",
      "2026-01-24",
      "2026-01-31",
      "2026-02-07",
      "2026-02-14",
      "2026-02-21", // a mais recente das 8 — deve aparecer; 2026-01-03 deve ficar de fora
    ];
    const rodadaExcluidaData = "2026-02-28";
    let rodadaIdsLancadas: string[] = [];

    // Snapshot "antes" dos ingredientes brutos do agregado de grupo,
    // capturado ANTES de qualquer inserção deste teste (ver nota no topo
    // do arquivo sobre por que valores absolutos não são confiáveis aqui).
    let rodadasLancadasAntes = 0;
    let atletasAtivosAntes = 0;
    let presencasGrupoAntes = 0;

    beforeAll(async () => {
      anon = createClient(SUPABASE_URL!, ANON_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Snapshot "antes" — mesma definição exata usada pela view (migration
      // `20260904090000_create_ranking_publico_recentes_view.sql`, CTE
      // `grupo_stats`), replicada aqui via consultas diretas às tabelas
      // base com a chave de serviço (contagem exata via JOIN embutido do
      // PostgREST, sem depender de arredondamento de `media_presenca`).
      const [{ count: rodadasCount }, { count: atletasCount }, { count: presencasCount }] =
        await Promise.all([
          service
            .from("rodada")
            .select("id", { count: "exact", head: true })
            .eq("status", "lancada"),
          service
            .from("atleta")
            .select("id", { count: "exact", head: true })
            .eq("ativo", true),
          service
            .from("participacao_rodada")
            .select(
              "id, rodada:rodada_id!inner(status), atleta:atleta_id!inner(ativo)",
              { count: "exact", head: true },
            )
            .eq("status", "presente")
            .eq("rodada.status", "lancada")
            .eq("atleta.ativo", true),
        ]);
      rodadasLancadasAntes = rodadasCount ?? 0;
      atletasAtivosAntes = atletasCount ?? 0;
      presencasGrupoAntes = presencasCount ?? 0;

      // Três atletas: um ativo com 8 participações lançadas (prova o corte
      // em N=7 e participa do agregado de grupo), um ativo sem nenhuma
      // participação (prova que ainda aparece na view com array vazio, mas
      // ainda soma ao denominador `atletas ativos` do agregado de grupo) e
      // um anonimizado/inativo (nunca deve aparecer nem contar em nada).
      const { data: atletas, error: atletasError } = await service
        .from("atleta")
        .insert([
          {
            nome_completo: `${runId} Zeta Ativo`,
            apelido_exibicao: `${runId}-zeta`,
            contato: "11999999999",
            data_nascimento: "1990-01-01",
            pontuacao_inicial: 0,
            ativo: true,
            anonimizado_em: null,
          },
          {
            nome_completo: `${runId} Alfa Anonimizado`,
            apelido_exibicao: `${runId}-alfa`,
            contato: "11988888888",
            data_nascimento: "1991-02-02",
            pontuacao_inicial: 0,
            ativo: false,
            anonimizado_em: new Date().toISOString(),
          },
          {
            nome_completo: `${runId} Beta SemRodada`,
            apelido_exibicao: `${runId}-beta`,
            contato: "11977777777",
            data_nascimento: "1992-03-03",
            pontuacao_inicial: 0,
            ativo: true,
            anonimizado_em: null,
          },
        ])
        .select("id, apelido_exibicao");
      if (atletasError) throw atletasError;
      atletaComOitoRodadasId = atletas!.find(
        (a: any) => a.apelido_exibicao === `${runId}-zeta`,
      )!.id;
      atletaAnonimizadoId = atletas!.find(
        (a: any) => a.apelido_exibicao === `${runId}-alfa`,
      )!.id;
      atletaSemRodadaId = atletas!.find(
        (a: any) => a.apelido_exibicao === `${runId}-beta`,
      )!.id;

      const { data: rodadas, error: rodadasError } = await service
        .from("rodada")
        .insert([
          ...datasRodadasLancadas.map((data) => ({ data, status: "lancada" })),
          { data: rodadaExcluidaData, status: "excluida" },
        ])
        .select("id, data, status");
      if (rodadasError) throw rodadasError;
      rodadaIdsLancadas = datasRodadasLancadas.map(
        (data) => rodadas!.find((r: any) => r.data === data)!.id,
      );
      rodadaExcluidaId = rodadas!.find(
        (r: any) => r.data === rodadaExcluidaData,
      )!.id;

      // Atleta principal: presente nas 5 rodadas (índices 1,2,4,5,7),
      // ausente em 2 (índices 0 e 6) e lesionado em 1 (índice 3) — 5
      // presenças entre as 8 lançadas. Também presente na rodada excluída
      // (não deve contar em nada). Atleta anonimizado também presente na
      // mais recente (nunca deve contar, mesmo estando "presente").
      const participacoesPayload = [
        { rodada_id: rodadaIdsLancadas[0], atleta_id: atletaComOitoRodadasId, status: "ausente" },
        { rodada_id: rodadaIdsLancadas[1], atleta_id: atletaComOitoRodadasId, status: "presente" },
        { rodada_id: rodadaIdsLancadas[2], atleta_id: atletaComOitoRodadasId, status: "presente" },
        { rodada_id: rodadaIdsLancadas[3], atleta_id: atletaComOitoRodadasId, status: "lesionado" },
        { rodada_id: rodadaIdsLancadas[4], atleta_id: atletaComOitoRodadasId, status: "presente" },
        { rodada_id: rodadaIdsLancadas[5], atleta_id: atletaComOitoRodadasId, status: "presente" },
        { rodada_id: rodadaIdsLancadas[6], atleta_id: atletaComOitoRodadasId, status: "ausente" },
        { rodada_id: rodadaIdsLancadas[7], atleta_id: atletaComOitoRodadasId, status: "presente" },
        { rodada_id: rodadaExcluidaId, atleta_id: atletaComOitoRodadasId, status: "presente" },
        { rodada_id: rodadaIdsLancadas[7], atleta_id: atletaAnonimizadoId, status: "presente" },
      ];
      const { error: participacoesError } = await service
        .from("participacao_rodada")
        .insert(participacoesPayload);
      if (participacoesError) throw participacoesError;
    });

    afterAll(async () => {
      // Mesma disciplina de limpeza best-effort de BE-03 — `atleta`/
      // `lancamento_pontos` nunca são removidos fisicamente.
      const rodadaIds = [...rodadaIdsLancadas, rodadaExcluidaId].filter(Boolean);
      if (rodadaIds.length > 0) {
        await service.from("participacao_rodada").delete().in("rodada_id", rodadaIds);
        await service.from("rodada").delete().in("id", rodadaIds);
      }
    });

    it("nunca retorna contato/data_nascimento, mesmo com select *", async () => {
      const { data, error } = await anon
        .from("ranking_publico_recentes")
        .select("*");
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      assertSemColunaSensivel(data!);
    });

    it("não inclui atleta anonimizado/inativo (ADR-011)", async () => {
      const { data, error } = await anon
        .from("ranking_publico_recentes")
        .select("*")
        .eq("atleta_id", atletaAnonimizadoId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("inclui atleta ativo sem nenhuma rodada, com rodadas_recentes vazio", async () => {
      const { data, error } = await anon
        .from("ranking_publico_recentes")
        .select("*")
        .eq("atleta_id", atletaSemRodadaId)
        .single();
      expect(error).toBeNull();
      expect(data!.rodadas_recentes).toEqual([]);
    });

    it(
      "rodadas_recentes: apenas as 7 rodadas lançadas mais recentes (N=7), " +
        "ordem mais-recente-primeiro, exclui rodada com status=excluida",
      async () => {
        const { data, error } = await anon
          .from("ranking_publico_recentes")
          .select("*")
          .eq("atleta_id", atletaComOitoRodadasId)
          .single();
        expect(error).toBeNull();
        const recentes = data!.rodadas_recentes as Array<{
          rodada_id: string;
          data: string;
          status: string;
        }>;
        expect(recentes).toHaveLength(7);
        // A mais antiga das 8 (índice 0, 2026-01-03) fica de fora do corte.
        expect(recentes.some((r) => r.rodada_id === rodadaIdsLancadas[0])).toBe(false);
        // A rodada excluída nunca aparece, mesmo tendo participação do atleta.
        expect(recentes.some((r) => r.rodada_id === rodadaExcluidaId)).toBe(false);
        // Ordem mais-recente-primeiro.
        expect(recentes[0]!.rodada_id).toBe(rodadaIdsLancadas[7]);
        expect(recentes[0]!.status).toBe("presente");
        expect(recentes[6]!.rodada_id).toBe(rodadaIdsLancadas[1]);
        // Status literal preservado (não reescreve "lesionado" para "presente").
        const rodadaLesionado = recentes.find(
          (r) => r.rodada_id === rodadaIdsLancadas[3],
        );
        expect(rodadaLesionado!.status).toBe("lesionado");
      },
    );

    it(
      "rodadas_jogadas/media_presenca são estatísticas de GRUPO (UX-SPEC.md " +
        "Seção 2.2, não do atleta individual): mesmo valor em toda linha, e " +
        "refletem exatamente o delta introduzido por este teste sobre o " +
        "snapshot 'antes' (8 rodadas lançadas a mais, +2 atletas ativos, " +
        "+5 presenças de atleta ativo; lesionado/ausente não somam, atleta " +
        "anonimizado e rodada excluída não contam)",
      async () => {
        const { data, error } = await anon
          .from("ranking_publico_recentes")
          .select("atleta_id, rodadas_jogadas, media_presenca");
        expect(error).toBeNull();
        expect(data!.length).toBeGreaterThan(0);

        const rodadasEsperado = rodadasLancadasAntes + 8;
        const atletasEsperado = atletasAtivosAntes + 2; // zeta + beta (alfa é ativo=false)
        const presencasEsperado = presencasGrupoAntes + 5; // 5 presenças do zeta
        const mediaEsperada =
          Math.round(
            (presencasEsperado / (atletasEsperado * rodadasEsperado)) * 1000,
          ) / 10;

        // Mesmo valor em toda linha (estatística de grupo, não por atleta).
        const valoresDistintos = new Set(data!.map((r: any) => r.rodadas_jogadas));
        expect(valoresDistintos.size).toBe(1);
        const mediasDistintas = new Set(data!.map((r: any) => r.media_presenca));
        expect(mediasDistintas.size).toBe(1);

        expect(data![0]!.rodadas_jogadas).toBe(rodadasEsperado);
        expect(data![0]!.media_presenca).toBeCloseTo(mediaEsperada, 1);
      },
    );
  },
);

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada, em vez de uma lacuna
  // silenciosa (TASK.md Secao 1.0: "nunca esconder incerteza").
  describe("BE-R01 — ranking_publico_recentes (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY/" +
        "TEST_SUPABASE_SERVICE_ROLE_KEY (ver `supabase status` após " +
        "`supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
