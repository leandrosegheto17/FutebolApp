# PLANNING-FLOW.md

Sequência lógica da **fase de planejamento** do pipeline — da ideia inicial até um
`TASK.md` aprovado, pronto para a fase de execução (Backend/Frontend/Mobile/QA/
DevSecOps/DevOps — fluxo separado, não coberto aqui).

Este documento não redefine nenhum dos 12 agentes nem a convenção de artefatos —
só ordena o que cada um já declara em `AGENT-TEMPLATE.md`/`PIPELINE-CONVENTIONS.md`
numa sequência executável, com pontos de pausa e escalonamento.

**Mecanismo de orquestração (comando, agente dedicado, etc.) ainda não definido** —
este documento cobre só a lógica da sequência; a ferramenta que a executa é tratada
à parte.

---

## Sequência (6 agentes ativos)

| # | Agente | Dispara quando | Produz | Checkpoint |
|---|---|---|---|---|
| 1 | `cto` | Ideia inicial (briefing, sem artefato formal) | Seção **Gate 1** em `CTO-REVIEW.md` | Veto: Aprovado / Aprovado com ressalvas / Reprovado — Reprovado não libera o PM |
| 2 | `pm` | Gate 1 aprovado | `PRD.md` | Checklist binário próprio do PM (sem veredito do CTO) |
| 3 | `business-analyst` | PM libera `PRD.md` | `PRD-TECNICO.md` | Checklist binário próprio |
| 4 | `software-architect` | BA libera `PRD-TECNICO.md` | `SDD.md` + ADRs | **CTO Gate 2** — só aqui o SDD.md vira final |
| 5 | `ux-ui` | SDD.md aprovado no Gate 2 | `UX-SPEC.md` | Checklist binário próprio |
| 6 | `tech-lead` | SDD.md aprovado + UX-SPEC.md disponível | `TASK.md` + rascunho de `GUARDRAILS.md` | **CTO Gate 3** (TASK.md) + **guardrails-governance** (GUARDRAILS.md) |

Bate diretamente com o que cada agente já declara em `upstream`/`triggers` — nenhuma
ordem forçada por conveniência.

**Simplificação deliberada**: no pipeline "real" (`PIPELINE-CONVENTIONS.md`), UX/UI e
Tech Lead disparam em paralelo, os dois a partir do Gate 2. Como este fluxo pausa para
validação a cada etapa, os dois são serializados aqui (UX/UI primeiro, Tech Lead
depois) — não há como validar duas coisas ao mesmo tempo, e o Tech Lead já aceita
`UX-SPEC.md` completo como input (não só incremental).

---

## Onde as "specs rotuladas por agente executor" já existem

A resposta não é uniforme entre os cinco papéis de execução:

- **Backend, Frontend, Mobile**: rotulados de fato na Seção 3 do `TASK.md` — cada
  tarefa tem coluna "dono/time responsável", preenchida pelo `task-decomposition` do
  Tech Lead (etapa 6). Essa tabela **é** a spec individual de implementação para os
  três; não existe (nem precisa existir) um arquivo separado por componente.
- **DevSecOps e DevOps**: não recebem tarefa individual no `TASK.md` — consomem o
  `SDD.md` inteiro como referência (DevSecOps lê a Seção 7, Requisitos de Segurança;
  DevOps lê as Seções 3 e 6, Stack e Riscos/Escalabilidade). `SDD.md` já é, na
  prática, a spec deles — só que no nível do documento inteiro, não fatiada por
  componente.

**Ponto em aberto, não decidido aqui**: se uma spec fatiada por componente também for
necessária para DevSecOps/DevOps mais adiante, isso muda o escopo do Software
Architect (um agente já auditado) — fica para quando o fluxo de execução for
desenhado, não decidido dentro deste documento.

---

## CLAUDE.md e GUARDRAILS.md

- **CLAUDE.md**: não existe como arquivo separado — consolidado na Seção 1 do
  `TASK.md` ("Diretrizes de Implementação"), produzida pelo Tech Lead junto com o
  resto do TASK.md, etapa 6.
- **GUARDRAILS.md**: o Tech Lead propõe o rascunho (`guardrails-drafting`) no mesmo
  momento em que produz o `TASK.md` (etapa 6); o CTO segue sendo o único que aprova
  (`guardrails-governance`, PIPELINE-CONVENTIONS.md §5). É um mecanismo de aprovação
  separado do Gate 3 (veto de gate vs. governança de documento vivo), mas os dois
  acontecem no mesmo ponto da sequência.

---

## Onde o fluxo termina

`TASK.md` aprovado no Gate 3 (Aprovado ou Aprovado com ressalvas) **+**
`GUARDRAILS.md` aprovado via `guardrails-governance` — os dois juntos marcam
planejamento completo. `TASK.md` é o artefato de entrega principal (consumido por
Backend/Frontend/Mobile/QA para iniciar a execução); `GUARDRAILS.md` é a regra que
vale durante toda a execução.

---

## Pausa e escalonamento

- Após cada uma das 6 etapas: resumo do que foi produzido, aguarda validação
  (aprovar / pedir ajuste / reprovar) antes de acionar o próximo agente.
- Se um agente gerar uma entrada em `BLOCKERS.md` (ex.: BA sinaliza ambiguidade de
  escopo no `PRD.md` do PM): pausa, explica o motivo, aciona o agente de destino já
  definido no campo "Escala para" daquele agente, e **retoma a etapa original** com a
  resolução em mãos — usa só o que já está declarado nos 12 agentes (inclusive os
  campos "Recebe reabertura de" adicionados na auditoria end-to-end).
- Se o CTO reprovar um gate: o agente dono do artefato revisado corrige (reprovação
  pontual reabre só o ponto apontado, não o documento inteiro — já definido em
  `software-architect.md`/`tech-lead.md`), e o fluxo retoma a partir da reavaliação
  do CTO, não do início.
