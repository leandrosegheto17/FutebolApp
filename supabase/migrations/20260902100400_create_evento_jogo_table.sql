-- BE-02 — tabela `evento_jogo` (SDD.md Secao 5).
--
-- ROLLBACK: DROP TABLE IF EXISTS app.evento_jogo CASCADE; -- aditiva,
-- README.md.

create table app.evento_jogo (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references app.participacao_rodada (id) on delete restrict,
  tipo text not null,
  quantidade integer not null default 1,
  criado_em timestamptz not null default now(),
  constraint evento_jogo_tipo_check
    check (tipo in ('gol', 'cartao_amarelo', 'cartao_vermelho')),
  constraint evento_jogo_quantidade_check check (quantidade > 0)
);

comment on table app.evento_jogo is
  'SDD.md Secao 5. `tipo`: gol|cartao_amarelo|cartao_vermelho (RN-05). FK '
  'para `participacao_rodada` (nao para `atleta` diretamente) para que '
  'RF-02.6 (bloquear evento para ausente) seja garantido no proprio desenho '
  'do dado, nao so em codigo de aplicacao — nenhum evento_jogo pode existir '
  'sem uma linha de participacao (implementacao do bloqueio em si, incluindo '
  'checar o `status`, e escopo de BE-08).';

create index idx_evento_jogo_participacao_id on app.evento_jogo (participacao_id);

alter table app.evento_jogo enable row level security;

revoke all on app.evento_jogo from public;
revoke all on app.evento_jogo from anon;
grant all on app.evento_jogo to service_role;
