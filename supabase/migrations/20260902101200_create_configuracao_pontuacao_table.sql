-- BE-02 — tabela `configuracao_pontuacao` (SDD.md Secao 5, nota de
-- modelagem: "tabela auxiliar... evento, pontos, vigente_desde").
--
-- `evento` e texto livre (nao um CHECK fechado de valores) de proposito: RN-05
-- e "configuravel em banco para auditabilidade", nao fixos em codigo/schema —
-- travar os valores possiveis num CHECK reintroduziria o mesmo acoplamento
-- que a decisao de arquitetura (SDD.md Secao 5, nota) quis evitar. Sem UI de
-- edicao nesta release (editavel so via migration/acesso direto), conforme
-- ja registrado no SDD.md.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.configuracao_pontuacao CASCADE; --
-- aditiva, README.md.

create table app.configuracao_pontuacao (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  pontos numeric not null,
  vigente_desde date not null,
  criado_em timestamptz not null default now(),
  constraint configuracao_pontuacao_unique unique (evento, vigente_desde)
);

comment on table app.configuracao_pontuacao is
  'SDD.md Secao 5. Versiona os valores de RN-05 por data de vigencia — o '
  'calculo de pontos (BE-08) sempre le o valor vigente na data do evento, '
  'nunca hardcoded em TypeScript/PL-pgSQL (TASK.md Secao 1.2).';

create index idx_configuracao_pontuacao_evento on app.configuracao_pontuacao (evento);

alter table app.configuracao_pontuacao enable row level security;

revoke all on app.configuracao_pontuacao from public;
revoke all on app.configuracao_pontuacao from anon;
grant all on app.configuracao_pontuacao to service_role;
