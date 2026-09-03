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

**Revisão 2026-09-03**: este documento foi reestruturado em torno da unidade de
trabalho **lote** (ver Seção 1), substituindo o desenho anterior de tarefa-individual
→ bateria completa de QA/DevSecOps por tarefa. Motivação: o desenho por-tarefa gerava
disparo excessivo (5 skills de QA + revisão isolada por tarefa) e nunca podava o
contexto acumulado ao longo do projeto. O extremo oposto (Backend/Frontend/Mobile
implementarem o backlog inteiro antes de qualquer QA) foi avaliado e descartado por
criar efeito cascata de retrabalho quando um erro nasce cedo e só é detectado no fim.
Esta revisão exigiu mudança correspondente em `tech-lead.md` (TASK.md ganha
agrupamento em lotes na Seção 3, e o Tech Lead passa a ter um papel na fase de
execução: aprovar o fechamento de cada lote) e em `qa.md` (gatilho de validação
passa de "por tarefa `Concluída`" para "por lote fechado") — os três arquivos devem
ser lidos como um conjunto consistente, não only este.

---

## 1. Lotes — a unidade de trabalho

Um **lote** agrupa um conjunto coerente de tarefas do `TASK.md` (de Backend,
Frontend e/ou Mobile) que formam uma funcionalidade/módulo com sentido próprio (ex.:
"Autenticação", "Cadastro de Atletas", "Montagem de Times") — nunca uma tarefa solta,
nunca o backlog inteiro.

- **Onde o lote é definido**: na Seção 3 do `TASK.md` (`tech-lead.md` já foi
  atualizado para produzir essa estrutura) — uma subseção `3.0 Lotes` lista cada
  lote com nome, as tarefas de todas as trilhas que o compõem, e a ordem relativa
  entre lotes; cada linha de tarefa nas tabelas 3.1/3.2/3.3 ganha uma coluna `Lote`
  referenciando esse nome. Um `TASK.md` sem essa estrutura (produzido antes desta
  revisão) precisa ser retrofitado pelo Tech Lead antes de este fluxo rodar sobre
  ele — não é responsabilidade do orquestrador inferir lotes por conta própria.
- **O que caracteriza um lote fechado**: todas as tarefas de todas as trilhas
  listadas em `3.0 Lotes` para aquele lote estão `Concluída`, QA validou o lote
  inteiro (Seção 3), DevSecOps auditou o lote (Seção 4) e o Tech Lead aprovou o
  fechamento (Seção 6) — só então o lote está pronto para deploy (Seção 5).
- **Lotes não são necessariamente sequenciais entre si** — se dois lotes não têm
  dependência mapeada na Seção 4 do `TASK.md` entre suas tarefas, podem ser
  trabalhados em paralelo (mesma lógica de paralelismo que já existia por tarefa,
  agora também aplicável entre lotes independentes). Quando há dependência (ex.:
  lote "Rodadas" depende de tarefas do lote "Atletas"), o lote dependente só começa
  depois que as tarefas específicas de que depende estiverem prontas — não
  necessariamente depois do lote inteiro fechar, se a dependência mapeada for mais
  granular.

---

## 2. As trilhas dentro de um lote (Backend / Frontend / Mobile)

Cada trilha processa, em paralelo com as outras duas, as tarefas do lote corrente
atribuídas a ela. **Dentro de uma mesma trilha, as tarefas rodam em sequência** (uma
por vez, respeitando as dependências já mapeadas na Seção 4 do TASK.md) — só o
paralelismo *entre* trilhas é real. Isso é idêntico ao desenho anterior; a única
mudança é que o escopo de "todas as tarefas" agora é o lote corrente, não o
`TASK.md` inteiro de uma vez.

Por tarefa, dentro da trilha:

1. Dispara o agente da trilha (`backend`/`frontend`/`mobile`) para a tarefa
   específica — ele implementa em ciclo TDD via sua própria `automated-testing`.
2. Ao concluir, dispara uma revisão leve de spec-compliance (contra o critério de
   aceite da própria tarefa) + qualidade de código.
3. Achado da revisão: corrige e revisa de novo (fix-loop) — sem pausar, **até um
   teto de 2 tentativas de correção**. Se a 3ª revisão ainda encontrar achado, o
   fix-loop **para**: a tarefa é marcada `Bloqueada` no `TASK.md` e escalada ao
   `tech-lead` (mesmo mecanismo de "desvio grande de escopo/estimativa" já definido
   em `backend.md`/`frontend.md`/`mobile.md` — duas falhas consecutivas de
   spec-compliance é sinal de tarefa mal especificada/subestimada, não só um bug de
   execução). O Tech Lead resolve (ajusta critério de aceite, decompõe diferente,
   ou confirma que é só um bug e devolve para nova tentativa) antes da trilha
   retomar essa tarefa.
