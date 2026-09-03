-- BE-02 — tabela `substituicao` (SDD.md Secao 5).
--
-- CHECK atleta_sai_id <> atleta_entra_id: reforco estrutural (defesa em
-- profundidade) da regra de RF-06 ("tentar usar o mesmo atleta em 'sai' e
-- 'entra' e bloqueado com mensagem clara") — a mensagem clara em si e
-- responsabilidade da camada de API (BE-13); esta CHECK garante que a
-- invariante nunca seja violada mesmo por um caminho de escrita futuro que
-- esqueca a validacao de aplicacao.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.substituicao CASCADE; -- aditiva,
-- README.md.

create table app.substituicao (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references app.rodada (id) on delete restrict,
  time_id uuid not null references app.time (id) on delete restrict,
  atleta_sai_id uuid not null references app.atleta (id) on delete restrict,
  atleta_entra_id uuid not null references app.atleta (id) on delete restrict,
  criado_em timestamptz not null default now(),
  constraint substituicao_atletas_distintos_check check (atleta_sai_id <> atleta_entra_id)
);

comment on table app.substituicao is
  'SDD.md Secao 5. Registro de fidelidade historica (RF-06) — sem efeito em '
  'pontuacao (nenhuma FK/trigger desta tabela altera lancamento_pontos).';

create index idx_substituicao_rodada_id on app.substituicao (rodada_id);
create index idx_substituicao_time_id on app.substituicao (time_id);

alter table app.substituicao enable row level security;

revoke all on app.substituicao from public;
revoke all on app.substituicao from anon;
grant all on app.substituicao to service_role;
