---
description: Orquestra a fase de execução (Backend/Frontend/Mobile em paralelo, QA, DevSecOps, DevOps) a partir do TASK.md aprovado, até o deploy em produção. Pausa só nos pontos definidos em EXECUTION-FLOW.md — o resto encadeia sem parar.
argument-hint: "[opcional: tarefa/lote específico para retomar; vazio processa todo o TASK.md pendente]"
---

# Orquestrador da Fase de Execução

Você está entrando no **modo Orquestrador de Execução**, que persiste pelo resto desta
conversa até o fluxo terminar (ou você decidir interrompê-lo). A lógica deste fluxo
está definida em `.claude/EXECUTION-FLOW.md` — leia esse arquivo agora, antes de fazer
qualquer outra coisa, se ainda não o tiver em contexto. `PIPELINE-CONVENTIONS.md` e os
arquivos de agente (`backend.md`, `frontend.md`, `mobile.md`, `qa.md`, `devsecops.md`,
`devops.md`) definem o que cada um faz internamente — este comando só ordena os
dispatches.

Escopo recebido (pode estar vazio, processa todo o TASK.md pendente): $ARGUMENTS

## 0. Pré-requisitos e ponto de retomada

Nunca presuma que está começando do zero, e nunca inicie sem os dois pré-requisitos
bloqueantes:

1. **Repositório git**: confirme que o projeto é um repositório git (`git status`).
   Sem isso a camada de revisão pós-implementação não tem `git diff` para comparar —
   pare e ofereça `git init` antes de prosseguir.
2. **Planejamento fechado**: `.md/TASK.md` precisa estar aprovado no Gate 3
   (`.md/CTO-REVIEW.md`) e `.md/GUARDRAILS.md` aprovado via `guardrails-governance`.
   Se qualquer um dos dois faltar ou estiver `Reprovado`, pare e informe que o
   planejamento (`/planejar`) precisa terminar primeiro.

A partir daí, reconstrua o estado real antes de disparar qualquer agente:

3. Leia a Seção 3 do `TASK.md` (tabela de tarefas) e classifique cada tarefa por
   Status: `Não iniciada` / `Em andamento` / `Bloqueada` / `Concluída`.
4. Leia `.md/QA-REPORT.md`, `.md/SECURITY-REVIEW.md` e `.md/DEPLOY.md` (se existirem)
   para saber o que já foi validado, auditado ou deployado.
5. Leia `.md/BLOCKERS.md` (se existir) e liste toda entrada `Aberto` — trate como
   pausa pendente antes de iniciar trabalho novo relacionado a ela (ver Seção 5).
6. Se `$ARGUMENTS` apontar um lote/tarefa específico, restrinja a retomada a ele;
   caso contrário, retome **todas** as tarefas ainda não `Concluída`, respeitando as
   dependências já mapeadas na Seção 4 do `TASK.md`.
7. Nunca reinicie uma tarefa já `Concluída` e aprovada — só reabra se o próprio
   `TASK.md`/`QA-REPORT.md`/`SECURITY-REVIEW.md` indicar reversão.

## 1. A sequência

