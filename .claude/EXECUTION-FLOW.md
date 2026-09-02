# EXECUTION-FLOW.md

Sequência lógica da **fase de execução** — parte de onde o planejamento termina
(`TASK.md` aprovado no Gate 3 + `GUARDRAILS.md` aprovado, ver `PLANNING-FLOW.md`) e
vai até o deploy em produção, fechando o ciclo de volta ao CTO.

Este documento não redefine nenhum dos 12 agentes nem os critérios internos de cada
um (o que QA considera bug bloqueante, o que DevSecOps considera achado crítico, o
que autoriza o DevOps a fazer deploy) — só ordena o que cada agente já declara, com
pontos de paralelismo, pausa e escalonamento.

**Técnica de implementação**: cada trilha usa ciclo TDD (teste falha → implementação
mínima → teste passa → refatora) dentro da própria skill `automated-testing` do
agente — é técnica interna de cada dispatch, não um passo separado do orquestrador.
Uma camada de revisão (spec-compliance + qualidade de código) roda depois de cada
tarefa implementada, antes do QA entrar — mecanismo próprio deste fluxo, não do
Superpowers (ver histórico de decisão: Superpowers foi avaliado e descartado como
motor deste fluxo por ser dimensionado para feature isolada em manutenção, não para
um pipeline de 12 papéis com gate de CTO — revisitar quando a fase de manutenção
pós-v1 for desenhada).

**Pré-requisito bloqueante**: este projeto precisa ser um repositório git antes deste
fluxo rodar de verdade — a camada de revisão depende de diff (`git diff`) entre o
estado antes e depois de cada tarefa.

---

## As 3 trilhas paralelas (Backend / Frontend / Mobile)

Cada trilha processa, em paralelo com as outras duas, as tarefas do `TASK.md`
atribuídas a ela (coluna "dono/time responsável", Seção 3). **Dentro de uma mesma
trilha, as tarefas rodam em sequência** (uma por vez, respeitando as dependências já
mapeadas na Seção 4 do TASK.md) — só o paralelismo *entre* trilhas é real.

Por tarefa, dentro da trilha:

1. Dispara o agente da trilha (`backend`/`frontend`/`mobile`) para a tarefa
   específica — ele implementa em ciclo TDD via sua própria `automated-testing`.
2. Ao concluir, dispara uma revisão de spec-compliance (contra o critério de aceite
   da própria tarefa) + qualidade de código.
3. Achado da revisão: corrige e revisa de novo (fix-loop) — **sem pausar**; só
   reprovação do QA ou achado do DevSecOps geram pausa (ver abaixo).
4. Marca a tarefa `Concluída` no `TASK.md` (mecanismo já definido nos três agentes).

**Dependência de contrato de API (Frontend/Mobile ↔ Backend)**: não é orquestrada
aqui — `frontend.md`/`mobile.md` já resolvem sozinhos ("mock se o endpoint já está
em `API-CONTRACT.yaml`, aguarda se não está"). O orquestrador só precisa saber que
uma tarefa `Em andamento` com nota de mock ainda não está de fato pronta.

---

## QA — contínuo, por tarefa

Conforme já definido em `qa.md`:

- `test-strategy-planning` já roda desde o Gate 3 (fim do planejamento), em
  paralelo — não é acionado de novo aqui.
- As 5 skills de validação disparam **a cada tarefa marcada `Concluída`** por
  qualquer trilha, imediatamente — nunca em lote, nunca esperando um conjunto
  fechar.
- Aprovação (Aprovado ou Aprovado com ressalvas): segue sem pausa.
- **Reprovação: pausa obrigatória.** Explica o motivo, a tarefa volta pra trilha
  responsável (`Em andamento`, conforme já definido em `qa.md`), retoma quando
  corrigida.

---

## DevSecOps — dois ritmos

Conforme já definido em `devsecops.md`:

- `static-security-analysis` (SAST, dependências) roda **contínuo desde o início**
  da execução, em paralelo às 3 trilhas, sem esperar nada pronto.
- **Achado de severidade alta/crítica, a qualquer momento** (inclusive durante a
  varredura contínua, não só na auditoria final): **pausa obrigatória**.
- A auditoria completa (as outras 5 skills) dispara quando o QA tiver aprovado
  (Aprovado ou Aprovado com ressalvas) **todas** as tarefas do lote em execução —
  mesmo gatilho "QA aprovou o build" que `devsecops.md` já define.
- Achado que bloqueia: pausa, explica, escala para a trilha de implementação
  responsável (campo "Escala para" já definido em `devsecops.md`), retoma a trilha
  original após a correção.

---

## DevOps — prepara desde o início, deploya só no fim

Conforme já definido em `devops.md`:

- `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` disparam
  assim que o `SDD.md` está aprovado (Gate 2, já aconteceu no planejamento) — ou
  seja, começam **no instante zero da execução**, em paralelo com as 3 trilhas, sem
  pausa.
- O deploy em si só dispara com a **dupla aprovação**: `QA-REPORT.md` (Aprovado ou
  Aprovado com ressalvas) **e** `SECURITY-REVIEW.md` (Aprovado ou Aprovado com
  débito registrado) do **mesmo build**.
- Deploy em staging: sem pausa.
- **Deploy em produção: pausa obrigatória sempre** — mesmo com tudo limpo,
  conforme exigido neste fluxo (não é condicional a haver problema).

---

## Bloqueio silencioso

Se uma tarefa ficar travada por dependência não resolvida (de outra tarefa, de um
endpoint que não existe, de um achado ainda não corrigido), o reporte inclui **há
quanto tempo está parada** — calculado a partir da data já registrada na entrada
correspondente de `BLOCKERS.md`, nunca deixado travado em silêncio.

---

## Resumo: quando pausa e quando não pausa

**Pausa obrigatória**:
- Qualquer reprovação do QA numa tarefa.
- Qualquer achado de severidade alta/crítica do DevSecOps, a qualquer momento.
- Sempre antes do deploy em produção.
- Tarefa bloqueada por dependência não resolvida (reporta com tempo parado).

**Progride sem pausa**:
- Execução paralela normal das 3 trilhas.
- Preparação de infraestrutura e pipeline do DevOps.
- Aprovações limpas do QA e do DevSecOps.
- Fix-loop interno de revisão pós-implementação (spec-compliance + qualidade).
- Deploy em staging.

---

## Onde o fluxo termina

**Gate 4**: o DevOps registra o resultado do deploy em `DEPLOY.md` (sucesso,
rollback, incidente); o CTO fecha o ciclo em `CTO-REVIEW.md` — só registro, sem
poder de veto aqui, o deploy já aconteceu (mesmo mecanismo já definido em
`PLANNING-FLOW.md`/`cto.md`).

Ao final, apresentar a lista consolidada de tudo que foi implementado, testado,
auditado e deployado nesta execução, com status de cada peça.
