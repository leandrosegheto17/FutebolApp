# BLOCKERS.md

Log de bloqueios entre agentes do pipeline. Cada entrada nomeia origem, destino,
descrição do bloqueio, impacto e status. Uma entrada só é marcada `Resolvido` pelo
agente para quem foi escalada, atualizando também o artefato de origem quando
aplicável (ex.: UX-SPEC.md).

---

## BLOCKER-001

- **Data**: 2026-09-02
- **Origem**: ux-ui
- **Escalado para**: software-architect
- **Artefato afetado**: `UX-SPEC.md`, Seção 7.2, item 1 — Tela T09 (Montagem de Times)
- **Descrição**: RF-05.2 exige que o sistema informe "quais restrições não puderam
  ser satisfeitas" quando não existe divisão de times que respeite 100% das
  restrições obrigatórias. O `ADR-007` e o `SDD.md` não detalham o mecanismo
  algorítmico que produz essa explicação (o próprio Gate 2 do CTO já registrou isso
  como ressalva — item 6, dono Software Architect/Backend, "detalhar antes da
  implementação do Serviço de Times"). O `UX-SPEC.md` desenhou a tela T09 assumindo
  que o backend devolverá uma lista estruturada de pares de atletas em conflito
  (`[{atleta_a, atleta_b, motivo}]`), permitindo o componente `ConflictList` explicar
  o conflito de forma específica.
- **Impacto se não resolvido**: se o mecanismo real for mais simples (ex.: só um
  booleano "sem solução", sem identificar pares específicos), a tela T09 precisa ser
  redesenhada para uma explicação genérica — o Tech Lead precisaria reestimar essa
  tela após a mudança.
- **Status**: Resolvido
- **Resolução (2026-09-02, software-architect)**: mecanismo definido — grafo de
  restrições obrigatórias decomposto em componentes conexos (union-find); o
  backtracking já decidido em `ADR-007` roda por componente; quando um componente
  não admite divisão válida, a API devolve todos os pares daquele componente. O
  contrato de dado (`restricoes_conflitantes: [{atleta_a_id, atleta_b_id, motivo,
  ...}]` + `grupos_conflito`) é uma superestrutura aditiva da suposição do
  `UX-SPEC.md` — não exige redesenho de T09/`ConflictList`. Registrado em
  `ADR-010` (novo, não supersede `ADR-007`) e em `SDD.md` Seção 2.1, Seção 6.3 e
  Anexo A.

---

## BLOCKER-002

- **Data**: 2026-09-02
- **Origem**: ux-ui
- **Escalado para**: software-architect
- **Artefato afetado**: `UX-SPEC.md`, Seção 7.2, item 2 — Tela T04 (Cadastro/Edição
  de Atleta)
- **Descrição**: O Gate 2 do CTO identificou que o `SDD.md` não desenha um
  fluxo/mecanismo de exclusão ou anonimização de dado pessoal do atleta (LGPD Art.
  18), mesmo o ledger de pontos sendo append-only (item 3, dono Software Architect,
  "antes do Tech Lead fechar o modelo de dados definitivo"). O `UX-SPEC.md` **não
  inclui**, deliberadamente, uma ação de "excluir"/"anonimizar" atleta em T04
  enquanto esse mecanismo não for definido pelo Software Architect.
- **Impacto se não resolvido**: quando o mecanismo de anonimização for definido, T04
  precisará de uma nova ação de interface (ex.: "Solicitar exclusão de dados
  pessoais") — mudança visível a incorporar no `UX-SPEC.md`, com reestimativa
  correspondente pelo Tech Lead.
- **Status**: Resolvido
- **Resolução (2026-09-02, software-architect)**: mecanismo definido —
  anonimização in-place da linha `ATLETA` (nunca exclusão física), via nova função
  `anonimizar_atleta` no mesmo padrão transacional do `ADR-006`: sobrescreve
  `nome_completo`/`apelido_exibicao`/`contato`/`data_nascimento` por placeholder
  não identificável, marca `ativo=false` e `anonimizado_em`, desativa restrições
  obrigatórias associadas; nenhuma tabela do ledger (`lancamento_pontos` e
  demais) é alterada — zero quebra de integridade referencial. Log de auditoria
  correspondente nunca grava o dado pessoal original (valores redigidos).
  Registrado em `ADR-011` (novo, aditivo), `SDD.md` Seção 5 (modelo de dados) e
  Seção 7.7 (novo), e Anexo A. UX/UI está desbloqueado para desenhar a ação
  correspondente em T04.

---

## BLOCKER-003

- **Data**: 2026-09-02
- **Origem**: cto
- **Escalado para**: software-architect
- **Artefato afetado**: `adr/002-adotar-supabase-legado-como-plataforma-de-dados.md`
  (ADR-002), sem alteração de conteúdo já aceito — trata-se de adendo pendente,
  não de reabertura da decisão.
- **Descrição**: o Gate 2 do CTO (`CTO-REVIEW.md`) já havia identificado que o
  ADR-002 registra vendor lock-in como consequência aceita, mas não documenta um
  plano de saída, e comprometeu prazo explícito — "antes do Gate 3" — para o
  Software Architect adicionar um parágrafo nomeando a Opção B (migração
  Postgres→Postgres) como rota de baixo custo caso o tier comercial do Supabase
  se torne inviável. Ao revisar `SDD.md`/ADR-002 no Gate 3, o CTO confirma que
  esse parágrafo **não foi adicionado** — é a primeira vez que o prazo é
  formalmente perdido (o item já havia sido reiterado, mas sem escalonamento
  formal, no Gate 2 e na Seção 6.1 do `TASK.md` do Tech Lead).
- **Impacto se não resolvido**: não bloqueia nenhuma tarefa de Backend/Frontend
  do `TASK.md` atual (a decisão estrutural do ADR-002, Opção A, permanece
  `Accepted` e não muda). Bloqueia especificamente a execução real de `BE-15`
  (migração de dados do legado) contra a schema legada real — trava formalizada
  em `GUARDRAILS.md`, regra 35 (adendo do CTO, Gate 3).
- **Sugestão**: adicionar ao ADR-002 um parágrafo curto de "plano de saída"
  nomeando a Opção B como rota de baixo custo (schema/RLS/funções PL/pgSQL
  portam quase sem reescrita para outro Postgres gerenciado), conforme já
  detalhado na análise de `build-vs-buy-analysis` do Gate 2 (`CTO-REVIEW.md`).
  Não exige novo ADR nem reabertura de decisão — é adendo ao ADR-002 existente.
- **Status**: Resolvido
- **Prazo**: antes da execução real de `BE-15` contra a schema legada (não há
  mais prazo de gate — este é o prazo final, com trava técnica de processo via
  `GUARDRAILS.md` regra 35).
- **Resolução (2026-09-02, software-architect)**: adicionado parágrafo "Plano de
  Saída" ao `ADR-002` (seção nova, logo após "Negative Consequences"), nomeando a
  Opção B (migração Postgres→Postgres) como rota de baixo custo, com a ressalva de
  que API autogerada (PostgREST) e backup/PITR nativos do Supabase exigiriam
  substituto equivalente nessa rota. Adendo pontual — não reabre a decisão; Opção A
  permanece `Accepted`, sem novo ADR.

---

## Notas

- O ponto de "redação da base legal diferenciada (adulto vs. menor) na Seção 7.6 do
  `SDD.md`" (Gate 2, item 4) **não** gerou entrada própria aqui — é acompanhamento de
  sincronização de texto entre `SDD.md` e o aviso de privacidade já desenhado em T04,
  não um conflito de experiência vs. arquitetura que bloqueie o Tech Lead. Registrado
  apenas em `UX-SPEC.md`, Seção 7.2, item 3.
- O procedimento de redefinição de senha única (Gate 2, item 7) também não gerou
  entrada aqui — seu dono já é Tech Lead/Backend, conforme `CTO-REVIEW.md`, não uma
  divergência entre UX/UI e Software Architect.
