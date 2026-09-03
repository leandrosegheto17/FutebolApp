---
description: Orquestra a fase de execução (Backend/Frontend/Mobile em paralelo, QA, DevSecOps, DevOps, Tech Lead) a partir do TASK.md aprovado, por lote. Por padrão processa um lote por invocação e para; use --continuar para encadear vários, até o deploy em produção. Pausa sempre nos pontos definidos em EXECUTION-FLOW.md.
argument-hint: "[opcional] --continuar [N] para encadear N lotes (ou todos os restantes, sem N); ou um lote/tarefa específico para restringir o escopo. Vazio = processa só o lote atual/próximo e para."
---

# Orquestrador da Fase de Execução

Você está entrando no **modo Orquestrador de Execução**, que persiste pelo resto desta
conversa até o fluxo terminar (ou você decidir interrompê-lo). A lógica deste fluxo
está definida em `.claude/EXECUTION-FLOW.md` — leia esse arquivo agora, antes de fazer
qualquer outra coisa, se ainda não o tiver em contexto. `PIPELINE-CONVENTIONS.md` e os
arquivos de agente (`backend.md`, `frontend.md`, `mobile.md`, `qa.md`, `devsecops.md`,
`devops.md`, `tech-lead.md`) definem o que cada um faz internamente — este comando só
ordena os dispatches.

**Revisão 2026-09-03**: este comando opera por **lote** (conjunto coerente de tarefas
de Backend/Frontend/Mobile que forma uma funcionalidade/módulo), não mais por tarefa
individual isolada nem pelo backlog inteiro de uma vez — ver `EXECUTION-FLOW.md` §1.

**Revisão 2026-09-04**: por padrão, este comando processa **um único lote** por
invocação e para — mesmo que o lote feche limpo, sem nenhuma pausa obrigatória. Isso
é diferente das pausas obrigatórias do §3 (aquelas sinalizam um problema a resolver;
esta é só o ritmo padrão entre invocações). Use `--continuar` para encadear todos os
lotes restantes automaticamente (comportamento equivalente ao anterior a esta
revisão), ou `--continuar N` para encadear até N lotes e então parar. O reset de
contexto entre lotes (§2.6) acontece da mesma forma nos dois modos — o que muda é só
se o orquestrador para ou segue automaticamente para o lote seguinte depois de
fechar um.

Escopo recebido: $ARGUMENTS

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
3. **Estrutura de lotes**: confirme que a Seção 3 do `TASK.md` tem a subseção `3.0
   Lotes` e que cada tarefa nas tabelas 3.1/3.2/3.3 tem uma coluna `Lote` preenchida.
   Se o `TASK.md` foi produzido antes desta revisão e não tem essa estrutura, **pare**
   e informe que o Tech Lead precisa retrofitar o agrupamento em lotes antes deste
   fluxo rodar — não infira lotes por conta própria a partir de nomenclatura de ID ou
   suposição de módulo; isso é decisão do Tech Lead, documentada no `TASK.md`.

**Interpretando `$ARGUMENTS`** — define a meta de quantos lotes processar nesta
invocação, e opcionalmente restringe o escopo:

- **Vazio**: meta = **1 lote**. Processa o lote em andamento (se houver um
  incompleto) ou inicia o próximo lote pendente na ordem de `TASK.md` §3.0; para
  depois que esse lote fechar (Seção 5.1) — mesmo sem nenhum problema.
- **`--continuar`**: meta = **ilimitada**. Processa lotes em sequência
  automaticamente, sem parar entre um lote limpo e o próximo, só parando nas pausas
  obrigatórias do §3.1 ou ao final de todos os lotes (Seção 5.2).
- **`--continuar N`** (N inteiro positivo): meta = **N lotes**. Processa até N
  lotes fecharem nesta invocação e então para (Seção 5.1), mesmo que ainda faltem
  lotes depois.
- **Um identificador de lote (ex.: `L3`) ou de tarefa (ex.: `BE-06`)**: restringe o
  escopo a esse lote/tarefa específico. Pode ser combinado com `--continuar`/
  `--continuar N` (ex.: `L3 --continuar` processa a partir de L3 em diante sem
  parar entre lotes); sozinho, aplica a meta padrão de 1 lote sobre o escopo
  indicado.
- Combinação inválida ou ambígua (ex.: N não numérico, lote/tarefa inexistente):
  pare e peça esclarecimento — não adivinhe a meta nem o escopo.

A partir daí, reconstrua o estado real antes de disparar qualquer agente:

