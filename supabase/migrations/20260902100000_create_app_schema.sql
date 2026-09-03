-- BE-02 (TASK.md Secao 3.1) — cria a schema `app` que hospeda todo o modelo de
-- dominio novo (SDD.md Secao 5), isolada da schema legada do projeto Supabase
-- reaproveitado (ADR-002/ADR-008) — nenhuma migration desta pasta referencia a
-- schema legada por nome, conforme supabase/migrations/README.md.
--
-- Aditiva por desenho — nao precisa de bloco `-- ROLLBACK:` (README.md: "a
-- primeira migracao para producao e aditiva por desenho... reverter o deploy
-- da aplicacao ja e suficiente").

create schema if not exists app;

comment on schema app is
  'Schema de dominio do sistema de ranking "Turma do Rola - Comary" (SDD.md '
  'Secao 5). Isolada da schema legada do Supabase (ADR-008) — nunca '
  'referenciada por nenhuma migration desta pasta. RLS habilitado '
  'deny-by-default em toda tabela (ADR-005, GUARDRAILS.md regra 5).';

-- gen_random_uuid(), usado como default de toda PK uuid desta schema. Ja
-- habilitada por padrao na imagem do Supabase (schema `extensions`, incluida
-- no search_path) — IF NOT EXISTS aqui e apenas defesa adicional para
-- ambientes atipicos (ex.: reset local a partir de uma imagem diferente).
create extension if not exists pgcrypto;

-- Apenas USAGE — nao concede acesso a nenhuma tabela por si so (GRANT/REVOKE
-- por tabela e feito na migration de cada entidade, para que o teste de
-- integracao de RLS possa validar "tabela a tabela", conforme criterio de
-- aceite de BE-02). USAGE em `anon` e necessario desde ja para que, quando as
-- views publicas curadas forem criadas nesta schema (BE-03, ADR-005), a role
-- `anon` consiga resolve-las via PostgREST (supabase/config.toml expoe
-- `schemas = ["public", "app"]`).
grant usage on schema app to anon;
grant usage on schema app to service_role;

-- Defesa adicional/documentacao explicita — em Postgres moderno, uma schema
-- nova criada explicitamente (diferente da schema `public` provisionada pelo
-- initdb) nao recebe nenhum privilegio automatico para PUBLIC; esta instrucao
-- deixa isso inequivoco em vez de depender de um comportamento implicito do
-- motor de banco.
revoke all on schema app from public;
