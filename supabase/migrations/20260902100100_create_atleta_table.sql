-- BE-02 — tabela `atleta` (SDD.md Secao 5; Anexo A/ADR-011 para
-- `anonimizado_em`). RLS habilitado deny-by-default (ADR-005, GUARDRAILS.md
-- regra 5): nenhuma policy criada aqui de proposito — SELECT/INSERT/UPDATE/
-- DELETE da role `anon` ficam negados ate BE-03 liberar leitura curada via
-- view (nunca via tabela base).
--
-- ROLLBACK: DROP TABLE IF EXISTS app.atleta CASCADE; -- aditiva (primeira
-- migracao de producao, README.md) — nao ha dado real a perder ainda.

create table app.atleta (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  apelido_exibicao text not null,
  contato text,
  data_nascimento date,
  consentimento_responsavel_obtido boolean not null default false,
  pontuacao_inicial numeric not null default 0,
  ativo boolean not null default true,
  anonimizado_em timestamptz,
  criado_em timestamptz not null default now()
);

comment on table app.atleta is
  'SDD.md Secao 5. Linha nunca excluida fisicamente, nenhum motivo, inclusive '
  'a pedido do titular (GUARDRAILS.md regra 9) — o unico mecanismo permitido '
  'e a funcao anonimizar_atleta (ADR-011, BE-07, ainda nao implementada '
  'nesta migration).';
comment on column app.atleta.contato is
  'Sensivel — nunca trafega nem e renderizado na area publica (RN-01, '
  'ADR-005, GUARDRAILS.md regra 19). Nunca selecionado por view publica.';
comment on column app.atleta.data_nascimento is
  'Sensivel — mesma restricao de app.atleta.contato (RN-01, ADR-005).';
comment on column app.atleta.anonimizado_em is
  'Nullable — preenchido pela funcao anonimizar_atleta (ADR-011). BE-02 so '
  'declara a coluna; a funcao/trigger e escopo de BE-07.';

create index idx_atleta_ativo on app.atleta (ativo);

alter table app.atleta enable row level security;

revoke all on app.atleta from public;
revoke all on app.atleta from anon;
grant all on app.atleta to service_role;

-- Enforcement de "nenhuma linha de atleta e excluida fisicamente, por
-- nenhum motivo" (GUARDRAILS.md regra 9) no proprio banco, alem da
-- disciplina de codigo ja exigida — bloqueia DELETE incondicionalmente,
-- valido mesmo para `service_role` (contorna RLS, nao contorna trigger). O
-- unico mecanismo permitido de "remover" dado pessoal e a funcao
-- `anonimizar_atleta` (ADR-011, BE-07), que so faz UPDATE — nunca DELETE —
-- portanto nunca colide com este bloqueio.
create function app.forbid_atleta_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Nenhuma linha de app.atleta e excluida fisicamente, por nenhum motivo (GUARDRAILS.md regra 9) — use a funcao anonimizar_atleta (ADR-011) para atender a um pedido de anonimizacao.';
end;
$$;

comment on function app.forbid_atleta_delete() is
  'Bloqueia DELETE em app.atleta incondicionalmente, mesmo para service_role '
  '(trigger executa independente de RLS bypass) — reforco estrutural de '
  'GUARDRAILS.md regra 9 / ADR-011.';

create trigger trg_atleta_no_delete
  before delete on app.atleta
  for each row execute function app.forbid_atleta_delete();
