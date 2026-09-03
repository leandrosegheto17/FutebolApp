# Convenção de Migrations — Turma do Rola / Comary

Esta pasta é a **infraestrutura como código da camada de dados** (ver
`infra/README.md` Seção 1). O conteúdo SQL de cada migration (schema `app`,
RLS, funções/triggers de atomicidade, views públicas) é responsabilidade do
Backend (`SDD.md` Seções 2.1/5, ADRs 005/006/008/011) — esta convenção é
definida pelo DevOps para que o pipeline saiba aplicar/reverter de forma
previsível, não para prescrever o schema em si.

## Nomenclatura

Padrão do Supabase CLI: `supabase/migrations/<timestamp>_<descricao_curta>.sql`
(gerado por `supabase migration new <descricao_curta>`). Nunca editar um
arquivo de migration já aplicado em staging ou produção — mudança sempre é
uma nova migration (mesmo princípio de imutabilidade dos ADRs,
`GUARDRAILS.md` regra 4, aplicado aqui à camada de dados).

## Idempotência e reexecução (ADR-008, `GUARDRAILS.md` regra 11)

Toda migration relacionada à migração do legado (RF-08) é **idempotente e
reexecutável** — nenhuma assume que roda uma única vez sem erro. Migrations
de schema "normais" (criar tabela/coluna/função) seguem a garantia padrão do
Supabase CLI (registradas em `supabase_migrations.schema_migrations`, cada uma
aplicada uma única vez por ambiente).

## Regra de rollback (pré-condição de deploy em produção)

Nenhuma migration é **só de ida**: toda migration que altera ou remove uma
estrutura já existente (não apenas `CREATE TABLE IF NOT EXISTS` aditivo) deve
incluir, no topo do arquivo, um comentário `-- ROLLBACK:` com o SQL (ou passo
manual) que desfaz a mudança. O estágio de CI (`ci.yml`) verifica
mecanicamente que todo arquivo de migration que contém `DROP`/`ALTER
...DROP`/`ALTER ...ALTER COLUMN` também contém um bloco `-- ROLLBACK:` —
falha o build caso contrário. Isso é o que torna "rollback testado" (não só
documentado) possível antes de qualquer deploy em produção, conforme
guardrail do DevOps.

A **primeira migração para produção** (criação da schema `app` ao lado da
schema legada intocada, RF-08/ADR-008) é aditiva por desenho — não precisa de
rollback de dados: reverter o deploy da aplicação já é suficiente, porque a
schema legada nunca é tocada até validação explícita (RF-08.5/RF-08.6).

## Ambiente de destino

| Ambiente | Como a migration chega lá |
|---|---|
| Local/CI | `supabase db reset` / `supabase start`, aplicado sempre do zero a cada execução |
| Staging | `supabase db push` automático, a cada push em `main` (`.github/workflows/deploy-staging.yml`) |
| Produção (projeto legado `ipnbdrejlikrmqyxggsp`) | `supabase db push` manual, só dentro de `.github/workflows/deploy-production.yml`, e só depois de: (a) dupla aprovação QA+DevSecOps, (b) para `BE-15` especificamente, o adendo de "plano de saída" do ADR-002 aceito (`GUARDRAILS.md` regra 35, `BLOCKERS.md` BLOCKER-003) |

Nenhum arquivo de migration deste diretório tem permissão de escrita
destrutiva sobre as tabelas da schema legada (`GUARDRAILS.md` regra 11) — a
schema legada não é sequer referenciada por nome de schema `app`.
