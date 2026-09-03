-- BE-02 — tabela `participacao_rodada` (SDD.md Secao 5).
--
-- UNIQUE(rodada_id, atleta_id): um atleta tem no maximo uma participacao por
-- rodada — decisao de modelagem fisica (delegada ao Backend Developer),
-- suporta diretamente RF-02.6 (bloquear evento para atleta ausente pressupoe
-- uma unica linha de status por atleta/rodada).
--
-- ROLLBACK: DROP TABLE IF EXISTS app.participacao_rodada CASCADE; -- aditiva,
-- README.md.

create table app.participacao_rodada (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references app.rodada (id) on delete restrict,
  atleta_id uuid not null references app.atleta (id) on delete restrict,
  status text not null,
  criado_em timestamptz not null default now(),
  constraint participacao_rodada_status_check
    check (status in ('presente', 'ausente', 'lesionado')),
  constraint participacao_rodada_unique_atleta_rodada unique (rodada_id, atleta_id)
);

comment on table app.participacao_rodada is
  'SDD.md Secao 5. `status`: presente|ausente|lesionado (RF-02.3/RF-02.6).';

create index idx_participacao_rodada_rodada_id on app.participacao_rodada (rodada_id);
create index idx_participacao_rodada_atleta_id on app.participacao_rodada (atleta_id);

alter table app.participacao_rodada enable row level security;

revoke all on app.participacao_rodada from public;
revoke all on app.participacao_rodada from anon;
grant all on app.participacao_rodada to service_role;
