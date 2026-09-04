/**
 * Teste de integração de BE-14 (TASK.md Secao 3.1) — critério de aceite
 * literal: "Tentativa de remover/alterar destrutivamente a schema legada
 * antes da flag de validação falha por permissão negada no próprio
 * Postgres, não só por convenção de processo; após a flag de validação ser
 * gravada, a operação de arquivamento passa a ser permitida".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo protocolo de
 * `app-schema-rls.integration.test.ts` (BE-02):
 *
 *   supabase start
 *   supabase status -o env --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * Conecta diretamente ao Postgres via `pg` (não via PostgREST) porque
 * DROP/ALTER TABLE não são operações que o PostgREST expõe — é exatamente
 * o mesmo tipo de conexão bruta que um script operacional (BE-15, ou um
 * acesso administrativo direto) usaria para tentar a operação real.
 *
 * ATENÇÃO — decisão de detalhe sobre o que este arquivo NUNCA testa
 * (documentada, não uma lacuna silenciosa): a migration desta tarefa
 * também bloqueia `DROP SCHEMA public` (não só `DROP TABLE`/`ALTER TABLE`
 * em tabelas dentro dela — ver comentário da migration
 * `20260903170000_travar_schema_legada_ate_validacao.sql`, Decisão 3), e
 * esse caminho foi validado empiricamente de forma manual durante esta
 * tarefa (mesma função/mesmo mecanismo — `sql_drop` +
 * `pg_event_trigger_dropped_objects()` — já exercitado abaixo via `DROP
 * TABLE`). Emitir literalmente `DROP SCHEMA public CASCADE` neste arquivo
 * NÃO é seguro de automatizar: se a flag de validação já estiver gravada
 * (ex.: reexecução da suíte sem `supabase db reset` entre execuções, ou um
 * bug futuro nesta lógica), o comando teria sucesso de verdade e destruiria
 * a schema `public` compartilhada por TODO o Postgres local usado por todos
 * os outros arquivos `*.integration.test.ts` desta suíte — risco
 * operacional desproporcional ao ganho marginal de cobertura (mesmo
 * mecanismo já coberto por `DROP TABLE`/`ALTER TABLE` abaixo).
 *
 * Idempotência entre execuções (`npm run test:integration` rodado duas
 * vezes seguidas sem reset, mesmo protocolo de BE-02 a BE-13): a flag de
 * validação (`app.legado_migracao_validacao`), uma vez gravada, é
 * IMUTÁVEL por desenho (DELETE bloqueado, TASK.md Secao 6.2 item 6/RF-08.6
 * — "ação irreversível", mesmo espírito de ADR-011) — não há como esta
 * suíte "desfazer" a validação entre duas execuções. Por isso os testes de
 * "antes da flag" são pulados (`it.skipIf`, com motivo explícito no nome)
 * quando a flag já existir de uma execução anterior; os testes de "depois
 * da flag"/imutabilidade continuam rodando sempre, independente disso.
 *
 * CORREÇÃO (2026-09-04, BE-14): este arquivo continha um describe adicional
 * ("REVOKE permanente de escrita comum (DML) sobre a schema legada"),
 * removido por inteiro nesta data. Ele testava um `REVOKE INSERT/UPDATE/
 * DELETE/TRUNCATE` permanente que a migration desta tarefa
 * (`20260903170000_travar_schema_legada_ate_validacao.sql`) aplicava sobre
 * toda tabela de `public` — essa instrução foi removida da própria
 * migration (ver comentário "CORREÇÃO (2026-09-04)" nela) porque o
 * stakeholder confirmou que o app legado real (`FutebolRanking`) continua
 * no ar, escrevendo normalmente nessas mesmas tabelas via uma dessas roles,
 * por tempo indeterminado — um REVOKE permanente derrubaria essa escrita
 * legítima, o oposto do pedido explícito do stakeholder. Os testes de
 * DROP/ALTER TABLE (bloqueados antes da flag, liberados depois) permanecem
 * 100% inalterados — essa trava nunca teve relação com a escrita normal do
 * app legado (ele nunca faz DDL em tempo de execução).
 */
