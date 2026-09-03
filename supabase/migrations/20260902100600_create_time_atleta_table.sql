-- BE-02 — tabela `time_atleta` (SDD.md Secao 5) — tabela de associacao pura
-- (sem `id` proprio no diagrama da Secao 5); PK composta.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.time_atleta CASCADE; -- aditiva,
-- README.md.

create table app.time_atleta (
  time_id uuid not null references app.time (id) on delete restrict,
  atleta_id uuid not null references app.atleta (id) on delete restrict,
  criado_em timestamptz not null default now(),
  constraint time_atleta_pkey primary key (time_id, atleta_id)
);

comment on table app.time_atleta is
  'SDD.md Secao 5. Associacao atleta<->time de uma rodada (ADR-007).';

create index idx_time_atleta_atleta_id on app.time_atleta (atleta_id);

alter table app.time_atleta enable row level security;

revoke all on app.time_atleta from public;
revoke all on app.time_atleta from anon;
grant all on app.time_atleta to service_role;
