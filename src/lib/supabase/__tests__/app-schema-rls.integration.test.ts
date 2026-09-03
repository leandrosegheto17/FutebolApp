/**
 * Teste de integração de BE-02 (TASK.md Secao 3.1) — critério de aceite
 * literal: "todas as tabelas criadas via migration versionada; SELECT/INSERT/
 * UPDATE/DELETE da role `anon` negados por padrão em toda tabela... teste de
 * integração confirma RLS ativo tabela a tabela".
 *
 * Exige um Supabase local rodando (`supabase start`, ver
 * `supabase/config.toml`) — não roda no job "Test" do CI compartilhado
 * (`.github/workflows/ci.yml`), que não sobe banco algum (ver
 * `vitest.integration.config.ts`). Rodar localmente com:
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 *
 * (ou definir as 4 variáveis manualmente a partir da saída de `supabase status`).
 *
 * Duas camadas de verificação, para cada uma das 12 tabelas da schema `app`
 * (SDD.md Secao 5):
 *   1. Verificação estrutural direta (`pg_class.relrowsecurity`) — confirma
 *      que RLS está literalmente habilitado no catálogo do Postgres, não
 *      apenas inferido por comportamento.
 *   2. Verificação comportamental via PostgREST (o caminho real que um
 *      cliente `anon` usaria em produção) — confirma que SELECT/INSERT/
 *      UPDATE/DELETE são de fato negados, e usa `service_role` como controle
 *      positivo (prova que a tabela existe e é alcançável, isolando a negação
 *      como efeito de RLS/ausência de GRANT, não de tabela inexistente).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client as PgClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.TEST_SUPABASE_DB_URL;

const podeRodar = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY && DB_URL);

/** As 12 entidades de BE-02 (SDD.md Secao 5) — auth_interno/tentativa_login
 * (BE-04) e views públicas (BE-03) ficam fora deste teste de propósito. */
const TABELAS_APP = [
  "atleta",
  "rodada",
  "participacao_rodada",
  "evento_jogo",
  "time",
  "time_atleta",
  "substituicao",
  "lancamento_pontos",
  "restricao_obrigatoria",
  "log_auditoria",
  "legado_migracao_registro",
  "configuracao_pontuacao",
] as const;

describe.skipIf(!podeRodar)(
  "BE-02 — schema app: tabelas criadas via migration + RLS deny-by-default (role anon)",
  () => {
    let anon: SupabaseClient<any, any, any>;
    let service: SupabaseClient<any, any, any>;
    let pg: PgClient;

    beforeAll(async () => {
      anon = createClient(SUPABASE_URL!, ANON_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        db: { schema: "app" },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      pg = new PgClient({ connectionString: DB_URL });
      await pg.connect();
    });

    afterAll(async () => {
      await pg.end();
    });

    describe("verificação estrutural (pg_class.relrowsecurity)", () => {
      it.each(TABELAS_APP)("app.%s existe e tem RLS habilitado", async (tabela) => {
        const { rows } = await pg.query<{ relrowsecurity: boolean }>(
          `select relrowsecurity
             from pg_class
            where relnamespace = 'app'::regnamespace
              and relname = $1`,
          [tabela],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]!.relrowsecurity).toBe(true);
      });
    });

    describe("controle positivo (service_role, bypassa RLS por desenho)", () => {
      it.each(TABELAS_APP)(
        "service_role consegue SELECT em app.%s (tabela existe/alcançável)",
        async (tabela) => {
          const { error } = await service.from(tabela).select("*").limit(1);
          expect(error).toBeNull();
        },
      );
    });

    describe("negação por padrão para anon (comportamento real via PostgREST)", () => {
      it.each(TABELAS_APP)("SELECT em app.%s é negado para anon", async (tabela) => {
        const { error } = await anon.from(tabela).select("*").limit(1);
        expect(error).not.toBeNull();
      });

      it.each(TABELAS_APP)("INSERT em app.%s é negado para anon", async (tabela) => {
        const { error } = await anon.from(tabela).insert({});
        expect(error).not.toBeNull();
      });

      it.each(TABELAS_APP)("UPDATE em app.%s é negado para anon", async (tabela) => {
        // Filtro por `criado_em` (presente nas 12 tabelas) em vez de `id`
        // porque `time_atleta` tem chave composta (time_id, atleta_id), sem
        // coluna `id` própria — condição sempre falsa é irrelevante aqui: o
        // acesso deve ser negado antes de qualquer linha ser avaliada.
        const { error } = await anon
          .from(tabela)
          .update({})
          .lt("criado_em", "1970-01-01T00:00:00Z");
        expect(error).not.toBeNull();
      });

      it.each(TABELAS_APP)("DELETE em app.%s é negado para anon", async (tabela) => {
        const { error } = await anon
          .from(tabela)
          .delete()
          .lt("criado_em", "1970-01-01T00:00:00Z");
        expect(error).not.toBeNull();
      });
    });
  },
);

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada, em vez de uma lacuna silenciosa
  // (TASK.md Secao 1.0: "nunca esconder incerteza").
  describe("BE-02 — schema app: RLS (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY/" +
        "TEST_SUPABASE_SERVICE_ROLE_KEY/TEST_SUPABASE_DB_URL (ver `supabase status` " +
        "após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