4. Leia `.md/TASK.md` §3.0 (lotes definidos) e a Seção 3 (tabela de tarefas) e
   classifique cada tarefa por Status: `Não iniciada` / `Em andamento` / `Bloqueada` /
   `Concluída`. Para cada lote, derive seu status agregado: `Não iniciado` (nenhuma
   tarefa começou), `Em andamento` (alguma tarefa não `Concluída`), `Aguardando QA`
   (todas as tarefas `Concluída`, QA ainda não validou o lote), `Aguardando
   DevSecOps`/`Aguardando Tech Lead`/`Fechado` (conforme os gates do lote já
   passados).
5. Leia `.md/EXECUTION-LOG.md` (se existir) — é o resumo compacto de cada lote já
   fechado (o que foi feito, aprovado, e débitos registrados). Use **só** essa
   entrada + os artefatos-fonte vivos (`TASK.md`, `SDD.md`, `GUARDRAILS.md`,
   `API-CONTRACT.yaml`, estado corrente de `QA-REPORT.md`/`SECURITY-REVIEW.md`) como
   contexto de lotes já fechados — nunca precise reconstruir o histórico completo de
   dispatches de um lote fechado para retomar o próximo.
6. Leia `.md/QA-REPORT.md`, `.md/SECURITY-REVIEW.md` e `.md/DEPLOY.md` (se
   existirem) para saber o que já foi validado, auditado ou deployado no(s) lote(s)
   em andamento (ainda não fechado, portanto ainda não resumido em
   `EXECUTION-LOG.md`).
7. Leia `.md/BLOCKERS.md` (se existir) e liste toda entrada `Aberto` — trate como
   pausa pendente antes de iniciar trabalho novo relacionado a ela (ver Seção 4).
8. Se `$ARGUMENTS` apontar um lote/tarefa específico, restrinja a retomada a ele;
   caso contrário, retome o lote em andamento ou o próximo lote pendente, na ordem
   relativa definida em `TASK.md` §3.0. Em qualquer caso, **processe só até a meta
   desta invocação** definida acima — nunca além dela, mesmo que mais lotes já
   estejam liberados para começar. Lotes sem dependência entre si podem ser
   trabalhados em paralelo dentro do que a meta permitir.
9. Nunca reinicie uma tarefa já `Concluída` e aprovada, nem reabra um lote já
   `Fechado` — só reabra se o próprio `TASK.md`/`QA-REPORT.md`/`SECURITY-REVIEW.md`
   indicar reversão.

## 1. A sequência

Diferente do `/planejar`, este fluxo **não pausa a cada etapa dentro de um lote** —
só nos pontos listados na Seção 3.1 abaixo. A parada entre lotes (Seção 3.2) é o
padrão desta invocação, não uma etapa isolada a aprovar.

| Trilha/Papel | Agente (`subagent_type`) | Dispara quando | Ritmo |
|---|---|---|---|
| Backend | `backend` | Tarefa de backend do lote corrente liberada por dependência | Sequencial dentro da trilha, escopo = lote corrente |
| Frontend | `frontend` | Tarefa de frontend do lote corrente liberada por dependência | Sequencial dentro da trilha, escopo = lote corrente |
| Mobile | `mobile` | Tarefa de mobile do lote corrente liberada por dependência | Sequencial dentro da trilha, escopo = lote corrente |
| QA (planejamento) | `qa` (`test-strategy-planning`) | Início do projeto (uma vez) | Uma vez, em paralelo ao primeiro lote |
| QA (validação) | `qa` (demais skills) | Todas as tarefas de um lote marcadas `Concluída` | Uma vez por lote fechado |
| DevSecOps (scan) | `devsecops` (`static-security-analysis`) | Início do projeto | Contínuo, em paralelo a todos os lotes |
| DevSecOps (auditoria) | `devsecops` (demais skills) | QA aprova todas as tarefas do lote | Uma vez por lote |
| Tech Lead (aprovação de lote) | `tech-lead` | QA e DevSecOps já aprovaram o mesmo lote | Uma vez por lote |
| DevOps (prep) | `devops` (IaC + CI/CD) | SDD.md aprovado (já aconteceu) | Início do projeto |
| DevOps (deploy) | `devops` (demais skills) | Lote aprovado por QA + DevSecOps + Tech Lead | Staging automático por lote; produção sempre pausa, por lote |

Lotes sem dependência mapeada entre si podem rodar em paralelo (dentro do limite da
meta desta invocação); dentro de um lote, as 3 trilhas rodam em paralelo entre si, e
dentro de cada trilha as tarefas rodam em sequência.

