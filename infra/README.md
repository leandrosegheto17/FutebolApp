# Infraestrutura como Código — Turma do Rola / Comary

**Dono**: DevOps Engineer (`infrastructure-as-code-provisioning` +
`cicd-pipeline-configuration`).
**Origem**: `SDD.md` Seção 3 (Stack Tecnológica) e Seção 6 (Riscos Técnicos e
Escalabilidade), `GUARDRAILS.md` (regras 25-27, 35-36), `CTO-REVIEW.md` (Gate 3).
**Fase atual**: preparação de infraestrutura/pipeline, em paralelo à
implementação (Backend/Frontend). **Nenhum deploy real ocorreu ainda** — os
workflows de deploy existem, prontos para serem acionados por
`deployment-execution` assim que houver dupla aprovação (QA + DevSecOps) sobre
um build.

---

## 1. Por que não há Terraform/CloudFormation aqui

A stack definida no SDD.md (Seção 3) é **Vercel (hobby/free) + Supabase
(BaaS)** — não há VPC, servidor, rede ou serviço de fila para provisionar via
IaC tradicional. Nesta stack, a "infraestrutura como código" real é:

- **Camada de dados (Supabase)**: schema, RLS, funções/triggers versionados
  como **migrations SQL** (`supabase/migrations/`), aplicadas via Supabase CLI
  — isso *é* o Terraform deste projeto para o banco.
- **Camada de hospedagem (Vercel)**: configuração de projeto versionada em
  `vercel.json` (headers, HSTS) + todo deploy acionado por pipeline (nunca por
  clique manual no dashboard) — ver Seção 3.
- **Pipeline (GitHub Actions)**: versionado em `.github/workflows/`.

