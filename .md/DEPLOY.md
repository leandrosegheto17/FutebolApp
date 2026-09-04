# DEPLOY.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: DevOps Engineer
**Status**: **Segunda tentativa de deploy de staging registrada (Lote
L6, 2026-09-04) — resultado: novamente SIMULADO/BLOQUEADO, pelos mesmos
três pré-requisitos de infraestrutura identificados na primeira tentativa
(Lote L0, 2026-09-03), ainda não resolvidos.** `L6` fechou com dupla
aprovação (QA `Aprovado com ressalvas` — `QA-REPORT.md` Seção 11;
DevSecOps `Aprovado`, sem débito novo — `SECURITY-REVIEW.md` Seções
18-28; Tech Lead aprovou o fechamento — `EXECUTION-LOG.md`), o que libera
`deployment-execution` para staging conforme `EXECUTION-FLOW.md` §6/§2.5
(staging dispara por lote fechado, sem pausa). A execução real, porém,
esbarra nos mesmos três bloqueios já registrados na Seção 7.1: nenhum
secret de CI/CD confirmado, nenhum projeto Supabase de staging dedicado
existe, e **todo o código dos Lotes L1 a L6 segue não commitado em
`main`** (working tree idêntica em `git diff`, `HEAD` continua em
`3453a5a`, o mesmo commit já registrado como desatualizado na tentativa de
L0). Nenhum bit novo foi publicado em Vercel/Supabase de staging. Ver
Seção 7.2 para o detalhe completo desta tentativa e Seção 10 para o
alerta de acúmulo (6 lotes fechados, zero deploys reais).
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
| Hospedagem frontend/API (Vercel) | `vercel.json` | Headers de segurança (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy — SDD.md Seção 7.3), framework/build command |
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
- **Status atual**: o workflow está **pronto, mas em modo pendente de
  ativação** — depende de `SUPABASE_ACCESS_TOKEN` e
  `SUPABASE_PROD_PROJECT_REF`, que só existem depois que as credenciais do
  projeto legado forem disponibilizadas na fase de execução (SDD.md Seção
  6.1, spike `SPK-01`). Enquanto ausentes, o job identifica a ausência e
  encerra sem erro (`::notice::`), não falha silenciosamente disfarçado de
  sucesso.
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
- **Status de teste**: **AINDA NÃO TESTADO** — não há deployment de teste na
  Vercel ainda (nenhum código de aplicação implantado). Isso é
  **bloqueante** para o primeiro deploy real de produção, por guardrail
  próprio do DevOps ("nunca deploy em produção sem rollback testado, não só
  documentado") — registrado aqui como pré-condição explícita para
  `deployment-execution`, não esquecido.

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

## 8. Incidentes Pós-Deploy

_Nenhum — não há deploy real ainda (L0 e L6 seguem simulados/bloqueados,
Seções 7.1/7.2)._

## 9. Fechamento do Ciclo (Gate 4)

**Não aplicável ainda.** O Gate 4 (`PIPELINE-CONVENTIONS.md`) só se aplica
depois do primeiro deploy de produção e da janela de observação
correspondente. Este documento é reportado ao CTO agora como **registro
intermediário de preparação de infraestrutura/pipeline**, não como
fechamento de ciclo — o encerramento formal (`CTO-REVIEW.md`) só acontece
quando a Seção 7 acima tiver pelo menos uma execução de produção com veredito
aplicado.

## 10. Pendências resumidas para o CTO

0. **Alerta de acúmulo (novo, 2026-09-04, o mais urgente desta seção)**: seis
   lotes (`L0` a `L6`) já receberam dupla aprovação de QA/DevSecOps e
   fechamento do Tech Lead, mas **nenhum deploy real ocorreu até agora** —
   as duas tentativas de `deployment-execution` (L0 em 2026-09-03, L6 em
   2026-09-04) foram ambas simuladas/bloqueadas pelos exatos mesmos três
   pré-requisitos (Seção 7.1/7.2), nenhum resolvido no intervalo entre as
   duas tentativas. Isso significa que todo o trabalho de Backend/Frontend
   validado por QA/DevSecOps até aqui existe **apenas na árvore de trabalho
   local**, nunca em `main`, nunca em staging navegável. Quanto mais lotes
   se acumularem sem resolver isso, maior o risco de um deploy real, quando
   finalmente ocorrer, expor uma diferença grande demais para revisar com
   segurança de uma vez (o oposto do racional que motivou o desenho "por
   lote" do `EXECUTION-FLOW.md` §1). Este agente não tem autoridade para
   resolver os itens 1-2 abaixo sozinho (recurso real em conta pessoal
   compartilhada) nem o item de commit (fora do escopo de
   `deployment-execution`, é decisão de Backend/Tech Lead) — mas reitera
   que os três seguem pendentes de decisão explícita, agora com 6 lotes de
   atraso acumulado, não 1.
1. Primeira tentativa de deploy de staging do lote L0 (2026-09-03) e a
   segunda, do lote L6 (2026-09-04), ficaram **simuladas/bloqueadas** pelos
   mesmos três pré-requisitos de infraestrutura ainda ausentes (Seções
   7.1/7.2) — nenhum é falha de código (build local validado com sucesso
   nas duas tentativas, `CRIT-01` confirmado corrigido na versão instalada,
   as 4 rotas novas de L6 confirmadas exigindo sessão): (a) secrets de
   CI/CD não configurados no repositório GitHub; (b) projeto Supabase de
   staging dedicado ainda não existe; (c) código de L0 a L6 ainda não
   commitado em `main`. Nenhum dos três foi resolvido unilateralmente por
   este agente — itens 2 e 3 exigem confirmação explícita do usuário/CTO
   antes da próxima tentativa (criação de recurso real numa conta
   compartilhada com outro projeto; e decisão de quem/quando commita o
   acumulado de 6 lotes a `main`).
2. Suposição de segundo projeto Supabase gratuito para staging **ainda não
   confirmada nem negada** (Seção 5.1, revisada nesta execução) — checagem
   real via CLI mostrou que o projeto simplesmente não existe ainda, não que
   foi recusado. Requer decisão de criação antes de saber a resposta real.
3. Rollback ainda não testado (Seção 5) — pré-condição obrigatória antes do
   primeiro deploy real de produção, não apenas nota de risco. Vale também
   para staging quando a publicação real ocorrer: recomendável testar o
   `vercel rollback` no primeiro deploy real de staging, antes de repetir o
   padrão em produção.
4. Monitoramento de **pausa/status** do Supabase (Guardrail 36) e o job de
   **backup lógico externo** (ADR-009) estão implementados e prontos, mas em
   modo pendente de ativação até os secrets de credencial do projeto legado
   existirem (pós-`SPK-01`, fase de execução); monitoramento de **percentual
   de cota** (segundo gatilho da regra 36) fica como checagem manual mensal
   até confirmação de endpoint estável da Management API (Seção 4).
   **Reforço explícito nesta revisão**: como staging ainda não tem tráfego
   real (nenhuma publicação de fato aconteceu), não há urgência de ativar o
   monitoramento agora — mas ele fica formalmente registrado como item de
   checklist obrigatório da **primeira fase real de observabilidade**
   (`observability-setup`/`non-functional-requirement-validation`), a
   rodar assim que o primeiro deploy de staging (ou produção) publicar bits
   de fato. Não é opcional nem pode ser esquecido nessa próxima rodada.
5. Débitos de segurança com prazo antes do **primeiro deploy de produção**
   (`.md/SECURITY-REVIEW.md`): `DEBT-03` (CSP ausente em `vercel.json`) e
   `DEBT-04` (advisories residuais de `next@14.2.35`, classe DoS/cache, não
   a mesma de `CRIT-01`). Nenhum dos dois bloqueia staging — ambos ficam
   como pré-condição de produção, já rastreados no relatório do DevSecOps,
   sem necessidade de nova entrada aqui além deste lembrete.

Nenhuma das pendências acima bloqueia o trabalho em paralelo de Backend/
Frontend/QA/DevSecOps — todas são follow-up do próprio DevOps antes do
próximo deploy real, registradas para rastreabilidade, não escaladas como
bloqueio de terceiros. Itens 1 e 2 (criação de projeto Supabase de staging,
configuração de secrets) são o único ponto que precisa de uma decisão
explícita de fora do DevOps antes da próxima tentativa render um deploy
real em vez de simulado.
