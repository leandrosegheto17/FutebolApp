# GUARDRAILS.md — Sistema de Ranking "Turma do Rola - Comary"

**Status**: **Aprovado pelo CTO no Gate 3** (`CTO-REVIEW.md`, 2026-09-02). Regras
1-34 aprovadas exatamente como submetidas pelo Tech Lead. Regras 35-36 (Seção 9)
foram propostas e aprovadas pelo próprio CTO neste mesmo gate, para dar força de
guardrail vinculante a duas pendências de governança que já haviam atravessado
mais de um gate sem resolução (plano de saída do ADR-002 e orçamento/monitoramento
do tier gratuito do Supabase) — ver `CTO-REVIEW.md`, Gate 3, e `BLOCKERS.md`
(`BLOCKER-003`). Regras 37-40 (Seção 10) foram propostas pelo Tech Lead no Gate 3
da Iniciativa "Redesenho Visual" e **aprovadas pelo CTO sem ajuste** nesse mesmo
gate (`CTO-REVIEW.md`, 2026-09-04) — generalizam, como guardrail vinculante
permanente para qualquer mudança futura de fundação compartilhada (não só desta
iniciativa), as três condições de execução impostas no Gate 2 da mesma iniciativa
(aprovação com ressalvas de `ADR-013`) mais a obrigação de reestimativa formal já
exercida em `TASK.md` Parte II. Todas as 40 regras estão em vigor a partir de
2026-09-04.
**Quem propõe**: Tech Lead (`guardrails-drafting`), a partir de `CTO-REVIEW.md`
(Gate 1 e Gate 2), `SDD.md` e ADRs 001-011.
**Quem aprova**: só o CTO/Head de Tecnologia — qualquer mudança estrutural
(adicionar/remover/reescrever regra) depois da aprovação inicial também passa por
ele; correção de formatação/typo pode ser feita por qualquer agente diretamente.
**Como ler**: cada regra é inegociável — não é uma preferência de estilo, é uma
condição que, se violada, reabre uma decisão já aprovada (ADR, Gate do CTO) ou cria
risco de compliance/segurança já identificado. Regras não cobrem convenção de
formatação de código (isso é responsabilidade de lint/formatter configurado em
`TASK.md` Seção 1, não deste documento).

---

## 1. Arquitetura e Stack (imutável sem novo ADR)

1. O estilo arquitetural é **monólito modular sobre Supabase** (ADR-001/002).
   Nenhum agente introduz microsserviço, banco adicional, ou nova plataforma de
   backend sem que o Software Architect registre um novo ADR e ele passe por
   novo Gate do CTO.
2. O framework web único é **Next.js (App Router, TypeScript)** (ADR-003).
   Nenhuma rota de escrita é implementada como SPA pura consumindo Supabase
   diretamente do cliente.
3. **Mobile nativo está fora de escopo deste projeto** (Gate 1 do CTO). Nenhum
   agente propõe ou implementa app mobile nativo nesta release — "acessível pelo
   celular" é satisfeito exclusivamente por web responsivo.
4. Todo ADR com `Status: Accepted` é **imutável** — nenhum agente edita o
   conteúdo de um ADR já aceito. Mudar uma decisão exige um ADR novo com
   `Superseded by`/`Supersedes` apontando um para o outro.

## 2. Banco de Dados e Integridade de Dados

5. Toda tabela da schema `app` nasce com **RLS habilitado, `deny-by-default`**
   (ADR-005). Nenhuma tabela nova vai para produção com RLS desabilitado, mesmo
   "temporariamente".
6. A role `anon` do Supabase **nunca** recebe `INSERT`/`UPDATE`/`DELETE` em
   nenhuma tabela. Toda escrita passa exclusivamente pela API server-side com
   `service role`.
7. A chave de serviço (`service role`) do Supabase **nunca** é exposta ao
   cliente/navegador, em nenhuma circunstância (nenhuma variável `NEXT_PUBLIC_*`
   contendo essa chave).
8. `lancamento_pontos` é um **ledger append-only** (ADR-006). Nenhum código faz
   `UPDATE`/`DELETE` sobre um lançamento já gravado — correção/estorno sempre
   insere um novo lançamento de ajuste.
9. **Nenhuma linha de `atleta` é excluída fisicamente**, por nenhum motivo,
   inclusive a pedido do titular (LGPD Art. 18) — o único mecanismo permitido é
   a anonimização in-place via função `anonimizar_atleta` (ADR-011).
10. Toda operação que altera saldo acumulado de atleta (lançamento, correção,
    estorno, exclusão, anonimização) roda dentro de **uma única transação
    Postgres (função/trigger PL/pgSQL)** — nunca como sequência de chamadas
    separadas da camada de aplicação (ADR-006).
