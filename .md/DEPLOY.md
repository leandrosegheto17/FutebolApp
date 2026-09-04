# DEPLOY.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: DevOps Engineer
**Status**: **RECONCILIADO EM 2026-09-04 — publicação real de produção
detectada, ocorrida fora do fluxo governado deste agente.** As Seções
7.1/7.2 abaixo registram duas tentativas de `deployment-execution`
(L0, L6) que este agente conduziu e classificou como
SIMULADO/BLOQUEADO, por três pré-requisitos de infraestrutura então
ausentes. Essa leitura está **desatualizada**: evidência coletada
diretamente pelo usuário (fora deste fluxo simulado, presumivelmente
numa sessão paralela) e reportada a este agente mostra que **um deploy
real de produção já aconteceu** — `npx vercel ls futebol-app` lista 8
deploys de Produção (o mais recente com ~1h no momento da checagem,
status "Ready"), publicados em `https://futebol-app-lsm.vercel.app`,
respondendo HTTP 200 e com `/api/health` retornando `{"status":"ok"}`.
`main` está sincronizado com `origin/main` (commit `4c57be7`, confirmado
por este agente via `git log`/`git status`), contendo os Lotes L0-L6.
Os itens (a) e (c) do bloqueio registrado nas Seções 7.1/7.2 —
respectivamente "nenhum secret de CI/CD" e "código não commitado em
`main`" — **não são mais verdade**: os secrets de ambiente Production
existem na Vercel (`vercel env ls production` confirmado pelo usuário) e
o código está commitado e sincronizado. Ver Seção 7.3 (novo) para o
registro completo desta reconciliação, incluindo o que **não foi
verificado** (secrets do GitHub Actions, se o ambiente deveria ter
passado por staging antes), e a Seção 10, item 0, para a reavaliação de
urgência de `DEBT-03` (CSP ausente, confirmado ainda ausente em produção
real) e do rollback nunca testado — ambos eram tratados como
pré-condição "antes do primeiro deploy real de produção"; esse deploy já
ocorreu, portanto passam a ser lacunas **ativas em produção agora**, não
mais preparação futura. **Nenhuma ação de infraestrutura foi executada
por este agente** nesta reconciliação — apenas leitura/registro
documental a partir de evidência já coletada pelo usuário.
**Atualização 2026-09-04 (Seção 7.5)**: os secrets do GitHub Actions foram
configurados e o Guardrail 36 (monitoramento de pausa/status do tier
gratuito do Supabase) foi confirmado **ativo por execução real**
(`ACTIVE_HEALTHY`) — ver Seção 4/7.5/10 para o registro completo e as
ressalvas do que ainda não foi testado (workflows de deploy/rollback
governados, gate mecânico de dupla aprovação em execução real).
Este documento continuará a ser atualizado incrementalmente
(`deployment-execution`, `observability-setup`,
`non-functional-requirement-validation`, `deploy-report-drafting`).
**Input de origem**: `SDD.md` Seção 3 (Stack Tecnológica) e Seção 6 (Riscos
Técnicos e Escalabilidade); `GUARDRAILS.md` (regras 1, 6, 7, 25-27, 35-36);
`CTO-REVIEW.md` Gate 3 (decisão de orçamento e monitoramento herdado).
**Skills aplicadas nesta revisão**: `infrastructure-as-code-provisioning`,
`cicd-pipeline-configuration` (com apoio de `cicd-iac-foundations` como base
conceitual, adaptada à stack já escolhida).

---

## 1. Infraestrutura como Código Provisionada

A stack (`SDD.md` Seção 3) é **Vercel (hobby/free) + Supabase (BaaS)** — não
há rede/servidor/fila para modelar em Terraform tradicional. "IaC" nesta
stack é:

| Componente do SDD.md (Seção 3) | Onde está versionado | Formato |
|---|---|---|
| Schema `app`, RLS, funções/triggers de atomicidade, views públicas (Postgres/Supabase) | `supabase/migrations/*.sql` | Supabase CLI migrations, aplicadas via `supabase db push` |
| Configuração local/CI do stack Supabase | `supabase/config.toml` | Supabase CLI config |
| Hospedagem frontend/API (Vercel) | `vercel.json` | Headers de segurança (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, **Content-Security-Policy — adicionada em 2026-09-04, ver Seção 10.1**), framework/build command |
| Pipeline de CI/CD | `.github/workflows/*.yml` | GitHub Actions |
| Convenções/racional de todo o acima | `infra/README.md` | Documentação versionada |

Detalhe completo da decisão (por que não Terraform, o que é manual vs.
código, contrato de secrets) em `infra/README.md` — não duplicado aqui.

### 1.1 Critério de aceite (`infrastructure-as-code-provisioning`)

- [x] Todo componente da Seção 3 do SDD.md relevante a hospedagem/banco tem
      definição de IaC correspondente (tabela acima).
- [x] Staging e produção derivam da **mesma base de IaC** (mesmas migrations
      SQL, mesmo `vercel.json`) — o que muda é o projeto Supabase de destino
      e o alias Vercel, nunca a definição (`infra/README.md` Seção 2).
- [x] Infraestrutura dimensionada conforme a escalabilidade esperada do
      SDD.md Seção 6 (volume baixo — dezenas de atletas, uma rodada semanal —
      plenamente coberto pelo tier gratuito de ambas as plataformas; nenhum
      componente adicional de escala foi provisionado por não haver sinal que
      o justifique).
- [x] Nenhum secret em texto plano na definição de infraestrutura — todos os
      valores reais ficam em GitHub Actions Secrets / variáveis de ambiente
      da Vercel (contrato de nomes em `infra/README.md` Seção 4).
- [x] Nenhuma limitação real foi encontrada ainda que exija sinalização ao
      Software Architect — a única pendência é uma **suposição a confirmar**
      (item 5.1 abaixo), não uma limitação já observada.

## 2. Pipeline de CI/CD Configurado

| Estágio | Workflow | Gate (falha o build se não passar) |
|---|---|---|
| Build, Lint, Typecheck, Format check, Teste automatizado | `.github/workflows/ci.yml` (job `build-and-test`) | Sim — a cada push/PR em `main` |
| Scan de segurança (segredos via gitleaks + dependências via `npm audit`) | `.github/workflows/ci.yml` (job `security-scan`) | Sim |
| Convenção de rollback de migration (bloco `-- ROLLBACK:` obrigatório em migration destrutiva) | `.github/workflows/ci.yml` (job `migration-convention-check`) | Sim |
| Deploy staging (automático) | `.github/workflows/deploy-staging.yml`, acionado quando `CI` conclui com sucesso em `main` | Aplica migrations no Supabase de staging + deploy Vercel Preview, alias fixo |
| Deploy produção (manual, gated) | `.github/workflows/deploy-production.yml`, `workflow_dispatch` | Gate automático lê `.md/QA-REPORT.md` e `.md/SECURITY-REVIEW.md` do commit; bloqueia (fail-closed) se não encontrar veredito de aprovação reconhecível, ou se encontrar reprovação/achado bloqueante |
| Rollback produção | `.github/workflows/rollback-production.yml`, `workflow_dispatch` | Reatribui alias Vercel ao deployment anterior (segundos, sem rebuild) |
| Monitoramento tier Supabase (Guardrail 36) | `.github/workflows/supabase-health-check.yml`, cron diário | Ver Seção 4 |
| Backup lógico externo (ADR-009) | `.github/workflows/supabase-backup-export.yml`, cron semanal | `pg_dump` comprimido publicado como GitHub Release (destino externo ao Supabase); falha do job abre Issue de alerta visível — nunca falha em silêncio |
| Expurgo de `app.tentativa_login` (`DEBT-07`, minimização de dados) | `.github/workflows/tentativa-login-purge.yml`, cron diário (10:00 UTC) | `DELETE` via `psql`/`SUPABASE_PROD_DB_URL` de linhas com `tentado_em` mais antigo que 72h; falha do job abre Issue de alerta (`tentativa-login-purge-alerta`) — nunca falha em silêncio. Ver Seção 10.2 para o registro do que foi validado e do que segue pendente (execução real contra produção) |

### 2.1 Critério de aceite (`cicd-pipeline-configuration`)

- [x] Todos os estágios (build, lint, teste, scan de segurança, deploy)
      configurados.
- [x] Nenhum segredo exposto em log do pipeline — todo valor sensível vem de
      `secrets.*`, nunca hardcoded; job de scan de segredos roda a cada CI.
- [x] Gate de produção exige dupla aprovação (QA + DevSecOps), nunca deploy
      automático sem checagem — implementado como verificação mecânica de
      `.md/QA-REPORT.md`/`.md/SECURITY-REVIEW.md`, **fail-closed** (bloqueia
      por padrão se o formato não for reconhecido; nunca libera por omissão).
- [x] Falha em qualquer estágio produz log diagnosticável (`::error::` com
      contexto específico em cada verificação, não só "falhou").

### 2.2 Convenção combinada com QA/DevSecOps (dependência a confirmar)

O gate automático de `deploy-production.yml` procura a string `Veredito`
seguida de `Aprovado` em `.md/QA-REPORT.md`, e a string `Aprovado` em
`.md/SECURITY-REVIEW.md` (rejeitando se houver `Reprovado`/`bloqueia deploy`
respectivamente). Nem `qa.md` nem `devsecops.md` fixam um formato rígido de
cabeçalho para esses artefatos — esta é uma convenção mínima que o DevOps
está propondo para viabilizar automação, não uma imposição unilateral de
formato sobre QA/DevSecOps. **Se o formato divergir na prática**, o gate
falha (comportamento seguro — nunca libera por engano), mas exige ajuste
deste grep ou do formato do relatório antes do primeiro deploy real.

**Atualização 2026-09-04 (Seção 7.5)**: os 6 secrets que `deploy-production.yml`
(e `rollback-production.yml`) precisam para sequer iniciar
(`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_PROD_PROJECT_REF`, `SUPABASE_PROD_DB_URL`) foram configurados no
repositório e confirmados via `gh secret list` — a lacuna de infraestrutura
que impedia esses dois workflows de sequer rodar deixou de existir.
**Isso não equivale a dizer que o gate mecânico de dupla aprovação foi
exercitado**: nenhum `workflow_dispatch` de `deploy-production.yml` ou de
`rollback-production.yml` foi disparado nesta sessão — apenas
`supabase-health-check.yml` foi executado e confirmado com sucesso (Seção
7.5). A convenção de formato acima (grep por `Veredito`/`Aprovado`) segue
validada apenas por leitura de código, nunca por uma execução real do
workflow contra um `QA-REPORT.md`/`SECURITY-REVIEW.md` de verdade.

