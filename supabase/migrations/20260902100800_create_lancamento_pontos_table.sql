-- BE-02 — tabela `lancamento_pontos` (SDD.md Secao 5) — ledger append-only
-- (ADR-006, GUARDRAILS.md regra 8): "nenhum codigo faz UPDATE/DELETE sobre um
-- lancamento ja gravado; correcao/estorno sempre insere um novo lancamento de
-- ajuste".
--
-- Nota de modelagem fisica (delegada pelo SDD.md Secao 5 ao Backend
-- Developer): o diagrama ER da Secao 5 desenha uma relacao
-- `PARTICIPACAO_RODADA ||--o{ LANCAMENTO_PONTOS : origina`, mas a lista de
-- campos de LANCAMENTO_PONTOS (mesma Secao 5) nao inclui uma coluna
-- `participacao_id` — so `atleta_id`/`rodada_id`. Interpretacao adotada (lista
-- de campos e a fonte mais especifica/autoritativa da fisica da tabela,
-- consistente com "nao e modelagem fisica detalhada... cabe ao Backend
-- Developer"): a relacao "origina" e satisfeita indiretamente por
-- (atleta_id, rodada_id) — RN-04/RN-05 corrigem/calculam por atleta+rodada,
-- nao por evento individual. Desvio de detalhe documentado, nao escalado.
--
-- Enforcement de append-only no proprio banco (alem da disciplina de codigo
-- já exigida por GUARDRAILS.md regra 8): trigger que bloqueia
-- UPDATE/DELETE incondicionalmente, valida mesmo para `service_role` (que
-- contorna RLS mas nao contorna trigger) — reforco estrutural direto do
-- guardrail, dentro do escopo de integridade de schema de BE-02.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.lancamento_pontos CASCADE; -- aditiva,
-- README.md.

create table app.lancamento_pontos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references app.atleta (id) on delete restrict,
  rodada_id uuid not null references app.rodada (id) on delete restrict,
  origem text not null,
  pontos_delta numeric not null,
  criado_em timestamptz not null default now(),
  constraint lancamento_pontos_origem_check
    check (origem in ('lancamento', 'correcao', 'estorno', 'migracao_legado'))
);

comment on table app.lancamento_pontos is
  'SDD.md Secao 5. Ledger append-only (ADR-006, GUARDRAILS.md regra 8) — '
  'saldo do atleta = pontuacao_inicial + soma de pontos_delta. Nunca '
  'UPDATE/DELETE (enforced por trigger nesta migration).';

create index idx_lancamento_pontos_atleta_id on app.lancamento_pontos (atleta_id);
create index idx_lancamento_pontos_rodada_id on app.lancamento_pontos (rodada_id);

alter table app.lancamento_pontos enable row level security;

revoke all on app.lancamento_pontos from public;
revoke all on app.lancamento_pontos from anon;
grant all on app.lancamento_pontos to service_role;

create function app.forbid_lancamento_pontos_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'lancamento_pontos e um ledger append-only (ADR-006, GUARDRAILS.md regra 8) — % nao e permitido; correcao/estorno sempre insere um novo lancamento de ajuste.',
    tg_op;
end;
$$;

comment on function app.forbid_lancamento_pontos_mutation() is
  'Bloqueia UPDATE/DELETE em app.lancamento_pontos incondicionalmente, mesmo '
  'para service_role (trigger executa independente de RLS bypass) — reforco '
  'estrutural do ledger append-only (ADR-006, GUARDRAILS.md regra 8).';

create trigger trg_lancamento_pontos_no_update
  before update on app.lancamento_pontos
  for each row execute function app.forbid_lancamento_pontos_mutation();

create trigger trg_lancamento_pontos_no_delete
  before delete on app.lancamento_pontos
  for each row execute function app.forbid_lancamento_pontos_mutation();
