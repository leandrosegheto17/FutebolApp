-- BE-02 — tabela `restricao_obrigatoria` (SDD.md Secao 5; ADR-010).
--
-- ROLLBACK: DROP TABLE IF EXISTS app.restricao_obrigatoria CASCADE; --
-- aditiva, README.md.

create table app.restricao_obrigatoria (
  id uuid primary key default gen_random_uuid(),
  atleta_a_id uuid not null references app.atleta (id) on delete restrict,
  atleta_b_id uuid not null references app.atleta (id) on delete restrict,
  ativo boolean not null default true,
  desativado_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint restricao_obrigatoria_atletas_distintos_check check (atleta_a_id <> atleta_b_id)
);

comment on table app.restricao_obrigatoria is
  'SDD.md Secao 5. Desativacao e soft-delete (RN-11) — nunca exclusao fisica '
  '(RF-05.5, BE-12). Consumida pelo grafo de conflito do ADR-010 (arestas do '
  'grafo = pares ativos entre presentes).';

create index idx_restricao_obrigatoria_atleta_a_id on app.restricao_obrigatoria (atleta_a_id);
create index idx_restricao_obrigatoria_atleta_b_id on app.restricao_obrigatoria (atleta_b_id);
create index idx_restricao_obrigatoria_ativo on app.restricao_obrigatoria (ativo);

alter table app.restricao_obrigatoria enable row level security;

revoke all on app.restricao_obrigatoria from public;
revoke all on app.restricao_obrigatoria from anon;
grant all on app.restricao_obrigatoria to service_role;
