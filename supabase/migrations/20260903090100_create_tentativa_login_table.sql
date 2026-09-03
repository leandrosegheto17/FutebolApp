-- BE-04 (TASK.md Secao 3.1) — tabela `tentativa_login` (SDD.md Secao 2.1/7.1,
-- ADR-004/RNF-03/RNF-04): registra toda tentativa de login (sucesso e
-- falha) por IP, usada pelo Route Handler de login para decidir rate
-- limiting com backoff exponencial (5 tentativas erradas / 15 min por IP —
-- TASK.md Secao 1.3). Implementada em tabela Postgres propria, nunca em
-- servico externo (Redis ou equivalente), conforme RNF-04/GUARDRAILS.md
-- regra 25.
--
-- RLS habilitado deny-by-default (ADR-005, GUARDRAILS.md regra 5) — apenas
-- `service_role` acessa esta tabela.
--
-- ROLLBACK: DROP TABLE IF EXISTS app.tentativa_login CASCADE; -- aditiva
-- (nenhuma tabela/coluna existente e alterada por esta migration).

create table app.tentativa_login (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  sucesso boolean not null,
  tentado_em timestamptz not null default now()
);

comment on table app.tentativa_login is
  'ADR-004/RNF-03/RNF-04. Uma linha por tentativa de POST /api/auth/login '
  '(sucesso e falha, inclusive quando rejeitada por rate limiting antes de '
  'checar a senha — BE-04) — nunca associada a atleta/pessoa fisica (nao ha '
  'conta individual, RN-12). Algoritmo de decisao de bloqueio/backoff '
  'implementado em TypeScript (src/modules/autenticacao/rate-limit.ts), '
  'lendo esta tabela; decisao de detalhe documentada la (curva exponencial '
  'exata nao especificada literalmente pelo TASK.md/SDD.md, apenas o '
  'requisito "5 tentativas/15min com backoff exponencial").';
comment on column app.tentativa_login.ip is
  'Extraido de x-forwarded-for/x-real-ip da requisicao (BE-04) — dado '
  'operacional de seguranca (RNF-03), nao dado pessoal de atleta; escopo de '
  'retencao/expurgo desta tabela nao definido nesta tarefa (linhas fora da '
  'janela de 15 min nunca mais influenciam o calculo, mas nao ha purge '
  'automatico agendado ainda — fica como nota para o DevOps/DevSecOps '
  'avaliar se um job de limpeza periodica e necessario, nao bloqueia BE-04).';

create index idx_tentativa_login_ip_tentado_em
  on app.tentativa_login (ip, tentado_em desc);

alter table app.tentativa_login enable row level security;

revoke all on app.tentativa_login from public;
revoke all on app.tentativa_login from anon;
grant select, insert on app.tentativa_login to service_role;
