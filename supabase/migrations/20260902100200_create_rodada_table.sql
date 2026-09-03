-- BE-02 — tabela `rodada` (SDD.md Secao 5).
--
-- Decisao de modelagem fisica (delegada pelo SDD.md Secao 5 ao Backend
-- Developer: "Nao e modelagem fisica detalhada... isso cabe ao Backend
-- Developer/Tech Lead"): `status` usa soft-delete (`excluida`), nunca
-- exclusao fisica da linha — mesma filosofia nao-destrutiva de ADR-006/
-- ADR-008/ADR-011 aplicada por analogia. Motivo concreto: `log_auditoria.
-- rodada_id` (SDD.md Secao 5) e `lancamento_pontos.rodada_id` referenciam
-- `rodada.id`; excluir a linha fisicamente quebraria essas FKs e o proprio
-- log de auditoria da exclusao (RF-04.4) perderia a rodada a que se refere.
-- A funcao de correcao/exclusao (RF-04.1, BE-09) reverte pontos via novos
-- lancamentos (ledger append-only) e marca `status = 'excluida'` — nao
-- implementada nesta migration, apenas a coluna que a suporta.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.rodada CASCADE; -- aditiva, README.md.

create table app.rodada (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  status text not null default 'lancada',
  criado_em timestamptz not null default now(),
  constraint rodada_status_check check (status in ('lancada', 'excluida'))
);

comment on table app.rodada is
  'SDD.md Secao 5. `status` e soft-delete (nunca DELETE fisico) — ver nota de '
  'modelagem no topo desta migration.';

create index idx_rodada_status on app.rodada (status);
create index idx_rodada_data on app.rodada (data);

alter table app.rodada enable row level security;

revoke all on app.rodada from public;
revoke all on app.rodada from anon;
grant all on app.rodada to service_role;