4. Marca a tarefa `Concluída` no `TASK.md` (mecanismo já definido nos três agentes)
   — mas **isso não dispara QA individualmente**; QA só entra quando o lote inteiro
   estiver assim (ver Seção 3).

**Dependência de contrato de API (Frontend/Mobile ↔ Backend)**: não é orquestrada
aqui — `frontend.md`/`mobile.md` já resolvem sozinhos ("mock se o endpoint já está
em `API-CONTRACT.yaml`, aguarda se não está"). O orquestrador só precisa saber que
uma tarefa `Em andamento` com nota de mock ainda não está de fato pronta, e que o
lote não fecha enquanto qualquer uma de suas tarefas depender de mock.

---

## 3. QA — uma vez por lote fechado

- `test-strategy-planning` roda **uma vez, no início do projeto** (Gate 3, fim do
  planejamento), em paralelo ao primeiro lote — não muda em relação ao desenho
  anterior, e não se repete por lote.
- As 5 skills de validação (`acceptance-criteria-validation`,
  `cross-platform-integration-testing`, `bug-documentation`,
  `non-functional-validation`, `qa-report-drafting`) disparam **uma vez por lote**,
  quando **todas** as tarefas de Backend/Frontend/Mobile listadas para aquele lote
  em `3.0 Lotes` estiverem `Concluída` — nunca por tarefa individual, nunca
  esperando um conjunto de lotes fechar junto.
- Aprovação (Aprovado ou Aprovado com ressalvas) do lote inteiro: segue sem pausa —
  o lote avança para a auditoria do DevSecOps (Seção 4).
- **Reprovação de algo dentro do lote: pausa obrigatória.** Só a(s) tarefa(s)
  reprovada(s) — e o que depende delas dentro do mesmo lote, conforme a Seção 4 do
  TASK.md — voltam a `Em andamento` na trilha responsável. QA **retesta só o que
  foi corrigido + suas dependências**, não o lote inteiro do zero, e não reabre
  outros lotes já fechados nem tarefas do próprio lote que não foram afetadas.

---

## 4. DevSecOps — dois ritmos (mantido)

Conforme já definido em `devsecops.md`, sem mudança de comportamento nesta revisão:

- `static-security-analysis` (SAST, dependências) roda **contínuo desde o início do
  projeto inteiro**, em paralelo a todas as trilhas de todos os lotes — não espera
  nenhum lote fechar. Mantido deliberadamente fora da granularidade de lote: é uma
  varredura leve, o oposto do problema que motivou esta revisão (a bateria pesada
  de 5 skills por tarefa), e rodar cedo/sempre é estritamente melhor para custo de
  correção de segredo/dependência vulnerável.
- **Achado de severidade alta/crítica, a qualquer momento** (inclusive durante a
  varredura contínua, não só na auditoria de um lote fechado): **pausa
  obrigatória**.
- A auditoria completa (as outras 5 skills) dispara quando o QA tiver aprovado
  (Aprovado ou Aprovado com ressalvas) **todas as tarefas do lote** — mesmo
  gatilho "QA aprovou o build" que `devsecops.md` já define, agora com "build" =
  "lote fechado pelo QA", formalizando o que o documento anterior já insinuava sem
  definir.
- Achado que bloqueia: pausa, explica, escala para a trilha de implementação
  responsável (campo "Escala para" já definido em `devsecops.md`), retoma a trilha
  original após a correção — depois disso, DevSecOps reaudita só o que foi
  corrigido dentro do lote, não o lote inteiro do zero.

---

## 5. Tech Lead — aprovação de fechamento do lote (novo)

Depois que QA aprovou (Aprovado ou Aprovado com ressalvas) e DevSecOps aprovou
(Aprovado ou Aprovado com débito registrado) o mesmo lote, o Tech Lead aprova o
fechamento do lote antes de ele ser considerado pronto para deploy. Critério
objetivo (checklist binário, coerente com o padrão que `tech-lead.md` já usa para
seus próprios "Critérios de Pronto" — o Tech Lead não usa a escala
Aprovado/Aprovado com ressalvas/Reprovado do CTO):

- [ ] QA aprovou (ou aprovou com ressalvas) todas as tarefas do lote
- [ ] DevSecOps aprovou (ou aprovou com débito registrado, com prazo) a auditoria
      do lote
- [ ] Nenhuma tarefa do lote permanece `Bloqueada` sem resolução
- [ ] O `TASK.md` reflete fielmente o que foi implementado — nenhum desvio de
      escopo/dependência não documentado na Seção 6 (Lacunas Sinalizadas) ou como
      decisão de detalhe já registrada pelo próprio time de implementação

Reprovação deste checklist pelo Tech Lead **não é um novo veto do CTO** — é o Tech
Lead identificando que algo aprovado por QA/DevSecOps ainda diverge do que foi
decomposto; ele mesmo resolve (ajusta TASK.md) ou escala pontualmente ao agente
responsável, sem reabrir o lote inteiro nem os gates já passados do CTO.

---

## 6. DevOps — prepara desde o início do projeto, deploya por lote fechado

- `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` disparam
  assim que o `SDD.md` está aprovado (Gate 2, já aconteceu no planejamento) — ou
  seja, começam **no instante zero da execução do projeto inteiro** (não por lote),
  em paralelo às trilhas, sem pausa. Isso não muda em relação ao desenho anterior.
- O deploy em si dispara **por lote fechado** (aprovado por QA + DevSecOps + Tech
  Lead, Seções 3-5): assim que um lote fecha, seu build já vai para **staging sem
  pausa** — entrega incremental, um lote não espera os outros para chegar em
  staging.
- **Deploy em produção: pausa obrigatória sempre**, mesmo com tudo aprovado sem
  ressalva — mas agora também acontece **por lote fechado**, não só uma vez ao
  final de todos os lotes: cada lote, depois de validado em staging, pode ir a
  produção mediante confirmação explícita do usuário, de forma incremental.
  Múltiplos lotes podem se acumular em staging antes de uma confirmação de
  produção, se o usuário preferir agrupar deploys de produção — mas o gatilho
  técnico (build pronto) é por lote, não por "todos os lotes do projeto".

---

## 7. Resumo-e-reset de contexto entre lotes (novo)

Ao fechar um lote (QA aprovado + DevSecOps aprovado + Tech Lead aprovado), o
orquestrador registra uma entrada compacta em `.md/EXECUTION-LOG.md` (criado na
primeira vez que isso acontecer): nome do lote, tarefas incluídas (por trilha),
veredito de QA, veredito de DevSecOps, aprovação do Tech Lead, e qualquer
débito/pendência registrada que segue carregada para lotes futuros (ex.: achado de
baixa severidade com prazo, nota de reestimativa pendente).

Ao iniciar o lote seguinte, os prompts de dispatch do orquestrador referenciam
**apenas**:
- essa entrada compacta do(s) lote(s) anterior(es) em `EXECUTION-LOG.md`;
- os artefatos-fonte vivos e sempre atuais (`TASK.md`, `SDD.md`, `GUARDRAILS.md`,
  `API-CONTRACT.yaml`, estado corrente de `QA-REPORT.md`/`SECURITY-REVIEW.md`).

Nunca o histórico completo de dispatches, revisões e fix-loops do lote anterior —
esse histórico já está compactado no `EXECUTION-LOG.md` e nos artefatos formais
(`QA-REPORT.md`, `SECURITY-REVIEW.md`), não precisa ser recarregado no contexto do
orquestrador para o próximo lote fazer sentido.

---

## 8. Bloqueio silencioso

Se uma tarefa ficar travada por dependência não resolvida (de outra tarefa, de um
endpoint que não existe, de um achado ainda não corrigido), o reporte inclui **há
quanto tempo está parada** — calculado a partir da data já registrada na entrada
correspondente de `BLOCKERS.md`, nunca deixado travado em silêncio.

---

## 9. Resumo: quando pausa e quando não pausa

**Pausa obrigatória**:
- Qualquer reprovação do QA sobre algo dentro de um lote.
- Qualquer achado de severidade alta/crítica do DevSecOps, a qualquer momento
  (contínuo, independente de lote).
- Fix-loop de uma tarefa esgota o teto de 2 tentativas (escala `Bloqueada` ao Tech
  Lead).
- Sempre antes de qualquer deploy em produção (por lote).
- Tarefa bloqueada por dependência não resolvida (reporta com tempo parado).

**Progride sem pausa**:
- Execução paralela normal das trilhas dentro de um lote, e entre lotes
  independentes.
- Fix-loop interno de revisão pós-implementação, dentro do teto de tentativas.
- Preparação de infraestrutura e pipeline do DevOps (contínua, desde o início do
  projeto).
- `static-security-analysis` contínuo do DevSecOps.
- Aprovações limpas do QA e do DevSecOps sobre um lote.
- Aprovação do Tech Lead sobre o fechamento de um lote.
- Deploy em staging (por lote fechado).

---

## 10. Onde o fluxo termina

**Gate 4**: o DevOps registra o resultado de cada deploy de produção em
`DEPLOY.md` (sucesso, rollback, incidente); o CTO fecha o ciclo em
`CTO-REVIEW.md` — só registro, sem poder de veto aqui, o deploy já aconteceu
(mesmo mecanismo já definido em `PLANNING-FLOW.md`/`cto.md`). Como produção agora
pode acontecer por lote, o fechamento do Gate 4 é consolidado depois que **todos**
os lotes do `TASK.md` tiverem chegado a produção — não a cada lote individual.

Ao final, apresentar a lista consolidada de tudo que foi implementado, testado,
auditado e deployado ao longo de todos os lotes desta execução, com status de cada
peça — reconstruída a partir das entradas do `EXECUTION-LOG.md`, não do histórico
completo de dispatches.
