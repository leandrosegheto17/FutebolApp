-- BE-04 (TASK.md Secao 3.1) — tabela `auth_interno` (SDD.md Secao 2.1/7.1,
-- ADR-004): guarda o hash argon2id da senha unica compartilhada da area
-- interna (RF-07/RN-12 — nenhuma conta individual). RLS habilitado
-- deny-by-default (ADR-005, GUARDRAILS.md regra 5): nenhuma policy criada de
-- proposito — apenas `service_role` alcanca esta tabela (nem `anon`, nem
-- `authenticated`, que este projeto nem usa — ADR-004 rejeita Supabase Auth).
--
-- Decisao de detalhe documentada (SDD.md Secao 5 nao modela fisicamente esta
-- tabela — "isso cabe ao Backend Developer"; nao e lacuna estrutural, nao
-- escalada): tabela desenhada como singleton (`id smallint primary key
-- default 1 check (id = 1)`) porque so existe UMA senha compartilhada no
-- sistema inteiro (RN-12) — o proprio Postgres impede, no nivel de schema,
-- que uma segunda linha exista (chave primaria fixa em 1), sem depender de
-- disciplina de aplicacao para isso. `BE-05` (procedimento de redefinicao de
-- senha, proxima tarefa) faz `INSERT ... ON CONFLICT (id) DO UPDATE` sobre
-- esta mesma linha unica — nenhuma migration desta tarefa insere uma senha
-- inicial (GUARDRAILS.md regra 26 — nenhum segredo, nem hash de seed,
-- commitado em arquivo versionado); ambiente sem nenhuma linha aqui e
-- tratado pelo Route Handler de login como "sem senha configurada", com a
-- MESMA mensagem de erro generica de senha incorreta (RF-07.3 — nunca
-- diferenciar motivo de falha), nunca uma resposta que revele o estado do
-- sistema.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.auth_interno CASCADE; -- aditiva
-- (nenhuma tabela/coluna existente e alterada por esta migration).

create table app.auth_interno (
  id smallint primary key default 1,
  hash_senha text not null,
  atualizado_em timestamptz not null default now(),
  constraint auth_interno_singleton_check check (id = 1)
);

comment on table app.auth_interno is
  'ADR-004/RF-07/RN-12. Senha unica compartilhada da area interna — sem '
  'conta individual, sem hierarquia. Singleton (id fixo em 1, GUARDRAILS.md '
  'nao tem regra numerada para isso, mas seguem os mesmos principios de '
  'ADR-005/regra 5: RLS deny-by-default, apenas service_role escreve/le). '
  'hash_senha e SEMPRE argon2id (TASK.md Secao 1.3) — nunca texto puro, '
  'nunca comparado com "===" direto no codigo da aplicacao (comparacao em '
  'tempo constante via biblioteca de hash, BE-04).';
comment on column app.auth_interno.hash_senha is
  'Hash argon2id (RNF-03/TASK.md Secao 1.3) — nunca a senha em texto puro. '
  'Atualizado pelo runbook de BE-05, nunca editado manualmente em producao.';

alter table app.auth_interno enable row level security;

revoke all on app.auth_interno from public;
revoke all on app.auth_interno from anon;
grant select, insert, update on app.auth_interno to service_role;

-- Enforcement complementar ao proprio design de singleton: nenhuma linha e
-- excluida (o mecanismo de "trocar a senha" e sempre UPDATE via BE-05,
-- nunca DELETE+INSERT) — bloqueia DELETE incondicionalmente, mesmo para
-- service_role, mesmo padrao ja usado em app.atleta (BE-02,
-- app.forbid_atleta_delete) e app.lancamento_pontos (BE-02,
-- app.forbid_lancamento_pontos_mutation).
create function app.forbid_auth_interno_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Nenhuma linha de app.auth_interno e excluida — trocar a senha e sempre UPDATE (runbook BE-05), nunca DELETE.';
end;
$$;

comment on function app.forbid_auth_interno_delete() is
  'Bloqueia DELETE em app.auth_interno incondicionalmente, mesmo para '
  'service_role (trigger executa independente de RLS bypass) — o unico '
  'mecanismo de "trocar a senha" e UPDATE (BE-05).';

create trigger trg_auth_interno_no_delete
  before delete on app.auth_interno
  for each row execute function app.forbid_auth_interno_delete();