import { Client as PgClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DB_URL = process.env.TEST_SUPABASE_DB_URL;
const podeRodar = Boolean(DB_URL);

// Achado empírico durante a validação desta tarefa (TASK.md Secao 1.0 —
// nunca lacuna silenciosa): `it.skipIf`/`describe.skipIf` avaliam a
// condição na fase de COLETA dos testes, ANTES de qualquer `beforeAll`
// rodar — uma variável só atribuída dentro de `beforeAll` (como a
// verificação de "a flag já existe de uma execução anterior?") sempre
// seria lida com seu valor inicial (`false`) pelo `skipIf`, nunca com o
// valor real. Por isso esta checagem roda aqui, no top-level do módulo
// (top-level `await`, suportado pelo Vitest/Vite em arquivos ESM), ANTES
// do `describe` ser declarado — assim `it.skipIf` recebe o valor correto
// já resolvido na fase de coleta.
let flagJaExistiaAntesDesteArquivo = false;
if (podeRodar) {
  const probe = new PgClient({ connectionString: DB_URL });
  await probe.connect();
  const { rows } = await probe.query<{ n: number }>(
    "select count(*)::int as n from app.legado_migracao_validacao",
  );
  flagJaExistiaAntesDesteArquivo = (rows[0]?.n ?? 0) > 0;
  await probe.end();
}

describe.skipIf(!podeRodar)(
  "BE-14 — trava técnica complementar a RF-08.6 (schema legada `public`)",
  () => {
    let pg: PgClient;

    beforeAll(async () => {
      pg = new PgClient({ connectionString: DB_URL });
      await pg.connect();

      await pg.query(
        "create table if not exists public._be14_drop_test (id int primary key)",
      );
      await pg.query(
        "create table if not exists public._be14_alter_test (id int primary key)",
      );
      await pg.query(
        "create table if not exists app._be14_app_schema_test (id int primary key)",
      );
    });

    afterAll(async () => {
      // Neste ponto a flag já foi garantida (ver describe "garante a flag"
      // abaixo, que roda antes destes cleanups na ordem declarada do
      // arquivo) — DROP em `public` já está liberado.
      await pg.query("drop table if exists public._be14_drop_test");
      await pg.query("drop table if exists public._be14_alter_test");
      await pg.end();
    });

    describe("estrutura — event triggers e RLS criados pela migration", () => {
      it("os dois event triggers de BE-14 existem e estão habilitados", async () => {
        const { rows } = await pg.query<{
          evtname: string;
          evtevent: string;
          evtenabled: string;
        }>(
          `select evtname, evtevent, evtenabled
             from pg_event_trigger
            where evtname in ('trg_bloqueia_alter_schema_legada', 'trg_bloqueia_drop_schema_legada')
            order by evtname`,
        );
        expect(rows).toHaveLength(2);
        expect(rows.map((r) => r.evtevent).sort()).toEqual([
          "ddl_command_end",
          "sql_drop",
        ]);
        for (const r of rows) {
          // 'O' = origin (habilitado em sessão normal, não replica) — Postgres default.
          expect(r.evtenabled).toBe("O");
        }
      });

      it("app.legado_migracao_validacao existe com RLS habilitado", async () => {
        const { rows } = await pg.query<{ relrowsecurity: boolean }>(
          `select relrowsecurity
             from pg_class
            where relnamespace = 'app'::regnamespace
              and relname = 'legado_migracao_validacao'`,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]!.relrowsecurity).toBe(true);
      });
    });

    describe("antes da flag de validação (RF-08.5 ainda não confirmada)", () => {
      it.skipIf(flagJaExistiaAntesDesteArquivo)(
        "DROP TABLE em public.* falha com permissão negada nativa do Postgres (42501) [pulado se a flag já foi gravada em execução anterior — imutável por desenho]",
        async () => {
          await expect(
            pg.query("drop table public._be14_drop_test"),
          ).rejects.toMatchObject({
            code: "42501",
          });
          const { rows } = await pg.query<{ existe: string | null }>(
            "select to_regclass('public._be14_drop_test') as existe",
          );
          expect(rows[0]!.existe).not.toBeNull();
        },
      );

      it.skipIf(flagJaExistiaAntesDesteArquivo)(
        "ALTER TABLE em public.* falha com permissão negada nativa do Postgres (42501) [pulado se a flag já foi gravada em execução anterior]",
        async () => {
          await expect(
            pg.query("alter table public._be14_alter_test add column foo text"),
          ).rejects.toMatchObject({ code: "42501" });
          const { rows } = await pg.query<{ n: number }>(
            `select count(*)::int as n
               from information_schema.columns
              where table_schema = 'public' and table_name = '_be14_alter_test'`,
          );
          // só a coluna `id` original — nenhuma coluna nova foi adicionada.
          expect(rows[0]!.n).toBe(1);
        },
      );
    });

    it("DDL em app.* nunca é bloqueado pela trava, independente da flag de validação", async () => {
      await expect(
        pg.query("alter table app._be14_app_schema_test add column foo text"),
      ).resolves.toBeDefined();
      await expect(
        pg.query("drop table app._be14_app_schema_test"),
      ).resolves.toBeDefined();
    });

    it("garante que a flag de validação existe ao final desta suíte (idempotente entre execuções)", async () => {
      if (!flagJaExistiaAntesDesteArquivo) {
        await pg.query(
          "insert into app.legado_migracao_validacao (observacao) values ($1)",
          [
            "Gravado pelo teste de integração de BE-14 — simula a validação explícita do organizador sobre o relatório de conferência (RF-08.5).",
          ],
        );
      }
      const { rows } = await pg.query<{ n: number }>(
        "select count(*)::int as n from app.legado_migracao_validacao",
      );
      expect(rows[0]!.n).toBe(1);
    });

    describe("depois da flag de validação (RF-08.6 — operação de arquivamento permitida)", () => {
      it("DROP TABLE em public.* passa a ser permitido", async () => {
        await expect(
          pg.query("drop table public._be14_drop_test"),
        ).resolves.toBeDefined();
        const { rows } = await pg.query<{ existe: string | null }>(
          "select to_regclass('public._be14_drop_test') as existe",
        );
        expect(rows[0]!.existe).toBeNull();
        // recria para o cleanup do afterAll não precisar de `if exists` como única defesa
        await pg.query("create table public._be14_drop_test (id int primary key)");
      });

      it("ALTER TABLE em public.* passa a ser permitido", async () => {
        await expect(
          pg.query("alter table public._be14_alter_test add column foo text"),
        ).resolves.toBeDefined();
        const { rows } = await pg.query<{ n: number }>(
          `select count(*)::int as n
             from information_schema.columns
            where table_schema = 'public' and table_name = '_be14_alter_test'`,
        );
        // `id` original + `foo` nova.
        expect(rows[0]!.n).toBe(2);
      });
    });

    // CORRECAO (2026-09-04, BE-14): o describe "REVOKE permanente de escrita
    // comum (DML)..." que existia aqui foi REMOVIDO por inteiro. Ele
    // verificava um `REVOKE INSERT/UPDATE/DELETE/TRUNCATE` permanente que a
    // migration desta tarefa aplicava sobre TODA tabela de `public` — essa
    // instrucao foi removida da propria migration
    // (`20260903170000_travar_schema_legada_ate_validacao.sql`, ver
    // comentario "CORRECAO (2026-09-04)" no lugar onde a antiga Secao 3
    // estava) porque o stakeholder confirmou que o app legado real
    // (`FutebolRanking`) continua no ar, escrevendo normalmente nessas mesmas
    // tabelas via uma dessas roles, por tempo indeterminado — um REVOKE
    // permanente derrubaria essa escrita legitima. Os testes de DROP/ALTER
    // TABLE/DROP SCHEMA acima e abaixo (bloqueados antes da flag, liberados
    // depois) NAO mudam com esta correcao — essa trava nunca teve relacao
    // com a escrita normal do app legado (ele nunca faz DDL em tempo de
    // execucao).

    describe("imutabilidade da flag de validação", () => {
      it("DELETE em app.legado_migracao_validacao é sempre bloqueado, mesmo já validado", async () => {
        await expect(
          pg.query("delete from app.legado_migracao_validacao"),
        ).rejects.toMatchObject({
          code: "P0001",
        });
        const { rows } = await pg.query<{ n: number }>(
          "select count(*)::int as n from app.legado_migracao_validacao",
        );
        expect(rows[0]!.n).toBe(1);
      });

      it("uma segunda linha na tabela de validação é rejeitada pelo próprio Postgres (singleton)", async () => {
        await expect(
          pg.query("insert into app.legado_migracao_validacao (id) values (2)"),
        ).rejects.toMatchObject({ code: "23514" }); // check_violation (id = 1)
      });
    });
  },
);

if (!podeRodar) {
  describe("BE-14 — trava técnica complementar a RF-08.6 (integração)", () => {
    it.skip("PULADO: defina TEST_SUPABASE_DB_URL (ver `supabase status` após `supabase start`) para rodar este teste de integração", () => {});
  });
}