11. Toda migration de dados do banco legado é **idempotente e reexecutável**
    (ADR-008); a schema legada permanece **intocada (somente leitura)** até
    validação explícita do organizador (RF-08.5/RF-08.6) — nenhum script de
    migração tem permissão de escrita destrutiva sobre a schema legada antes
    dessa validação. **Nota (2026-09-04, correção BE-14)**: esta regra vale
    exclusivamente para os **scripts deste projeto** (ex.: BE-15, que só lê da
    schema legada) — ela nunca restringe, e nunca poderia restringir, a
    operação normal do próprio app legado (`FutebolRanking`), que continua
    escrevendo em `public` por conta própria, fora do controle deste projeto,
    por tempo indeterminado (o stakeholder confirmou que o legado permanece em
    uso ativo em paralelo até decisão futura própria de descontinuá-lo). A
    migration técnica de BE-14 (`20260903170000_travar_schema_legada_ate_validacao.sql`)
    foi corrigida na mesma data para remover um `REVOKE` permanente de escrita
    comum (INSERT/UPDATE/DELETE/TRUNCATE) que, por engano, teria bloqueado
    essa escrita legítima do app legado caso aplicado ao projeto remoto
    compartilhado — a trava contra `DROP`/`ALTER TABLE`/`DROP SCHEMA`
    destrutivo permanece válida e ativa, pois nunca afeta a operação normal
    (não-DDL) do app legado.
12. **Nenhum recálculo retroativo da pontuação histórica migrada do legado**
    (RN-13) — o histórico pré-migração é preservado exatamente como estava; a
    tabela RN-05 só vale a partir da primeira rodada lançada após a migração.

## 3. Autenticação e Sessão

13. A área interna usa **exclusivamente** o módulo de autenticação custom de
    senha única compartilhada (ADR-004) — nunca Supabase Auth, nunca Basic Auth
    em proxy/CDN.
14. Senha armazenada com **hash argon2id**, nunca texto puro; comparação em
    tempo constante.
15. Mensagem de erro de login é **sempre genérica** ("senha incorreta"),
    idêntica esteja ou não a tentativa sob rate limiting — nunca diferenciar
    "senha errada" de "bloqueado" na resposta (RF-07.3).
16. Sessão via cookie assinado `httpOnly`/`Secure`/`SameSite=Strict`, TTL curto
    (8-12h), **sem refresh token de longa duração**.
17. Toda rota de escrita da área interna exige verificação de sessão válida em
    middleware, **antes** de qualquer chamada à camada de dados.
18. **Nenhuma ação da área interna é atribuída a uma pessoa física
    identificada** (RN-12) — o log de auditoria nunca tem campo de autor
    individual, nem "sistema"/"organizador desconhecido" como preenchimento.

## 4. LGPD e Dado Pessoal

19. Contato e data de nascimento do atleta **nunca** trafegam nem são
    renderizados na área pública, em nenhuma resposta/página acessível sem
    sessão válida — a garantia é estrutural (RLS/views no banco), nunca apenas
    uma convenção de código de frontend (ADR-005).
20. O log de auditoria de anonimização grava **apenas marcadores redigidos** em
    `valores_antes` — nunca o dado pessoal real, nem no banco, nem em log de
    aplicação (evita perpetuar, no próprio log retido indefinidamente, o dado
    que a anonimização existe para eliminar).
21. Nenhum campo de dado pessoal novo (equivalente a `contato`/
    `data_nascimento`) é adicionado a qualquer tabela sem revisão explícita
    contra as views públicas antes do merge.

## 5. Montagem de Times

22. A montagem de times usa exclusivamente a **heurística determinística de
    duas fases** (backtracking com poda + busca local, ADR-007) — nenhum solver
    de otimização genérico (CSP/ILP), nenhuma heurística gulosa pura substitui
    a fase de backtracking.
23. A explicação de conflito de restrições segue o contrato exato do ADR-010
    (`restricoes_conflitantes`/`grupos_conflito`, por componente conexo) — nunca
    um booleano genérico "sem solução".
24. O algoritmo é sempre parametrizado por `N` (número de times) no Backend,
    mesmo quando a interface de uma release específica fixar `N` a um valor
    único — nunca hardcoded como constante de arquitetura.

## 6. Custo e Operação

25. **Nenhum serviço de terceiro pago** (rate limiting gerenciado, backup
    terceirizado, APM pago, solver comercial) é introduzido sem aprovação
    explícita do CTO (RNF-04).
26. **Nenhum segredo** (chave de serviço do Supabase, seed de hash) é commitado
    em arquivo versionado — sempre variável de ambiente do provedor de
    hospedagem, nunca em `.env` versionado no repositório.
