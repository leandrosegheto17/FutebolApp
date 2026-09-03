-- BE-02 — tabela `log_auditoria` (SDD.md Secao 5, atualizada pelo Anexo A/
-- ADR-011: ganhou `atleta_id`/`tipo_evento`).
--
-- Nota explicita de limite (Secao 1.0 do TASK.md — "nao esconder incerteza"):
-- esta migration NAO valida em nivel de banco que `valores_antes` contenha
-- apenas marcadores redigidos quando `tipo_evento = 'anonimizacao'`
-- (GUARDRAILS.md regra 20) — verificar isso via CHECK constraint exigiria
-- inspecionar o conteudo semantico de um jsonb livre, o que nao e viavel de
-- forma generica em SQL. A garantia real e de responsabilidade da funcao
-- `anonimizar_atleta` (ADR-011, BE-07), que grava exclusivamente os
-- marcadores redigidos — TODO rastreavel para BE-07/revisao de seguranca
-- (`security-implementation-check`) confirmar isso no codigo da funcao.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.log_auditoria CASCADE; -- aditiva,
-- README.md.

create table app.log_auditoria (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid references app.rodada (id) on delete restrict,
  atleta_id uuid references app.atleta (id) on delete restrict,
  tipo_evento text not null,
  ocorrido_em timestamptz not null default now(),
  valores_antes jsonb,
  valores_depois jsonb,
  constraint log_auditoria_tipo_evento_check
    check (tipo_evento in ('correcao', 'estorno', 'anonimizacao'))
);

comment on table app.log_auditoria is
  'SDD.md Secao 5/Anexo A. Nenhuma coluna de autor individual (RN-12, '
  'GUARDRAILS.md regra 18). `rodada_id`/`atleta_id` nullable — '
  'correcao/estorno de rodada preenche rodada_id; anonimizacao preenche '
  'atleta_id (rodada_id nulo).';
comment on column app.log_auditoria.valores_antes is
  'Para tipo_evento = anonimizacao: SEMPRE marcadores redigidos, nunca o '
  'dado pessoal real (GUARDRAILS.md regra 20) — garantia aplicada em '
  'codigo pela funcao anonimizar_atleta (ADR-011, BE-07), nao pelo schema.';

create index idx_log_auditoria_rodada_id on app.log_auditoria (rodada_id);
create index idx_log_auditoria_atleta_id on app.log_auditoria (atleta_id);
create index idx_log_auditoria_ocorrido_em on app.log_auditoria (ocorrido_em desc);

alter table app.log_auditoria enable row level security;

revoke all on app.log_auditoria from public;
revoke all on app.log_auditoria from anon;
grant all on app.log_auditoria to service_role;
