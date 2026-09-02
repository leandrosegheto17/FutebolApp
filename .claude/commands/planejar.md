---
description: Orquestra a fase de planejamento (CTO → PM → BA → Software Architect → UX/UI → Tech Lead) a partir de uma ideia inicial, até TASK.md + GUARDRAILS.md aprovados. Pausa para validação a cada etapa.
argument-hint: [ideia inicial em linguagem natural, opcional se já houver artefatos em .md/]
---

# Orquestrador da Fase de Planejamento

Você está entrando no **modo Orquestrador de Planejamento**, que persiste pelo resto
desta conversa até o fluxo terminar (ou você decidir interrompê-lo). A lógica deste
fluxo está definida em `.claude/PLANNING-FLOW.md` — leia esse arquivo agora, antes de
fazer qualquer outra coisa, se ainda não o tiver em contexto.

Ideia inicial recebida (pode estar vazia): $ARGUMENTS

## 0. Determinar o ponto de retomada

Nunca presuma que está começando do zero. Antes de acionar qualquer agente:

1. Verifique o que já existe em `.md/`: `PRD.md`, `PRD-TECNICO.md`, `SDD.md`,
   `UX-SPEC.md`, `TASK.md`, `GUARDRAILS.md`.
2. Leia `.md/CTO-REVIEW.md` (se existir) para saber quais gates já têm veredito
   (Aprovado / Aprovado com ressalvas / Reprovado).
3. Leia `.md/BLOCKERS.md` (se existir) para checar se há algum bloqueio `Aberto`
   pendente de uma execução anterior.
4. A partir disso, determine a primeira etapa da tabela abaixo que ainda não tem
   artefato aprovado, e retome exatamente dali — nunca reinicie etapas já aprovadas.
5. Se não houver nenhum artefato e `$ARGUMENTS` estiver vazio, pare e peça a ideia
   inicial em linguagem natural antes de prosseguir.

## 1. A sequência

Siga exatamente esta tabela (mesma definida em `PLANNING-FLOW.md`). Cada linha é uma
**etapa própria**, com sua própria pausa — um checkpoint do CTO não é a mesma etapa
que o agente que o antecede:

| Etapa | Agente (`subagent_type`) | Dispara quando | Produz |
|---|---|---|---|
| 1 | `cto` | Ideia inicial recebida | Gate 1 em `CTO-REVIEW.md` |
| 2 | `pm` | Gate 1 aprovado | `PRD.md` |
| 3 | `business-analyst` | PM libera `PRD.md` | `PRD-TECNICO.md` |
| 4 | `software-architect` | BA libera `PRD-TECNICO.md` | `SDD.md` + ADRs (rascunho) |
| 5 | `cto` | SDD.md entregue | Gate 2 em `CTO-REVIEW.md` |
| 6 | `ux-ui` | SDD.md aprovado no Gate 2 | `UX-SPEC.md` |
| 7 | `tech-lead` | UX-SPEC.md disponível | `TASK.md` + rascunho de `GUARDRAILS.md` |
| 8 | `cto` | TASK.md + GUARDRAILS.md entregues | Gate 3 em `CTO-REVIEW.md` + aprovação de `GUARDRAILS.md` (`guardrails-governance`) |

O fluxo termina ao final da etapa 8, com veredito Aprovado ou Aprovado com ressalvas.

## 2. Mecânica de cada etapa

Para a etapa corrente:

1. **Anuncie** em uma frase qual agente vai rodar e por quê (que artefato ele vai ler
   e o que vai produzir/revisar).
2. **Dispare o subagente** via `Agent` (`subagent_type` conforme a tabela,
   `run_in_background: false` — a pausa seguinte depende do resultado). O prompt de
   dispatch deve ser curto: aponte o(s) artefato(s) de entrada já disponíveis em
   `.md/` e o que se espera como saída, conforme os próprios Inputs/Outputs Esperados
   do agente — não repita a definição do agente, ele já a tem.
3. **Apresente um resumo objetivo** do que foi produzido: os pontos principais do
   artefato (não o documento inteiro) e o resultado do checklist "Critérios de
   Pronto" daquele agente (incluindo o veredito Aprovado/Aprovado com
   ressalvas/Reprovado, quando a etapa for um gate do CTO).
4. **Pare** — termine sua resposta aqui, aguardando a validação do usuário. Não
   dispare a próxima etapa na mesma resposta.

## 3. Como reagir à resposta do usuário

Quando o usuário responder à pausa:

- **Aprovação** ("pode seguir", "aprovado", etc.): avance para a próxima etapa da
  tabela.
- **Pedido de ajuste**: redisparar o **mesmo** subagente da etapa atual, agora com o
  feedback do usuário incluído no prompt de dispatch. Apresente o resultado revisado
  e pause de novo — nunca reinicie etapas anteriores só porque uma posterior mudou,
  a menos que o próprio agente sinalize que a mudança invalida algo já aprovado.
- **Reprovação explícita de um gate do CTO**: trate como um bloqueio (ver seção 4),
  mesmo que não exista uma entrada formal em `BLOCKERS.md` — o próprio veredito
  Reprovado já é o sinal.

## 4. Escalonamento (bloqueios)

Depois de cada dispatch, verifique se o subagente sinalizou um bloqueio (no próprio
relatório, ou checando novas entradas `Aberto` em `.md/BLOCKERS.md`). Se sim:

1. **Pare** e explique ao usuário: quem reportou, o que está bloqueado, e para qual
   agente foi escalado (campo "Escala para" do agente que reportou).
2. **Dispare o agente de destino** com o conteúdo da entrada de `BLOCKERS.md` como
   contexto, para que ele resolva.
3. Apresente a resolução e aguarde validação do usuário.
4. **Retome a etapa original** (não do início do fluxo) — redisparar o agente que
   estava bloqueado, agora com a resolução disponível, para ele concluir sua etapa.

Nunca decida a resolução de um bloqueio por conta própria — quem resolve é sempre o
agente de destino definido no próprio arquivo do agente que escalou.

## 5. Encerramento

Ao final da etapa 8, com Gate 3 e `GUARDRAILS.md` aprovados, apresente a lista
consolidada de todos os artefatos gerados nesta execução do fluxo — `PRD.md`,
`PRD-TECNICO.md`, `SDD.md` (+ ADRs), `UX-SPEC.md`, `TASK.md`, `GUARDRAILS.md` — cada
um com seu status final de aprovação, e informe que o planejamento está pronto para a
fase de execução (fora do escopo deste comando).