27. Backup/recuperação combina **PITR nativo do Supabase + exportação lógica
    agendada externa** (ADR-009) — nenhum agente remove uma das duas camadas de
    redundância sem novo ADR.

## 7. Frontend e Acessibilidade

28. **WCAG 2.1 nível AA é o piso não negociável** em toda tela, aplicado tela a
    tela — nenhuma tela é considerada pronta sem essa checagem.
29. Nenhum estado (presença, cartão, conflito de restrição) é comunicado
    **apenas por cor** — sempre texto/ícone associado.
30. `drag-and-drop` nunca é a **única** forma de interação em nenhuma tela —
    sempre existe uma alternativa acessível por teclado/seleção (ex.: modal de
    seleção em T09).
31. Todo componente do design system (`UX-SPEC.md` Seção 3.2) é implementado
    uma única vez e reutilizado — nenhuma tela cria uma variação paralela.

## 8. Governança e Rastreabilidade

32. Nenhum agente decide sozinho uma **lacuna estrutural** de um artefato
    upstream (ex.: `SDD.md` incompleto) — isso sempre escala via `BLOCKERS.md`
    para o dono do artefato. Lacuna de **detalhe** pode ser decidida e
    documentada pelo próprio agente responsável pela decomposição/implementação.
    (`PIPELINE-CONVENTIONS.md` §4)
33. Toda alteração estrutural neste `GUARDRAILS.md` (adicionar, remover ou
    reescrever uma regra) exige aprovação do CTO, registrada na tabela de Log de
    Alterações abaixo — nenhum outro agente aprova mudança estrutural aqui,
    mesmo que proponha.
34. `TASK.md` só é considerado final após aprovação do CTO no Gate 3 (Aprovado
    ou Aprovado com ressalvas) — nenhum time de execução considera uma tarefa
    do `TASK.md` autorizada para produção antes desse veredito.

## 9. Adendo do CTO — Gate 3 (2026-09-02)

Regras adicionadas diretamente pelo CTO, não pelo Tech Lead, no exercício da
autoridade de aprovação de exceção/mudança estrutural (`PIPELINE-CONVENTIONS.md`
§5) — nascem de decisões de governança tomadas no próprio Gate 3
(`CTO-REVIEW.md`), não de uma lacuna do trabalho de decomposição do Tech Lead.

35. **Nenhuma execução real de `BE-15`** (migração de dados do legado, RF-08)
    **contra a schema legada real** (carga de dado de produção, não teste/mock)
    pode iniciar sem que o `ADR-002` tenha, antes disso, o parágrafo de "plano de
    saída" (rota de baixo custo Postgres→Postgres, Opção B) redigido e aceito
    pelo Software Architect. Este ponto já havia sido comprometido para "antes
    do Gate 3" (Gate 2 do CTO) e não foi entregue — ver `BLOCKERS.md`
    (`BLOCKER-003`). Enquanto a condição não for satisfeita, `BE-15` pode ser
    desenvolvido/testado contra dado de teste, mas não pode ser apontado para a
    schema legada real.
36. **Toda fase de observabilidade/deploy do DevOps deve incluir, sem exceção,
    monitoramento do consumo do tier do Supabase** desde o primeiro mês em
    produção, com gatilho quantitativo objetivo definido (ex.: 70-80% de
    qualquer cota do tier gratuito, ou detecção de pausa por inatividade) que
    force reavaliação imediata para tier pago. Decorre da decisão do CTO no
    Gate 3 de adotar a Premissa 6 do `PRD.md` (orçamento mínimo) como resposta
    final, na ausência de confirmação do stakeholder em três gates
    consecutivos — o risco técnico correspondente já estava registrado em
    `SDD.md` Seção 6.2 (severidade Média); esta regra converte a mitigação de
    nota de risco em requisito vinculante para quando o DevOps for acionado.

---

## 10. Design System e Redesenho Visual — **Aprovado pelo CTO no Gate 3 da Iniciativa "Redesenho Visual" (2026-09-04)**

Extraídas de `CTO-REVIEW.md` (Gate 2 da Iniciativa "Redesenho Visual",
2026-09-04 — as três condições de execução impostas à aprovação com ressalvas
de `ADR-013`) e de `SDD.md` Anexo C/`ADR-013`, conforme `guardrails-drafting`.
Diferente das regras 1-36 (específicas de decisões já tomadas), estas
generalizam o aprendizado desta iniciativa para **qualquer** mudança futura de
fundação compartilhada do projeto — não apenas para a troca de
paleta/tipografia atual. Submetidas ao CTO junto com `TASK.md` Parte II (delta
desta iniciativa) e **aprovadas sem ajuste no Gate 3 desta iniciativa**
(`CTO-REVIEW.md`, 2026-09-04) — em vigor a partir desta data,
vinculantes para todo agente downstream.

