-- BE-02 — tabela `legado_migracao_registro` (SDD.md Secao 5; ADR-008).
--
-- `status` usa o enum decidido em TASK.md Secao 6.2, item 5 (Tech Lead,
-- lacuna de detalhe do SDD.md explicitamente delegada): pendente | migrado |
-- divergencia | erro.
--
-- UNIQUE(tabela_origem, id_origem): suporta a idempotencia/reexecutabilidade
-- exigida por ADR-008/GUARDRAILS.md regra 11 — o script de migracao (BE-15)
-- pode usar `ON CONFLICT (tabela_origem, id_origem) DO UPDATE` para
-- reexecutar sem duplicar mapeamento ja registrado.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.legado_migracao_registro CASCADE; --
-- aditiva, README.md.

create table app.legado_migracao_registro (
  id uuid primary key default gen_random_uuid(),
  tabela_origem text not null,
  id_origem text not null,
  tabela_destino text not null,
  id_destino uuid,
  status text not null default 'pendente',
  observacao text,
  criado_em timestamptz not null default now(),
  constraint legado_migracao_registro_status_check
    check (status in ('pendente', 'migrado', 'divergencia', 'erro')),
  constraint legado_migracao_registro_origem_unique unique (tabela_origem, id_origem)
);

comment on table app.legado_migracao_registro is
  'SDD.md Secao 5; ADR-008. Rastreia registro a registro o mapeamento '
  'origem->destino da migracao do legado (RF-08.3/RF-08.5), consumido por '
  'BE-15 (bloqueado ate SPK-01 + BE-14, GUARDRAILS.md regra 35).';

create index idx_legado_migracao_registro_status on app.legado_migracao_registro (status);

alter table app.legado_migracao_registro enable row level security;

revoke all on app.legado_migracao_registro from public;
revoke all on app.legado_migracao_registro from anon;
grant all on app.legado_migracao_registro to service_role;