Isso segue o framework `cicd-iac-foundations` (base neutra) adaptado à stack
já escolhida pelo Software Architect (não se usa Terraform apenas para "ter
Terraform" quando a plataforma BaaS já resolve provisionamento de banco/rede).

## 2. Estratégia de Ambientes

| Ambiente | Frontend/API | Banco (Supabase) | Deploy | Propósito |
|---|---|---|---|---|
| **Local/Dev** | `next dev` na máquina do desenvolvedor | Supabase local via CLI (`supabase start`, Docker) | Manual, individual | Desenvolvimento do dia a dia, zero custo, zero risco ao legado |
| **CI (efêmero)** | build/test no runner do GitHub Actions | Supabase local via CLI, subido e destruído a cada execução do pipeline | Automático, a cada push/PR | Testes automatizados (unitário + integração de RLS/migrations) sem tocar em qualquer projeto Supabase real — zero custo, isolamento total |
| **Staging** | Vercel Preview Deployment (alias fixo) | **Projeto Supabase separado, dedicado a staging** (tier gratuito) | Automático, a cada push em `main` | QA funcional (`QA-REPORT.md`), validação exploratória antes de produção, dados sintéticos/seed — nunca dado real do legado |
| **Produção** | Vercel Production | **Projeto Supabase legado reaproveitado** (`ipnbdrejlikrmqyxggsp`, ADR-002) | Manual (`workflow_dispatch`), gated por dupla aprovação QA + DevSecOps | Ambiente real, único ponto de verdade do organizador |

Justificativa: `infrastructure-as-code-provisioning` exige "ambientes
espelhados" (mesma definição de IaC, parâmetros diferentes) — staging e
produção aplicam exatamente as mesmas migrations SQL (`supabase/migrations/`)
e o mesmo `vercel.json`; o que muda é o projeto Supabase de destino e o alias
Vercel, nunca a definição.

**Nota de custo em aberto (não decidida unilateralmente aqui)**: o projeto
staging listado acima assume que a organização Supabase permite um segundo
projeto em tier gratuito além do legado. Isso **não foi confirmado** nesta
fase (sem acesso à conta Supabase real ainda — credenciais só chegam na fase
de execução, SDD.md Seção 6.1/SPK-01). Se, na prática, um segundo projeto
gratuito não for permitido pela conta existente, **não se cria um projeto
pago sem aprovação explícita do CTO** (Guardrail 25/RNF-04) — a alternativa de
zero custo garantido é reduzir staging a "CI efêmero apenas" (sem staging
navegável por QA) até essa confirmação, escalada ao CTO se bloquear
`QA-REPORT.md`. Registrar decisão em `BLOCKERS.md` se isso acontecer.

## 3. O que é manual vs. gerenciado por código

| Item | Manual (uma vez, fora de IaC) | Por quê |
|---|---|---|
| Criar o projeto Vercel e conectá-lo ao repositório GitHub | Sim | Vercel não expõe esse passo inicial via arquivo de config; feito uma única vez no dashboard/CLI (`vercel link`) |
| Criar o projeto Supabase de staging | Sim (condicionado à nota de custo acima) | Criação de projeto é ação de conta, não de código; após criada, todo o schema é 100% código (migrations) |
| Gerar tokens (`VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`) e configurá-los como GitHub Secrets | Sim | Segredo nunca é gerado nem versionado por pipeline — só referenciado (Guardrail 26) |
| Desabilitar deploy automático de produção pela integração nativa Git da Vercel (deixando só Preview automático) | Sim, uma vez, no Project Settings → Git da Vercel | Vercel não expõe esse toggle via `vercel.json`; sem isso, todo push em `main` iria para produção sem esperar dupla aprovação — violaria o gate |
| Tudo mais (schema, RLS, funções, headers, estágios do pipeline, rollback, gate de dupla aprovação) | Não — é código versionado | Ver Seções 4-6 |

## 4. Contrato de Secrets (nomes, não valores)

Nenhum valor real é versionado (Guardrail 26). Configurados como **GitHub
Actions Secrets** (nunca em `.env` commitado):

| Secret | Uso | Ambiente |
|---|---|---|
| `VERCEL_TOKEN` | Autentica CLI da Vercel no pipeline | staging + produção |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Identifica o projeto Vercel alvo | staging + produção |
| `SUPABASE_ACCESS_TOKEN` | Personal access token da Supabase CLI/Management API (gerar como usuário, sem custo) | staging + produção + monitoramento |
| `SUPABASE_STAGING_PROJECT_REF` / `SUPABASE_STAGING_DB_PASSWORD` | Aplica migrations no projeto de staging | staging |
| `SUPABASE_PROD_PROJECT_REF` (`ipnbdrejlikrmqyxggsp`) / `SUPABASE_PROD_DB_PASSWORD` | Aplica migrations no projeto legado — **só populado quando SPK-01 (SDD.md Seção 6.1) disponibilizar as credenciais reais na fase de execução** | produção |
| `SUPABASE_PROD_DB_URL` | Connection string Postgres completa, usada por `pg_dump` no job de backup lógico externo (ADR-009) — mesma condição de disponibilidade que a linha acima | produção |
| `SUPABASE_SERVICE_ROLE_KEY` (por ambiente Vercel) | Chave de serviço da API, injetada como variável de ambiente **server-side** da Vercel — nunca `NEXT_PUBLIC_*` (Guardrail 7) | staging + produção |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (por ambiente Vercel) | Config pública do cliente Supabase (RLS protege o resto) | staging + produção |
| `SESSION_COOKIE_SECRET` (por ambiente Vercel) | Assinatura do cookie de sessão da autenticação custom (ADR-004) | staging + produção |

As três últimas linhas acima são **variáveis de runtime da aplicação**
(nomes e schema de validação definidos e já implementados pelo Backend em
BE-01 — `.env.example` e `src/lib/config/env.ts`, confirmado nesta revisão),
não secrets do pipeline de deploy em si. O DevOps não as inventa: apenas as
configura como variáveis de ambiente do projeto na Vercel (por ambiente —
Preview/staging e Production), via dashboard ou `vercel env add`, e garante
que `vercel pull`/`vercel build` (usados em `deploy-staging.yml`/
`deploy-production.yml`) as puxem automaticamente antes do build. As demais
linhas da tabela (`VERCEL_*`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_*_PROJECT_REF`,
`SUPABASE_*_DB_PASSWORD`) são específicas do pipeline (GitHub Actions
Secrets), não da aplicação.

## 5. Estratégia de Rollback (resumo — detalhe em `.md/DEPLOY.md`)

- **Vercel**: rollback instantâneo via `vercel rollback <url-do-deployment-anterior>`
  (deployments são imutáveis; reatribuir o alias de produção ao deployment
  anterior é O(segundos), sem rebuild). Workflow dedicado:
  `.github/workflows/rollback-production.yml`.
- **Supabase**: a primeira migração para produção é **não-destrutiva por
  desenho** (ADR-008 — schema `app` nova ao lado da schema legada intocada);
  reverter o deploy de aplicação já é suficiente para "desligar" a escrita na
  schema nova sem qualquer ação de banco. Para migrations subsequentes
  (pós-go-live), a convenção (`supabase/migrations/README.md`) exige que toda
  migration destrutiva/irreversível tenha um plano de reversão documentado
  *antes* de ser aplicada em produção — nenhuma migration é "só de ida" sem
  essa nota.
- Este rollback precisa ser **testado** (não só documentado) contra staging
  antes do primeiro deploy real de produção — guardrail do próprio DevOps;
  registrado como pendência em `.md/DEPLOY.md`, a ser executado por
  `deployment-execution` quando o primeiro deploy acontecer.

## 6. Monitoramento do tier gratuito do Supabase (Guardrail 36)

Guardrail 36 (`GUARDRAILS.md`) exige monitoramento de consumo do tier do
Supabase desde o primeiro mês em produção, com gatilho quantitativo objetivo.
Implementado agora (antes mesmo do deploy) como
`.github/workflows/supabase-health-check.yml` — ver `.md/DEPLOY.md` Seção
"Observabilidade" para o detalhe completo (frequência, gatilho, canal de
alerta, e o que ainda depende de credenciais reais do projeto legado).

## 7. Referências

- `SDD.md` Seção 3 (Stack) e Seção 6 (Riscos)
- `GUARDRAILS.md` regras 1, 6, 7, 25, 26, 27, 35, 36
- `adr/002-adotar-supabase-legado-como-plataforma-de-dados.md` (Plano de Saída)
- `adr/008-migracao-nao-destrutiva-preservando-historico-legado.md`
- `adr/009-estrategia-de-backup-e-recuperacao.md`
- `.md/DEPLOY.md` (registro formal para o CTO)