## 2. Mecânica

### 2.1 Disparo inicial de um lote

Numa única resposta, dispare em paralelo (múltiplas chamadas `Agent`,
`run_in_background: true` para as que não bloqueiam o próximo passo imediato):

- Uma chamada por trilha (`backend`/`frontend`/`mobile`) para a primeira tarefa
  liberada de cada uma **dentro do lote corrente**, apontando a tarefa específica do
  `TASK.md` — não repita a definição do agente, ele já a tem.
- Se for o **primeiro lote do projeto** (nenhum `EXECUTION-LOG.md` ainda): também
  dispare `qa` para `test-strategy-planning`, `devsecops` para
  `static-security-analysis`, e `devops` para `infrastructure-as-code-provisioning`
  + `cicd-pipeline-configuration` — essas três rodam uma vez só, no início do
  projeto inteiro, não se repetem a cada lote.

Se alguma trilha não tiver tarefa no lote corrente (projeto sem mobile, por
exemplo, ou lote sem tarefa daquela trilha), simplesmente não a dispare.

### 2.2 Por tarefa, dentro de uma trilha, dentro do lote

1. O agente da trilha implementa em ciclo TDD (mecanismo interno da própria
   `automated-testing`) e roda a revisão de spec-compliance + qualidade.
2. Achado da revisão: corrige e revisa de novo — fix-loop **até um teto de 2
   tentativas de correção**. Se a 3ª revisão ainda encontrar achado: **pare**, marque
   a tarefa `Bloqueada` no `TASK.md`, e escale para `tech-lead` (mesmo mecanismo de
   "desvio grande de escopo/estimativa" já definido nos agentes de implementação).
   Retome a tarefa na trilha original depois que o Tech Lead resolver.
3. Ao marcar a tarefa `Concluída` no `TASK.md`, **não dispare QA ainda** — verifique
   se **todas** as tarefas do lote corrente (Backend+Frontend+Mobile, conforme
   `TASK.md` §3.0) já estão `Concluída`. Se não, dispare a próxima tarefa liberada da
   mesma trilha (dentro do lote) e continue.
4. Quando **todas** as tarefas do lote estiverem `Concluída`, dispare `qa` uma única
   vez para validar o lote inteiro (ver 2.2.1 abaixo).

#### 2.2.1 QA valida o lote

1. `qa` roda as 5 skills de validação sobre o lote inteiro (todas as suas tarefas).
2. **QA aprova o lote** (Aprovado ou Aprovado com ressalvas): sem pausa — segue para
   a auditoria completa do DevSecOps (2.3).
3. **QA reprova algo do lote**: pausa obrigatória (ver Seção 3.1). Só a(s) tarefa(s)
   reprovada(s) + dependentes voltam à trilha responsável; depois de corrigidas,
   dispare `qa` de novo, mas só para retestar o que foi reprovado + dependências —
   não o lote inteiro do zero.

### 2.3 DevSecOps

- O scan contínuo (`static-security-analysis`) roda desde o início do projeto, em
  paralelo a todos os lotes — não espera nenhum lote fechar, dispara uma vez no
  início e o próprio agente trata como atividade contínua ao longo da execução.
- **Achado de severidade alta/crítica, a qualquer momento**: pausa obrigatória,
  mesmo no meio da implementação de qualquer lote.
- A auditoria completa dispara quando QA aprovar todas as tarefas do lote (ver
  2.2.1.2).
- Achado que bloqueia a auditoria completa: pausa, escala para a trilha responsável
  (campo "Escala para" de `devsecops.md`), retoma a trilha original após correção, e
  DevSecOps reaudita só o que foi corrigido dentro do lote.

### 2.4 Tech Lead — aprovação de fechamento do lote

Depois que QA aprovou e DevSecOps aprovou (Aprovado ou Aprovado com débito
registrado) o mesmo lote, dispare `tech-lead` para aplicar o checklist de
`EXECUTION-FLOW.md` §5 (QA aprovou todas as tarefas; DevSecOps aprovou a auditoria;
nenhuma tarefa `Bloqueada` sem resolução; TASK.md reflete o que foi implementado).

- **Aprovado**: o lote está `Fechado` — registre a entrada compacta em
  `.md/EXECUTION-LOG.md` (ver 2.6), dispare o deploy em staging (2.5), e **incremente
  o contador de lotes fechados nesta invocação** (esse contador decide, na Seção
  2.6, se o orquestrador para ou segue automaticamente para o próximo lote).