## 3. Estratégia de Ambientes

Ver `infra/README.md` Seção 2 para a tabela completa. Resumo:

- **Local/Dev**: `next dev` + Supabase local via CLI (Docker) — zero custo.
- **CI (efêmero)**: sobe e derruba um stack Supabase local a cada execução —
  zero custo, zero risco ao legado (ainda não implementado no `ci.yml`
  atual — Backend/QA rodam testes de integração de banco localmente por ora;
  registrado como melhoria futura, não bloqueante desta fase).
- **Staging**: Vercel Preview (alias fixo) + projeto Supabase **separado**,
  dedicado a staging.
- **Produção**: Vercel Production + projeto Supabase **legado reaproveitado**
  (`ipnbdrejlikrmqyxggsp`, ADR-002).

## 4. Observabilidade — Monitoramento do Tier Gratuito do Supabase (Guardrail 36)

Implementado agora, antes mesmo do primeiro deploy, por exigência explícita
do CTO (`CTO-REVIEW.md` Gate 3) e do solicitante desta execução:
`.github/workflows/supabase-health-check.yml`.

- **Frequência**: diária (folga confortável frente à janela de ~7 dias de
  pausa por inatividade do tier gratuito do Supabase).
- **Mecanismo**: chama a Management API do Supabase (`GET
  /v1/projects/{ref}`) e verifica o campo `status`; qualquer resposta HTTP
  diferente de 200, ou `status` diferente de `ACTIVE_HEALTHY`, é o **gatilho
  quantitativo objetivo** (detecção de pausa/degradação) exigido pela regra
  36.
- **Alerta**: abre (ou comenta, se já aberta) uma Issue no GitHub com label
  `supabase-alerta` — canal gratuito, nativo do GitHub, visível a quem
  observa o repositório; nenhum serviço de terceiro pago introduzido
  (Guardrail 25).
- **Status atual: [SUPERADO — ver atualização abaixo] ATIVO, confirmado por
  execução real em 2026-09-04.** Texto original desta seção (histórico,
  mantido por rastreabilidade): "o workflow está pronto, mas em modo
  pendente de ativação — depende de `SUPABASE_ACCESS_TOKEN` e
  `SUPABASE_PROD_PROJECT_REF`, que só existem depois que as credenciais do
  projeto legado forem disponibilizadas na fase de execução (SDD.md Seção
  6.1, spike `SPK-01`). Enquanto ausentes, o job identifica a ausência e
  encerra sem erro (`::notice::`), não falha silenciosamente disfarçado de
  sucesso."