37. Toda substituição de valores globais de design system
    (`tokens.css`/`tokens.ts` ou equivalente) que atinja componentes
    compartilhados é tratada como evento atômico único — nunca coexistência de
    duas paletas/temas em runtime (`data-theme`, feature flag de tema, arquivo
    de token paralelo). Qualquer proposta de mecanismo de theming exige novo
    ADR do Software Architect antes de implementação (deriva de `ADR-013`).
38. Nenhum commit/PR que altere valores globais de design system
    pode incluir, no mesmo commit, mudança de layout/composição de tela —
    sempre commits separados, para preservar rollback trivial via `git revert`
    (deriva de `ADR-013`, condição de execução do Gate 2 do CTO da Iniciativa
    "Redesenho Visual").
39. Toda substituição de valores globais de design system exige
    `accessibility-review` completo (WCAG 2.1 AA) sobre **todos** os
    componentes compartilhados usados por **todas** as telas afetadas,
    executado e sem violação bloqueante **antes** do merge — nunca checagem
    incremental pós-merge tela a tela, mesmo quando só um subconjunto de telas
    recebe redesenho de composição dedicado no mesmo ciclo (deriva de
    RF-D05/Guardrail 28; generaliza a Guardrail 28 para o caso específico de
    mudança de fundação global, cujo raio de alcance é sempre maior que o
    conjunto de telas com composição nova).
40. Toda mudança de fundação compartilhada (design system,
    componente reutilizável de base, contrato de API central) que já tenha
    tarefas fechadas consumindo-a exige do Tech Lead reestimativa formal linha
    a linha de cada tarefa afetada em `TASK.md` — nunca tratada como "ajuste
    cosmético" genérico nem como tarefa nova isolada sem referência às tarefas
    fechadas que ela reabre (deriva de RNF-D05/`ADR-013`; generaliza o
    mecanismo de "histórico de mudança de componente" já usado em
    `UX-SPEC.md` Seção 3.3/3.5 para o próprio `TASK.md`).

---

## Log de Alterações

| Data | Proposto por | Aprovado por | Mudança | Motivo | Validade |
|---|---|---|---|---|---|
| 2026-09-02 | tech-lead | cto | Versão inicial (regras 1-34) | Primeira proposta de `GUARDRAILS.md` do projeto, extraída de `CTO-REVIEW.md` (Gate 1/Gate 2), `SDD.md` e ADRs 001-011, conforme `guardrails-drafting` | — |
| 2026-09-02 | cto | cto | Adição das regras 35-36 (Seção 9) | Formalizar como guardrail vinculante duas pendências de governança (plano de saída ADR-002, monitoramento do tier gratuito do Supabase) que atravessaram gates sem resolução — decisão registrada em `CTO-REVIEW.md`, Gate 3 | Permanente (regra 35 se extingue automaticamente quando o adendo do ADR-002 for aceito; regra 36 é permanente enquanto o projeto usar Supabase, ADR-002) |
| 2026-09-04 | tech-lead | cto | Proposta das regras 37-40 (Seção 10) | Generalizar, como guardrail vinculante permanente, as três condições de execução impostas pelo CTO no Gate 2 da Iniciativa "Redesenho Visual" (`CTO-REVIEW.md`, aprovação com ressalvas de `ADR-013`) — substituição atômica sem coexistência de temas, isolamento de commit de fundação, gate de acessibilidade pré-merge cobrindo o blast radius real — mais uma quarta regra que formaliza a obrigação de reestimativa linha a linha já exercida em `TASK.md` Parte II. Submetida junto com `TASK.md` Parte II ao Gate 3 desta iniciativa | Permanente — aplica-se a qualquer mudança futura de fundação compartilhada do projeto, não só a esta iniciativa |
| 2026-09-04 | cto | cto | Aprovação das regras 37-40 (Seção 10), sem ajuste de texto, no Gate 3 da Iniciativa "Redesenho Visual" | As três condições de execução do Gate 2 desta iniciativa foram verificadas como efetivamente cumpridas em `TASK.md` Parte II (não apenas alegadas); as quatro regras têm gatilho objetivo, não conflitam com as regras 1-36 vigentes, e generalizam corretamente invariantes arquiteturais já aceitas (Guardrail 1, 28, 31, 32) para o caso de mudança de fundação compartilhada — decisão registrada em `CTO-REVIEW.md`, Gate 3 desta iniciativa, 2026-09-04 | Permanente |

Todas as 40 regras das Seções 1-10 estão em vigor a partir de 2026-09-04 (Gate 3
da Iniciativa "Redesenho Visual", aprovação do CTO). Regras 1-36 seguem em vigor
desde 2026-09-02 (Gate 3 original), sem alteração de mérito.