Diferente do `/planejar`, este fluxo **não pausa a cada etapa** — só nos pontos
listados na Seção 3 abaixo (mesma lista de `EXECUTION-FLOW.md`, "Resumo: quando pausa
e quando não pausa"). Fora desses pontos, encadeie os dispatches na mesma resposta,
sem esperar validação do usuário.

| Trilha/Papel | Agente (`subagent_type`) | Dispara quando | Ritmo |
|---|---|---|---|
| Backend | `backend` | Tarefa de backend liberada por dependência | Sequencial dentro da trilha |
| Frontend | `frontend` | Tarefa de frontend liberada por dependência | Sequencial dentro da trilha |
| Mobile | `mobile` | Tarefa de mobile liberada por dependência | Sequencial dentro da trilha |
| QA (planejamento) | `qa` (`test-strategy-planning`) | Início da execução | Uma vez, em paralelo |
| QA (validação) | `qa` (demais skills) | Cada tarefa marcada `Concluída` | Contínuo, por tarefa |
| DevSecOps (scan) | `devsecops` (`static-security-analysis`) | Início da execução | Contínuo, em paralelo |
| DevSecOps (auditoria) | `devsecops` (demais skills) | QA aprova todas as tarefas do lote | Uma vez por lote |
| DevOps (prep) | `devops` (IaC + CI/CD) | SDD.md aprovado (já aconteceu) | Início da execução |
| DevOps (deploy) | `devops` (demais skills) | Dupla aprovação QA + DevSecOps do mesmo build | Staging sem pausa, produção sempre pausa |

As 3 trilhas rodam em paralelo entre si; **dentro** de cada trilha as tarefas rodam em
sequência, respeitando a Seção 4 do TASK.md.

## 2. Mecânica

### 2.1 Disparo inicial (instante zero da execução)

Numa única resposta, dispare em paralelo (múltiplas chamadas `Agent`,
`run_in_background: true` para as que não bloqueiam o próximo passo imediato):

- Uma chamada por trilha (`backend`/`frontend`/`mobile`) para a primeira tarefa
  liberada de cada uma, apontando a tarefa específica do `TASK.md` — não repita a
  definição do agente, ele já a tem.
- `qa` para `test-strategy-planning`.
- `devsecops` para `static-security-analysis`.
- `devops` para `infrastructure-as-code-provisioning` + `cicd-pipeline-configuration`.

Se alguma trilha não tiver tarefa (projeto sem mobile, por exemplo), simplesmente não
a dispare.

### 2.2 Por tarefa, dentro de uma trilha

1. O agente da trilha implementa em ciclo TDD (mecanismo interno da própria
   `automated-testing`) e roda a revisão de spec-compliance + qualidade — fix-loop
   interno, sem pausa.
2. Ao marcar a tarefa `Concluída` no `TASK.md`, dispare `qa` imediatamente para
   validar essa tarefa específica — não espere outras tarefas da mesma trilha ou de
   outras trilhas.
3. **QA aprova (Aprovado ou Aprovado com ressalvas)**: sem pausa — dispare a próxima
   tarefa liberada da mesma trilha.
4. **QA reprova**: pausa obrigatória (ver Seção 3).
5. Quando todas as tarefas do lote em execução tiverem QA aprovado, dispare a
   auditoria completa do DevSecOps (as 5 skills além do scan contínuo).

### 2.3 DevSecOps

- O scan contínuo (`static-security-analysis`) roda desde o início, em paralelo às 3
  trilhas — não espera nada pronto.
- **Achado de severidade alta/crítica, a qualquer momento** (inclusive durante o scan
  contínuo): pausa obrigatória, mesmo no meio da implementação.
- A auditoria completa dispara quando QA aprovar todas as tarefas do lote (ver 2.2.5).
- Achado que bloqueia a auditoria completa: pausa, escala para a trilha responsável
  (campo "Escala para" de `devsecops.md`), retoma a trilha original após correção.

### 2.4 DevOps

- Preparação (`infrastructure-as-code-provisioning`, `cicd-pipeline-configuration`)
  já disparou no instante zero (2.1), sem pausa.
- Deploy dispara só com dupla aprovação (`QA-REPORT.md` + `SECURITY-REVIEW.md` do
  mesmo build) — confira as duas antes de disparar `devops` para
  `deployment-execution`.
- Deploy em staging: sem pausa, segue direto.
- **Deploy em produção: pausa obrigatória sempre**, mesmo com tudo aprovado sem
  ressalva — apresente o que vai para produção e aguarde confirmação explícita do
  usuário antes de disparar.

### 2.5 Bloqueio silencioso

Se uma tarefa ficar parada por dependência não resolvida, calcule há quanto tempo
está parada a partir da data já registrada em `BLOCKERS.md` e inclua isso em qualquer
resumo apresentado — nunca deixe uma tarefa travada sem reportar o tempo parado.

## 3. Pontos de pausa e como reagir

Pare **apenas** nestes casos (mesma lista de `EXECUTION-FLOW.md`):

- QA reprova uma tarefa.
- DevSecOps encontra achado de severidade alta/crítica, a qualquer momento.
- Antes de qualquer deploy em produção.
- Tarefa bloqueada por dependência não resolvida (reporte, mas isso não impede as
  outras trilhas de continuarem em paralelo).

Ao pausar, apresente: o que aconteceu, qual artefato registrou (`QA-REPORT.md`,
`SECURITY-REVIEW.md`, ou o resumo de deploy), e o que está aguardando decisão.

Quando o usuário responder:

- **Aprovação/confirmação** ("pode seguir", "pode deployar"): retome exatamente do
  ponto pausado — reabra a tarefa na trilha responsável, ou dispare o deploy em
  produção.
- **Pedido de ajuste**: redisparar o agente responsável pela correção (trilha de
  implementação, ou `devsecops`/`devops` conforme o caso) com o feedback incluído no
  prompt de dispatch.
- **Reprovação/cancelamento explícito**: trate como bloqueio (Seção 4) — não decida
  sozinho um caminho alternativo.

Fora desses pontos, **não pare para pedir aprovação** — o próprio `EXECUTION-FLOW.md`
define isso como progresso sem pausa (execução paralela normal, aprovações limpas de
QA/DevSecOps, fix-loop interno, deploy em staging).

## 4. Escalonamento (bloqueios)

Depois de cada dispatch, verifique se o subagente sinalizou um bloqueio (no próprio
relatório, ou checando novas entradas `Aberto` em `.md/BLOCKERS.md`). Se sim:

1. **Pare** e explique: quem reportou, o que está bloqueado, e para qual agente foi
   escalado (campo "Escala para" do agente que reportou).
2. **Dispare o agente de destino** com o conteúdo da entrada de `BLOCKERS.md` como
   contexto, para que ele resolva.
3. Apresente a resolução e aguarde validação do usuário.
4. **Retome a trilha original** (não do início do fluxo) — redisparar o agente que
   estava bloqueado, agora com a resolução disponível, para ele concluir a tarefa.

Nunca decida a resolução de um bloqueio por conta própria — quem resolve é sempre o
agente de destino definido no próprio arquivo do agente que escalou. As demais
trilhas sem relação com o bloqueio continuam em paralelo, sem pausar por tabela.

## 5. Encerramento

Ao final — todas as tarefas `Concluída` e aprovadas, auditoria de segurança limpa (ou
com débito registrado dentro do prazo), e deploy em produção confirmado e registrado
em `.md/DEPLOY.md` — dispare `devops` para consolidar o Gate 4 (fechamento em
`.md/CTO-REVIEW.md`, sem poder de veto, só registro).

Apresente a lista consolidada de tudo que foi implementado, testado, auditado e
deployado nesta execução: por tarefa, o status final; achados de segurança relevantes
e seu tratamento (corrigido/débito); resultado do deploy (staging, produção, janela
de observação). Informe que o ciclo de governança aberto no Gate 1 do `/planejar` está
fechado.
