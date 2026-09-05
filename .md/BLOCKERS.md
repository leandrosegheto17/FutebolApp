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

## BLOCKER-004

- **Data**: 2026-09-03
- **Origem**: frontend
- **Escalado para**: ux-ui
- **Artefato afetado**: `UX-SPEC.md`, Seção 2 (T02 — Ranking Público, parágrafo
  logo após o wireframe ASCII) vs. Seção 6.2 (tabela de adaptações
  responsivas, linha "T02 Ranking") — e, por consequência, `API-CONTRACT.yaml`
  (schema `RankingPublicoItem`, endpoint `/ranking_publico`, BE-03).
- **Descrição**: `PRD-TECNICO.md` RF-03.1 exige explicitamente exibir, para
  cada atleta na área pública, "nome de exibição, pontuação acumulada, número
  de presenças **e número de ausências**". O `UX-SPEC.md`, Seção 2, repete
  essa mesma lista em prosa ("nome de exibição (RN-06), pontuação, presenças,
  **ausências**"). Porém: (a) o wireframe ASCII imediatamente acima, na mesma
  Seção 2, só mostra "12 presenças · 1 cartão" — sem nenhum campo de
  ausências; (b) a Seção 6.2 (tabela de adaptações responsivas, citada
  literalmente no critério de aceite de `FE-02` do `TASK.md`: "vira `<table>`
  real em `lg`") lista as colunas de T02 como "posição, nome, pontos,
  presenças, cartões" — também sem ausências; (c) a view `app.ranking_publico`
  publicada por `BE-03`/`API-CONTRACT.yaml` (schema `RankingPublicoItem`) não
  expõe nenhum campo de contagem de ausências, e não há como derivá-lo no
  cliente a partir dos campos existentes (não há um total de rodadas por
  atleta disponível nesta view nem em `presenca_mensal_publica` — esta última
  só lista quem esteve presente por rodada, não o universo de quem deveria
  estar). Ou seja, três das quatro fontes relevantes (wireframe, Seção 6.2,
  contrato de dado real) concordam em *não* incluir ausências; só a prosa da
  Seção 2 (ecoando RF-03.1) diverge.
- **Impacto se não resolvido**: `FE-02` foi implementado seguindo o wireframe
  + Seção 6.2 + o contrato de dado real hoje disponível (as três fontes
  consistentes entre si), sem o campo de ausências — o critério de aceite
  literal de `FE-02` no `TASK.md` está 100% satisfeito (não cita ausências).
  Se a intenção confirmada for manter RF-03.1 como está (ausências é
  requisito firme, não um resíduo de rascunho), falta um novo campo na view
  `app.ranking_publico` (ex.: `ausencias`, provavelmente `total_rodadas -
  presencas` por atleta) — mudança de contrato de dado, não decisão de
  Frontend, e exigiria nova versão de `API-CONTRACT.yaml` (Backend) e um
  pequeno ajuste de `FE-02` para exibir a coluna adicional depois.
- **Sugestão**: confirmar qual das duas leituras é a correta — (1) a prosa da
  Seção 2 está desatualizada/é um resíduo de outra versão do wireframe, e deve
  ser corrigida para bater com a Seção 6.2 (nesse caso, nenhuma mudança de
  contrato é necessária, `FE-02` já está correto como está); ou (2) RF-03.1 é
  para valer e a Seção 6.2/wireframe é que estão incompletos, caso em que
  `ux-ui` atualiza a Seção 6.2/wireframe e sinaliza a `software-architect`/
  `backend` a necessidade do campo novo na view.
- **Status**: Resolvido
- **Resolução (2026-09-03, ux-ui)**: leitura (2) confirmada — RF-03.1
  (`PRD-TECNICO.md`, EARS: "o sistema deve sempre exibir... número de presenças
  e número de ausências") e o fluxo 4.3 (diagrama Mermaid, nó D:
  "presenças/ausências") repetem o requisito em dois pontos independentes do
  documento do BA, sem nenhuma interpretação registrada na Seção 7 do
  `PRD-TECNICO.md` que o revogue — não é resíduo de rascunho. A prosa da Seção
  2 do `UX-SPEC.md` estava correta; o wireframe ASCII de T02 e a tabela da
  Seção 6.2 estavam incompletos e foram corrigidos para incluir "ausências"
  (`UX-SPEC.md`, Seção 2 — wireframe T02 — e Seção 6.2, linha "T02 Ranking").
  Mudança registrada como visível em `UX-SPEC.md` Seção 3.3 (histórico de
  componente), marcada "Precisa reestimar: Sim" para `FE-02`. Como o campo
  `ausencias` não existe hoje na view `app.ranking_publico`/`API-CONTRACT.yaml`
  (BE-03), esta correção de UX-SPEC.md não é auto-suficiente — depende de um
  campo novo no contrato de dado real, fora da autoridade do UX/UI para
  resolver sozinho. Novo bloqueio aberto para isso: `BLOCKER-005`, escalado a
  `software-architect`/`backend`. `FE-02` (já `Concluída`) permanece
  implementado sem a coluna de ausências até `BLOCKER-005` ser resolvido — a
  divergência está documentada em `UX-SPEC.md`, não escondida.
- **Nota de atualização (2026-09-04, business-analyst)**: a premissa de fundo
  desta resolução — RF-03.1 exigir número agregado de presenças/ausências —
  foi **revertida por decisão direta do organizador**, no contexto da
  Iniciativa de Redesenho Visual (`UX-SPEC.md`, Seção 7.2, item 7, `
  [RESOLVIDO em 2026-09-04]`). RF-03.1 (`PRD-TECNICO.md`) foi reescrito para
  exigir apenas a matriz de status (Presente/Ausente/Lesionado) das últimas N
  rodadas por atleta, sem contagem agregada de ausências (Interpretação #14,
  Seção 7 do `PRD-TECNICO.md`). Esta nota **não reabre** `BLOCKER-004` (o
  bloqueio em si, sobre a inconsistência de então entre wireframe/Seção
  6.2/contrato de dado da tabela pública antiga, já não se aplica ao layout
  atual do produto) — mantido `Status: Resolvido`, registrado aqui apenas
  para rastreabilidade de que o requisito de origem mudou.

---

## BLOCKER-005

- **Data**: 2026-09-03
- **Origem**: ux-ui
- **Escalado para**: software-architect
- **Artefato afetado**: `API-CONTRACT.yaml` (schema `RankingPublicoItem`, endpoint
  `/ranking_publico`), view `app.ranking_publico` (`BE-03`, já `Concluída`/aprovada
  pelo QA) — e, por consequência, `UX-SPEC.md` Seção 2 (T02) e Seção 6.2, já
  corrigidas nesta data para assumir a existência futura do campo (ver resolução de
  `BLOCKER-004` acima).
- **Descrição**: RF-03.1 do `PRD-TECNICO.md` exige exibir "número de ausências" por
  atleta na área pública (T02 — Ranking Público), confirmado como requisito firme
  na resolução de `BLOCKER-004` acima (não um resíduo de rascunho). A view
  `app.ranking_publico`, publicada por `BE-03`, expõe hoje `presencas` e `cartoes`
  mas não expõe nenhum campo de contagem de ausências, e o campo não é derivável no
  cliente a partir do que já está disponível (não há um total de rodadas por atleta
  exposto nesta view nem em `presenca_mensal_publica` — esta última lista apenas
  quem esteve presente por rodada, não o universo de quem deveria estar presente).
- **Impacto se não resolvido**: T02 (`FE-02`, já `Concluída`) permanece sem a
  coluna/linha de ausências no ranking público, apesar do wireframe/Seção 6.2 do
  `UX-SPEC.md` já a exibirem desde a resolução de `BLOCKER-004` — divergência entre
  especificação e implementação real, visível e rastreada, mas não fechada.
- **Sugestão**: adicionar um campo `ausencias` (ou nome equivalente) à view
  `app.ranking_publico`, provavelmente `total_rodadas_lancadas - presencas` por
  atleta (exata definição de "rodadas lançadas" e se `status='lesionado'` conta como
  presença ou ausência para este fim é decisão de modelo de dados do Software
  Architect/Backend, não do UX/UI). Nova versão de `API-CONTRACT.yaml` (incrementar
  `info.version`, registrar no Changelog do próprio arquivo, conforme já convencionado
  nele) e pequeno incremento em `FE-02` para consumir e exibir a nova coluna depois.
- **Status**: Resolvido
- **Resolução (2026-09-03, software-architect)**: fórmula sugerida pelo UX/UI
  (`total_rodadas_lancadas - presencas`) **rejeitada** — como a view já aprovada
  em `BE-03` conta `presencas` estritamente por `status = 'presente'` (excluindo
  `lesionado`), aquela subtração contaria toda rodada com lesão como se fosse
  ausência, contradizendo RN-05 (lesão nunca é penalizada e é categoria própria
  de `status`, distinta de `ausente`) e quebraria a soma `presencas + ausencias`
  em relação ao total real de participações. Releitura de RF-02.3/RN-05 confirma
  que "lesionado conta como presente" vale apenas para **pontuação**, não para a
  métrica de **exibição** de RF-03.1. Decisão: `ausencias` é contagem direta de
  `participacao_rodada.status = 'ausente'` (mesmo padrão de subquery já usado por
  `presenca`/`cartao` na view), com `lesionado` permanecendo terceira categoria,
  não contada nem em `presencas` nem em `ausencias`. Especificação exata (coluna
  computada via subquery na própria view, sem tabela auxiliar; nova migration
  aditiva via `CREATE OR REPLACE VIEW`, preservando a migration já aplicada de
  `BE-03` e os `GRANT`s existentes; sem novo ADR, detalhe de implementação já
  coberto por `ADR-005`) registrada em `SDD.md`, Seção 5.1 (novo adendo). Backend
  deve implementar a migration e atualizar `API-CONTRACT.yaml`
  (`RankingPublicoItem.ausencias`); Frontend deve incrementar `FE-02` para
  consumir e exibir a nova coluna — ambas as tarefas a serem redisparadas em
  seguida, fora do escopo deste agente.
- **Nota de atualização (2026-09-04, business-analyst)**: o requisito de
  origem que motivou este bloqueio — RF-03.1 exigir um campo `ausencias` na
  view `app.ranking_publico` para exibição agregada no ranking público — foi
  **revertido por decisão direta do organizador**, no contexto da Iniciativa
  de Redesenho Visual (`UX-SPEC.md`, Seção 7.2, item 7, `[RESOLVIDO em
  2026-09-04]`). RF-03.1 (`PRD-TECNICO.md`) foi reescrito para exigir apenas a
  matriz de status (Presente/Ausente/Lesionado) das últimas N rodadas por
  atleta na área pública, sem número agregado de ausências (Interpretação
  #14, Seção 7 do `PRD-TECNICO.md`) — consistente com o commit `d9b77e5`
  ("Remove presenças and cartões columns from public ranking table"), que já
  havia removido essas colunas da tabela pública em produção. Esta nota
  **não reabre** `BLOCKER-005` — mantido `Status: Resolvido` como registro
  histórico da especificação técnica então correta; o campo `ausencias`
  descrito na resolução acima **deixa de ser necessário** para a tela T02 na
  versão atual do produto (redesenho). Se o campo já tiver sido implementado
  na view/`API-CONTRACT.yaml`, cabe a `software-architect`/`backend` avaliar,
  em tarefa própria, se ele deve ser removido ou mantido sem consumidor no
  frontend — decisão técnica fora da alçada do BA, apenas sinalizada aqui
  para não perder rastreabilidade.

---

## BLOCKER-006

- **Data**: 2026-09-03
- **Origem**: devsecops
- **Escalado para**: backend
- **Artefato afetado**: `package.json`/`package-lock.json` (`next@14.2.5`,
  fixado por `BE-01`).
- **Descrição**: `static-security-analysis` (primeira execução, `.md/
  SECURITY-REVIEW.md`, achado `CRIT-01`) encontrou `next@14.2.5` na faixa
  vulnerável de `GHSA-f82v-jwr5-mffw` (CVE-2025-29927, CVSS 9.1) —
  "Authorization Bypass in Next.js Middleware": um cabeçalho
  `x-middleware-subrequest` forjado permite que a execução de
  `middleware.ts` seja inteiramente pulada. Este projeto usa
  exclusivamente `middleware.ts` como mecanismo de autorização de toda
  rota de escrita da área interna (GUARDRAILS.md regra 17, SDD.md Seção
  7.2) — não há checagem de sessão redundante em cada Route Handler.
- **Impacto se não resolvido**: bloqueia deploy de L0 e de todos os lotes
  subsequentes (mesmo `package.json` compartilhado). Se explorada em
  produção, permitiria contornar por completo a autenticação de sessão
  única compartilhada em qualquer rota de escrita (cadastro, lançamento de
  pontos, correção, anonimização, quando implementadas).
- **Sugestão**: atualizar `next` para `14.2.35` (ou patch mais recente da
  série 14.2.x no momento da correção) — `npm audit` confirma
  `fixAvailable.isSemVerMajor: false`, sem breaking change esperado.
  Aproveitar a mesma janela para `npm audit fix` de `vitest`→`2.1.9`
  (`DEBT-01` do `SECURITY-REVIEW.md`), para o gate `security-scan` do CI
  voltar a passar por completo.
- **Status**: Resolvido
- **Prazo**: bloqueante — antes de qualquer deploy (staging ou produção)
  de L0.
- **Resolução (2026-09-03, backend)**: `next` atualizado de `14.2.5` para
  `14.2.35` (`package.json`/`package-lock.json`, `--save-exact`, sem major —
  confirmado `isSemVerMajor: false`). `npm audit` pós-bump confirma que
  `GHSA-f82v-jwr5-mffw`/CVE-2025-29927 (o bypass de `middleware.ts` via
  `x-middleware-subrequest`) **não aparece mais** na lista de achados para
  `next` — CRIT-01 eliminado. Suíte completa reexecutada e verde:
  `npm run lint` (limpo), `npm run typecheck` (limpo), `npm test` (35
  arquivos, 179 testes, incluindo `__tests__/middleware.test.ts`, 7 testes),
  `npm run build` (compila com `▲ Next.js 14.2.35`, middleware presente no
  bundle, 9/9 páginas geradas). Nenhuma regressão em BE-01/BE-02/FE-00/BE-04.
  Aproveitada a mesma janela para `DEBT-01` (`SECURITY-REVIEW.md`): `vitest`
  atualizado de `2.0.5` para `2.1.9` (mesmo padrão de pin exato do resto do
  `package.json`), sem breaking change — suíte de 179 testes segue 100%
  verde após o bump. **Ressalva importante, para não esconder divergência**:
  ao contrário do que `DEBT-01` registrou (\"`npm audit fix` resolve
  `vitest`→`2.1.9`... sem major\"), o `npm audit` re-executado *depois* do
  bump ainda reporta `vitest` como crítico, mas agora só por
  `GHSA-5xrq-8626-4rwp` (\"When Vitest UI server is listening, arbitrary
  file can be read and executed\", faixa `<3.2.6`) — o outro achado citado em
  `DEBT-01` (`GHSA-9crc-q9x8-hgqq`) foi de fato resolvido por `2.1.9`, mas a
  faixa vulnerável de `GHSA-5xrq-8626-4rwp` aparentemente foi ampliada na
  base de advisories do npm depois que `SECURITY-REVIEW.md` foi escrito: a
  correção completa hoje só está disponível em `vitest@5.0.0`
  (`isSemVerMajor: true`), fora do que este bloqueio autorizou (major bump
  de test runner, risco de quebra de API, não coberto pela suíte atual só
  por passar hoje). Não forcei esse major — mesma severidade/mesmo raciocínio
  de mitigação já registrado em `DEBT-01` (vetor exige servidor de API do
  Vitest escutando localmente, `--ui`/watch, nunca exposto em
  `build`/`start` de produção). Devolvido para `devsecops` como achado
  residual a reclassificar/reabrir com prazo próprio (não bloqueia L0 — não
  é o mesmo achado que motivou este `BLOCKER-006`, que era especificamente o
  `next`/CRIT-01, agora fechado). Nenhuma tarefa do `TASK.md` reaberta
  (correção de dependência compartilhada, não mudança de critério de
  aceite de BE-01/BE-02/FE-00/BE-04).
- **Confirmação DevSecOps (2026-09-03, reauditoria pontual)**: `npm audit
  --json` re-executado confirma `GHSA-f82v-jwr5-mffw`/CVE-2025-29927
  ausente para `next@14.2.35` — CRIT-01 fechado formalmente em
  `SECURITY-REVIEW.md`. Achado residual de `vitest` devolvido pelo Backend
  (`GHSA-5xrq-8626-4rwp`) avaliado e reclassificado como `DEBT-01`
  (atualizado, severidade Baixa, dev-only confirmado — nenhum script do
  projeto usa `vitest --ui`) em `SECURITY-REVIEW.md` Seção 3, com prazo de
  reavaliação antes do fechamento de L2 — não reaberto como novo bloqueio.
  Durante a mesma reauditoria, `npm audit` também revelou advisories
  adicionais de `next@14.2.35` não relacionadas a CRIT-01 (classe DoS/
  cache, não bypass de autorização), registradas como novo achado `DEBT-04`
  em `SECURITY-REVIEW.md`, severidade Média, prazo antes do primeiro deploy
  de produção. Veredito de L0 atualizado para Aprovado com débito
  registrado (era Bloqueado). Nenhuma ação adicional pendente do Backend
  para fechar `BLOCKER-006`.

---

## BLOCKER-007

- **Data**: 2026-09-05
- **Origem**: devops
- **Escalado para**: backend
- **Artefato afetado**: `app/api/auth/__tests__/login.timing.test.ts` (introduzido
  pelo commit `56d9047`, "Retomar governança v1...", 2026-09-04); gate `Format
  check` (`npm run format:check`) de `.github/workflows/ci.yml`.
- **Descrição**: durante a execução real (não simulada) de `deployment-execution`
  do Lote RD0, o push de `efaf297` a `origin/main` disparou o `CI` real pela
  primeira vez desde que os secrets de GitHub Actions passaram a existir. O job
  `build-and-test` falhou no passo "Format check" — `prettier --check .` reprova
  `app/api/auth/__tests__/login.timing.test.ts`. Reproduzido em worktree isolado
  (checkout com `core.autocrlf=false`, replicando o comportamento LF do runner
  Ubuntu, para não confundir com um falso positivo de line-ending local do Windows)
  contra o commit anterior ao RD0 (`40a6400`, `origin/main` antes deste push): a
  mesma falha, no mesmo arquivo, já existia — **não é uma regressão do Lote RD0**
  (`5c7bad0`/`efaf297` não tocam esse arquivo).
- **Impacto se não resolvido**: bloqueia o `CI` (`build-and-test`) para **qualquer**
  push em `main`, o que por sua vez impede `deploy-staging.yml` de rodar (o
  `workflow_run` exige `conclusion == 'success'` do `CI`) — bloqueia deploy de
  staging de RD0 e de todo lote futuro, não só deste.
- **Sugestão**: `prettier --write app/api/auth/__tests__/login.timing.test.ts`
  (ou revisão de conteúdo, se a formatação divergente esconder algo além de
  estilo) e novo commit, revisado pela mesma esteira de QA/DevSecOps antes de
  contar como parte de um lote fechado.
- **Status**: Resolvido
- **Prazo**: bloqueante — antes do próximo deploy de staging (qualquer lote).
- **Resolução (2026-09-05, backend)**: confirmado que a divergência era
  puramente de estilo (quebra de linha de um `expect(...).toHaveBeenCalledWith(...)`
  que excedia `printWidth`), sem nenhum conteúdo de asserção alterado. Rodado
  `prettier --write app/api/auth/__tests__/login.timing.test.ts` (commit
  isolado `89f1c47`, sem misturar com nenhum outro arquivo em progresso de
  outros agentes — `git status` confirmou que só esse arquivo foi
  modificado/staged). Pós-fix: `npm run format:check` não lista mais este
  arquivo (restam apenas arquivos de WIP de outros agentes, fora do escopo
  deste blocker); `npx vitest run app/api/auth/__tests__/login.timing.test.ts`
  segue com os mesmos 3 testes passando; suíte completa (`npm test`) 109
  arquivos/853 testes verdes; `npm run lint` sem warnings/erros; `npm run
  typecheck` sem erros — nenhuma mudança de comportamento, só formatação.
  `CI`/`build-and-test` deve voltar a passar no gate "Format check" a partir
  deste commit; `deploy-staging.yml`/`deploy-production.yml` continuam
  bloqueados apenas pelo `BLOCKER-008` (gate `security-scan`) e pelo
  `BLOCKER-009` (secrets de staging inexistentes), ambos fora do escopo
  deste blocker.

---

## BLOCKER-008

- **Data**: 2026-09-05
- **Origem**: devops
- **Escalado para**: devsecops
- **Artefato afetado**: `.github/workflows/ci.yml` (job `security-scan`, passo
  "Auditoria de dependências", `npm audit --audit-level=high`); `DEBT-04`
  (`SECURITY-REVIEW.md`).
- **Descrição**: no mesmo `CI` real disparado pelo push de `efaf297` (Lote RD0),
  o job `security-scan` falhou em `npm audit --audit-level=high`: 14
  vulnerabilidades (1 crítica, 9 altas, 4 moderadas) em `next@14.2.35` e
  dependências transitivas (`postcss`, `minimatch` via `@typescript-eslint`).
  Reproduzido em worktree isolado contra `40a6400` (commit anterior ao RD0,
  `origin/main` antes deste push): resultado idêntico — **não é uma dependência
  nova do Lote RD0** (`git diff -- package.json package-lock.json` entre
  `40a6400` e `efaf297` é vazio, já confirmado por DevSecOps em
  `EXECUTION-LOG.md`, entrada "Lote RD0"). Esta classe de achado já está
  rastreada como `DEBT-04` em `SECURITY-REVIEW.md`, aceito como débito de
  severidade Média com prazo — mas o gate mecânico do CI (`--audit-level=high`)
  não tem forma de reconhecer essa aceitação: trata qualquer achado alto/crítico
  como falha dura, sem exceção.
- **Impacto se não resolvido**: mesmo impacto do `BLOCKER-007` — bloqueia `CI`
  (job `security-scan`) para qualquer push em `main`, impedindo `deploy-
  staging.yml`/`deploy-production.yml` de rodar para qualquer lote, não só RD0.
  Enquanto isso, a única forma de publicar qualquer lote seria contornar o
  pipeline governado (o mesmo padrão já registrado como problema em `DEPLOY.md`
  Seções 7.3/7.6) — o que este agente não fará.
- **Sugestão**: uma de duas decisões, que cabe a DevSecOps/CTO, não a DevOps
  unilateralmente: (a) atualizar `next`/dependências para eliminar os achados
  reais (pode envolver breaking change, já sinalizado em `DEBT-04`), ou (b)
  ajustar o gate do CI para reconhecer débito de segurança formalmente aceito
  com prazo (ex.: lista de exceções por advisory, ou rebaixar para
  `--audit-level=critical` combinado com revisão manual dos achados altos) —
  sem enfraquecer a postura de "fail-closed" para achados não avaliados.
- **Status**: Resolvido
- **Prazo**: bloqueante — antes do próximo deploy de staging ou produção
  (qualquer lote).
- **Resolução (2026-09-05, devsecops)**: investigação independente
  confirmou os 14 achados individualmente (não só a contagem agregada) —
  a 1 vulnerabilidade crítica é `GHSA-5xrq-8626-4rwp` (`vitest`), **a mesma
  já rastreada como `DEBT-01`** desde `BLOCKER-006` (2026-09-03), dev-only
  (exige `vitest --ui` escutando localmente, nenhum script do projeto usa
  essa flag), sem exposição em produção — não é achado novo. Os outros 15
  achados de severidade alta são, igualmente, os mesmos GHSA ids já
  cobertos por `DEBT-02` (glob/minimatch/`@typescript-eslint`, toolchain de
  lint dev/CI-only) e `DEBT-04` (next/postcss, DoS/leitura de arquivo em
  build-time, sem classe CWE-285/863). Confirmado via `npm view next
  versions` que não existe upgrade seguro disponível — `14.2.35` já é o
  último patch estável da série 14.2.x e não existe `15.x` estável (salto
  direto para `16.3.4`, dois majors) — Opção (a) do bloqueio (atualizar
  dependências) descartada por inviabilidade real, não por suposição.
  Adotada Opção (b): novo mecanismo de gate (`scripts/
  security-audit-gate.mjs` + `security/npm-audit-allowlist.json`)
  substituindo `npm audit --audit-level=high` puro no job `security-scan`
  (`.github/workflows/ci.yml`) — reconhece as 16 advisories já triadas por
  GHSA id específico (nunca por nome de pacote) com prazo de revisão
  (`revisar_ate: 2026-12-05`), permanecendo fail-closed para qualquer
  advisory nova ou débito expirado. Decisão tomada sem necessidade de
  aprovação prévia do CTO (correção técnica de processo, não relaxamento de
  critério nem decisão de negócio) — sinalizado ao CTO em paralelo, como
  registro, sobre (1) a rota de upgrade de `next` pular de 14.2.x direto
  para 16.x e (2) o padrão recorrente de prazo de débito não disparando
  automaticamente (agora mitigado pelo próprio gate, que falha sozinho
  quando `revisar_ate` vence). Detalhe completo, tabela das 16 advisories e
  verificação de que o gate volta a passar (`node scripts/
  security-audit-gate.mjs`, `exit 0`) em `SECURITY-REVIEW.md` Seção 78.
  **Nota**: o job `build-and-test` do mesmo CI segue falhando por
  `BLOCKER-007` (formatação de `login.timing.test.ts`), independente deste
  bloqueio — não resolvido por esta ação, dono próprio (Backend/DevOps).
- **Commit de referência**: `705becc` ("fix(security): reconhecer débito de
  segurança aceito no gate npm audit do CI") — inclui `.github/workflows/
  ci.yml`, `scripts/security-audit-gate.mjs`, `security/
  npm-audit-allowlist.json` e esta atualização de `BLOCKERS.md`/
  `SECURITY-REVIEW.md`.

---

## BLOCKER-009

- **Data**: 2026-09-05 (reconfirmação de pendência já registrada em
  `DEPLOY.md` Seção 5.1 desde 2026-09-03; primeira vez que bloqueia uma
  tentativa real de deploy de staging, não mais uma preparação teórica)
- **Origem**: devops
- **Escalado para**: cto
- **Artefato afetado**: `.github/workflows/deploy-staging.yml` (secrets
  `SUPABASE_STAGING_PROJECT_REF`/`SUPABASE_STAGING_DB_PASSWORD`); `infra/
  README.md` Seção 2; `DEPLOY.md` Seção 5.1.
- **Descrição**: não existe projeto Supabase dedicado a staging. Reconfirmado
  agora, 2026-09-05, via `npx supabase projects list` (sessão CLI local
  autenticada): a organização segue com apenas 2 projetos — `futebol-ranking`
  (legado de produção, `ADR-002`) e `mymoney` (não relacionado). Criar esse
  projeto é tecnicamente possível com a sessão disponível, mas é uma decisão de
  infraestrutura real (consome cota de uma conta compartilhada com outro
  projeto) que este agente não toma unilateralmente — precisa de confirmação
  explícita do usuário/organizador (mesma razão já registrada em `DEPLOY.md`
  Seção 5.1 desde a tentativa de deploy do Lote L0, 2026-09-03).
- **Impacto se não resolvido**: mesmo que `BLOCKER-007`/`BLOCKER-008` sejam
  resolvidos e o `CI` volte a passar, `deploy-staging.yml` falhará de qualquer
  forma no passo "Verifica secrets obrigatórios" — staging nunca produz um
  ambiente navegável real, apenas migrations/build validados localmente. Isso
  já bloqueou, na prática, a tentativa real de deploy do Lote RD0 (2026-09-05).
- **Sugestão**: decisão do usuário/organizador: (a) criar um segundo projeto
  Supabase gratuito dedicado a staging na mesma organização — se permitido pelo
  tier gratuito, a única ação adicional é configurar os 2 secrets acima; ou
  (b) aceitar formalmente que staging fique restrito a "CI efêmero apenas" (sem
  ambiente navegável) até decisão de investimento, registrando essa aceitação
  em `CTO-REVIEW.md`.
- **Atualização (2026-09-05, devops — autorização explícita do
  usuário/organizador recebida para a opção (a), verificação de custo
  executada antes de criar)**: `npx supabase projects list` reconfirmado
  nesta sessão — mesmo estado: apenas `futebol-ranking` (produção, ADR-002) e
  `mymoney` (não relacionado), ambos com `status: ACTIVE_HEALTHY`, na única
  organização da conta (`leandrosegheto17`, `lmjzszccfzkyacywphgc`). Verificado
  externamente (não presumido) o limite do tier gratuito do Supabase: **2
  projetos ativos em tier gratuito por organização** — limite confirmado de
  forma consistente por múltiplas fontes independentes atualizadas em 2026
  (ver Fontes). Como a organização **já tem os 2 projetos gratuitos ativos
  permitidos** ocupados por `futebol-ranking` e `mymoney`, criar um 3º projeto
  (`futebol-ranking-comary-staging` ou equivalente) **não é possível sem
  custo** nas condições atuais — exigiria uma de duas ações fora do escopo
  desta autorização: (i) upgrade da organização para o plano pago (Pro, a
  partir de US$25/mês) para liberar mais projetos ativos; ou (ii) pausar ou
  excluir o projeto `mymoney`, que é um projeto de terceiro não relacionado a
  este sistema — decisão que não cabe a este agente tomar unilateralmente
  sobre um recurso alheio, mesmo pausar temporariamente. Uma tentativa real de
  `supabase projects create` (com nome de teste, sem `--yes`, apenas para
  obter a mensagem de erro/custo real da API antes de decidir) foi bloqueada
  preventivamente pelo próprio classificador de segurança do ambiente de
  execução deste agente — reforça, por um mecanismo independente, que esta é
  uma ação com efeito financeiro real que não deve ser tentada sem nova
  confirmação explícita e específica sobre o custo. **Nenhum projeto foi
  criado. Nenhum recurso de `mymoney` foi alterado.** Conforme instrução
  explícita recebida junto com a autorização ("se o tier gratuito não
  comportar um 3º projeto sem custo, pare e reporte — não crie um projeto
  pago sem nova confirmação explícita"), este agente parou aqui e devolve a
  decisão ao usuário/organizador: (a) autorizar explicitamente o upgrade pago
  da organização (Pro) só para viabilizar staging; (b) autorizar
  explicitamente pausar/excluir `mymoney` para liberar a vaga gratuita, se
  esse projeto não estiver mais em uso; ou (c) aceitar formalmente a opção
  (b) original — staging como "CI efêmero apenas", sem ambiente navegável,
  registrando essa aceitação em `CTO-REVIEW.md`. Passos 3–5 desta tarefa
  (rodar migrations no projeto novo, configurar secrets, redisparar
  `deploy-staging.yml`) não puderam ser executados — dependem de um projeto
  Supabase de staging existir, e nenhum foi criado. Também confirmado nesta
  sessão: `BLOCKER-007`/`BLOCKER-008` (gates de CI) seguem `Aberto` — mesmo
  que a decisão de custo acima fosse resolvida agora, `deploy-staging.yml`
  para o Lote RD0 (`efaf297`) continuaria bloqueado no gate de CI antes de
  chegar ao gate de secrets de staging.
  - Fontes da verificação de limite (2026): UI Bakery
    (`https://uibakery.io/blog/supabase-pricing`), JetAdmin
    (`https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/`),
    Automation Atlas (`https://automationatlas.io/answers/supabase-free-tier-limits-2026/`),
    DesignRevision (`https://designrevision.com/blog/supabase-pricing`),
    CostBench (`https://costbench.com/software/database-as-service/supabase/free-plan/`) —
    todas convergem em "2 projetos ativos gratuitos por organização"
    (projetos pausados por inatividade não contam contra o limite, mas
    pausar `mymoney` ativamente para abrir vaga é a ação (ii) acima, não
    decidida unilateralmente).
- **Status**: Aberto (impedimento de custo real confirmado — não é mais uma
  suposição teórica; decisão de próximo passo devolvida ao
  usuário/organizador)
- **Prazo**: sem prazo formal — mas bloqueia todo deploy de staging real desde
  2026-09-03, agora confirmado por uma tentativa real, não apenas teórica, e
  agora também por um impedimento de custo real confirmado (2026-09-05).

---

## BLOCKER-010

- **Data**: 2026-09-05
- **Origem**: frontend
- **Escalado para**: ux-ui (spec) / software-architect (dado, se a leitura (2)
  abaixo for confirmada)
- **Artefato afetado**: `UX-SPEC.md` Parte II Seção 2.3 (T03 — Presença
  Mensal, delta) e "Nota de verificação de fidelidade", item 8 — e, por
  consequência, `API-CONTRACT.yaml` (schema `PresencaMensalPublicaItem`,
  endpoint `/presenca_mensal_publica`, BE-03) e `TASK.md` Parte II Seção 3.2,
  linha `FE-R03`.
- **Descrição**: `UX-SPEC.md` Parte II Seção 2.3 descreve a composição
  redesenhada de T03 como "uma matriz atleta × data do mês inteiro (dots
  `P`/`A`/`L`, mesmo componente/estilo confirmado em T02) com legenda
  'Presente/Ausente/Lesionado'" — uma linha por atleta, réplica estrutural da
  matriz de T02 (`ranking_publico_recentes`, `BE-R01`). A view pública real
  consumida por T03, `app.presenca_mensal_publica` (`BE-03`, já `Concluída`),
  não suporta essa estrutura: expõe uma linha **por rodada** (não por
  atleta), com `total_presentes`/`nomes_presentes` — só os nomes de quem
  esteve presente, sem o universo de atletas ativos do período e sem
  distinguir `ausente` de `lesionado`. É o mesmo tipo de lacuna de dado já
  identificado e resolvido (depois revertido por mudança de requisito) para
  T02 em `BLOCKER-004`/`BLOCKER-005` ("esta última só lista quem esteve
  presente por rodada, não o universo de quem deveria estar presente") — a
  citação já estava em ambos os blockers anteriores, mas nenhum dos dois
  atualizou a Seção 2.3 de T03 para refletir essa mesma limitação quando a
  Seção 2.2 (T02) foi reescrita nesta mesma revisão 2 do `UX-SPEC.md` para
  usar `ranking_publico_recentes` (`BE-R01`, um endpoint novo, dedicado, com
  status de 3 valores por atleta×rodada). `TASK.md` Parte II, linha
  `FE-R03`, também não lista nenhuma dependência de Backend (só `FE-R00`) e
  classifica o esforço como `S (1 PD)`, "repintura de tokens" — consistente
  com a Frontend não ter sido informada de que um novo dado seria necessário;
  construir a grade literal exigiria um novo endpoint público (por atleta
  ativo × rodada do mês civil navegável, com status de 3 valores — diferente
  de `ranking_publico_recentes`, que é uma janela fixa das últimas N=7
  rodadas, não navegável por mês civil arbitrário como RN-09 exige em T03).
- **Impacto se não resolvido**: `FE-R03` foi implementado (`PresencaMensal.tsx`)
  mantendo a estrutura por rodada já disponível no dado real — uma seção por
  rodada do mês (sem accordion, atendendo o critério de aceite literal do
  `TASK.md`, "mostra a matriz do mês diretamente"), cada nome presente
  marcado com o mesmo componente `PresenceDot`/estilo confirmado em T02
  (reuso literal do componente), legenda reduzida a apenas "Presente" (não os
  3 itens do `UX-SPEC.md`, para não anunciar uma distinção `ausente`/
  `lesionado` que o dado não sustenta). Divergência visível e documentada no
  próprio código (comentário de topo de `PresencaMensal.tsx`), não escondida.
  Se a intenção confirmada for a grade literal atleta×data (paridade visual
  completa com T02), é necessário um novo endpoint público (Backend) +
  reescrita de `PresencaMensal.tsx`/`presencaMensalApi.ts` (Frontend) —
  mudança de escopo maior que o `S (1 PD)` hoje registrado em `TASK.md`.
- **Sugestão**: confirmar qual das duas leituras é a correta — (1) a Seção
  2.3 do `UX-SPEC.md` está desatualizada (herdou a descrição de T02 sem
  ajustar para a fonte de dado real de T03, já disponível e mais limitada
  desde `BE-03`), e deve ser corrigida para descrever a estrutura por rodada
  já implementada (nesse caso, nenhuma mudança de contrato é necessária,
  `FE-R03` já está correto como está); ou (2) a matriz atleta×data é para
  valer também em T03, caso em que `ux-ui` ajusta a Seção 2.3 apenas depois
  que `software-architect`/`backend` confirmarem um novo endpoint público
  equivalente a `ranking_publico_recentes`, mas por mês civil navegável (não
  janela fixa de N rodadas) — nova tarefa de Backend fora do lote RD1 atual,
  com reestimativa de `FE-R03` pelo Tech Lead.
- **Status**: Aberto
- **Prazo**: sem prazo formal — não bloqueia o fechamento do Lote RD1 (mesmo
  padrão de precedente de `BLOCKER-005`: a tela já implementada com a
  divergência documentada, não uma tela quebrada/incompleta em relação ao
  seu próprio critério de aceite no `TASK.md`); bloqueia apenas um eventual
  sign-off (RF-D02) de T03 contra a Seção 2.3 do `UX-SPEC.md` como está
  escrita hoje, se o organizador insistir na paridade visual literal com T02.

---

## BLOCKER-011

- **Data**: 2026-09-05
- **Origem**: qa
- **Escalado para**: tech-lead
- **Artefato afetado**: `TASK.md` Parte II (diretrizes de implementação/
  Definição de Pronto de tarefa) — achado concreto em `BE-R01`, `FE-R02`,
  `FE-R03` (Lote RD1); `QA-REPORT.md` Seções 2/3 (Parte I, achados
  anteriores da mesma classe) e Seção 19 (Lote RD1, onde este achado foi
  originado).
- **Descrição**: durante o fechamento do Lote RD1 (`QA-REPORT.md` Seção
  19), o QA reexecutou `npm run format:check` (`prettier --check .`) de
  forma independente e encontrou **7 arquivos de propriedade das 3
  tarefas deste lote** fora do padrão Prettier: `RankingList.tsx`,
  `format.test.ts`, `matrix.test.ts`, `PublicHomeShell.test.tsx`,
  `rankingRecentesApi.test.ts` (todos `src/features/ranking-publico/`,
  `FE-R02`); `src/features/presenca-mensal/PresencaMensal.test.tsx`
  (`FE-R03`); `src/lib/supabase/__tests__/ranking-publico-recentes.integration.test.ts`
  (`BE-R01`). Nenhuma das 3 notas de conclusão destas tarefas em
  `TASK.md` menciona `npm run format:check` entre os comandos
  verificados antes de marcar `Concluída` — ao contrário de praticamente
  toda tarefa da Parte I, cujas notas de conclusão citam explicitamente
  `npm run lint`/`npm run typecheck`/`npm run format:check`/`npm test`/
  `npm run build` como o conjunto padrão verificado antes do fechamento
  (dezenas de ocorrências literais no próprio `TASK.md`). Esta é a
  **terceira ocorrência consecutiva do mesmo tipo de achado no
  Frontend** (após `BUG-QA-BE01-02` e `BUG-QA-FE00-01`, `QA-REPORT.md`
  Seções 2/3) — cruzando o limiar que o próprio QA já havia anunciado
  antecipadamente na Seção 3 do `QA-REPORT.md`: *"o QA vai escalar ao
  Tech Lead via BLOCKERS.md se o mesmo tipo de achado reaparecer numa
  terceira tarefa do Frontend"*. Desta vez o padrão também atinge o
  Backend (`BE-R01`), ampliando o escopo para além de um único time.
  Causa raiz técnica confirmada pelo QA: não existe hook de pre-commit
  (`.husky` ou equivalente) neste repositório que rode `prettier
  --write`/`format:check` automaticamente antes de um commit — a única
  salvaguarda mecânica hoje é o passo "Format check" do job
  `build-and-test` (`.github/workflows/ci.yml`), que só roda depois do
  push, quando já é tarde para o hábito individual de cada agente
  compensar.
- **Impacto se não resolvido**: cada uma das 3 tarefas deste lote, se
  pusheada como está, reprovaria o gate "Format check" do `CI` real —
  mesmo mecanismo já documentado e confirmado em `BLOCKER-007`, que
  bloqueou `build-and-test`/`deploy-staging` para **qualquer** push em
  `main` até ser corrigido. Sem uma correção estrutural (hook automático
  ou regra explícita na diretriz de implementação), é razoável esperar
  uma quarta e quinta ocorrência nos lotes `RD2`/`RD3`/`RD4` restantes
  desta mesma iniciativa.
- **Sugestão**: (1) ação imediata, de responsabilidade de Frontend
  (`FE-R02`/`FE-R03`) e Backend (`BE-R01`) — rodar `prettier --write`
  nos 7 arquivos listados acima e subir um commit isolado, mesmo padrão
  de resolução já usado em `BLOCKER-007` (commit dedicado, revisado por
  QA/DevSecOps, sem misturar com outro trabalho em progresso), antes do
  próximo push que dispare o `CI` compartilhado; (2) ação estrutural, de
  responsabilidade do Tech Lead — adicionar `npm run format:check` como
  item explícito e nomeado da checklist de "Definição de Pronto" nas
  diretrizes de implementação do `TASK.md` (hoje seguido apenas por
  hábito repetido, não por uma regra escrita), e avaliar com o Software
  Architect/DevOps a viabilidade de um hook de pre-commit (`.husky` +
  `lint-staged`) para tornar a salvaguarda automática em vez de depender
  da memória de cada agente.
- **Status**: Aberto
- **Prazo**: item (1) bloqueante — antes do próximo push que dispare o
  `CI` compartilhado de qualquer lote; item (2) sem prazo formal,
  recomendado antes do início de `RD2` para evitar uma quarta ocorrência.

---

## Notas

- O ponto de "redação da base legal diferenciada (adulto vs. menor) na Seção 7.6 do
  `SDD.md`" (Gate 2, item 4) **não** gerou entrada própria aqui — foi acompanhamento de
  sincronização de texto entre `SDD.md` e o aviso de privacidade já desenhado em T04,
  não um conflito de experiência vs. arquitetura que bloqueasse o Tech Lead. Registrado
  em `UX-SPEC.md`, Seção 7.2, item 3. **Resolvido em 2026-09-04** pelo Software
  Architect — Seção 7.6 do `SDD.md` reescrita distinguindo explicitamente as duas
  bases legais (Art. 7º IX para adulto, Art. 14 §1º para menor); veredito registrado
  de que o texto de produção de `FE-04` (`AtletaForm.tsx`) já é consistente com a
  redação corrigida e não precisa de ajuste de copy. Detalhe completo em `SDD.md`,
  Anexo B. Cabe ao UX/UI atualizar `UX-SPEC.md` Seção 7.2 item 3 para `Resolvido` e ao
  Tech Lead atualizar `TASK.md` Seção 6.1 item 2.
- O procedimento de redefinição de senha única (Gate 2, item 7) também não gerou
  entrada aqui — seu dono já é Tech Lead/Backend, conforme `CTO-REVIEW.md`, não uma
  divergência entre UX/UI e Software Architect.