- **Reprovado** (algo diverge do TASK.md): o Tech Lead ajusta o `TASK.md` ou escala
  pontualmente ao agente responsável, sem reabrir o lote inteiro nem os gates do
  CTO já passados. Retome depois da correção.

### 2.5 DevOps

- Preparação (`infrastructure-as-code-provisioning`, `cicd-pipeline-configuration`)
  já disparou no instante zero do projeto (2.1), sem pausa, uma vez só.
- Deploy em **staging** dispara automaticamente assim que um lote fecha (aprovado
  por QA + DevSecOps + Tech Lead) — sem pausa, por lote, entrega incremental.
- **Deploy em produção: pausa obrigatória sempre**, mesmo com tudo aprovado sem
  ressalva — apresente o que vai para produção (o lote validado em staging) e
  aguarde confirmação explícita do usuário antes de disparar. O usuário pode optar
  por acumular mais de um lote em staging antes de confirmar produção; o gatilho
  técnico (build pronto) é por lote, a decisão de quando promover a produção é do
  usuário a cada pausa.

### 2.6 Resumo-e-reset de contexto ao fechar um lote

Ao fechar um lote (Tech Lead aprovou, 2.4), registre uma entrada em
`.md/EXECUTION-LOG.md` (crie o arquivo na primeira vez): nome do lote, tarefas
incluídas por trilha, veredito de QA, veredito de DevSecOps, aprovação do Tech
Lead, e débitos/pendências que seguem carregados. A partir daí, os prompts de
dispatch do lote seguinte (se houver) referenciam **só** essa entrada + os
artefatos-fonte vivos (`TASK.md`, `SDD.md`, `GUARDRAILS.md`) — não replique o
histórico completo de dispatches/fix-loops do lote que acabou de fechar.

Isso também vale para como você se comporta **dentro desta própria conversa**: ao
apresentar o fechamento de um lote ao usuário, use o mesmo resumo compacto que
acabou de escrever em `EXECUTION-LOG.md` — não renarre o detalhe de cada dispatch,
fix-loop ou revisão individual daquele lote (isso já está registrado em
`QA-REPORT.md`/`SECURITY-REVIEW.md`, não precisa ser repetido). A partir daqui,
trate esse detalhe como encerrado: ao trabalhar no lote seguinte, não volte a
consultá-lo nem a mencioná-lo, a menos que o usuário pergunte diretamente sobre ele
ou que um bloqueio novo dependa explicitamente de algo decidido naquele lote.

**Checagem da meta desta invocação** (novo, `--continuar`): depois de registrar a
entrada em `EXECUTION-LOG.md` e aplicar o reset acima, compare o contador de lotes
fechados nesta invocação contra a meta definida em §0:

- **Meta atingida** (1 lote no padrão, ou N com `--continuar N`): **pare aqui** — vá
  para a Seção 5.1, mesmo que existam mais lotes pendentes e mesmo que este lote
  tenha fechado sem nenhum problema.
- **Meta não atingida** (modo `--continuar` sem número, ou `--continuar N` com N
  ainda não alcançado): inicie o próximo lote pendente automaticamente (volte à
  Seção 2.1), **sem perguntar** — isso é o comportamento esperado do modo
  `--continuar`, não uma nova pausa.

### 2.7 Bloqueio silencioso

Se uma tarefa ficar parada por dependência não resolvida, calcule há quanto tempo
está parada a partir da data já registrada em `BLOCKERS.md` e inclua isso em
qualquer resumo apresentado — nunca deixe uma tarefa travada sem reportar o tempo
parado.

## 3. Pontos de pausa e como reagir

### 3.1 Pausas obrigatórias (sempre, independente do modo `--continuar`)

Pare **apenas** nestes casos (mesma lista de `EXECUTION-FLOW.md` §9) — são
problemas a resolver, não o ritmo padrão de invocação:

- QA reprova algo dentro de um lote.
- Fix-loop de uma tarefa esgota o teto de 2 tentativas (escala `Bloqueada` ao Tech
  Lead).
- DevSecOps encontra achado de severidade alta/crítica, a qualquer momento.
- Antes de qualquer deploy em produção (por lote).
- Tarefa bloqueada por dependência não resolvida (reporte, mas isso não impede
  outras trilhas/lotes independentes de continuarem em paralelo).

Ao pausar, apresente: o que aconteceu, qual artefato registrou (`QA-REPORT.md`,
`SECURITY-REVIEW.md`, ou o resumo de deploy), e o que está aguardando decisão.

