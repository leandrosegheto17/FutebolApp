# DEPLOY.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: DevOps Engineer
**Status**: **Fase de preparação de infraestrutura/pipeline** —
`infrastructure-as-code-provisioning` + `cicd-pipeline-configuration`
executadas em paralelo à implementação (Backend/Frontend em tarefas
iniciais), conforme `SDD.md` aprovado no Gate 2. **Nenhum deploy foi
executado ainda.** Este documento será atualizado incrementalmente conforme
o ciclo avança (`deployment-execution`, `observability-setup`,
`non-functional-requirement-validation`, `deploy-report-drafting`) — a seção
"Execuções de Deploy" só passa a ter entradas reais depois da dupla aprovação
de QA e DevSecOps sobre um build.
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
reaproveitado (ADR-002). **Isso não foi confirmado** — não há acesso à conta
Supabase real nesta fase (credenciais só chegam com `SPK-01`, execução).

- Se confirmado: nenhuma ação adicional, staging funciona como desenhado.
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

_Nenhuma execução ainda. Esta seção será preenchida por `deployment-execution`
+ `deploy-report-drafting` assim que houver dupla aprovação (QA + DevSecOps)
sobre um build — formato: versão, ambiente, horário, resultado._

| Versão | Ambiente | Horário | Resultado |
|---|---|---|---|
| — | — | — | — |

## 8. Incidentes Pós-Deploy

_Nenhum — não há deploy ainda._

## 9. Fechamento do Ciclo (Gate 4)

**Não aplicável ainda.** O Gate 4 (`PIPELINE-CONVENTIONS.md`) só se aplica
depois do primeiro deploy de produção e da janela de observação
correspondente. Este documento é reportado ao CTO agora como **registro
intermediário de preparação de infraestrutura/pipeline**, não como
fechamento de ciclo — o encerramento formal (`CTO-REVIEW.md`) só acontece
quando a Seção 7 acima tiver pelo menos uma execução de produção com veredito
aplicado.

## 10. Pendências resumidas para o CTO

1. Suposição de segundo projeto Supabase gratuito para staging não
   confirmada (Seção 5.1) — sem impacto imediato; só vira bloqueio real se
   a conta Supabase, na prática, não permitir.
2. Rollback ainda não testado (Seção 5) — pré-condição obrigatória antes do
   primeiro deploy real de produção, não apenas nota de risco.
3. Monitoramento de **pausa/status** do Supabase (Guardrail 36) e o job de
   **backup lógico externo** (ADR-009) estão implementados e prontos, mas em
   modo pendente de ativação até os secrets de credencial do projeto legado
   existirem (pós-`SPK-01`, fase de execução); monitoramento de **percentual
   de cota** (segundo gatilho da regra 36) fica como checagem manual mensal
   até confirmação de endpoint estável da Management API (Seção 4).

Nenhuma das pendências acima bloqueia o trabalho em paralelo de Backend/
Frontend/QA/DevSecOps — todas são follow-up do próprio DevOps antes do
primeiro deploy real, registradas para rastreabilidade, não escaladas como
bloqueio de terceiros.