- **Atualização 2026-09-04 — Guardrail 36 ATIVO, confirmado por execução
  real, não apenas por presença de secret (ver Seção 7.5 para o registro
  completo)**: os 6 secrets de produção (`VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_PROJECT_REF`,
  `SUPABASE_PROD_DB_URL`) foram configurados via `gh secret set`, confirmados
  em `gh secret list`. Com `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROD_PROJECT_REF`
  presentes, `supabase-health-check.yml` foi disparado manualmente
  (`gh workflow run`, `workflow_dispatch`):
  - Run: `https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716`
    (run #2) — **Success**, job concluído em 7s.
  - Log do step "Consulta status do projeto (Supabase Management API)":
    retornou **`ACTIVE_HEALTHY`**, confirmado pelo usuário.
  - Nenhuma Issue `supabase-alerta` criada (esperado — status saudável).
  - O cron diário (09:00 UTC) passa a rodar de verdade a partir de hoje,
    não mais em modo pendente.
  - **Ressalva de escopo, não coberta por esta ativação**: isto confirma
    apenas o gatilho de **pausa/status** do tier gratuito do Supabase
    (Guardrail 36, sub-item de maior probabilidade prática — Seção 6.2 do
    SDD.md). Não confirma observabilidade geral da aplicação (logs
    estruturados, métricas de erro/latência, alertas de aplicação em
    produção), que segue **não implementada** — ver Seção 8/9. O segundo
    gatilho da regra 36 (percentual de cota) permanece como checagem manual
    mensal, sem mudança (ver limitação já registrada abaixo).
- **Limitação reconhecida (não resolvida ainda)**: o gatilho acima cobre
  **pausa/degradação de status**, que é o risco de maior probabilidade
  prática (Seção 6.2 do SDD.md). Não cobre ainda o segundo gatilho sugerido
  pela regra 36 ("70-80% de qualquer cota do tier gratuito" — ex.: tamanho de
  banco, linhas, bandwidth), porque a Management API pública do Supabase para
  consulta de consumo percentual de cota não teve endpoint estável
  confirmado nesta pesquisa (sem acesso à conta real ainda). **Mitigação
  interina**: até esse endpoint ser confirmado/implementado, checagem manual
  mensal do painel "Usage" do Supabase Dashboard fica registrada como tarefa
  recorrente do DevOps a partir do primeiro mês em produção — não é
  automação completa, mas cumpre o espírito da regra 36 sem inventar uma
  chamada de API não confirmada. Revisar assim que houver acesso à conta real
  (fase de execução).

## 5. Estratégia de Rollback

Detalhe completo em `infra/README.md` Seção 5. Resumo do estado atual:

- **Mecanismo**: `vercel rollback` (Vercel), reatribuição instantânea de
  alias — workflow `.github/workflows/rollback-production.yml`.
- **Dados (Supabase)**: primeira migração de produção é não-destrutiva por
  desenho (ADR-008); migrations subsequentes exigem bloco `-- ROLLBACK:`,
  verificado mecanicamente no CI (Seção 2).
- **Status de teste**: **TESTADO DE FATO em produção real, em 2026-09-04
  18:02 (horário local)** — ver Seção 7.4 para o registro completo da
  execução (comandos exatos, verificações antes/depois/restauração). O
  mecanismo `vercel rollback` foi exercitado de ponta a ponta contra a
  produção real (`futebol-app` / alias `futebol-app-lsm.vercel.app`):
  rollback para o deployment anterior, confirmação de saúde, e restauração
  ao deployment atual, todos com verificação HTTP real, não simulada. Isso
  **resolve** o item 1 do Tier 1 de `CTO-REVIEW.md` ("Consolidação de
  Pendências Reais da v1", 2026-09-04) e a pendência histórica desta
  Seção/Seção 10 item 0 ("rollback nunca testado"). Ressalva que permanece,
  não coberta por este teste (não pode ser inflada como resolvida): o
  rollback do Vercel só reatribui alias de frontend/API — **não** testa
  reversão de migration de Supabase; essa continua dependendo da disciplina
  de bloco `-- ROLLBACK:` verificada no CI (Seção 2), nunca exercitada de
  fato em produção porque, felizmente, nenhuma migration destrutiva foi
  aplicada ainda contra o legado.

## 5.1 Suposição registrada, pendente de confirmação

`infra/README.md` Seção 2 assume que a organização Supabase permite um
segundo projeto em tier gratuito, dedicado a staging, além do legado
reaproveitado (ADR-002).

**Atualizado em 2026-09-03 (tentativa de deploy de L0)**: há uma sessão CLI
local autenticada neste ambiente (login pessoal, fora do fluxo de secrets do
GitHub Actions) que permitiu uma checagem real e não-destrutiva:
`supabase projects list` retorna **apenas dois projetos** na organização —
`futebol-ranking` (`ipnbdrejlikrmqyxggsp`, o legado reaproveitado de
produção, ADR-002) e `mymoney` (projeto não relacionado a este sistema, no
mesmo tier gratuito da mesma organização). **Não existe ainda um projeto
Supabase dedicado a staging.** A suposição desta seção, portanto, segue
**não confirmada positivamente nem negativamente** quanto a permissão de um
segundo projeto gratuito — só ficará confirmada quando o projeto de fato for
criado com sucesso (ou recusado) pela plataforma.

- Criar esse projeto agora seria tecnicamente possível com a sessão CLI
  disponível, mas **este agente optou por não fazê-lo unilateralmente**:
  provisionar um recurso real numa conta pessoal compartilhada com outro
  projeto (`mymoney`) consome cota da mesma organização e é uma decisão de
  infraestrutura com efeito fora do escopo estritamente documental desta
  tentativa de deploy — por isso fica registrada como **pendência explícita
  para confirmação do usuário/CTO antes da próxima tentativa**, não como
  bloqueio silencioso.
- Se confirmado (projeto criado com sucesso): nenhuma ação adicional além de
  configurar `SUPABASE_STAGING_PROJECT_REF`/`SUPABASE_STAGING_DB_PASSWORD`
  como secrets do repositório — staging passa a funcionar como desenhado.
- Se **não** for permitido sem upgrade pago: staging fica reduzido a "CI
  efêmero apenas" (sem ambiente navegável por QA) até resolução — e a
  criação de um projeto Supabase pago **não é decidida por este agente**,
  exige aprovação explícita do CTO (Guardrail 25/RNF-04). Se isso bloquear
  `QA-REPORT.md`, será registrado em `BLOCKERS.md` no momento em que a
  informação real estiver disponível.

## 6. Validação contra Requisitos Não Funcionais (preliminar)

`non-functional-requirement-validation` roda de forma completa apenas quando
houver aplicação implantada em staging/produção para medir. Nesta fase,
validação possível é só de **desenho**:

| RNF | Verificação de desenho possível agora | Pendente para quando houver deploy real |
|---|---|---|
| RNF-04 (custo mínimo/zero) | Toda infraestrutura desenhada usa exclusivamente tiers gratuitos (Vercel hobby, Supabase free, GitHub Actions dentro do limite gratuito de minutos, gitleaks/npm audit open-source) — nenhum serviço pago introduzido | Confirmar consumo real de minutos de CI/CD e de cota Supabase após uso real |
| RNF-05 (backup/recuperação) | PITR nativo (Supabase) + exportação lógica agendada (ADR-009), implementada em `supabase-backup-export.yml` (semanal, destino externo, retenção de 12 backups ≈ 3 meses, falha visível) | Testar restauração pelo menos uma vez antes de produção |
| RNF-06 / Seção 6.2 do SDD.md (janela de retenção de backup vs. anonimização LGPD Art. 18) | Política de retenção definida e aplicada automaticamente: **12 backups semanais (~3 meses)**, expurgo automático dos mais antigos a cada execução — responde diretamente ao item da Seção 6.2 atribuído ao DevOps ("documentar a janela de retenção de backup vigente para informar ao titular se solicitado") | Nenhuma — política já é o estado final; revisar só se o volume de pedidos de anonimização crescer a ponto de exigir expurgo ativo antes do prazo natural de 3 meses (condição já prevista no SDD.md Seção 6.3) |
| RNF-07/RNF-09 (mobile-first, compat. navegadores) | Fora do escopo de infraestrutura — validado por QA/Frontend | — |

**Atualizado nesta revisão**: o job de exportação lógica externa (ADR-009)
foi implementado (`supabase-backup-export.yml`), incluindo política de
retenção (12 backups semanais, ~3 meses) que responde ao item pendente da
Seção 6.2 do SDD.md. Como os demais workflows desta fase, fica em modo
pendente de ativação até `SUPABASE_PROD_DB_URL` existir (pós-`SPK-01`).

## 7. Execuções de Deploy

### 7.1 Lote L0 — Staging — 2026-09-03 — SIMULADO (bloqueado por pré-requisito de infraestrutura, não por código)

**Gate de dupla aprovação (pré-condição do próprio `deployment-execution`)**:
satisfeito — `.md/EXECUTION-LOG.md` (entrada L0) registra QA `Aprovado com
ressalvas` e DevSecOps `Aprovado com débito registrado` sobre o mesmo build.
Débitos de QA e `DEBT-01/02/03/04` de segurança são de baixa/média
severidade, com prazo definido, e não bloqueiam staging (só `DEBT-03`/
`DEBT-04` têm prazo antes de produção — Seção 10).

**Verificação de pré-requisito de segurança específico deste deploy**:
confirmado que a correção do achado crítico `CRIT-01`
(CVE-2025-29927/GHSA-f82v-jwr5-mffw) está de fato refletida no que seria
publicado:
- `package.json` e `package-lock.json` (working tree) declaram
  `"next": "14.2.35"`.
- `npx next --version` no ambiente de execução confirma `Next.js v14.2.35`
  de fato instalado (não só declarado no manifesto).
- Build de produção local (`npm run build`, com variáveis de ambiente
  dummy só para viabilizar o build — nenhum valor real usado) **compilou e
  gerou todas as 9 rotas com sucesso**, confirmando que o código do
  repositório é buildável nesta versão do Next.js antes de qualquer
  tentativa de publicação real.

**Por que o resultado é SIMULADO, não um deploy real**:
1. **Nenhuma credencial de deploy governada existe neste repositório.** O
   workflow real (`deploy-staging.yml`) depende dos secrets do GitHub
   Actions `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`,
   `SUPABASE_STAGING_DB_PASSWORD` — nenhum está configurado no repositório
   (verificação: o próprio workflow falharia rápido no passo "Verifica
   secrets obrigatórios"). Sem eles, o pipeline de CI/CD real não pode
   rodar, e este agente não os inventa.
2. **Não existe projeto Supabase de staging para apontar.** Confirmado por
   checagem real via sessão CLI local autenticada (Seção 5.1): a
   organização só tem o projeto legado de produção e um projeto não
   relacionado — nenhum staging dedicado ainda.
3. **O código do lote L0 (fix de `CRIT-01`) ainda não foi commitado/enviado
   a `main`.** `git status` no momento desta execução mostra
   `package.json`/`package-lock.json` modificados na working tree, não
   commitados — o gatilho real do pipeline (`workflow_run` de `CI` bem-
   sucedido em `main`) nunca dispararia sobre este estado. HEAD atual:
   `3453a5a` (não contém o fix). Commitar/dar push não é decisão deste
   agente tomar unilateralmente fora do fluxo combinado do pipeline.
4. **Uma sessão CLI local (Vercel/Supabase) está autenticada neste
   ambiente** (login pessoal do usuário, fora do fluxo de secrets do GitHub
   Actions) e teoricamente permitiria disparar um deploy real "por fora" do
   pipeline governado. Este agente **optou deliberadamente por não usá-la
   para publicar nada real**: contorná-la pularia os gates de CI/CD (build,
   lint, teste, scan de segurança, convenção de rollback de migration —
   Seção 2), tocaria uma conta pessoal compartilhada com outro projeto sem
   confirmação explícita, e não haveria commit real para atribuir ao
   deploy. Usar a sessão apenas para leitura (`whoami`, `projects list`) foi
   considerado seguro e não-destrutivo; usá-la para escrita não foi.

| Versão/Commit | Ambiente | Horário | Resultado |
|---|---|---|---|
| L0 — fix `next@14.2.35` (working tree sobre `3453a5a`, ainda não commitado) | Staging | 2026-09-03 | **Simulado/bloqueado** — build local validado com sucesso; publicação real não ocorreu por ausência de (a) secrets de CI/CD no repositório, (b) projeto Supabase de staging dedicado, (c) commit do fix em `main`. Nenhum incidente, porque nenhuma publicação real aconteceu. |

**Próximos passos para que a próxima tentativa seja um deploy real** (nenhum
decidido unilateralmente por este agente):
1. Commitar/dar push do fix de L0 para `main` (dono: Backend/Tech Lead,
   conforme fluxo combinado).
2. Confirmar com o usuário/CTO a criação de um projeto Supabase de staging
   dedicado (Seção 5.1) e configurar os 6 secrets listados acima no
   repositório GitHub.
3. Reexecutar `deployment-execution` — a essa altura o `deploy-staging.yml`
   dispara automaticamente no próximo push bem-sucedido em `main`, sem nova
   pausa (conforme `EXECUTION-FLOW.md` §6/§2.5).

### 7.2 Lote L6 — Staging — 2026-09-04 — SIMULADO (bloqueado pelos mesmos 3 pré-requisitos de infraestrutura de L0, ainda não resolvidos)

**Gatilho**: usuário confirmou explicitamente autorização para prosseguir
com o deploy em staging do Lote L6 (Montagem de Times, Restrições e
Substituições — `BE-11`, `BE-12`, `BE-13`, `FE-09`, `FE-10`, `FE-11`).
Produção não faz parte deste pedido e não foi disparada.

**Gate de dupla aprovação (pré-condição do próprio `deployment-execution`)**:
satisfeito, verificado por leitura direta dos 3 artefatos, não apenas do
resumo do usuário:
- `QA-REPORT.md` Seção 11 — veredito agregado "Lote L6... Aprovado com
  ressalvas" (5 das 6 tarefas aprovadas sem ressalva; `FE-10` com 1 débito
  de baixa severidade não bloqueante, `BUG-QA-FE10-01`, acessibilidade).
- `SECURITY-REVIEW.md` Seções 18-28 — veredito "Lote L6... APROVADO", sem
  débito novo; débitos herdados (`DEBT-01`/`02`/`04`) reconfirmados sem
  mudança de severidade/prazo; nenhum achado crítico/alto.
- `EXECUTION-LOG.md`, entrada "Lote L6" — Tech Lead aprovou o fechamento do
  lote, nenhuma tarefa reaberta.

**Verificações executadas por este agente antes de tentar publicar (não
apenas aceite dos relatos de QA/DevSecOps)**:

| Verificação | Comando/método | Resultado |
|---|---|---|
| Build de produção local, árvore de trabalho atual (mesmas variáveis dummy de L0, nenhum valor real) | `npm run build` | ✅ `Compiled successfully`, 30 rotas geradas, incluindo as 4 rotas de API novas do lote (`/api/times/sugestao`, `/api/rodadas/[id]/times`, `/api/restricoes` + `[id]`/`desativar`/`reativar`, `/api/rodadas/[id]/substituicoes`) e as 2 páginas novas (`/times`, `/restricoes`) |
| Versão do Next.js de fato instalada (reconfirmação do fix de `CRIT-01`, L0) | `npx next --version` | ✅ `14.2.35`, inalterado desde L0 |
| Smoke test das 4 rotas novas — exigem sessão (mesmo padrão já validado por QA Seção 11/DevSecOps Seção 22) | `npm run start` local (porta 3100, variáveis dummy) + `curl` sem cookie de sessão contra `POST /api/times/sugestao`, `POST /api/rodadas/{id}/times`, `GET /api/restricoes`, `GET /api/rodadas/{id}/substituicoes` | ✅ **401 nas 4 rotas**, sem cookie de sessão; `GET /api/health` de controle retornou `200` (servidor de fato no ar, não é falha de rede) |
| Migrations do lote — aplicáveis sem erro | Não reexecutado do zero por este agente (Docker local ocupado por outro processo nesta sessão) — **aceito o resultado já reproduzido pelo QA** (`QA-REPORT.md` Seção 11, bloco comum: `supabase db reset` aplicando as migrations do lote, incluindo `20260903150000_forbid_restricao_obrigatoria_delete.sql` e `20260903160000_create_confirmar_times_rodada_function.sql`, sem erro) — **não há, porém, nenhum projeto Supabase de staging real para aplicar essas migrations via `supabase db push`** (ver bloqueio abaixo) |

**Por que o resultado é SIMULADO, não um deploy real — os mesmos 3
bloqueios de L0, reverificados agora e ainda não resolvidos**:

1. **Nenhuma credencial de deploy governada foi confirmada neste
   repositório.** Este agente não tem `gh` disponível neste ambiente para
   listar os secrets do GitHub Actions diretamente; mesmo que estivessem
   configurados, o bloqueio 2 abaixo por si só já impede um `db push` real.
   `deploy-staging.yml` continua com o passo "Verifica secrets
   obrigatórios" (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`,
   `SUPABASE_STAGING_DB_PASSWORD`) inalterado desde L0.
2. **Continua não existindo projeto Supabase de staging.** Reconfirmado
   agora via a mesma sessão CLI local autenticada usada em L0:
   `supabase projects list` retorna, de novo, só `futebol-ranking`
   (`ipnbdrejlikrmqyxggsp`, legado de produção) e `mymoney` (projeto não
   relacionado, mesma organização). Nenhum projeto dedicado a staging foi
   criado desde a tentativa de L0 — a suposição da Seção 5.1 segue **não
   confirmada nem negada**.
3. **Nenhum código dos Lotes L1 a L6 foi commitado/enviado a `main`.**
   Reconfirmado por `git log`/`git fetch origin`: `HEAD` local e
   `origin/main` continuam idênticos, em `3453a5a` (o mesmo commit já
   citado como desatualizado na tentativa de L0) — nenhum commit novo
   desde então, apesar de 6 lotes (`L0` a `L6`) já terem passado por dupla
   aprovação. `git status` mostra toda a implementação de `L1`-`L6` (rotas
   de API, módulos, features, migrations, o próprio `SECURITY-REVIEW.md`/
   `EXECUTION-LOG.md`) como alterações não commitadas na árvore de
   trabalho. O gatilho real do pipeline (`workflow_run` de `CI` bem-
   sucedido em `main`) não tem sobre o que disparar. Como em L0, **decidir
   commitar/dar push da árvore de trabalho inteira não é uma decisão deste
   agente tomar unilateralmente** — é responsabilidade do fluxo combinado
   (Backend/Tech Lead), e envolveria assumir autoria de código de outros
   agentes sem revisão própria de conteúdo (fora do escopo de
   `deployment-execution`).

Também verificado (leitura, não escrita): uma sessão Vercel CLI local
autenticada (`vercel whoami` → `leandrosegheto17`) confirma a existência de
um projeto Vercel já criado (`futebol-ranking-comary`, criado em
2026-05-29 — mesma data do projeto Supabase legado, ou seja, pré-existente
à fase de execução deste pipeline, não criado por `L0`/`L6`). Nenhuma
tentativa de publicação foi feita através dele: sem commit real em `main`
para atribuir a um deploy, publicar "por fora" do pipeline governado
pularia os gates de CI/CD (build, lint, teste, scan de segurança,
convenção de rollback de migration) pelo mesmo racional já registrado na
tentativa de L0.

| Versão/Commit | Ambiente | Horário | Resultado |
|---|---|---|---|
| L6 — Montagem de Times, Restrições e Substituições (working tree sobre `3453a5a`, ainda não commitado) | Staging | 2026-09-04 | **Simulado/bloqueado** — build local validado com sucesso (30 rotas), as 4 rotas de API novas confirmadas exigindo sessão (401 sem cookie), migrations do lote já validadas pelo QA contra Supabase local; publicação real não ocorreu pelos mesmos 3 motivos de L0: (a) nenhum secret de CI/CD confirmado, (b) nenhum projeto Supabase de staging dedicado existe, (c) código de `L1`-`L6` não commitado em `main`. Nenhum incidente, porque nenhuma publicação real aconteceu. |

**Próximos passos, inalterados desde L0 (nenhum decidido unilateralmente
por este agente)**:
1. Commitar/dar push do código acumulado de `L1` a `L6` para `main` (dono:
   Backend/Tech Lead, conforme fluxo combinado) — só então o gatilho real
   do `deploy-staging.yml` (`workflow_run` de `CI`) passa a ter algo sobre
   o que disparar.
2. Confirmar com o usuário/CTO a criação de um projeto Supabase de staging
   dedicado (Seção 5.1) e configurar os 6 secrets listados acima no
   repositório GitHub.
3. Reexecutar `deployment-execution` — a essa altura `deploy-staging.yml`
   dispara automaticamente no próximo push bem-sucedido em `main`, sem nova
   pausa (conforme `EXECUTION-FLOW.md` §6/§2.5).

### 7.3 Produção — publicação real observada fora do fluxo governado — reconciliação em 2026-09-04

**Isto não é o registro de uma execução de `deployment-execution` deste
agente.** As Seções 7.1 e 7.2 acima permanecem como o histórico honesto de
duas tentativas reais deste agente, ambas corretamente simuladas/
bloqueadas com base no estado que existia no momento de cada uma. O que
esta seção registra é diferente: entre a tentativa de L6 (2026-09-04) e
agora, **uma publicação real de produção aconteceu por fora desse fluxo**
— não por ação deste agente, nem por reexecução da skill
`deployment-execution`, mas presumivelmente por ação direta do
usuário/outro processo, fora da governança de dupla aprovação mecânica
descrita na Seção 2 (`deploy-production.yml`). Este agente não tem meios
de confirmar se esse workflow governado foi de fato o mecanismo usado,
ou se a publicação ocorreu por outro caminho (ex.: `vercel --prod`
direto, ou push que disparou o Git integration nativo da Vercel).
Registro do que foi verificado (evidência coletada e reportada pelo
usuário, mais uma reconfirmação independente deste agente onde indicado):

| Verificação | Fonte | Resultado |
|---|---|---|
| Deploys de produção existentes | `npx vercel ls futebol-app` (usuário) | 8 deploys de Produção no projeto `futebol-app` (org `leandrosegheto17s-projects`); mais recente ~1h antes da checagem, status "Ready" |
| Aplicação no ar | `curl https://futebol-app-lsm.vercel.app/` (usuário) | HTTP 200 |
| Health check | `curl .../api/health` (usuário) | `{"status":"ok"}` |
| Headers de segurança do `vercel.json` | resposta HTTP real (usuário) | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` presentes — consistentes com `vercel.json` no `HEAD` atual (reconfirmado por este agente lendo `git show HEAD:vercel.json`) |
| CSP | mesma resposta HTTP real (usuário) | **Ausente** — confirma que `DEBT-03` segue não corrigido, agora em produção real, não mais hipotético |
| Secrets de ambiente Production na Vercel | `npx vercel env ls production` (usuário) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_BASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_COOKIE_SECRET` — todos configurados (Encrypted) |
| Código em `main` | `git log`/`git status` (usuário, reconfirmado por este agente) | `main` sincronizado com `origin/main`, `HEAD` em `4c57be7`, contendo os Lotes L0-L6 e correções pós-deploy (`working tree` deste agente no momento da reconciliação mostra apenas `.md/CTO-REVIEW.md` modificado localmente, não relacionado) |
| Projeto Supabase de destino | `NEXT_PUBLIC_SUPABASE_URL` = `ipnbdrejlikrmqyxggsp.supabase.co`, confirmado via `npx supabase projects list` (usuário) contra o projeto `futebol-ranking` | É o **mesmo projeto legado de produção** já previsto em `ADR-002` Opção A — **não** é um projeto de staging dedicado, nem um projeto novo |
| Dados servidos | consulta REST direta (`Accept-Profile: app`) à view `app.ranking_publico` (usuário) | Retornou dados reais migrados (atletas e pontuação reais) — schema `app` populado e servindo produção real |

**O que não foi verificado (nem pelo usuário, nem por este agente) e
fica registrado como lacuna de confirmação, não como fato assumido**:
- Se os secrets do GitHub Actions (`.github/workflows/deploy-production.yml`
  e demais, Seção 2) estão de fato configurados no repositório GitHub —
  `gh` CLI indisponível neste ambiente para checar. Não é possível
  confirmar se o gate mecânico de dupla aprovação (leitura de
  `QA-REPORT.md`/`SECURITY-REVIEW.md`) de fato rodou antes desta
  publicação, ou se o deploy contornou esse workflow.
- Se este ambiente é tecnicamente "produção" por já ter sido a decisão
  correta neste ponto do processo, ou se deveria ter passado por staging
  primeiro (Seção 3 desenha staging como projeto Supabase separado —
  isso nunca chegou a existir, Seção 5.1) — este agente não decide essa
  questão de processo sozinho, apenas a registra.
- Fluxo de login/escrita da área interna (não testado — sem credencial).
- Estado do rollback (Seção 5) — segue **não testado**, independente de
  quem publicou.
- Estado real do monitoramento do Guardrail 36 — segue **não ativado**
  (Seção 4), independente de quem publicou.

**Por que este agente não reivindica esta publicação como sua**: nenhuma
skill `deployment-execution` deste agente foi reexecutada para produzi-
la; a Seção 7.2 (L6, mesma data) registra que este agente, na sua última
execução real, ainda encontrava os três bloqueios então vigentes e
optou deliberadamente por não publicar "por fora" do pipeline governado.
O estado real mudou depois disso, por ação fora do escopo de execução
deste agente. Registrar esse estado real na Seção 7 é obrigação deste
agente (é o dono do artefato `DEPLOY.md`); executá-lo não foi.

| Versão/Commit | Ambiente | Horário (aprox.) | Resultado |
|---|---|---|---|
| `main` @ `4c57be7` (Lotes L0-L6 + correções pós-deploy) | **Produção** (não staging) | ~2026-09-04, detectado pelo usuário com deploy mais recente há ~1h no momento da checagem | **Publicação real confirmada** — aplicação no ar (200/health ok), dados reais migrados servidos, headers de segurança básicos presentes, CSP ausente (`DEBT-03` ativo), rollback e observabilidade de Guardrail 36 **não confirmados como testados/ativos** por este agente. Execução não atribuível a este agente nem à skill `deployment-execution` governada — ver ressalvas acima. |

### 7.4 Teste real (não simulado) do mecanismo de rollback de produção — 2026-09-04

**Gatilho e autorização**: execução solicitada explicitamente pelo
usuário/organizador nesta sessão, com autorização direta para rodar o
teste contra a **produção real** (não dry-run) — item 1 do Tier 1 de
`CTO-REVIEW.md` ("Consolidação de Pendências Reais da v1 — Lista Única
Priorizada — 2026-09-04") e o alerta mais urgente já registrado nas
Seções 5/9/10 deste documento ("a primeira execução do rollback em
produção seria também a primeira vez que ele é testado"). Nota de
Governança Ad Hoc referenciada (`CTO-REVIEW.md`): hoje o único usuário
real do sistema é o próprio organizador — reduz o blast radius de
qualquer instabilidade momentânea, mas o teste foi conduzido com o mesmo
cuidado e documentação honesta de qualquer ação em produção real.

**1. Reconfirmação do estado real antes de qualquer ação** (nada foi
assumido de `DEPLOY.md` Seção 7.3 sem reverificar):
- `git status`/`git log` (ambiente deste agente): `main` sincronizado com
  `origin/main`, `HEAD` em `4c57be7`, nenhuma mudança de código pendente
  (só os próprios `.md` de governança, já modificados antes desta
  execução).
- `npx vercel whoami` → sessão CLI local autenticada como
  `leandrosegheto17`, confirmada disponível neste ambiente.
- `gh --version` / `gh auth status` → **`gh` CLI indisponível neste
  ambiente** (`command not found`), confirmando o que já era suspeitado em
  Seção 7.2/7.3 (item "não verificado"). Consequência: o disparo do
  workflow `rollback-production.yml` via `gh workflow run` **não era
  possível nesta execução** — o teste foi conduzido via **CLI local direta
  da Vercel**, não pelo caminho governado por GitHub Actions. Registrado
  aqui com a mesma transparência já praticada nas Seções 7.1-7.3 (não
  inflando o resultado: o mecanismo testado foi `vercel rollback`
  diretamente, que é o mesmo mecanismo subjacente que o workflow
  `.github/workflows/rollback-production.yml` invocaria, mas **não** o
  workflow governado em si — essa diferença fica registrada, não
  escondida).
- `npx vercel ls futebol-app --prod`: 8 deployments de produção, o mais
  recente (`futebol-1hs9xw5vf…`, `dpl_BU8RSxjUfy8UYCBb5fbxJLS2PE2v`,
  criado 2026-09-04 16:09:11 -03:00, ~2h antes do teste) e o segundo mais
  recente (`futebol-kiibus776…`, `dpl_HuxE99qwRAN5aMrj61SNL7R5zryW`,
  criado 15:36:50 -03:00) ambos com status `Ready`.
- `npx vercel inspect futebol-app-lsm.vercel.app` + `npx vercel alias ls`:
  confirmado que o alias de produção apontava, antes do teste, para
  `futebol-1hs9xw5vf…` (commit `4c57be7`) — o "atual". O candidato a
  "anterior" (próximo deployment `Ready` mais recente) é
  `futebol-kiibus776…` (commit `d9b77e5`, "Remove presenças e cartões da
  tabela pública de ranking").
- `curl https://futebol-app-lsm.vercel.app/` → `HTTP 200`; `curl
  .../api/health` → `{"status":"ok"}`. Health check confirmado **antes**
  de qualquer ação.

**2. Avaliação de compatibilidade de schema antes de rolar para trás**:
`git diff --stat d9b77e5 4c57be7` mostra **apenas** `.gitignore` e dois
assets de imagem (`logo.jpg`, `logo_comary.jpg`) — **nenhuma migration em
`supabase/migrations/*.sql` foi adicionada entre o deployment "anterior" e
o "atual"**. Ou seja, ambos os deployments rodam contra exatamente o
mesmo schema de produção — risco de incompatibilidade de dados
**inexistente** neste caso específico (não é um caso de "mudança aditiva
segura", é literalmente nenhuma mudança de schema no intervalo). Teste
prosseguiu sem ressalva de compatibilidade.

**3. Execução do rollback de fato** — comandos exatos, sessão CLI local
(não workflow governado, pelos motivos do item 1 acima):

```
npx vercel rollback futebol-kiibus776-leandrosegheto17s-projects.vercel.app --yes
> Success! futebol-app was rolled back to
  futebol-kiibus776-leandrosegheto17s-projects.vercel.app
  (dpl_HuxE99qwRAN5aMrj61SNL7R5zryW) [3s]
```

**4. Confirmação de que o rollback funcionou**:
- `curl https://futebol-app-lsm.vercel.app/` → `HTTP 200`.
- `curl .../api/health` → `{"status":"ok"}`.
- `npx vercel alias ls` → confirmado: `futebol-app-lsm.vercel.app` agora
  aponta para `futebol-kiibus776-leandrosegheto17s-projects.vercel.app`
  (`dpl_HuxE99qwRAN5aMrj61SNL7R5zryW`), não mais para o deployment atual.
  Reatribuição de alias confirmada em segundos, sem rebuild, exatamente
  como documentado na Seção 5 antes deste teste — agora **confirmado por
  execução real**, não só pela documentação do mecanismo.

**5. Restauração de produção ao estado atual** (o teste não deixou
produção presa numa versão antiga):

```
npx vercel rollback futebol-1hs9xw5vf-leandrosegheto17s-projects.vercel.app --yes
> Success! futebol-app was rolled back to
  futebol-1hs9xw5vf-leandrosegheto17s-projects.vercel.app
  (dpl_BU8RSxjUfy8UYCBb5fbxJLS2PE2v) [3s]
```

Confirmação final:
- `curl https://futebol-app-lsm.vercel.app/` → `HTTP 200`.
- `curl .../api/health` → `{"status":"ok"}`.
- `npx vercel alias ls` → confirmado: alias restaurado para
  `futebol-1hs9xw5vf-leandrosegheto17s-projects.vercel.app`
  (`dpl_BU8RSxjUfy8UYCBb5fbxJLS2PE2v`, commit `4c57be7`) — estado idêntico
  ao que existia antes do início deste teste.

**Janela de instabilidade real**: a produção ficou servindo o deployment
"anterior" (commit `d9b77e5`) por aproximadamente 1-2 minutos entre o
passo 3 e o passo 5 (tempo de execução dos comandos e verificações desta
sessão) — não é uma instabilidade no sentido de erro/downtime (ambos os
`curl` durante essa janela retornaram 200/ok), é apenas o intervalo em que
produção serviu uma versão de código ligeiramente anterior, com a mesma
tela pública (a diferença entre os dois commits nem sequer é visível ao
usuário: só `.gitignore` e assets de imagem não referenciados pelas
páginas). Nenhum incidente ocorrido.

**O que este teste confirma, e o que não confirma** (para não inflar o
resultado):
- **Confirma**: `vercel rollback` funciona de fato contra a produção
  real deste projeto, reatribui alias em segundos, sem rebuild, e a
  aplicação responde normalmente (200/health ok) tanto no deployment
  "anterior" quanto de volta no "atual". O guardrail "nunca produção sem
  rollback testado, não só documentado" está, a partir de agora,
  satisfeito para o **mecanismo de reatribuição de alias**.
- **Não confirma**: (a) que o workflow governado
  `.github/workflows/rollback-production.yml` (via `gh workflow run`)
  funciona — não foi possível testá-lo por `gh` estar indisponível neste
  ambiente; o mecanismo subjacente (`vercel rollback`) é o mesmo, mas o
  caminho de disparo governado via GitHub Actions segue **não testado**;
  (b) reversão de migration destrutiva de Supabase — não havia nenhuma
  migration a reverter neste par de deployments, então esse cenário
  (mais arriscado, dados potencialmente incompatíveis) permanece
  **não exercitado**; (c) comportamento de rollback sob uma mudança de
  schema real entre deployments — este teste foi, por sorte do timing
  real de commits, o caso mais simples possível (zero diferença de
  schema). Um rollback futuro que precise reverter sobre uma migration
  aplicada ainda é um cenário não testado e deve ser tratado com a mesma
  cautela documentada na Seção 5 (bloco `-- ROLLBACK:`).

| Ação | Comando | Resultado |
|---|---|---|
| Verificação prévia | `curl` home + `/api/health` | 200 / `{"status":"ok"}` |
| Rollback para deployment anterior | `npx vercel rollback futebol-kiibus776…` | Sucesso, 3s, alias reatribuído |
| Verificação pós-rollback | `curl` home + `/api/health` + `vercel alias ls` | 200 / `{"status":"ok"}` / alias confirmado em `futebol-kiibus776…` |
| Restauração ao deployment atual | `npx vercel rollback futebol-1hs9xw5vf…` | Sucesso, 3s, alias reatribuído |
| Verificação final | `curl` home + `/api/health` + `vercel alias ls` | 200 / `{"status":"ok"}` / alias confirmado de volta em `futebol-1hs9xw5vf…` (`4c57be7`) |

### 7.5 Ativação de secrets do GitHub Actions e confirmação real do Guardrail 36 — 2026-09-04

**Gatilho e execução**: diferente das Seções 7.1-7.4 (executadas por este
agente), os passos abaixo foram executados **pelo usuário/organizador
diretamente no GitHub** (`gh secret set`, `gh secret list`, `gh workflow
run`), com orientação deste agente. Não é simulado: todos os itens abaixo
têm confirmação real (comando executado e resultado observado), registrados
aqui por serem o dono do artefato `DEPLOY.md`, não por tê-los executado
diretamente.

**1. Confirmação do estado anterior (fecha uma lacuna de confirmação
histórica das Seções 7.2/7.3/10 item 1)**: `gh secret list --repo
leandrosegheto17/FutebolApp` (e a UI de Settings > Secrets) confirmaram
**zero secrets configurados** antes desta sessão. Isso substitui, por
confirmação positiva, o que até aqui era registrado como "não verificado"
(Seção 7.3, "o que não foi verificado", item 1; Seção 10, item 1): **os
secrets do GitHub Actions não estavam configurados**. Consequência direta,
agora confirmada e não mais hipótese: a publicação real de produção já
registrada na Seção 7.3 (commit `4c57be7`, detectada fora do fluxo
governado) **não pode ter passado pelo gate mecânico de dupla aprovação**
de `deploy-production.yml` (que depende desses secrets para sequer iniciar)
— foi publicada por um caminho não governado (`vercel --prod` direto, ou
Git integration nativo da Vercel), exatamente como a Seção 7.3 já
suspeitava sem poder confirmar.

**2. Seis secrets configurados agora, via `gh secret set`, confirmados em
`gh secret list`**:

| Secret | Observação |
|---|---|
| `VERCEL_TOKEN` | — |
| `VERCEL_ORG_ID` | `team_LGMpqv4TnLt60QJ52AKDqQI9`, não sensível — obtido via `vercel link` local, `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `prj_Ql7a22UII1loTsNAfjOGsnWSNx7z`, idem |
| `SUPABASE_ACCESS_TOKEN` | — |
| `SUPABASE_PROD_PROJECT_REF` | `ipnbdrejlikrmqyxggsp`, já conhecido (ADR-002) |
| `SUPABASE_PROD_DB_URL` | — |

**Nota (não inflar como resolvido)**: os secrets de staging
(`SUPABASE_STAGING_PROJECT_REF`/`SUPABASE_STAGING_DB_PASSWORD`) **não**
foram configurados nesta sessão — a decisão de criar ou não um segundo
projeto Supabase gratuito dedicado a staging (Seção 5.1) segue em aberto,
não foi tomada agora. `deploy-staging.yml` continua sem poder rodar de
verdade (o passo "Verifica secrets obrigatórios" desse workflow ainda
falharia).

**3. Ativação real (não só presença de secret) do `supabase-health-check.yml`
(Guardrail 36)**, disparado manualmente via `gh workflow run`
(`workflow_dispatch`):

| Verificação | Resultado |
|---|---|
| Run | `https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716` (run #2) |
| Status do job "Verifica status e pausa do projeto Supabase" | **Success**, concluído em 7s |
| Log do step "Consulta status do projeto (Supabase Management API)" | Retornou **`ACTIVE_HEALTHY`**, confirmado pelo usuário |
| Issue com label `supabase-alerta` | Nenhuma criada (esperado — status saudável; o job só abre/comenta Issue em caso de degradação/pausa) |

Isso é confirmação de **execução real de ponta a ponta**, não apenas de
que os secrets existem — o Guardrail 36 (monitoramento do tier gratuito),
antes registrado como "pronto, mas em modo pendente de ativação" (Seção 4),
está **ativo e funcionando** a partir de agora, incluindo o cron diário
(09:00 UTC) que passa a rodar de verdade a partir de hoje.

**4. O que não foi testado nesta sessão (não inflar como resolvido)**:
os workflows `deploy-production.yml`, `deploy-staging.yml` e
`rollback-production.yml` — que também dependem destes 6 secrets — **não
foram disparados/exercitados**. Só `supabase-health-check.yml` foi de fato
executado e confirmado. Consequências práticas:
- O **caminho governado de rollback via GitHub Actions**
  (`rollback-production.yml`, distinto do teste de `vercel rollback` via
  CLI local já registrado na Seção 7.4) ainda **não foi validado** — os
  secrets necessários agora existem, mas o workflow em si nunca rodou.
- O **gate mecânico de dupla aprovação** de `deploy-production.yml`
  (leitura de `QA-REPORT.md`/`SECURITY-REVIEW.md`, Seção 2/2.2) também
  **não foi exercitado de fato** nesta sessão — ele agora *tem* os secrets
  necessários para rodar, mas isso é diferente de ter sido *comprovado em
  execução real*. A convenção de formato (grep por `Veredito`/`Aprovado`)
  segue validada apenas por leitura de código, não por disparo real do
  workflow.

| Ação | Método | Resultado |
|---|---|---|
| Confirmação de zero secrets antes da sessão | `gh secret list` | Confirmado vazio |
| Configuração de 6 secrets de produção | `gh secret set` × 6 | Confirmado em `gh secret list` |
| Disparo manual do health-check | `gh workflow run` (`workflow_dispatch`) | Success, `ACTIVE_HEALTHY`, run #2 |
| Disparo de `deploy-production.yml`/`deploy-staging.yml`/`rollback-production.yml` | — | **Não executado nesta sessão** |

## 8. Incidentes Pós-Deploy

**Reavaliado em 2026-09-04.** Não há, até o momento, sinal de incidente
crítico nas checagens pontuais reportadas (200 OK, `/api/health` ok).
Porém isso **não equivale a uma janela de observação pós-deploy válida**:
nenhuma observabilidade ativa (logs estruturados, métricas, alertas) foi
confirmada em produção — o único monitoramento desenhado por este agente
(Guardrail 36, Seção 4) segue em modo pendente de ativação, e não há
registro de quando exatamente a janela de 24h (Seção "Critérios de
Pronto") começou a contar, nem de quem a está observando. Este agente não
pode declarar "nenhum incidente" com confiança equivalente a uma janela
pós-deploy real monitorada — só pode registrar que, nas poucas checagens
pontuais feitas por fora (não por monitoramento contínuo), nada de errado
apareceu. Ver Seção 10, item 0, para a reclassificação de urgência.

**Atualização 2026-09-04 (Seção 7.5) — parcialmente superado**: o
Guardrail 36 (monitoramento de pausa/status do tier gratuito do Supabase)
**deixou de estar em modo pendente de ativação** — foi confirmado ativo por
execução real (`supabase-health-check.yml`, run
`https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716`,
`ACTIVE_HEALTHY`), com o cron diário passando a rodar de verdade a partir
de hoje. Isso cobre especificamente o risco de pausa/degradação do projeto
Supabase — **não** cobre observabilidade geral da aplicação (logs
estruturados de requisições/erros, métricas de latência, alertas de erro em
produção), que **segue não implementada/confirmada**. A afirmação "nenhuma
observabilidade ativa foi confirmada em produção" acima fica, portanto,
**parcialmente superada**: há, agora, um monitoramento ativo e real (o do
Guardrail 36), mas ele é específico à saúde do projeto Supabase, não um
substituto para observabilidade de aplicação. A janela de 24h pós-deploy
continua sem registro formal de início/responsável de observação contínua.

**Atualização 2026-09-04 (teste de rollback, Seção 7.4)**: durante o
teste real do mecanismo de rollback, produção serviu por ~1-2 minutos o
deployment imediatamente anterior (commit `d9b77e5`) antes de ser
restaurada ao deployment atual (`4c57be7`) — isso **não** é um incidente
(ambos os `curl` de controle durante a janela retornaram 200/health ok;
a diferença de código entre os dois commits é apenas `.gitignore` e dois
assets de imagem, sem efeito visível). Registrado por transparência, não
como incidente pós-deploy.

## 9. Fechamento do Ciclo (Gate 4)

**Ainda não pode ser formalmente fechado por este agente, agora por um
motivo diferente do registrado nas revisões anteriores.** Antes desta
reconciliação, a razão era "não há deploy de produção ainda". Isso deixou
de ser verdade (Seção 7.3) — há, sim, um deploy real de produção no ar.
Mas o Gate 4, pela própria Definition of Done deste documento (seção
"Critérios de Pronto" no topo do arquivo-fonte deste agente), exige, além
do build em produção: observabilidade ativa, rollback testado (não só
documentado), infraestrutura validada contra RNFs, e janela pós-deploy
sem incidente crítico monitorada de fato. **Atualização 2026-09-04**: um
desses quatro itens — rollback testado — passou de "não satisfeito" para
**satisfeito** (Seção 7.4: teste real, não simulado, executado contra
produção real, com restauração confirmada ao estado atual). Os outros
três continuam **não** confirmados como satisfeitos: observabilidade
ativa (Seção 4, ainda pendente de ativação por falta de credenciais),
infraestrutura validada contra RNFs (Seção 6, só validação de desenho,
não de medição real) e janela pós-deploy monitorada de fato (Seção 8,
ainda sem monitoramento contínuo). Fechar o Gate 4 agora ainda seria
reportar ao CTO um "sucesso" que este agente não pode afiançar
integralmente. **O que este agente reporta ao CTO agora não é
fechamento de ciclo — é uma atualização do alerta da Seção 10, item 0**:
produção real está no ar, servindo dados reais migrados do legado, com
uma das quatro garantias operacionais agora confirmada (rollback), e três
ainda pendentes.

**Atualização 2026-09-04 (Seção 7.5) — segundo item avança, mas não
fecha**: o item "observabilidade ativa" deixa de ser **integralmente**
"não satisfeito" — o Guardrail 36 (monitoramento de pausa/status do tier
gratuito do Supabase) está confirmado ativo por execução real (run
`https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716`,
`ACTIVE_HEALTHY`). Isso **não** equivale, porém, a "observabilidade ativa"
no sentido pleno exigido pela Definition of Done deste documento (logs
estruturados, métricas, alertas de erro da própria aplicação em produção)
— o Guardrail 36 cobre um risco específico de infraestrutura (pausa do
projeto Supabase), não a aplicação como um todo. Tratamento honesto: o
item passa de "não satisfeito" para **"parcialmente satisfeito"**, não
para "satisfeito". Os outros dois itens (infraestrutura validada contra
RNFs por medição real, janela pós-deploy monitorada de fato) continuam
**não** satisfeitos, sem mudança. O Gate 4 **continua não podendo ser
formalmente fechado** — agora com duas de quatro garantias
confirmadas/parciais (rollback confirmado; observabilidade parcialmente
confirmada) e duas ainda pendentes.

## 10. Pendências resumidas para o CTO

0. **Alerta reclassificado (atualizado em 2026-09-04, reconciliação —
   substitui o alerta de acúmulo anterior, o mais urgente desta seção)**:
   uma publicação real de produção já aconteceu, fora do fluxo governado
   deste agente (Seção 7.3) — o alerta deixa de ser "nenhum deploy real
   ocorreu apesar de 6 lotes aprovados" e passa a ser **"há produção real
   no ar, servindo dados reais migrados do legado, sem duas garantias
   operacionais que este agente trata como pré-condição inegociável de
   qualquer deploy de produção"**:
   - **`DEBT-03` (CSP ausente em `vercel.json`) — CSP ADICIONADA em
     2026-09-04 (ver Seção 10.1 para o registro completo, incluindo o que
     foi e o que não foi testado)**: estava registrada no item 5 (abaixo)
     como "prazo: antes do primeiro deploy de produção". Esse prazo **já
     tinha vencido**: o primeiro deploy de produção já havia acontecido
     (Seção 7.3, CSP confirmadamente ausente na resposta HTTP real naquele
     momento). Ação tomada agora, autorizada explicitamente pelo usuário/
     organizador nesta sessão: `vercel.json` passou a incluir um header
     `Content-Security-Policy` (`default-src 'self'`; `connect-src`
     liberando `'self'` + o domínio Supabase de produção confirmado,
     `https://ipnbdrejlikrmqyxggsp.supabase.co`; `script-src`/`style-src`
     com `'unsafe-inline'`, necessário e confirmado empiricamente — ver
     Seção 10.1 — para não quebrar a hidratação do Next.js App Router sem
     introduzir nonce, fora de escopo desta correção). **Isso ainda não é
     "débito fechado" no sentido pleno**: a config está commitada e o build
     local segue verde, mas a aplicação real do header em produção só é
     confirmável com um deploy real (Vercel edge, não `next start` local) —
     ver Seção 10.1 para a limitação de teste explícita, não inflada.
   - **Rollback nunca testado (Seção 5) — RESOLVIDO em 2026-09-04 (Seção
     7.4)**: por autorização explícita do usuário/organizador, o mecanismo
     `vercel rollback` foi testado de fato contra a produção real —
     rollback para o deployment anterior (`d9b77e5`), confirmação de
     saúde (200/health ok), e restauração ao deployment atual (`4c57be7`),
     com o alias confirmado de volta ao estado original. **Ressalva que
     permanece, não coberta por este teste**: o caminho testado foi a CLI
     local da Vercel, não o workflow governado
     `rollback-production.yml` (disparo via `gh workflow run` não foi
     possível — `gh` CLI indisponível neste ambiente, mesma lacuna já
     registrada no item 1 abaixo); e nenhuma migration de Supabase precisou
     ser revertida neste teste (não havia diferença de schema entre os dois
     deployments) — reversão de migration destrutiva **segue não
     exercitada**. O item deixa de ser Tier 1/urgente no sentido de
     "nunca testado", mas a ressalva do workflow governado e de migration
     reversível permanece registrada, não inflada como 100% coberta.
   - **Observabilidade — Guardrail 36 RESOLVIDO em 2026-09-04 (Seção 7.5);
     observabilidade geral da aplicação segue pendente**: o monitoramento
     de pausa/status do tier gratuito do Supabase (Guardrail 36) deixou de
     estar em modo pendente de ativação — os 6 secrets de produção foram
     configurados (`gh secret set`/`gh secret list`) e
     `supabase-health-check.yml` foi disparado manualmente e concluído com
     sucesso (run `https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716`,
     status `ACTIVE_HEALTHY`), com o cron diário passando a rodar de
     verdade a partir de hoje. **Ressalva que permanece, não coberta por
     esta resolução**: isso cobre apenas o risco específico de
     pausa/degradação do projeto Supabase (o de maior probabilidade
     prática, SDD.md Seção 6.2) — observabilidade geral da aplicação (logs
     estruturados, métricas de erro/latência, alertas de aplicação em
     produção) **segue não implementada**. Combinado com os dois pontos
     acima, produção real está no ar hoje sem CSP e sem observabilidade
     geral de aplicação — essas duas lacunas continuam sendo **risco ativo
     de uma produção que já existe**, não mais "preparação para um deploy
     futuro"; o item de rollback e o sub-item de monitoramento de tier
     gratuito do Supabase saem dessa lista por já estarem resolvidos.
   Este agente não executou essa publicação e não tem meios de revertê-la
   ou corrigi-la unilateralmente (seria uma ação de infraestrutura real,
   fora do escopo desta reconciliação, conforme instrução explícita
   recebida). O registro acima é a sinalização formal ao CTO de que as três
   lacunas mudaram de severidade — de "pendência de preparo" para "risco
   ativo em produção real" — e merecem decisão/priorização imediata, não
   na próxima janela de deploy.
1. **[Atualizado 2026-09-04 — item dos secrets do GitHub Actions FECHADO
   FORMALMENTE nesta data, Seção 7.5; staging dedicado segue em aberto,
   ver item 2]** As tentativas de deploy de staging do lote L0
   (2026-09-03) e L6 (2026-09-04) haviam sido registradas como
   simuladas/bloqueadas por três pré-requisitos: (a) secrets de CI/CD, (b)
   projeto Supabase de staging dedicado, (c) código não commitado em
   `main`. Dos três, **(a) e (c) não são mais verdade** — `main` está
   sincronizado com `origin/main` em `4c57be7`, contendo L0-L6, e os
   secrets do ambiente Production existem na Vercel (Seção 7.3).
   **Fechamento formal da pergunta em aberto sobre os secrets do GitHub
   Actions (Seção 7.5)**: `gh secret list --repo leandrosegheto17/FutebolApp`
   confirmou que, **antes desta sessão, não havia nenhum secret
   configurado** — o que confirma retroativamente que a publicação real de
   produção já registrada na Seção 7.3 (commit `4c57be7`) **não pode ter
   passado pelo gate mecânico de dupla aprovação** de
   `deploy-production.yml` (que depende desses secrets para sequer
   iniciar); foi publicada por um caminho não governado, como já se
   suspeitava sem poder confirmar. **Agora**, 6 secrets de produção foram
   configurados e confirmados (`VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_PROJECT_REF`,
   `SUPABASE_PROD_DB_URL`) — a pergunta original ("os secrets do GitHub
   Actions estão configurados?") está respondida, positivamente, tanto
   para o estado anterior (não) quanto para o atual (sim, para produção).
   **Ressalva explícita que permanece em aberto, não inflada como
   resolvida**: a *confirmação de que o gate mecânico de dupla aprovação
   de fato governa deploy futuro* é uma pergunta distinta da presença dos
   secrets — nenhum `workflow_dispatch` de `deploy-production.yml` ou de
   `rollback-production.yml` foi disparado nesta sessão; só
   `supabase-health-check.yml` foi executado e confirmado (Seção 7.5). Essa
   parte específica do item segue **não verificada por execução real**.
   (b) segue **confirmado ainda ausente** — o ambiente de produção real
   aponta para o mesmo projeto Supabase legado (`ipnbdrejlikrmqyxggsp`,
   ADR-002 Opção A), não um projeto de staging dedicado (Seção 5.1, sem
   mudança), e os secrets de staging (`SUPABASE_STAGING_PROJECT_REF`/
   `SUPABASE_STAGING_DB_PASSWORD`) não foram configurados nesta sessão —
   ver item 2.
2. Suposição de segundo projeto Supabase gratuito para staging **ainda não
   confirmada nem negada** (Seção 5.1) — reconfirmado nesta reconciliação
   que o projeto de staging dedicado segue inexistente; produção aponta
   diretamente para o legado. Requer decisão de criação, agora com a
   ressalva adicional de que produção real já está ativa sem staging
   intermediário ter existido em nenhum momento.
3. **[RESOLVIDO em 2026-09-04, Seção 7.4] Rollback testado de fato em
   produção real** — ver item 0 para o registro completo. Deixa de ser
   lacuna ativa quanto ao mecanismo de reatribuição de alias em si;
   permanece em aberto, com severidade menor, apenas: (a) o caminho
   governado via GitHub Actions (`gh workflow run`) segue não testado por
   falta de `gh` CLI neste ambiente (converge com o item 1 abaixo); (b)
   reversão de migration destrutiva de Supabase segue não exercitada por
   nunca ter havido um par de deployments com diferença de schema
   disponível para testar.
4. **[Atualizado 2026-09-04 — monitoramento de pausa/status RESOLVIDO,
   Seção 7.5]** Monitoramento de **pausa/status** do Supabase (Guardrail
   36) estava implementado e pronto, mas em modo pendente de ativação até
   os secrets de credencial do projeto legado existirem (pós-`SPK-01`).
   **Isso deixou de ser verdade nesta sessão**: `SUPABASE_ACCESS_TOKEN` e
   `SUPABASE_PROD_PROJECT_REF` foram configurados, e
   `supabase-health-check.yml` foi disparado manualmente
   (`gh workflow run`) e concluído com sucesso (run
   `https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716`,
   status `ACTIVE_HEALTHY`) — o cron diário (09:00 UTC) passa a rodar de
   verdade a partir de hoje, não mais em modo pendente. O job de **backup
   lógico externo** (ADR-009, `supabase-backup-export.yml`) também
   depende dos mesmos secrets agora presentes (`SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_PROD_DB_URL`), mas **não foi disparado/testado nesta
   sessão** — segue como pendência separada, não inflada como resolvida
   apenas por os secrets existirem. Monitoramento de **percentual de
   cota** (segundo gatilho da regra 36) segue como checagem manual
   mensal até confirmação de endpoint estável da Management API (Seção
   4), sem mudança. **Correção desta reconciliação, mantida**: a nota
   anterior ("como staging ainda não tem tráfego real, não há urgência
   de ativar agora") permanece superada — há produção real com tráfego
   real desde a Seção 7.3, e a ativação do sub-item de pausa/status já
   ocorreu, deixando de ser item do alerta urgente do item 0 (ver
   atualização lá).
5. **[Atualizado 2026-09-04]** Débitos de segurança que estavam registrados
   com prazo "antes do primeiro deploy de produção" (`.md/SECURITY-REVIEW.md`):
   `DEBT-03` (CSP ausente em `vercel.json` — **CSP adicionada em 2026-09-04,
   ver item 0 e Seção 10.1; aplicação real em produção ainda não confirmada
   por deploy**) e `DEBT-04` (advisories residuais de `next@14.2.35`, classe
   DoS/cache, não verificado nesta reconciliação se segue igual, fora do
   escopo desta correção pontual). `DEBT-07` (`app.tentativa_login.ip` sem
   retenção/expurgo) também tinha o mesmo prazo — **workflow de expurgo
   implementado e validado localmente em 2026-09-04, ver Seção 10.2; nunca
   executado contra produção real ainda**.

Nenhuma das pendências acima bloqueia o trabalho em paralelo de Backend/
Frontend/QA/DevSecOps — todas são follow-up do próprio DevOps, registradas
para rastreabilidade, não escaladas como bloqueio de terceiros — com a
ressalva de que os itens 0 e 3 acima agora dizem respeito a uma produção
real já ativa, não mais a preparação futura. **Atualização 2026-09-04**: a
parte de secrets do GitHub Actions do item 1 e o monitoramento de
pausa/status do item 4 foram **resolvidos nesta sessão** (Seção 7.5) — não
seguem mais precisando de decisão explícita de fora do DevOps. O que
ainda segue precisando de decisão explícita de fora do DevOps é: (a) a
criação (ou não) de um projeto Supabase de staging dedicado (item 2/Seção
5.1); (b) exercitar de fato, via `gh workflow run`, os workflows
`deploy-production.yml`, `deploy-staging.yml` e `rollback-production.yml`
— agora tecnicamente possíveis (secrets presentes), mas ainda não
disparados nesta sessão; e (c) a mitigação de `DEBT-03`/observabilidade
geral de aplicação (item 0). Diferente de revisões anteriores deste
documento, essas decisões não são mais pré-condição para que "a próxima
tentativa renda um deploy real" — o deploy real já aconteceu (Seção 7.3).
A decisão agora é sobre regularizar retroativamente a governança desse
deploy (staging, exercício real do gate de CI/CD) e sobre as lacunas
ativas do item 0, não sobre viabilizar uma primeira publicação que já
ocorreu.

## 10.1 Correção de `DEBT-03` — CSP adicionada em `vercel.json` — 2026-09-04

**Gatilho e autorização**: correção de débito de segurança já diagnosticado
em `SECURITY-REVIEW.md` Seção 3/Seção 10 item 0, aprovada para execução
agora pelo usuário/organizador nesta sessão de retomada de governança.

**1. Confirmação das origens reais de fetch client-side ao Supabase (não
assumido cegamente)**: `src/features/ranking-publico/rankingApi.ts` e
`src/features/presenca-mensal/presencaMensalApi.ts` (as duas telas públicas,
T02/T03) usam `getAnonClient()` (`src/lib/supabase/anon-client.ts`), que lê
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` — confirmado por
leitura de código que essas duas telas rodam client-side (`app/page.tsx`
delega para `PublicHomeShell`, marcado `"use client"`) e fazem a chamada
diretamente do navegador ao PostgREST do Supabase, não via Route Handler
próprio. O domínio de produção real já estava confirmado em
`DEPLOY.md` Seção 7.3 (`NEXT_PUBLIC_SUPABASE_URL` =
`https://ipnbdrejlikrmqyxggsp.supabase.co`, o mesmo projeto legado de
`ADR-002`) — não um valor assumido, mas o mesmo já registrado por evidência
real de produção nesta mesma seção. `.env.example` confirma o formato
`https://<ref>.supabase.co`. Nenhum uso de Supabase Realtime/WebSocket
encontrado (`grep` por `.channel(`/`realtime`/`websocket`/`wss:` em `src` —
zero ocorrência real, um falso positivo de `vi.useRealTimers()` descartado).
Nenhuma imagem externa em uso hoje (`grep` por `<img`/`next/image`/
`src="http` em `src`/`app` — nenhuma ocorrência; os assets `logo.jpg`/
`logo_comary.jpg` adicionados recentemente ainda não são referenciados por
nenhum componente). Nenhuma fonte externa em uso — `src/design-system/
tokens.css` usa exclusivamente a pilha `system-ui`/`-apple-system`/`Segoe
UI`/Roboto/Helvetica/Arial (sem Google Fonts); a nota de `CTO-REVIEW.md`
sobre "fonte externa (Google Fonts) e CSP" refere-se à iniciativa de
redesenho v2.0, ainda não implementada — não se aplica ao código real hoje.

**2. CSP adicionada em `vercel.json`** (bloco `headers`, mesmo `source`
`/(.*)` dos demais headers de segurança):

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://ipnbdrejlikrmqyxggsp.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

Racional de cada diretiva: `default-src 'self'` como base restritiva;
`connect-src` libera exatamente o domínio Supabase de produção confirmado
acima, além de `'self'` (chamadas às Route Handlers próprias); `img-src
'self' data:` cobre o uso atual (nenhuma imagem externa) com folga para
`data:` URIs comuns em ícones/placeholders; `font-src 'self'` (sem fonte
externa hoje); `frame-ancestors 'none'`/`object-src 'none'` fecham
clickjacking/plugins por padrão (reforça o `X-Frame-Options: DENY` já
existente); `base-uri 'self'`/`form-action 'self'` reduzem superfície de
injeção de base tag/exfiltração de formulário.

**`'unsafe-inline'` em `script-src`/`style-src` — decisão deliberada,
verificada empiricamente, não assumida por comodidade**: o texto original
do achado antecipava a necessidade de `'unsafe-inline'` só para
`style-src`. Verificação real contra o HTML de fato renderizado por este
projeto (não suposição) mostrou que **também** é necessário para
`script-src`:
- Build local (`npm run build`, variáveis de ambiente dummy, nenhum valor
  real — mesmo padrão já usado em L0/L6) — `Compiled successfully`, 31
  rotas geradas, nenhuma quebra.
- `npm run start` local (porta 3100) + `curl http://localhost:3100/` — HTML
  de fato inspecionado: múltiplos `<script>` inline **sem** `src`,
  contendo `self.__next_f.push(...)` — o mecanismo de streaming de payload
  RSC do Next.js App Router 14.2.x, JavaScript executável real, não um
  bloco `type="application/json"` inerte. Sem `'unsafe-inline'` em
  `script-src` (e sem nonce, explicitamente fora de escopo desta correção
  por instrução recebida), a hidratação da aplicação inteira quebraria.
- Mesmo HTML mostrou atributos `style="..."` inline em componentes de
  esqueleto de carregamento — confirma a necessidade de `'unsafe-inline'`
  em `style-src` também por evidência direta, não só pela premissa original
  do achado.
- `middleware.ts` não define nenhum header próprio que colida com o CSP.

**Limitação de teste explícita, não inflada como "testado" quando não
foi**: `vercel.json` define headers de **borda da Vercel** (Edge Network) —
eles **não** são aplicados por `next start` local. Confirmado
empiricamente: `curl -I http://localhost:3100/` **não retornou nenhum**
dos headers de segurança já existentes (`Strict-Transport-Security`,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), muito
menos o novo `Content-Security-Policy` — ou seja, esta limitação não é
exclusiva do CSP novo, é uma característica de todo o bloco `headers` deste
projeto quando testado via `next start` local, e já era assim antes desta
mudança (só nunca havia sido verificado/registrado explicitamente). Este
agente **não** executou `vercel dev` ou um deploy real (staging/produção)
para confirmar o header via HTTP real, por decisão deliberada: `vercel
dev`/um deploy real tocaria o projeto Vercel/Supabase de produção já
linkado nesta sessão (mesma cautela já registrada nas Seções 7.1-7.4 sobre
não publicar "por fora" do fluxo governado sem necessidade), e o escopo
desta tarefa era a correção do débito documentado, não uma nova rodada de
`deployment-execution`. **Não foi possível** verificar console do navegador
por ausência de Playwright/Puppeteer neste ambiente (confirmado por
`grep`/checagem de `node_modules/.bin` — nenhum instalado) — a verificação
de compatibilidade de `script-src`/`style-src` foi feita por inspeção
direta do HTML renderizado (acima), evidência real, mas não substitui um
teste de console de navegador real contra o header aplicado de fato.
**Resumo honesto**: a *sintaxe* e a *config* do CSP foram validadas (JSON
válido, build verde, compatibilidade de `'unsafe-inline'` confirmada por
evidência de HTML real); a *aplicação do header em uma resposta HTTP real*
segue não confirmada nesta sessão — só será confirmável no próximo deploy
real (staging ou produção) desta stack, quando o próprio `deployment-
execution` (ou uma checagem pontual pós-deploy) puder rodar `curl -I`
contra a URL pública.

**Limitação estrutural registrada (não resolvida por esta correção)**: o
`connect-src` está fixado ao domínio de produção confirmado
(`ipnbdrejlikrmqyxggsp.supabase.co`). `vercel.json` é compartilhado entre
todos os ambientes (Seção 1: "Staging e produção derivam da mesma base de
IaC... o que muda é o projeto Supabase de destino"). Se/quando um projeto
Supabase de staging dedicado for criado (Seção 5.1, ainda pendente), seu
domínio precisará ser adicionado a este `connect-src` antes de qualquer
teste real em staging que dependa de fetch client-side — caso contrário o
CSP bloquearia legitimamente essas chamadas em staging. Registrado aqui
para não ser esquecido quando a Seção 5.1 avançar.

## 10.2 Correção de `DEBT-07` — workflow de expurgo de `app.tentativa_login` — 2026-09-04

**Gatilho e autorização**: mesma sessão/autorização da Seção 10.1.

**1. Referência de padrão**: `.github/workflows/supabase-backup-export.yml`
lido como base (cron, `precheck` que faz o job virar no-op silencioso e
visível via `::notice::` enquanto o secret não existe, acesso direto ao
Postgres via `SUPABASE_PROD_DB_URL`/`psql`, alerta de falha via Issue com
label própria, nunca falha em silêncio).

**2. Nome exato da coluna de timestamp confirmado antes de escrever a
query** (não assumido): leitura direta de `supabase/migrations/
20260903090100_create_tentativa_login_table.sql` — a coluna é
`tentado_em`, não `criado_em` (nome hipotético mencionado como possível
divergência na tarefa recebida, corretamente descartado).

**3. Workflow criado**: `.github/workflows/tentativa-login-purge.yml` —
cron diário `0 10 * * *` (10:00 UTC, depois de `supabase-health-check.yml`
às 09:00 UTC, para não competir por execução), `workflow_dispatch` manual
também disponível. Janela de retenção: **72 horas** (extremo superior da
faixa sugerida pelo próprio achado, "24-72h" — folga maior para investigação
manual de incidente de força bruta recente). Query:
`DELETE FROM app.tentativa_login WHERE tentado_em < now() - interval '72
hours'`, executada via `psql "$SUPABASE_PROD_DB_URL"` (acesso direto ao
Postgres, não PostgREST/`service_role`/`anon` — mesmo padrão do backup).
Loga contagem de linhas elegíveis antes e depois do `DELETE` (via `WITH
removidas AS (... RETURNING 1) SELECT count(*)`) para diagnosticabilidade —
nunca só "rodou". Falha do job abre/comenta Issue com label
`tentativa-login-purge-alerta` (mesmo padrão de `supabase-backup-export.yml`/
`supabase-health-check.yml`).

**4. Validação real executada (não apenas leitura de sintaxe)**:
- Sintaxe YAML validada (`python -c "import yaml; yaml.safe_load(...)"`) —
  sem erro.
- **Query SQL testada empiricamente contra Postgres local**, não apenas
  revisada: este ambiente já tinha um stack Supabase local rodando via
  Docker (`supabase_db_turma-do-rola-comary`, mesma imagem/schema deste
  projeto). Inserção de 4 linhas de teste em `app.tentativa_login` com
  `tentado_em` em 100h, 80h, 5h e 1h atrás; execução da query exata do
  workflow (`SELECT count(*)` antes, depois o `DELETE` com `RETURNING`)
  confirmou que **exatamente as 2 linhas com mais de 72h foram removidas**,
  preservando as 2 mais recentes e as linhas pré-existentes de outros
  testes de integração do projeto. Linhas de teste inseridas para esta
  validação foram removidas ao final, sem deixar resíduo no ambiente local.
- Nenhum linter de GitHub Actions (`actionlint`) disponível neste ambiente
  (confirmado por tentativa via `npx`) — validação de sintaxe/estrutura do
  workflow feita por comparação estrutural direta com
  `supabase-backup-export.yml` (já em produção, mesmo padrão de
  `precheck`/`permissions`/alerta de falha) e pela validação YAML acima.

**5. O que NÃO foi feito, explicitamente (não inflar como resolvido)**:
- **O `DELETE` real nunca foi executado contra o banco de produção** —
  nem manualmente (`gh workflow run tentativa-login-purge.yml`,
  `workflow_dispatch`), nem pelo cron (que só passará a rodar de fato a
  partir do próximo disparo agendado, `10:00 UTC`). O secret
  `SUPABASE_PROD_DB_URL` já existe no repositório (`DEPLOY.md` Seção 7.5),
  então o workflow está tecnicamente apto a rodar — isso é diferente de
  ter sido *comprovado em execução real* contra produção, mesma distinção
  já aplicada a outros workflows deste projeto (`deploy-production.yml`,
  `rollback-production.yml` via GitHub Actions).
- Este agente não disparou o workflow manualmente contra produção nesta
  sessão, conforme instrução explícita recebida ("não execute o delete
  real agora contra produção").

**6. `SECURITY-REVIEW.md` atualizado** (Seção 12, `DEBT-07`) — marcado
"Resolvido (implementação), pendente de primeira execução real contra
produção", referenciando este workflow e a validação empírica acima, sem
inflar como debt totalmente fechado até a primeira execução real (manual
ou pelo cron) ser confirmada.
