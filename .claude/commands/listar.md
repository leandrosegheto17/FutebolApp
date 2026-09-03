---
description: Apresenta o status do projeto em termos de lotes de execução (qual lote está em andamento, qual é o próximo, quais faltam) — puramente informativo, não dispara nenhum agente nem avança o fluxo.
argument-hint: ""
---

# Relatório de Status por Lote

Este comando é **só leitura**. Ele não usa a ferramenta `Agent`, não escreve em
nenhum artefato, não avança nenhuma tarefa/lote, e não pausa esperando confirmação —
produz um relatório e encerra. O fluxo de execução em si continua sendo o
`/executar`; este comando nunca substitui nem inicia esse fluxo.

Usa a mesma convenção de agrupamento em lotes e a mesma leitura de estado que o
`/executar` já usa no seu passo 0 — leia `.claude/EXECUTION-FLOW.md` §1 e
`.claude/commands/executar.md` Seção 0 agora, antes de fazer qualquer outra coisa,
se ainda não os tiver em contexto, para usar exatamente o mesmo vocabulário de
status.

## 1. Pré-requisito

Confirme que `.md/TASK.md` existe e tem a subseção `3.0 Lotes` (com a coluna `Lote`
preenchida nas tabelas 3.1/3.2/3.3). Se não existir, informe que o planejamento
(`/planejar`) ainda não terminou, ou que o `TASK.md` existente precisa do retrofit
de lotes pelo Tech Lead (mesma checagem do `/executar` Seção 0.3) — e pare, sem
tentar adivinhar ou inferir lotes por conta própria.

## 2. Leitura de estado (mesma fonte do `/executar`, só leitura)

1. Leia `.md/TASK.md` §3.0 — a lista de lotes definidos, na ordem prevista de
   execução, com as dependências entre eles.
2. Leia a Seção 3 (tabela de tarefas) e classifique cada tarefa por Status:
   `Não iniciada` / `Em andamento` / `Bloqueada` / `Concluída`.
3. Leia `.md/EXECUTION-LOG.md` (se existir) — lotes já fechados sob o mecanismo
   novo (QA + DevSecOps + Tech Lead aprovaram o lote inteiro). Use só a entrada
   compacta de cada lote fechado, não reabra detalhe de dispatches antigos.
4. Leia `.md/QA-REPORT.md` e `.md/SECURITY-REVIEW.md` (se existirem) para o estado
   de validação/auditoria de lotes ainda não fechados (não resumidos em
   `EXECUTION-LOG.md`).
5. Leia `.md/BLOCKERS.md` (se existir) e liste toda entrada `Aberto` — associe cada
   uma à tarefa/lote que ela afeta.

Para cada lote, derive o status agregado usando o mesmo vocabulário do `/executar`
(Seção 0, item 4): `Não iniciado` / `Em andamento` / `Aguardando QA` / `Aguardando
DevSecOps` / `Aguardando Tech Lead` / `Fechado`.

**Caso especial — lote em transição**: se todas (ou a maioria) das tarefas de um
lote já estiverem `Concluída` e aprovadas **individualmente** pelo QA, mas não
existir entrada em `EXECUTION-LOG.md` para aquele lote (ou seja, o lote nunca
passou pela validação de QA/auditoria de DevSecOps/aprovação do Tech Lead **como
unidade**, porque as tarefas foram concluídas sob o fluxo anterior à revisão por
lote) — não arredonde isso para `Fechado` nem para `Em andamento`. Classifique como
**"transição"** e explique exatamente o que falta (QA por lote / auditoria
DevSecOps / aprovação Tech Lead) para esse lote fechar formalmente.

**Nunca presuma** o status de um lote quando a informação disponível for
insuficiente ou ambígua — sinalize explicitamente a lacuna (ex.: "não há registro
de auditoria do DevSecOps para este lote, status de segurança desconhecido") em vez
de inferir um veredito.

## 3. Formato do relatório

Apresente, sempre nesta ordem:

1. **Lote atual** (o primeiro lote, na ordem de `TASK.md` §3.0, que não está
   `Fechado`) — nome, tarefas que o compõem com o status de cada uma, e qualquer
   bloqueio ativo (`BLOCKERS.md` aberto afetando esse lote, ou reprovação do QA
   pendente de correção).
2. **Lotes em transição**, se houver (ver caso especial acima) — tarefas prontas,
   o que falta para o fechamento formal.
3. **Lotes fechados** — lista curta (nome + data, se disponível em
   `EXECUTION-LOG.md`), sem repetir detalhe de tarefas/dispatches.
4. **Lotes não iniciados** — na ordem de execução prevista, com a dependência
   entre eles quando houver (ex.: "Lote B depende de Lote A concluído").

Se nenhum lote estiver `Fechado` e nenhum estiver em transição, omita essas seções
(não force uma seção vazia com placeholder).

## O que este comando nunca faz

- Nunca chama a ferramenta `Agent` nem qualquer subagente.
- Nunca escreve ou edita `TASK.md`, `QA-REPORT.md`, `SECURITY-REVIEW.md`,
  `BLOCKERS.md` ou `EXECUTION-LOG.md` — só lê.
- Nunca avança uma tarefa ou lote, nunca sugere "posso continuar?" como próxima
  ação implícita — termina no relatório.
- Nunca pausa esperando confirmação do usuário — é uma consulta de status, não uma
  etapa do fluxo de execução.