Quando o usuário responder:

- **Aprovação/confirmação** ("pode seguir", "pode deployar"): retome exatamente do
  ponto pausado — reabra a tarefa na trilha responsável, ou dispare o deploy em
  produção.
- **Pedido de ajuste**: redisparar o agente responsável pela correção (trilha de
  implementação, `tech-lead`, `devsecops` ou `devops` conforme o caso) com o
  feedback incluído no prompt de dispatch.
- **Reprovação/cancelamento explícito**: trate como bloqueio (Seção 4) — não decida
  sozinho um caminho alternativo.

### 3.2 Parada natural de fim de invocação (não é um problema)

Quando a meta de lotes desta invocação é atingida (§0/§2.6) com o(s) lote(s)
fechado(s) limpo(s), **isso também para o fluxo** — mas não é uma pausa obrigatória
esperando decisão sobre um problema, é o padrão de ritmo desta revisão. Apresente o
resumo da Seção 5.1 e encerre a resposta; não pergunte "posso continuar?" como
próxima ação implícita — se o usuário quiser mais lotes, ele roda `/executar` de
novo (ou já usa `--continuar`/`--continuar N` na primeira chamada).

Fora dos pontos de 3.1 e 3.2, **não pare para pedir aprovação** — o próprio
`EXECUTION-FLOW.md` define isso como progresso sem pausa (execução paralela normal,
fix-loop dentro do teto, aprovações limpas de QA/DevSecOps/Tech Lead, deploy em
staging).

## 4. Escalonamento (bloqueios)

Depois de cada dispatch, verifique se o subagente sinalizou um bloqueio (no próprio
relatório, ou checando novas entradas `Aberto` em `.md/BLOCKERS.md`). Se sim:

1. **Pare** e explique: quem reportou, o que está bloqueado, e para qual agente foi
   escalado (campo "Escala para" do agente que reportou — para fix-loop esgotado,
   é sempre `tech-lead`).
2. **Dispare o agente de destino** com o conteúdo da entrada de `BLOCKERS.md` como
   contexto, para que ele resolva.
3. Apresente a resolução e aguarde validação do usuário.
4. **Retome a trilha/lote original** (não do início do fluxo) — redisparar o agente
   que estava bloqueado, agora com a resolução disponível, para ele concluir a
   tarefa.

Nunca decida a resolução de um bloqueio por conta própria — quem resolve é sempre o
agente de destino definido no próprio arquivo do agente que escalou. Lotes/trilhas
sem relação com o bloqueio continuam em paralelo, sem pausar por tabela.

## 5. Encerramento

### 5.1 Fim desta invocação (meta de lotes atingida, projeto não terminou)

Quando o contador de lotes fechados nesta invocação atinge a meta definida em §0 (1
por padrão, ou N com `--continuar N`), pare aqui, mesmo que existam mais lotes
pendentes no `TASK.md`. Apresente:

- O resumo compacto de cada lote fechado **nesta invocação** (mesmo conteúdo
  gravado em `EXECUTION-LOG.md`: tarefas, veredito de QA/DevSecOps, aprovação do
  Tech Lead, débitos registrados) — se mais de um lote fechou (`--continuar N`),
  um resumo por lote, não só o último.
- Uma frase informando que o projeto tem mais lotes pendentes, **sem listar o
  detalhe de cada um** — isso é papel do `/listar`, não deste comando.

Não pergunte se deve continuar; não liste as tarefas dos lotes futuros. Só informe
que há mais e encerre a resposta.

### 5.2 Encerramento do projeto (todos os lotes fechados e em produção)

Um lote fecha (Seção 2.4-2.6) várias vezes ao longo da execução — isso não é o
encerramento do fluxo inteiro. O encerramento geral acontece quando **todos os
lotes** do `TASK.md` estiverem `Fechado` e tiverem chegado a produção (confirmados
pelo usuário, um a um ou agrupados, conforme 2.5): dispare `devops` para consolidar
o Gate 4 (fechamento em `.md/CTO-REVIEW.md`, sem poder de veto — só registro).

Apresente a lista consolidada de tudo que foi implementado, testado, auditado e
deployado nesta execução — reconstruída a partir das entradas de
`.md/EXECUTION-LOG.md`, não do histórico completo de dispatches: por lote, o status
final; achados de segurança relevantes e seu tratamento (corrigido/débito);
resultado do deploy (staging, produção, janela de observação). Informe que o ciclo
de governança aberto no Gate 1 do `/planejar` está fechado.
