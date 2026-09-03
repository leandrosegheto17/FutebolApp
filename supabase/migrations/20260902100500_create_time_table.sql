-- BE-02 — tabela `time` (SDD.md Secao 5). `time` e keyword nao-reservada do
-- Postgres (pode ser usada como identificador sem aspas).
--
-- ROLLBACK: DROP TABLE IF EXISTS app.time CASCADE; -- aditiva, README.md.

create table app.time (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references app.rodada (id) on delete restrict,
  label text not null,
  criado_em timestamptz not null default now()
);

comment on table app.time is
  'SDD.md Secao 5. Um time pertence a exatamente uma rodada (ADR-007/010, '
  'algoritmo parametrizado por N times por rodada).';

create index idx_time_rodada_id on app.time (rodada_id);

alter table app.time enable row level security;

revoke all on app.time from public;
revoke all on app.time from anon;
grant all on app.time to service_role;
