# QA-REPORT.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: QA Engineer
**Skills aplicadas**: `acceptance-criteria-validation` (execução), `bug-documentation`,
`non-functional-validation`, `qa-report-drafting`.
**Gatilho**: cada entrada abaixo só é produzida depois que o time responsável
(Backend/Frontend/Mobile) marcou a tarefa correspondente como `Concluída` no
`TASK.md` — nunca antes.
**Convenção de veredito por tarefa**: `Aprovado` | `Aprovado com ressalvas`
(critério de aceite 100% satisfeito, mas há débito de severidade baixa/média
registrado com prazo) | `Reprovado` (critério de aceite não satisfeito ou bug
de severidade alta/crítica em aberto — `TASK.md` reverte para `Em andamento`).

---

## 1. BE-01 — Setup do projeto Next.js

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Projeto builda e
roda localmente; lint/typecheck sem erro; `.env.example` documentado sem
segredo real; estrutura de pastas reflete os módulos da Seção 2.1 do `SDD.md`."

**Método**: validação independente, não apenas conferência do relato do
Backend — todos os comandos abaixo foram executados diretamente pelo QA no
estado atual da árvore de trabalho, e os arquivos relevantes foram lidos.

### 1.1 Verificação item a item

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Projeto builda | `npm run build` (com env placeholders equivalentes ao job `build-and-test` do `.github/workflows/ci.yml`) | ✅ `Compiled successfully`, 3 rotas geradas, sem erro |
| Projeto roda localmente | `npm run start` + `GET http://localhost:3000/api/health` | ✅ HTTP 200, body `{"status":"ok"}` |
| Lint sem erro | `npm run lint` | ✅ 0 erros. 1 warning (`jsx-a11y/no-noninteractive-tabindex` em `src/components/ui/Tabs/Tabs.tsx`) — confirmado como componente do design system (FE-00), fora do escopo de BE-01; bate com o relato do Backend |
| Typecheck sem erro | `npm run typecheck` (`tsc --noEmit`) | ✅ 0 erros, saída vazia |
| `.env.example` documentado, sem segredo real | Leitura de `.env.example` | ✅ Todas as 5 variáveis (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_COOKIE_SECRET`, `NEXT_PUBLIC_APP_BASE_URL`) usam placeholder (`changeme-*`/`your-*`/URL de exemplo), comentário explícito citando GUARDRAILS.md regra 26; `.gitignore` confirma `.env`/`.env*.local` ignorados (mas `.env.example` propriamente não é ignorado, como esperado) |
| Estrutura de pastas reflete os módulos da Seção 2.1 do `SDD.md` | Leitura de `SDD.md` Seção 2.1 + `find ./src -type d` | ✅ Os 8 componentes de 2.1 que correspondem a módulo de aplicação têm pasta própria em `src/modules/`: `autenticacao`, `atletas`, `rodadas`, `times` (com `times/restricoes` como submódulo), `substituicoes`, `auditoria`, `migracao`. Os 3 componentes restantes de 2.1 (Web Público/Web Interno = as próprias páginas Next.js; Camada de Exposição Pública = views/RLS no Postgres; Backup/Exportação Externa = job agendado, já presente em `.github/workflows/supabase-backup-export.yml`) corretamente **não** viram pasta de módulo — não são serviços de aplicação. O desvio nomeado na nota de status do BE-01 (`autenticacao`/`substituicoes` além dos 5 citados no nome da tarefa; `restricoes` aninhado em `times`) está documentado, justificado por referência à própria Seção 2.1 do SDD.md e aos ADRs 007/010, e não é uma reinterpretação do critério — é leitura correta da mesma seção citada no critério |

**Veredito dos 4 itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificado de forma independente.

### 1.2 Non-functional validation (mínima, apropriada para tarefa de setup)

- **Cenário de erro (validação de env)**: `src/lib/config/env.ts` valida
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/
  `NEXT_PUBLIC_APP_BASE_URL` (público) e `SUPABASE_SERVICE_ROLE_KEY`/
  `SESSION_COOKIE_SECRET` (servidor) via `zod`, com mensagem de erro
  específica por variável ausente/malformada, e `getServerOnlyEnv()` lança
  erro explícito se chamada em código de navegador (GUARDRAILS.md regra 7).
  Falha cedo e de forma legível, em vez de silenciosa — adequado para este
  estágio. Coberto por teste próprio (`src/lib/config/__tests__/env.test.ts`).
- **Performance básica**: não aplicável de forma significativa nesta tarefa
  (sem tela/endpoint de negócio ainda); build e start responderam em tempo
  normal para um projeto Next.js deste tamanho, sem sinal de regressão.
- **Usabilidade (UX-SPEC.md)**: não aplicável — BE-01 não entrega UI.

### 1.3 Achados do QA (bugs/débitos) — nenhum bloqueante

Durante a verificação independente, o QA encontrou 2 divergências em relação
ao relato do Backend. Nenhuma delas está dentro do texto literal do critério
de aceite de BE-01 (que não menciona `format:check` nem estado de CI), então
**nenhuma bloqueia esta tarefa** — registradas como débito, conforme a regra
de severidade baixa/média não bloqueia sozinha.

---

**BUG-QA-BE01-01 — Severidade: Baixa (débito, sem bloqueio)**
- **Componente**: workspace/higiene de arquivos (não é código de produto)
- **Passos para reproduzir**: no estado da árvore de trabalho entregue para
  validação, existiam dois arquivos não versionados (`git status` confirma
  `??`, i.e. nunca commitados) em `src/_repro2.test.tsx` e
  `src/_repro3.test.tsx` — scripts de depuração usados, ao que tudo indica,
  para investigar o bug de `AppNav`/`TopNav` mencionado na nota de status.
- **Resultado esperado**: `npm test` reportando exatamente o número de
  arquivos/casos de teste do conjunto real do projeto.
- **Resultado obtido**: com os 2 arquivos presentes, `npm test` reportava
  23 arquivos/99 testes (2 falhas) em vez de 21 arquivos/95 testes (1 falha)
  como relatado pelo Backend. Após o QA remover os 2 arquivos localmente
  para validar o conjunto real, o resultado bateu exatamente com o relato do
  Backend: **21 arquivos, 95 testes, 94 passando, 1 falha
  (`AppNav.test.tsx`)**.
- **Causa raiz confirmada da falha remanescente (`AppNav.test.tsx`)**: não é
  regressão de BE-01. `TopNav` (`src/components/ui/AppNav/AppNav.module.css`)
  usa `display: none` por padrão em `.topNav`, revertido só via
  `@media (min-width: 640px)`; o ambiente jsdom do Vitest não avalia media
  queries, então o `<nav>` inteiro fica fora da árvore de acessibilidade
  quando `TopNav` é renderizado isoladamente no teste — confirmado lendo o
  CSS module e reproduzindo o erro (`"There are no accessible roles"`)
  isoladamente. Bug do próprio componente `TopNav`/FE-00, não de BE-01,
  como já apontado pelo Backend.
- **Ação**: nenhuma ação bloqueante em BE-01. Recomenda-se ao Backend
  remover os dois arquivos `_repro*.test.tsx` da árvore de trabalho antes do
  próximo commit (não estão no índice do git, então não afetam o histórico,
  mas poluem a pasta `src/` e distorcem a contagem de testes de quem rodar
  localmente). Débito sem prazo formal — é limpeza de arquivo solto, não
  código de produto.

---

**BUG-QA-BE01-02 — Severidade: Baixa (débito, prazo: antes do próximo push
que dispare o pipeline de CI compartilhado)**
- **Componente**: `src/components/ui/AppNav/AppNav.test.tsx` (FE-00) +
  step "Format check" do `.github/workflows/ci.yml` (criado por BE-01)
- **Passos para reproduzir**: `npm run format:check` (`prettier --check .`)
  na raiz do projeto, com os dois arquivos `_repro*.test.tsx` já removidos
  (conjunto real do projeto).
- **Resultado esperado**: saída limpa / exit code 0, como relatado pelo
  Backend ("`npm run format:check` (limpo)").
- **Resultado obtido**: `Code style issues found in the above file` para
  `src/components/ui/AppNav/AppNav.test.tsx`; exit code **1**. Ou seja, o
  relato do Backend de que `format:check` está limpo **não se confirma** no
  estado atual da árvore — o comando de fato falha, por causa de um arquivo
  de propriedade do Frontend (FE-00), não de um arquivo criado por BE-01.
- **Por que não bloqueia BE-01**: o critério de aceite escrito de BE-01 não
  menciona `format:check`/formatação, só "lint/typecheck sem erro" — QA não
  reinterpreta o critério para incluir um item que não está nele. Porém, o
  `.github/workflows/ci.yml` entregue pela própria BE-01 tem o passo
  "Format check" configurado para falhar o pipeline inteiro (`run: npm run
  format:check`, sem `continue-on-error`), então **o CI compartilhado, hoje,
  ficaria vermelho no próximo push/PR de qualquer time**, por causa de um
  arquivo que não é do Backend.
- **Ação**: registrado como débito de baixa severidade, atribuído ao
  Frontend (dono do arquivo) — rodar `npm run format -- --write
  src/components/ui/AppNav/AppNav.test.tsx` (ou `npm run format` completo)
  antes do próximo push que dispare o CI. Não é bug isolado de decomposição
  de tarefa — é o mesmo arquivo (`AppNav`/`TopNav`, FE-00) já responsável
  pela falha de teste citada acima; ainda não configura padrão recorrente
  entre tarefas diferentes o suficiente para escalar ao Tech Lead (guardrail:
  só escala por padrão recorrente, não por bug isolado). QA reavalia este
  ponto ao validar FE-00.

---

### 1.4 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bugs de severidade baixa/média registrados como débito, com dono e
      contexto de prazo (BUG-QA-BE01-01, BUG-QA-BE01-02 acima)
- [x] Testes de integração cruzada — não aplicável a esta tarefa (BE-01 não
      tem dependência de contrato de API com Frontend/Mobile; FE-00 corre em
      paralelo, sem depender de tabela real, conforme `TASK.md` Seção 4.2)
- [x] Requisito não funcional relevante validado (comportamento de erro na
      validação de env; ver 1.2)

### 1.5 Veredito

## **BE-01: Aprovado com ressalvas**

Todos os 4 itens do critério de aceite, lidos literalmente, estão
satisfeitos e foram verificados de forma independente pelo QA (não apenas
aceitos do relato do Backend). As ressalvas são 2 débitos de severidade
baixa (BUG-QA-BE01-01, BUG-QA-BE01-02), nenhum bloqueante, nenhum de autoria
de BE-01 em si — ambos ligados a arquivos/hábitos fora do escopo de BE-01
(um arquivo solto de depuração não commitado; um arquivo de teste do FE-00
sem formatação Prettier que atualmente derrubaria o step de `format:check`
do CI compartilhado). Nenhuma ação de reprovação necessária em `TASK.md`;
status permanece `Concluída`.

**Nota para o Frontend (referência cruzada, não é reprovação de BE-01)**: ao
validar `FE-00`, o QA vai reexaminar `AppNav.test.tsx`/`AppNav.module.css` —
tanto a falha de teste do `TopNav` isolado (media query não avaliada em
jsdom) quanto a formatação Prettier pendente (BUG-QA-BE01-02) — como parte
do critério de aceite daquela tarefa.

---

## 2. FE-00 — Fundação do Design System

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "Cada componente
implementado uma vez, com os 4 estados relevantes (default/hover/
focus-visible/disabled quando aplicável) e conformidade com WCAG transversal
(Seção 5.1 do `UX-SPEC.md`); nenhuma tela abaixo reimplementa um desses
componentes."

**Skills aplicadas**: `acceptance-criteria-validation`,
`accessibility-implementation-check` (WCAG/ARIA na web).

**Método**: validação independente. Todos os comandos abaixo foram
executados diretamente pelo QA no estado atual da árvore de trabalho (não
apenas aceito do relato do Frontend), e o código-fonte de cada componente
listado no critério foi lido linha a linha (não só os testes/snapshot).

### 2.1 Verificação de comandos (independente do relato do Frontend)

| Comando | Resultado obtido pelo QA | Bate com o relato do Frontend? |
|---|---|---|
| `npm test -- --run` | ✅ **21 arquivos, 95 testes, 95 passando, 0 falha** (inclui asserções `jest-axe`/`toHaveNoViolations` em 17 dos 18 componentes de `src/components/ui/*`) | Sim — inclusive confirma que a falha de `AppNav.test.tsx` (`TopNav` isolado) citada em BE-01/BUG-QA-BE01-02 foi corrigida |
| `npm run lint` | ✅ 0 erros, 0 warnings (o warning `jsx-a11y/no-noninteractive-tabindex` de `Tabs.tsx`, citado em BE-01, foi resolvido com `eslint-disable` justificado inline, conforme padrão ARIA APG de `tabpanel` focável) | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run build` | ✅ `Compiled successfully`, 3 rotas geradas | Sim |
| `npm run format:check` | ❌ **Falha** — `Code style issues found`: `src/components/ui/AppNav/AppNav.test.tsx` **e** `app/page.tsx` (2 arquivos), exit code 1 | **Não bate** — ver BUG-QA-FE00-01 abaixo |

### 2.2 Verificação item a item do critério de aceite

**(a) Cada componente implementado uma vez** — ✅ confirmado por leitura
direta de `src/components/ui/*` (18 diretórios, um por componente/família:
`Accordion`, `AppNav` [agrupa `BottomTabBar`+`TopNav`], `Badge`, `Button`,
`Card`, `DateInput`, `EmptyState`, `Modal`, `NumberInput`, `PasswordInput`,
`SegmentedControl`, `SessionExpiryBanner`, `Skeleton`, `Stepper`,
`StepperCounter`, `Tabs`, `TextInput`, `Toast` [agrupa `ToastProvider`+
`AlertBanner`]) + `_internal/FormField`/`input.module.css` como wrapper de
acessibilidade compartilhado por `TextInput`/`DateInput`/`NumberInput`/
`PasswordInput` (não é um 19º componente do UX-SPEC.md, é detalhe de
implementação interno, documentado como tal no próprio código). Todos
exportados uma única vez em `src/components/ui/index.ts`. Os 3 componentes
"novo, específico do domínio" do UX-SPEC.md Seção 3.2 (`ConflictList`,
`DiffViewer`, `TypedConfirmationModal`) **não** estão aqui — corretamente,
porque não fazem parte da lista de escopo de `FE-00` no `TASK.md` (ficam para
`FE-04`/`FE-07`/`FE-09`).

**(b) Nenhuma tela abaixo reimplementa um desses componentes** — ✅
confirmado: nenhuma tarefa `FE-01`…`FE-12` está `Concluída` ou sequer
iniciada (`find src app` não mostra nenhuma pasta de tela de produto além de
`app/page.tsx`), então não há, hoje, nenhuma tela candidata a violar este
item. `app/page.tsx` (a vitrine manual de QA citada na nota de status) importa
os componentes do barrel `@/components/ui`, não os reimplementa. **Este item
do critério será reverificado a cada tarefa `FE-0X` futura**, como parte da
própria validação daquela tarefa.

**(c) 4 estados relevantes (default/hover/focus-visible/disabled)** — ✅
verificado por leitura de CSS Module + componente, amostragem cobrindo todos
os componentes interativos:
- `Button`: default/hover/active/disabled por variante (`primary`/
  `secondary`/`danger`/`ghost`) + `loading` (spinner, texto nunca some,
  conforme a UX-SPEC.md pede) + `spinnerStatic` sob `prefers-reduced-motion`.
- `TextInput`/`DateInput`/`NumberInput`/`PasswordInput` (via
  `_internal/input.module.css` compartilhado): hover/focus-visible/disabled/
  `aria-invalid` consistentes nos quatro.
- `SegmentedControl`, `StepperCounter`, `Tabs`, `Accordion`, `Modal`,
  `AppNav`/`TopNav`: estados verificados individualmente no código (roving
  tabindex, `disabled`/`aria-disabled` onde aplicável, `hover` em
  `.topNavItem`).
- **`focus-visible` não é reimplementado componente a componente** — está
  centralizado em `app/globals.css` (`:focus-visible { outline: 3px solid
  var(--color-focus-ring); ... }`, com `:focus { outline: none }` para não
  mostrar o anel em clique de mouse). Isso satisfaz o próprio `TASK.md`
  Seção 1.6 ("critérios transversais... valem para todo componente novo") —
  não é lacuna, é a arquitetura correta para um critério transversal.
- Único ponto de baixa severidade encontrado: o botão de dispensar (`×`) do
  `Toast`/`ToastItem` (`Toast.module.css`, classe `.dismiss`) não define
  `:hover` próprio (só herda `color: inherit` e o `focus-visible` global) —
  visualmente inerte no hover, embora funcionalmente acessível. Registrado
  como **BUG-QA-FE00-02** abaixo (severidade baixa, débito).

**(d) Conformidade com WCAG transversal (Seção 5.1 do `UX-SPEC.md`)** — ✅
verificado item a item da tabela da Seção 5.1, por amostragem direta do
código-fonte (não apenas confiança nos testes `jest-axe`, embora estes também
tenham passado 0 violações):
- **1.4.1 (cor não é único indicador)**: `Badge` sempre combina `children`
  textual com cor/ícone opcional; nenhum componente comunica estado só por
  cor.
- **4.1.2 (nome/função/valor via ARIA real)**: `SegmentedControl` =
  `radiogroup`/`radio` real com roving tabindex e navegação por seta;
  `StepperCounter` = `spinbutton` com `aria-valuenow/min/max`; `Tabs` =
  `tablist`/`tab`/`tabpanel` reais com `aria-selected`/`aria-controls`;
  `Accordion` = `aria-expanded`/`aria-controls` + painel `role="region"`.
  Nenhum é `div` estilizada genérica.
- **4.1.3 (mensagens de status via `aria-live`)**: `Toast`/`ToastProvider`
  usa duas regiões `aria-live` persistentes (`polite` para
  sucesso/aviso/info, `assertive` só para `danger`); `AlertBanner` usa
  `role="alert"` (danger) / `role="status"` (demais); `SessionExpiryBanner`
  é construído sobre `AlertBanner` (`info`, `polite`) — bate com a Seção
  2.2.1 (aviso não-bloqueante de expiração).
- **2.5.5/2.5.8 (alvo de toque 44×44px)**: token `--tap-target-min: 44px`
  definido em `src/design-system/tokens.css` e aplicado consistentemente em
  `Button`, `.input`, `.bottomTabItem`, `.topNavItem`, botões de
  `StepperCounter`.
- **Redução de movimento**: `prefersReducedMotion()` (`tokens.ts`, lê
  `prefers-reduced-motion` via `matchMedia`) usado em `Button` (spinner
  estático) e `Skeleton` (sem "pulso"), conforme exigido pela Seção 3.1/3.2.
- **2.4.7 (foco visível)**: coberto transversalmente em `globals.css` (ver
  item c acima).
- **Modal (focus trap, `Esc`, retorno de foco, foco inicial seguro)**:
  `Modal.tsx` implementa `role="dialog"`/`aria-modal`/`aria-labelledby`,
  trap de `Tab`/`Shift+Tab` manual sobre elementos focáveis, `Escape` fecha,
  foco retorna ao elemento que abriu (`previouslyFocused`), e aceita
  `initialFocusRef` — parametrização citada na nota de status do `FE-00`
  como "usado depois por T04/T07" bate com o código.
- **Decisão de `DateInput` (nativo vs. mascarado)**: ✅ **confirmada como
  trade-off documentado, não lacuna silenciosa** — o comentário JSDoc dentro
  de `src/components/ui/DateInput/DateInput.tsx` explica a motivação
  (acessibilidade de navegação por segmento via teclado/leitor de tela é
  não-trivial de reimplementar à mão) e sinaliza explicitamente a
  consequência (formato de exibição segue o locale do navegador/SO, não é
  garantido dd/mm/aaaa) e a ação recomendada ("sinalizar para `ux-ui`
  confirmar antes de T04/T05 congelarem a tela definitivamente"). Isso
  satisfaz a diretriz da Seção 1.0 do `TASK.md` ("nunca esconder incerteza...
  vira comentário/TODO rastreável, nunca lacuna silenciosa").

**Veredito dos itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificado de forma independente pelo QA.

### 2.3 Non-functional validation

- **Cenário de erro**: `useToast()` lança erro explícito e legível
  (`"useToast deve ser usado dentro de <ToastProvider>"`) se usado fora do
  provider — falha cedo, não silenciosa (visível inclusive nos logs do
  próprio `npm test`, onde é exercitado propositalmente por um teste
  negativo em `Toast.test.tsx`).
- **Performance básica**: build de produção gerou bundle de tamanho normal
  para um design system deste escopo (First Load JS 87.1 kB compartilhado,
  8.15 kB específico da vitrine); sem sinal de regressão.
- **Usabilidade (UX-SPEC.md)**: os pontos de atenção específicos da Seção
  5.2 (toggle de senha com `aria-pressed`, `StepperCounter` com
  `aria-label` por atleta/evento, foco inicial seguro em modais destrutivos)
  já estão implementados na camada de componente reutilizável — ficam
  reverificados contra a tela real (dado dinâmico) quando `FE-01`/`FE-04`/
  `FE-05`/`FE-07` forem validados.

### 2.4 Achados do QA (bugs/débitos)

---

**BUG-QA-FE00-01 — Severidade: Baixa (débito, prazo: antes do próximo push
que dispare o pipeline de CI compartilhado)**
- **Componente**: `src/components/ui/AppNav/AppNav.test.tsx` (o mesmo
  arquivo de BUG-QA-BE01-02) + `app/page.tsx` (novo, vitrine de FE-00) +
  step "Format check" do `.github/workflows/ci.yml`
- **Passos para reproduzir**: `npm run format:check` (`prettier --check .`)
  na raiz do projeto, estado atual da árvore.
- **Resultado esperado**: saída limpa / exit code 0 — o Frontend relatou
  nesta entrega ter corrigido o bug de teste do `AppNav.test.tsx`
  (mockando o CSS Module), o que resolveu de fato a **falha de teste**
  (confirmado, ver 2.1), mas o pedido explícito do QA em BE-01 era também
  rechecar o `format:check`.
- **Resultado obtido**: `format:check` **continua falhando**, exit code 1,
  `Code style issues found` em **2 arquivos**: (1) o mesmo
  `AppNav.test.tsx` — o bloco `vi.mock("./AppNav.module.css", ...)`
  adicionado para corrigir o teste não está formatado conforme Prettier
  (`npx prettier` reformataria o objeto `Proxy` em uma linha e ajustaria
  vírgulas finais em 3 outros trechos do mesmo arquivo); (2) **novo**:
  `app/page.tsx` (a vitrine de QA manual criada nesta tarefa) também tem
  divergências de quebra de linha/objeto em 4 pontos. Ou seja, o mesmo tipo
  de problema não só não foi corrigido como se espalhou para um segundo
  arquivo novo da própria `FE-00`.
- **Por que não bloqueia FE-00**: o critério de aceite escrito de `FE-00`
  (citado no topo desta seção) não menciona `format:check`/formatação — só
  "4 estados" e "WCAG transversal" — QA não reinterpreta o critério para
  incluir um item que não está nele, mesmo reavaliando o ponto conforme
  prometido em BE-01. Porém, como já registrado em BUG-QA-BE01-02, o
  `.github/workflows/ci.yml` (herdado de BE-01) tem o passo "Format check"
  sem `continue-on-error`, então **o CI compartilhado, hoje, ficaria
  vermelho no próximo push/PR de qualquer time** — agora por 2 arquivos de
  propriedade do Frontend, não 1.
- **Ação**: registrado como débito de baixa severidade, atribuído ao
  Frontend — rodar `npm run format -- --write .` (ou os 2 arquivos
  especificamente) antes do próximo push que dispare o CI. **Observação de
  tendência (ainda não escalada ao Tech Lead)**: esta é a segunda vez
  consecutiva que uma entrega do Frontend chega ao QA com
  `format:check` quebrado sem o comando ter sido rodado antes de marcar a
  tarefa `Concluída` — mesmo arquivo na primeira vez, arquivo novo
  adicional na segunda. Ainda não configura o padrão recorrente que o
  guardrail exige para escalar ao Tech Lead (é a mesma causa raiz — hábito
  de não rodar `format:check` antes de marcar `Concluída` —, não um sinal
  de problema na decomposição de tarefas ou nas diretrizes), mas se
  reaparecer numa terceira tarefa (`FE-01` em diante), o QA vai tratar como
  padrão recorrente e escalar via `BLOCKERS.md` ao Tech Lead, por indicar
  possível lacuna de diretriz (ex.: falta de hook de pre-commit/pre-push
  rodando `format:check` automaticamente, item que a própria Seção 1 do
  `TASK.md` não cobre hoje).

---

**BUG-QA-FE00-02 — Severidade: Baixa (débito, sem prazo formal — polimento
visual)**
- **Componente**: `src/components/ui/Toast/Toast.module.css`, classe
  `.dismiss` (botão "×" de fechar notificação, usado por `Toast` e,
  indiretamente, por `AlertBanner`/`SessionExpiryBanner` não — estes não
  usam o botão de dismiss do toast flutuante).
- **Passos para reproduzir**: ler `Toast.module.css`; passar o mouse sobre o
  botão de dispensar um toast renderizado (ex.: via `app/page.tsx`, seção de
  demonstração de `Toast`).
- **Resultado esperado**: algum feedback visual de `hover` (ex.: leve
  mudança de fundo/opacidade), consistente com o padrão de "hover" que os
  demais componentes interativos (`Button`, `.topNavItem`, inputs) têm.
- **Resultado obtido**: `.dismiss` não define nenhuma regra `:hover` —
  visualmente idêntico em repouso e sob o cursor (o foco via teclado
  continua funcionando normalmente, por herdar o `:focus-visible` global).
  Não é uma violação WCAG (2.4.7 exige foco visível, não hover visível — não
  há critério equivalente para hover), mas é uma inconsistência de polimento
  frente ao restante do design system.
- **Ação**: débito de baixa severidade, sem prazo formal, atribuído ao
  Frontend — adicionar `:hover` a `.dismiss` em paridade com os demais
  botões ghost/ícone do sistema, na próxima janela de manutenção do
  componente `Toast` (não bloqueia nenhuma tarefa `FE-0X` dependente).

---

### 2.5 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bugs de severidade baixa/média registrados como débito, com dono e
      contexto de prazo (BUG-QA-FE00-01, BUG-QA-FE00-02 acima)
- [x] Testes de integração cruzada — não aplicável a esta tarefa isolada
      (`FE-00` não depende de contrato de API; a integração cruzada
      Backend↔Frontend será testada tela a tela, a partir de `FE-01`, contra
      `API-CONTRACT.yaml`)
- [x] Requisito não funcional relevante validado (cenário de erro do
      `ToastProvider`, performance básica de build, usabilidade conforme
      Seção 5.1/5.2 do `UX-SPEC.md` — ver 2.3)

### 2.6 Veredito

## **FE-00: Aprovado com ressalvas**

Todos os itens do critério de aceite, lidos literalmente ("cada componente
implementado uma vez, com os 4 estados relevantes... e conformidade com
WCAG transversal... nenhuma tela abaixo reimplementa"), estão satisfeitos e
foram verificados de forma independente pelo QA — leitura direta do código
de cada um dos 18 componentes/famílias em `src/components/ui/*`, não apenas
aceite do relato do Frontend ou dos 95 testes automatizados (que também
passam 100%, incluindo 0 violação de `jest-axe`). A decisão de `DateInput`
(nativo vs. mascarado) está confirmada como trade-off documentado
inline no código, com sinalização explícita de quando escalar ao `ux-ui` —
não é lacuna silenciosa. `lint`/`typecheck`/`build` estão limpos.

As ressalvas são 2 débitos de severidade baixa, nenhum bloqueante: **(1)
BUG-QA-FE00-01** — `npm run format:check` continua falhando (agora em 2
arquivos: `AppNav.test.tsx`, que já havia sido apontado em BE-01, e o novo
`app/page.tsx`), o que mantém o step "Format check" do CI compartilhado
vermelho no próximo push de qualquer time; **(2) BUG-QA-FE00-02** — botão de
dispensar do `Toast` sem estado `hover` próprio (inconsistência visual menor,
não WCAG). Nenhuma ação de reprovação necessária em `TASK.md`; status
permanece `Concluída`.

**Nota de acompanhamento (não é escalonamento ao Tech Lead)**: BUG-QA-FE00-01
é a segunda ocorrência consecutiva do mesmo tipo de falha
(`format:check` quebrado por arquivo não formatado, entregue como
`Concluída` sem rodar o comando antes). Ainda tratado como execução pontual,
não como padrão recorrente de decomposição/diretriz — mas o QA vai escalar
ao Tech Lead via `BLOCKERS.md` se o mesmo tipo de achado reaparecer numa
terceira tarefa do Frontend.

---

## 3. BE-02 — Migrations da schema `app` + RLS deny-by-default

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Todas as tabelas
criadas via migration versionada; `SELECT`/`INSERT`/`UPDATE`/`DELETE` da role
`anon` negados por padrão em toda tabela, exceto onde explicitamente liberado
nas views (BE-03); teste de integração confirma RLS ativo tabela a tabela."

**Método**: validação independente e **reprodução real**, não apenas leitura
do SQL ou aceite do relato do Backend — Docker estava disponível neste
ambiente, então o QA efetivamente subiu um Supabase local (`npx supabase
start` + `npx supabase db reset`, aplicando as 13 migrations do zero) e rodou
a suíte de integração real contra ele, além de emitir consultas SQL/PostgREST
próprias (fora da suíte automatizada) para checar pontos que o teste do
Backend não cobre.

### 3.1 Verificação item a item

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Todas as tabelas criadas via migration versionada | Leitura das 13 migrations em `supabase/migrations/` linha a linha + `npx supabase db reset` aplicando todas do zero | ✅ 13 migrations aplicadas sem erro (1 setup de schema `app` + 12 tabelas = as 12 entidades exatas da Seção 5 do `SDD.md`: `atleta`, `rodada`, `participacao_rodada`, `evento_jogo`, `time`, `time_atleta`, `substituicao`, `lancamento_pontos`, `restricao_obrigatoria`, `log_auditoria`, `legado_migracao_registro`, `configuracao_pontuacao`) |
| `SELECT`/`INSERT`/`UPDATE`/`DELETE` de `anon` negados por padrão, em toda tabela | (a) Teste de integração real (72 casos) rodado pelo QA contra o Supabase local recém-criado; (b) consulta própria a `information_schema.role_table_grants` e `pg_policies` via `psql` direto no container | ✅ **72/72 passando** na execução do QA (não só relatado pelo Backend — reproduzido do zero). Consulta direta confirma **zero** linhas em `role_table_grants` para `anon`/`public` nas 12 tabelas e **zero** policies em `pg_policies` para a schema `app` — deny-by-default é literal, não inferido |
| Teste de integração confirma RLS ativo tabela a tabela | Leitura de `src/lib/supabase/__tests__/app-schema-rls.integration.test.ts` linha a linha + execução real | ✅ Cobertura exata das 12 tabelas × 6 verificações = 72 casos: (1) `pg_class.relrowsecurity = true` via `pg` direto, (2) `service_role` consegue `SELECT` (controle positivo), (3-6) `anon` negado em `SELECT`/`INSERT`/`UPDATE`/`DELETE` via PostgREST real (não mockado) |

**Veredito dos 3 itens do critério de aceite, como escrito**: **todos
satisfeitos**, reproduzido de ponta a ponta pelo QA, não apenas conferido por
leitura.

### 3.2 Reforço estrutural (triggers de append-only/não-exclusão) — verificado empiricamente pelo QA

O Backend relatou dois triggers (`app.forbid_lancamento_pontos_mutation`,
`app.forbid_atleta_delete`) como reforço além do texto literal do critério de
BE-02. O QA reproduziu isso de forma independente, indo além do que o próprio
teste de integração do Backend cobre (que só testa a via PostgREST/`anon` —
não testa a trigger contra um cliente com privilégio mais alto que
`service_role`):

- `DELETE FROM app.atleta` executado via `psql` **como superusuário
  `postgres`** (privilégio estritamente maior que `service_role`, bypassa RLS
  por completo) — bloqueado pela trigger com a mensagem exata esperada
  (`"Nenhuma linha de app.atleta e excluida fisicamente..."`). Confirma que o
  bloqueio é estrutural (nível de trigger), não apenas um efeito de RLS.
- `UPDATE`/`DELETE` em `app.lancamento_pontos` (registro previamente inserido
  pelo próprio QA para o teste), também via `psql` como superusuário —
  ambos bloqueados pela trigger `forbid_lancamento_pontos_mutation`, mensagem
  exata conforme a migration.

Ambos os reforços funcionam exatamente como descrito, verificados numa
condição ainda mais rigorosa (superusuário) do que a testada pelo Backend
(`service_role`).

### 3.3 Convenção de rollback de CI — verificado

Reexecutado localmente o mesmo grep do job `migration-convention-check` do
`.github/workflows/ci.yml` contra as 13 migrations reais: nenhuma falha
(`exit 0`). As 12 migrations de tabela contêm `DROP TABLE` (dentro do bloco
`-- ROLLBACK:`) e o bloco `-- ROLLBACK:` correspondente; a migration de setup
da schema (`20260902100000`) não contém `DROP`/`ALTER ... DROP`/`ALTER ...
ALTER COLUMN`, então corretamente não é exigida a ter o bloco — bate com o
relato do Backend e com `supabase/migrations/README.md`.

### 3.4 Avaliação dos desvios de modelagem física declarados (autoridade delegada pelo SDD.md Seção 5 ao Backend)

O `SDD.md` Seção 5 é explícito: "Não é modelagem física detalhada (tipos de
coluna exatos, índices) — isso cabe ao Backend Developer/Tech Lead na
decomposição seguinte." O QA comparou campo a campo cada uma das 12 tabelas
migradas contra a lista de campos do diagrama ER do `SDD.md` Seção 5
(incluindo o Anexo A para `log_auditoria`):

- **Todas as colunas listadas explicitamente no diagrama de cada entidade
  estão presentes na migration correspondente**, sem omissão. As únicas
  adições são: `criado_em timestamptz` (praticamente toda tabela, ausente do
  diagrama mas não conflitante com ele — auditoria básica de linha, decisão
  de detalhe razoável), `id`/PK onde o diagrama já implicava PK, `CHECK`
  (enums fechados, pares distintos), `UNIQUE` (idempotência,
  1-participação-por-atleta-por-rodada) e índices — nenhuma dessas adições
  contradiz ou remove um campo do modelo aprovado no Gate 2.
- **(1) `lancamento_pontos` sem `participacao_id`**: confirmado como
  inconsistência real, pré-existente, do próprio `SDD.md` — o diagrama de
  relacionamento desenha `PARTICIPACAO_RODADA ||--o{ LANCAMENTO_PONTOS :
  origina`, mas a lista de campos da mesma Seção 5 para `LANCAMENTO_PONTOS`
  não inclui `participacao_id` (só `atleta_id`/`rodada_id`). Diante de uma
  contradição interna do próprio documento de origem, a leitura adotada pelo
  Backend (lista de campos como fonte mais específica/autoritativa da física
  da tabela) é uma interpretação razoável, dentro da autoridade delegada —
  **não é uma reinterpretação do critério de aceite de BE-02** (que fala de
  RLS/migration, não da física exata de FK), é resolução de uma ambiguidade
  de um artefato de outro agente (Software Architect), documentada e não
  escondida. **Observação de QA, não bloqueante**: como `atleta_id`/`rodada_id`
  em `lancamento_pontos` não têm nenhuma FK/constraint que os amarre a uma
  linha existente de `participacao_rodada`, é estruturalmente possível
  (mesmo que a Seção 1.2 do `TASK.md` proíba isso por disciplina de código)
  gravar um lançamento de pontos para um par atleta+rodada sem participação
  registrada. Isso não é uma violação do critério de aceite de BE-02 (que não
  exige essa integridade referencial específica) — fica registrado como
  **débito de severidade baixa, sem prazo formal**, para o Backend considerar
  ao implementar a função atômica de lançamento (`BE-08`): validar
  em código (ou constraint composta contra `participacao_rodada(rodada_id,
  atleta_id)`, que já tem `UNIQUE`) que a participação existe antes de gravar
  o lançamento.
- **(2) `rodada.status` como soft-delete**: consistente com o próprio
  `SDD.md` (ledger append-only, RF-04.1 reverte via novo lançamento, FKs de
  `log_auditoria.rodada_id`/`lancamento_pontos.rodada_id` dependem da linha
  de `rodada` continuar existindo) — não extrapola a autoridade delegada,
  é a mesma filosofia não-destrutiva já usada em ADR-006/008/011 aplicada por
  analogia a uma entidade que o `SDD.md` não detalhou explicitamente quanto a
  isso. Aprovado.
- **(3) `evento_jogo` referenciando `participacao_rodada`**: o QA observa que
  isto **não é, na verdade, um desvio** — o próprio diagrama do `SDD.md`
  Seção 5 já lista `participacao_id` como campo de `EVENTO_JOGO` e desenha a
  relação `PARTICIPACAO_RODADA ||--o{ EVENTO_JOGO : gera`. A nota do Backend
  rotula isso como "decisão", mas é execução literal do modelo aprovado, não
  uma decisão de detalhe nova — apenas uma imprecisão de rótulo na
  documentação da migration, sem nenhum efeito funcional ou de risco. Não é
  registrado como bug (não é reproduzível nem tem efeito observável), só
  anotado aqui para precisão do relato.
- **(4) `UNIQUE`/`CHECK` adicionados**: reforços de integridade aditivos,
  nenhum contradiz o diagrama, dentro da autoridade de "tipos de coluna
  exatos, índices" explicitamente delegada. Aprovado.

**Conclusão desta seção**: nenhum dos desvios declarados extrapola a
autoridade delegada pelo `SDD.md` Seção 5 ao Backend. Nenhuma lacuna
estrutural nova encontrada pelo QA que justifique escalar a
`software-architect` — a única imprecisão real (item 3, rótulo) é cosmética,
e a única fragilidade de integridade referencial (item 1) é um débito de
baixa severidade, não uma reprovação.

### 3.5 Non-functional validation

- **Cenário de erro**: cada migration de tabela documenta explicitamente, em
  comentário, o único ponto que a própria migration **não** garante em nível
  de banco (`log_auditoria`: conteúdo semântico de `valores_antes` redigido é
  responsabilidade da função `anonimizar_atleta`, ainda não implementada) —
  tratado como `TODO` rastreável, não lacuna silenciosa, conforme Seção 1.0
  do `TASK.md`.
- **Performance básica**: não aplicável de forma significativa (tarefa de
  schema, sem endpoint de negócio ainda); `supabase db reset` aplicou as 13
  migrations em poucos segundos, sem sinal de problema.
- **Usabilidade**: não aplicável — BE-02 não entrega UI.

### 3.6 Achados do QA — nenhum bloqueante

**BUG-QA-BE02-01 — Severidade: Baixa (débito, sem prazo formal)**
- **Componente**: `supabase/migrations/20260902100800_create_lancamento_pontos_table.sql`
- **Passos para reproduzir**: inserir um `atleta`/`rodada` sem nenhuma linha
  correspondente em `participacao_rodada`, depois inserir em
  `app.lancamento_pontos` referenciando esse par `atleta_id`/`rodada_id`.
- **Resultado esperado** (à luz da relação `PARTICIPACAO_RODADA ||--o{
  LANCAMENTO_PONTOS : origina` do `SDD.md`): alguma garantia estrutural de que
  o lançamento só existe para um par com participação registrada.
- **Resultado obtido**: o `INSERT` é aceito sem erro — não há FK/constraint
  amarrando `lancamento_pontos` a `participacao_rodada`.
- **Por que não bloqueia BE-02**: o critério de aceite literal de BE-02 é
  sobre migration versionada + RLS deny-by-default + teste de integração de
  RLS — não sobre integridade referencial de `lancamento_pontos`. A decisão
  de modelagem em si (usar `atleta_id`/`rodada_id` em vez de
  `participacao_id`) está dentro da autoridade delegada pelo `SDD.md` Seção 5
  (ver 3.4, item 1).
- **Ação**: débito de baixa severidade, atribuído ao Backend — considerar,
  ao implementar `BE-08` (função de lançamento), validar em código (ou via
  constraint composta contra `participacao_rodada(rodada_id, atleta_id)`,
  que já tem `UNIQUE`) que existe participação antes de gravar o lançamento.
  Sem prazo formal — não é código de produto ainda em uso.

### 3.7 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite da tarefa foi testado e está passando —
      reproduzido do zero (Supabase local real), não apenas conferido
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bug de severidade baixa registrado como débito, com dono e contexto de
      prazo (BUG-QA-BE02-01 acima)
- [x] Testes de integração cruzada — não aplicável ainda (BE-02 não depende
      de contrato de API consumido por Frontend/Mobile; a integração
      cruzada relevante desta tarefa é backend↔banco, coberta pelo teste
      de RLS, executado e confirmado pelo QA)
- [x] Requisito não funcional relevante validado (cenário de erro
      documentado via comentário/TODO rastreável; ver 3.5)

### 3.8 Veredito

## **BE-02: Aprovado com ressalvas**

Todos os 3 itens do critério de aceite, lidos literalmente, estão
satisfeitos — verificado por **reprodução real**, não apenas leitura do SQL
ou aceite do relato do Backend: o QA subiu um Supabase local do zero
(`supabase start` + `supabase db reset`, as 13 migrations aplicadas sem
erro), executou a suíte de integração do Backend contra esse ambiente real
(**72/72 passando**), confirmou por SQL direto que zero grants/policies
existem para `anon`/`public` nas 12 tabelas, e reproduziu empiricamente os
dois triggers de reforço (`forbid_atleta_delete`,
`forbid_lancamento_pontos_mutation`) numa condição ainda mais rigorosa
(superusuário Postgres, não só `service_role`). `lint`/`typecheck`/`build`/
`npm test` (95 testes) seguem verdes, e a convenção de rollback de CI foi
reverificada com o grep exato do workflow.

Os desvios de modelagem física documentados pelo Backend foram avaliados um
a um contra o `SDD.md` Seção 5: nenhum extrapola a autoridade delegada
("modelagem física... cabe ao Backend Developer"); um deles (item 3,
`evento_jogo`→`participacao_rodada`) é, na leitura do QA, execução literal do
modelo aprovado, não uma decisão nova — apenas uma imprecisão de rótulo, sem
efeito funcional. A ressalva é um único débito de severidade baixa
(**BUG-QA-BE02-01** — ausência de FK/constraint entre `lancamento_pontos` e
`participacao_rodada`), sem prazo formal, recomendado para consideração ao
implementar `BE-08`. Nenhuma ação de reprovação necessária em `TASK.md`;
status permanece `Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: este é o
segundo agente de implementação (após Frontend/FE-00) cujo trabalho é
validado nesta rodada — nenhum padrão recorrente de bug entre Backend e
Frontend foi identificado até aqui (os achados de `format:check` são restritos
ao Frontend; o achado de integridade referencial de BE-02 é isolado, sem
repetição em outra tarefa do Backend ainda). Guardrail de "só escala por
padrão recorrente" seguido — nenhuma entrada nova em `BLOCKERS.md`.

---

## 4. BE-03 — Views públicas curadas (`ranking_publico`, `presenca_mensal_publica`)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "View
`ranking_publico` nunca retorna `contato`/`data_nascimento` mesmo com
`SELECT *`; view `presenca_mensal_publica` agrupa por mês civil (RN-09);
teste automatizado consulta ambas as views com a chave `anon` e falha se
qualquer coluna sensível aparecer."

**Método**: validação independente e **reprodução real**, mesmo rigor de
BE-02 — Docker estava disponível, então o QA subiu o Supabase local do zero
(`npx supabase start` + `npx supabase db reset`, aplicando as 13 migrations,
incluindo a nova `20260902101300_create_public_views.sql`), rodou a suíte de
integração real do Backend duas vezes seguidas, e foi além dela com consultas
SQL diretas (`psql` no container) e chamadas HTTP diretas ao PostgREST (fora
de qualquer client/test helper do Backend) para checar pontos que a suíte
fornecida não cobre.

### 4.1 Verificação item a item

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| `ranking_publico` nunca retorna `contato`/`data_nascimento`, mesmo com `SELECT *` | (a) Leitura linha a linha da migration — nenhuma das duas views seleciona essas colunas de `app.atleta` em nenhum ponto da definição; (b) execução real da suíte (`npm run test:integration`, 2x seguidas); (c) `select contato from app.ranking_publico` via `psql` como role `anon` — verificação própria, fora da suíte; (d) consulta direta a `information_schema.columns` para as duas views | ✅ Migration confirma ausência estrutural das colunas; suíte **78/78 verde em 2 execuções seguidas** (72 de BE-02 + 6 de BE-03); `psql` retorna `ERROR: column "contato" does not exist` (a coluna **não existe** na view, não é apenas "não populada" — garantia mais forte que omissão de payload); `information_schema.columns` lista exatamente 5 colunas em `ranking_publico` (`atleta_id`, `nome_exibicao`, `pontuacao_acumulada`, `presencas`, `cartoes`) e 6 em `presenca_mensal_publica` (`ano`, `mes`, `rodada_id`, `rodada_data`, `total_presentes`, `nomes_presentes`) — nenhuma sensível em nenhuma das duas |
| `presenca_mensal_publica` agrupa por mês civil (RN-09) | Leitura de `PRD-TECNICO.md` RN-09 ("mês civil, calendário Gregoriano, dia 1 ao último dia") + Interpretação registrada #8 (Seção 7) + `UX-SPEC.md` T03 ("Navegação por mês civil (RN-09)... cada rodada do mês é expansível") + leitura da migration (`extract(year/month from r.data)::int`, uma linha por rodada `lancada`) + execução do teste que verifica `ano=2026`/`mes=9` para rodada de `2026-09-05` | ✅ A view expõe `ano`/`mes` (mês civil Gregoriano, sem ambiguidade de fuso — `rodada.data` é `date`, sem componente de hora) por linha de rodada, para o Frontend agrupar/filtrar no cliente (`?ano=eq.2026&mes=eq.9`, já documentado em `API-CONTRACT.yaml`) — isso bate exatamente com o desenho de T03 no `UX-SPEC.md` (accordion por rodada **dentro** de um mês, não uma linha agregada por mês), não é reinterpretação: é a forma correta de satisfazer RN-09 dado como a tela consome o dado |
| Teste automatizado consulta ambas as views com a chave `anon` e falha se qualquer coluna sensível aparecer | Leitura de `src/lib/supabase/__tests__/public-views.integration.test.ts` linha a linha + execução real | ✅ `assertSemColunaSensivel` roda contra `SELECT *` de ambas as views, autenticado como `anon` (client criado com a `ANON_KEY`, não `service_role`) — cobre literalmente o texto do critério |

**Veredito dos 3 itens do critério de aceite, como escrito**: **todos
satisfeitos**, reproduzido de ponta a ponta pelo QA, não apenas conferido por
leitura ou aceite do relato do Backend.

### 4.2 Verificação independente além da suíte fornecida (RLS/grants intocados em tabela base)

Reproduzido com consultas próprias via `psql` direto no container do
Postgres local, fora de qualquer helper do Backend:

- `set role anon; select * from app.atleta limit 1;` → `ERROR: permission
  denied for table atleta` — acesso direto à tabela base **continua negado**
  para `anon`, exatamente como BE-02 deixou.
- `information_schema.role_table_grants` filtrado por `grantee='anon'` na
  schema `app` retorna **exatamente 2 linhas**: `SELECT` em
  `ranking_publico` e `SELECT` em `presenca_mensal_publica` — nenhuma outra
  tabela/view recebeu grant novo para `anon`.
- `pg_policies` da schema `app` continua retornando **0 linhas** — nenhuma
  `POLICY` foi criada, deny-by-default de BE-02 permanece literal.
- `pg_class.relrowsecurity` de `app.atleta` continua `true` — RLS não foi
  desabilitado em nenhuma tabela base.

Confirma, de forma independente (não só por leitura do comentário da
migration), a alegação central do Backend: **nenhuma tabela base foi
alterada** — toda a liberação de leitura pública está contida nas duas views
novas.

### 4.3 Non-functional validation

- **Performance básica**: não aplicável de forma significativa (duas views
  sem volume de dado real ainda); `supabase db reset` aplicou a migration
  nova junto às 12 anteriores em poucos segundos, sem sinal de problema.
- **Usabilidade (UX-SPEC.md)**: não aplicável ainda em UI própria — `FE-02`/
  `FE-03` (consumidoras destas views) constam como "Não iniciada" no
  `TASK.md`; a validação de usabilidade de T02/T03 propriamente dita fica
  para quando essas tarefas forem concluídas. O QA confirma aqui apenas que
  o **dado disponibilizado** já é compatível com o que `UX-SPEC.md` T02/T03
  exige (nome de exibição, pontuação, presenças, cartões, mês civil,
  presentes por rodada) — nada a mais, nada a menos.
- **Cenário de erro (401 documentado em `API-CONTRACT.yaml`)**: verificado
  e **não confirmável no ambiente local** — ver achado abaixo
  (BUG-QA-BE03-01).
- **Integração cruzada Backend↔Frontend**: `API-CONTRACT.yaml` (primeira
  publicação, v0.1.0) foi conferido campo a campo contra a saída real das
  duas views (mesma consulta de `information_schema.columns` da Seção 4.1):
  `RankingPublicoItem` e `PresencaMensalPublicaItem` declaram exatamente as
  mesmas 5 e 6 colunas, nesta ordem de tipo (`uuid`/`string`/`number`/
  `integer`/`array`), sem nenhuma coluna a mais ou a menos —
  `additionalProperties: false` é uma afirmação verdadeira, não apenas
  aspiracional. `FE-02`/`FE-03` ainda não começaram (dependem de `BE-03`,
  agora liberado) — o teste de integração cruzada de ponta a ponta
  (Frontend consumindo de fato via `@supabase/supabase-js` com `db: {
  schema: "app" }`, mesmo padrão usado pelo próprio teste do Backend) fica
  para a validação de `FE-02`/`FE-03`, quando existir código Frontend para
  rodar contra este contrato.

### 4.4 Achados do QA

---

**BUG-QA-BE03-01 — Severidade: Baixa/informativo (débito, sem prazo
formal — limitação de ambiente, não defeito de código)**
- **Componente**: `.md/API-CONTRACT.yaml` (seção "responses", `401`) vs.
  stack local do Supabase CLI (`supabase/config.toml` + Kong local).
- **Passos para reproduzir**: com o Supabase local rodando, `curl` direto ao
  PostgREST via Kong (`http://127.0.0.1:54321/rest/v1/ranking_publico`) com
  header `Accept-Profile: app` (necessário para resolver a view fora do
  schema `public`, equivalente ao `db: { schema: "app" }` do
  `@supabase/supabase-js` usado pelo teste do Backend): (1) **sem** header
  `apikey`; (2) com `apikey: chave-invalida` (string arbitrária, não um JWT).
- **Resultado esperado**, conforme `API-CONTRACT.yaml` (`getRankingPublico`,
  resposta `401`: "Chave `anon` ausente/inválida no header `apikey`
  (comportamento padrão do PostgREST)"): HTTP 401 em ambos os casos.
- **Resultado obtido**: HTTP **200**, com os dados reais de
  `ranking_publico`, em ambos os casos — nenhuma rejeição.
- **Causa raiz confirmada** (lida diretamente do `kong.yml` do container
  local, não suposição): a rota `rest-v1` do Kong local **não tem o plugin
  `key-auth`** (só `cors` + um `request-transformer` que só *traduz* um
  `apikey` reconhecido em header `Authorization`, sem rejeitar um `apikey`
  desconhecido/ausente); sem `Authorization` válido chegando ao PostgREST,
  este usa seu `db-anon-role` padrão (`anon`) — comportamento documentado do
  próprio PostgREST, não um bug introduzido por esta tarefa. A rota
  `rest-admin-v1` do mesmo arquivo tem um comentário `# TODO: validate
  apikey` do próprio template oficial do Supabase CLI, confirmando que essa
  simplificação é um comportamento conhecido e deliberado do **ambiente
  local de desenvolvimento**, não uma falha de configuração desta tarefa.
- **Por que não bloqueia BE-03 nem é um risco de segurança real**: o
  critério de aceite literal de BE-03 não exige o código HTTP 401 —
  ele exige que as colunas sensíveis nunca apareçam, o que continua
  verdadeiro **mesmo neste cenário** (o pior caso possível, requisição sem
  nenhuma autenticação, ainda assim só devolve exatamente as 5/6 colunas já
  públicas por design, nunca `contato`/`data_nascimento` — a proteção real
  está no RLS/GRANT do Postgres, Seção 4.2 acima, exatamente como o `SDD.md`
  Seção 7.5/ADR-005 desenha: "proteção garantida no nível de banco", não no
  gateway). Em produção (Supabase hospedado), o Kong gerenciado pela
  Supabase **valida** `apikey` antes de rotear ao PostgREST (comportamento
  gerenciado, fora do controle desta migration) — não há evidência de que o
  401 documentado esteja errado para produção, só que **não é verificável
  contra o ambiente local**, que é conhecidamente mais permissivo.
- **Ação**: débito de baixa severidade/informativo, sem prazo formal.
  Recomendação ao Backend: adicionar uma nota em `API-CONTRACT.yaml` (seção
  `401`) esclarecendo que essa resposta é garantida pelo gateway gerenciado
  do Supabase hospedado e **não é reproduzível no Supabase CLI local**, para
  que quem escrever um teste de integração futuro contra este endpoint
  (Frontend ou o próprio QA, ao validar `FE-02`/`FE-03`) não escreva uma
  asserção de `401` que falharia localmente por limitação de ambiente, não
  por regressão real. Não configura padrão recorrente (é a primeira vez que
  esse tipo de achado aparece) — não escalado ao Tech Lead.

---

### 4.5 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite da tarefa foi testado e está passando —
      reproduzido do zero (Supabase local real, 2 execuções da suíte), não
      apenas conferido por leitura
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bug de severidade baixa/informativo registrado como débito, com
      contexto (BUG-QA-BE03-01 acima) — sem prazo formal por não ser
      defeito de código, e sim limitação documentada do ambiente local
- [x] Testes de integração cruzada — `API-CONTRACT.yaml` conferido campo a
      campo contra a saída real das views (Seção 4.3); teste de ponta a
      ponta com código Frontend real fica para a validação de `FE-02`/
      `FE-03` (ainda "Não iniciada" no `TASK.md`), quando existir
- [x] Requisito não funcional relevante validado (cenário de erro
      investigado e documentado — achado de ambiente, não de código; ver
      4.3/4.4)

### 4.6 Veredito

## **BE-03: Aprovado**

Os 3 itens do critério de aceite, lidos literalmente, estão satisfeitos —
verificado por **reprodução real**, não apenas leitura do SQL ou aceite do
relato do Backend: o QA subiu um Supabase local do zero (13 migrations,
incluindo a nova de views), rodou a suíte de integração do Backend **duas
vezes seguidas (78/78 verde em ambas)**, e foi além dela com consultas SQL
diretas (`psql`) e chamadas HTTP diretas ao PostgREST que a suíte fornecida
não cobre — incluindo tentar ativamente extrair `contato` de
`ranking_publico` (coluna não existe na view, erro de SQL, não apenas
ausência de dado) e confirmar, via `information_schema`, que nenhuma tabela
base ganhou grant novo para `anon` e que zero `POLICY` existe na schema
`app` (deny-by-default de BE-02 permanece literal). O agrupamento por mês
civil de `presenca_mensal_publica` (RN-09) foi confirmado contra a definição
exata da regra em `PRD-TECNICO.md` e contra o desenho de tela em
`UX-SPEC.md` T03 — a escolha de expor `ano`/`mes` por linha de rodada (em
vez de uma linha agregada por mês) é a leitura correta do requisito, não uma
reinterpretação. `API-CONTRACT.yaml` (primeira publicação, v0.1.0) foi
conferido campo a campo contra a saída real das duas views — coerente,
sem coluna sensível documentada nem omitida. `lint`/`typecheck`/`build`/
`npm test` (95 testes) seguem verdes; convenção de rollback de CI
reverificada com o mesmo grep do workflow.

**Única ressalva, não bloqueante**: BUG-QA-BE03-01 — o código `401`
documentado em `API-CONTRACT.yaml` para chave `apikey` ausente/inválida não
é reproduzível no Supabase CLI local (o Kong local não valida `apikey`
nesta rota, comportamento conhecido e deliberado do template oficial, não
uma configuração desta tarefa); a garantia de dado sensível nunca aparecer
continua válida mesmo neste cenário, porque a proteção real está no
RLS/GRANT do Postgres (Seção 4.2), não no gateway. Registrado como débito
informativo, sem prazo formal, com recomendação de nota no próprio
`API-CONTRACT.yaml`. Nenhuma ação de reprovação necessária em `TASK.md`;
status permanece `Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: terceiro
agente de implementação validado nesta rodada (após FE-00, BE-02); nenhum
padrão recorrente de bug entre tarefas do Backend foi identificado — o
achado desta tarefa (limitação de ambiente local para validar `401`) é de
natureza distinta do achado de BE-02 (ausência de FK/constraint), sem
repetição de causa raiz. Guardrail de "só escala por padrão recorrente"
seguido — nenhuma entrada nova em `BLOCKERS.md`.

---

### 4.7 Sub-item (2026-09-03, resolução de `BLOCKER-005`) — Campo `ausencias` em `app.ranking_publico`

**Gatilho**: Backend marcou este incremento de `BE-03` como concluído no
`TASK.md` (Seção 3.1), reportando a migration
`20260903091500_add_ausencias_to_ranking_publico.sql`, atualização de
`API-CONTRACT.yaml` (v0.3.0) e 84/84 testes de integração (2 execuções).

**Especificação exata contra a qual este incremento é validado**: `SDD.md`
Seção 5.1 ("Adendo 2026-09-03 — Campo `ausencias` em
`app.ranking_publico`"), **não** a sugestão original do UX/UI em
`BLOCKER-005` (`total_rodadas_lancadas - presencas`, explicitamente
rejeitada pelo Software Architect) — QA valida contra a decisão final
registrada no `SDD.md`, conforme o próprio guardrail deste agente de nunca
reinterpretar o critério de aceite.

**Método**: validação independente e **reprodução real**, mesmo rigor de
BE-02/BE-03/BE-04 — não apenas leitura do SQL/YAML ou aceite do relato do
Backend. Docker/Supabase CLI estavam disponíveis: o QA rodou `npx supabase
db reset` (17 migrations aplicadas do zero, incluindo a nova, sem erro),
inspecionou a view e os grants diretamente via `psql` dentro do container
(`docker exec supabase_db_turma-do-rola-comary psql ...`, fora de qualquer
helper do Backend), rodou a suíte de integração real duas vezes seguidas, e
reexecutou a suíte completa (`npm test`), `lint`, `typecheck`,
`format:check`, `build` e o grep exato do job `migration-convention-check`
do `.github/workflows/ci.yml`.

#### 4.7.1 Verificação item a item contra `SDD.md` Seção 5.1

| Item da especificação | Verificado por QA | Resultado |
|---|---|---|
| Migration **aditiva**, não edita `20260902101300_create_public_views.sql` | Leitura do diretório `supabase/migrations/` — arquivo novo `20260903091500_add_ausencias_to_ranking_publico.sql`; `20260902101300` permanece byte a byte igual (não houve `git diff` nela) | ✅ |
| `CREATE OR REPLACE VIEW`, reproduzindo integralmente as 5 colunas/ordem/tipos existentes, acrescentando `ausencias` como 6ª coluna | `\d+ app.ranking_publico` via `psql` real após `db reset` | ✅ 6 colunas na ordem exata `atleta_id, nome_exibicao, pontuacao_acumulada, presencas, cartoes, ausencias`; `pg_get_viewdef` confirma a definição completa, nenhuma das 5 subqueries pré-existentes (`saldo`/`presenca`/`cartao`) foi alterada, só a subquery `ausencia` foi acrescentada |
| `GRANT`s de `anon`/`service_role` preservados, **sem reemissão** | `select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema='app'` via `psql` real | ✅ Exatamente 2 linhas para `anon` na schema inteira: `SELECT` em `ranking_publico` e `SELECT` em `presenca_mensal_publica` — idêntico ao estado pós-BE-03, nenhum grant novo, nenhuma tabela base tocada |
| `ausencias` = contagem direta e simétrica de `participacao_rodada.status='ausente'` em rodada `status='lancada'`, **sem subtração** | Leitura da subquery na migration + `pg_get_viewdef` real | ✅ `left join (select ... count(*) ... where pr.status = 'ausente' and r.status = 'lancada' ...) ausencia` — mesmo padrão de `presenca`/`cartao`, nenhuma subtração de `total_rodadas` em lugar algum |
| `lesionado` não conta nem em `presencas` nem em `ausencias` | (a) `select conname, pg_get_constraintdef(...) from pg_constraint where conrelid='app.participacao_rodada'::regclass` confirma `status` restrito a `presente`/`ausente`/`lesionado` (mutuamente exclusivos); (b) execução do teste de integração dedicado (ver 4.7.2) | ✅ Confirmado estruturalmente (CHECK constraint de 3 valores mutuamente exclusivos) e empiricamente (teste dedicado) |
| Nenhuma coluna sensível nova, nenhum `GRANT` novo | Leitura completa de `pg_get_viewdef` + grants (linhas acima) | ✅ `contato`/`data_nascimento` continuam ausentes de toda a definição da view |
| Nenhuma tabela auxiliar criada; coluna computada via subquery na própria view | Leitura da migration + `\dt app.*` (lista de tabelas) | ✅ 14 tabelas base, nenhuma nova; `ausencias` é puramente uma subquery/CTE dentro do `SELECT` de `ranking_publico`, mesmo padrão de `presenca`/`cartao` |
| Nenhum novo ADR necessário | Confirmado — este é detalhe de implementação de view já coberto por `ADR-005`, nenhum ADR novo foi criado (`adr/` continua com 011 arquivos) | ✅ |
| `API-CONTRACT.yaml`: `ausencias` (`integer`) em `RankingPublicoItem`, incluído em `required`, `info.version` incrementado, entrada no `x-changelog` | `node -e` carregando o YAML com `js-yaml` (evita erro de leitura manual) + leitura direta do changelog | ✅ YAML sintaticamente válido; `info.version = "0.3.0"`; `required` inclui `ausencias`; descrição do campo documenta a derivação exata (contagem direta, sem subtração, `lesionado` excluído) — consistente com o `SDD.md`; 3 entradas em `x-changelog` (`0.1.0`/BE-03, `0.2.0`/BE-04, `0.3.0`/este sub-item), sem reescrita das entradas anteriores |

**Veredito dos itens da especificação, como escrita no `SDD.md`**: **todos
satisfeitos**, verificado por reprodução real contra Supabase local, não
apenas leitura do SQL/YAML ou aceite do relato do Backend.

#### 4.7.2 Teste de integração dedicado — verificação empírica dos 3 casos (presente/ausente/lesionado)

Leitura linha a linha de `src/lib/supabase/__tests__/public-views.integration.test.ts`
(incremento sobre o arquivo já existente de BE-03, não recriado do zero) e
execução real contra Supabase local:

- O `beforeAll` cria, além do par de rodadas original de BE-03 (`lancada`/
  `excluida`), duas rodadas novas dedicadas (`rodadaAusenteId`,
  `rodadaLesionadoId`, ambas `status='lancada'`), com o mesmo atleta ativo
  participando como `ausente` numa e `lesionado` na outra — cobrindo os 3
  valores possíveis de `participacao_rodada.status` para o mesmo atleta em
  rodadas distintas.
- Teste `"pontuacao_acumulada = ... presencas/cartoes/ausencias ignoram
  rodada com status=excluida"` (linha 254-270) confirma `presencas = 1`,
  `cartoes = 1`, **`ausencias = 1`** para o atleta ativo.
- Teste dedicado `"ausencias (BLOCKER-005, SDD.md Seção 5.1): contagem
  direta e simétrica de status=ausente; status=lesionado não conta nem em
  presencas nem em ausencias"` (linha 272-290) reafirma `presencas=1`/
  `ausencias=1` e documenta explicitamente, em comentário no próprio teste,
  que **`presencas (1) + ausencias (1) ≠ total de participações do atleta
  (4)`** — a rodada `lesionado` fica de fora de ambas as contagens por
  desenho. **QA confirma esta é exatamente a asserção que prova a exclusão
  de `lesionado`** relatada pelo Backend, não uma alegação não verificável:
  o teste é determinístico (4 participações conhecidas: presente/excluída
  não conta, presente/lançada, ausente/lançada, lesionado/lançada — 2
  contam, 2 não), e passou nas duas execuções reais do QA.
- Suíte de integração deste arquivo específico: **6 → 7 casos** (o 7º é o
  teste dedicado acima), confirmado via `npm run test:integration` real
  (ver 4.7.3) — bate exatamente com o incremento relatado pelo Backend.

#### 4.7.3 Verificação de comandos (independente do relato do Backend)

| Comando | Resultado obtido pelo QA | Bate com o relato do Backend? |
|---|---|---|
| `npx supabase db reset` (seed do zero, 17 migrations) | ✅ Todas aplicadas sem erro, incluindo a nova | Sim |
| `npm run test:integration` (1ª execução) | ✅ **3 arquivos, 84 testes, 84 passando** (72 BE-02 + 5 BE-04 + 7 `public-views`) | Sim |
| `npm run test:integration` (2ª execução, mesma instância, sem `db reset` entre as duas) | ✅ **84/84 passando novamente** — confirma reexecução sem colisão, mesmo critério já usado em BE-03 | Sim |
| `npm test -- --run` | ✅ **31 arquivos, 151 testes, 151 passando, 0 falha** — nenhuma regressão introduzida por este incremento | Sim |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run format:check` | ✅ Limpo (`All matched files use Prettier code style!`) | Sim |
| `npm run build` | ✅ `Compiled successfully`, 8 rotas geradas | Sim |
| Grep exato do job `migration-convention-check` do `ci.yml`, reexecutado localmente contra as 18 migrations reais | ✅ `exit 0` — a nova migration não contém `DROP`/`ALTER ...DROP`/`ALTER ...ALTER COLUMN`, então o check nem é acionado (puramente aditiva, como já documentado no próprio arquivo) | Sim |

#### 4.7.4 Non-functional validation

- **Cenário de erro**: não aplicável de forma nova — o comportamento de erro
  desta view (chave `anon` ausente/inválida) já foi investigado em BE-03
  (BUG-QA-BE03-01, limitação conhecida do ambiente local, não deste
  incremento) e não muda com a coluna nova.
- **Performance básica**: `db reset` aplicou a migration nova sobre as 16
  anteriores em poucos segundos; a subquery `ausencia` é estruturalmente
  idêntica (mesmo padrão de índice implícito via `participacao_rodada`) às
  subqueries `presenca`/`cartao` já existentes — sem sinal de regressão.
- **Usabilidade (`UX-SPEC.md`)**: não aplicável ao Backend — a exibição de
  `ausencias` em T02 é escopo de `FE-02` (Frontend), ainda não reestimado/
  reaberto (`UX-SPEC.md` Seção 3.3 já sinaliza "Precisa reestimar: Sim",
  `BLOCKERS.md` `BLOCKER-005` marcado `Resolvido`). QA confirma aqui apenas
  que o **dado necessário já está disponível e correto** no contrato — a
  validação de usabilidade da tela em si fica para quando `FE-02`
  (incremento) for marcada `Concluída` pelo Frontend, fora do escopo deste
  agente por ora.

#### 4.7.5 Achados do QA

Nenhum bug encontrado nesta validação — nenhuma entrada nova de
`BUG-QA-BE03-0X`.

#### 4.7.6 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite (especificação exata do `SDD.md` Seção 5.1)
      foi testado e está passando — reproduzido do zero contra Supabase
      local real, não apenas conferido por leitura
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum débito novo de severidade baixa/média a registrar
- [x] Testes de integração cruzada — `API-CONTRACT.yaml` (v0.3.0) conferido
      campo a campo contra a saída real da view (`ausencias` como `integer`,
      `required`); integração Backend↔Frontend de ponta a ponta fica para a
      validação do incremento de `FE-02` (ainda não redisparado/concluído)
- [x] Requisito não funcional relevante validado (performance básica;
      usabilidade fora de escopo do Backend, ver 4.7.4)

#### 4.7.7 Veredito

## **BE-03 (incremento `ausencias`, resolução de `BLOCKER-005`): Aprovado**

Todos os itens da especificação exata do `SDD.md` Seção 5.1 estão
satisfeitos, verificados por **reprodução real** contra um Supabase local
recriado do zero (18 migrations aplicadas sem erro) — não apenas leitura do
SQL/YAML ou aceite do relato do Backend. Inspeção direta via `psql` dentro
do container confirma: a view tem exatamente as 6 colunas esperadas, na
ordem esperada; os `GRANT`s de `anon` permanecem restritos a `SELECT` em
`ranking_publico`/`presenca_mensal_publica`, sem nenhuma alteração em
nenhuma tabela base (mesmas 2 linhas de antes da migration); `ausencias` é
de fato uma contagem direta e simétrica de `status='ausente'`, sem
subtração; nenhuma coluna sensível foi introduzida. O teste de integração
dedicado foi lido e reexecutado (não apenas aceito): a asserção explícita de
que `presencas + ausencias` (1+1=2) é diferente do total real de
participações do atleta de teste (4) prova, de forma determinística, que
`lesionado` fica fora de ambas as contagens, exatamente como a decisão final
do Software Architect em `BLOCKER-005`/`SDD.md` exige — a fórmula por
subtração originalmente sugerida pelo UX/UI foi corretamente rejeitada, e
esta implementação não a reintroduz. Suíte de integração real (84/84,
reproduzida em 2 execuções seguidas pelo próprio QA) e suíte unitária
(151/151) sem regressão; `lint`/`typecheck`/`format:check`/`build` limpos;
grep de convenção de rollback de CI reexecutado localmente sem falha.
`API-CONTRACT.yaml` (v0.3.0) é sintaticamente válido e bate campo a campo
com a saída real da view. Nenhum bug encontrado. Nenhuma ação de reprovação
necessária em `TASK.md`; status permanece `Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: nenhum padrão
recorrente de bug foi identificado neste incremento — é a primeira vez que
um "sub-item" pós-resolução de bloqueio interagente (UX/UI → Software
Architect → Backend) chega ao QA; a cadeia de especificação (`BLOCKERS.md`
`BLOCKER-004`/`BLOCKER-005` → `SDD.md` Seção 5.1 → migration/teste/contrato)
está integralmente rastreável e sem contradição interna. Guardrail de "só
escala por padrão recorrente" seguido — nenhuma entrada nova em
`BLOCKERS.md`.

**Nota para o Frontend (referência cruzada, fora da autoridade deste
agente para executar)**: este incremento **destrava** a reestimativa/
implementação do incremento correspondente em `FE-02` (exibir `ausencias`
no ranking público, `UX-SPEC.md` Seção 3.3 já sinalizada "Precisa
reestimar: Sim") — o QA validará esse incremento de `FE-02` quando o
Frontend o marcar `Concluída` no `TASK.md`, contra o critério de aceite que
o Tech Lead/Frontend definirem para ele, não contra este relato.

---

## 5. BE-04 — Módulo de autenticação custom (senha única, sessão, rate limiting)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Login com senha
correta emite cookie httpOnly/secure/SameSite=strict com TTL 8-12h; 5
tentativas erradas em 15 min bloqueiam com backoff; mensagem de erro
idêntica em ambos os casos (RF-07.3); toda rota de escrita retorna 401 sem
sessão válida."

**Skills aplicadas**: `acceptance-criteria-validation`,
`security-requirement-validation` (módulo de maior criticidade de segurança
do projeto — hash de senha, sessão, rate limiting são exatamente os
requisitos de arquitetura de `ADR-004`/`SDD.md` Seção 7), `bug-documentation`.

**Método**: validação independente e **reprodução real de ponta a ponta**,
mesmo rigor de BE-02/BE-03 — não apenas leitura do código ou aceite do
relato do Backend. O QA (a) leu linha a linha todo o código de
`src/modules/autenticacao/*`, `app/api/auth/login|logout/route.ts`,
`middleware.ts` e as duas migrations novas
(`20260903090000_create_auth_interno_table.sql`,
`20260903090100_create_tentativa_login_table.sql`); (b) subiu o Supabase
local do zero (`npx supabase start` + `npx supabase db reset`, 17
migrations aplicadas sem erro) e rodou a suíte automatizada completa; (c)
fez `npm run build` + `npm run start` reais numa porta dedicada (3101,
isolada de qualquer outro processo), semeou um hash argon2id **real**
gerado com a mesma biblioteca do projeto (`@node-rs/argon2`) via `INSERT`
autenticado como `service_role` no PostgREST local, e emitiu `curl` diretos
contra os três endpoints (`/api/auth/login`, `/api/auth/logout`,
`/api/atletas` como rota de escrita representativa) — protocolo próprio,
não reaproveitando nenhum script/helper do Backend. Nenhum artefato de teste
manual (`.env.local`, script de seed de hash) permanece no repositório —
removido ao final desta validação (`.env.local` já coberto por
`.gitignore`, mesmo padrão usado pelo próprio Backend).

### 5.1 Verificação de comandos (independente do relato do Backend)

| Comando | Resultado obtido pelo QA | Bate com o relato do Backend? |
|---|---|---|
| `npm test -- --run` | ✅ **31 arquivos, 151 testes, 151 passando, 0 falha** | Sim |
| `npm run test:integration` (Supabase local real, resetado do zero) | ✅ **3 arquivos, 84 testes, 84 passando** (72 de BE-02 + 6 de BE-03 + **5 de BE-04**, incluindo `auth.integration.test.ts`) | Sim |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run build` | ✅ `Compiled successfully`, `/api/auth/login`/`/api/auth/logout` gerados como rotas dinâmicas, `Middleware 27.4 kB` | Sim |

### 5.2 Verificação item a item do critério de aceite (reprodução `curl` própria, servidor real na porta 3101, Supabase local real)

**(a) Login com senha correta emite cookie httpOnly/Secure/SameSite=strict, TTL 8-12h** — ✅ confirmado byte a byte:

```
HTTP/1.1 200 OK
set-cookie: sessao_interna=eyJleHAi...; Path=/; Expires=Fri, 04 Sep 2026 00:32:10 GMT;
            Max-Age=36000; HttpOnly; SameSite=strict
```

`Max-Age=36000` = 10h, dentro da faixa 8-12h exigida. `Secure` não aparece
porque a requisição de teste foi feita sobre `http://localhost` (decisão de
detalhe documentada e testada em `session-cookie.ts` — `Secure` reflete o
protocolo real da requisição; em produção, atrás de HTTPS da Vercel, é
sempre `true`) — mesmo comportamento já coberto pela suíte automatizada, não
uma lacuna nova encontrada pelo QA.

**(b) 5 tentativas erradas em 15 min bloqueiam com backoff** — ✅ confirmado:
5 tentativas com senha errada do mesmo IP retornaram `401`/`{"error":"Senha
incorreta."}`; a 6ª tentativa do mesmo IP, **mesmo com a senha correta**,
também retornou `401` sem cookie (`set-cookie` ausente). Leitura de
`rate-limit.ts` confirma a curva de backoff exponencial (base 30s, dobra por
tentativa falha adicional, teto de 15min) — os valores 5/15min do critério
literal são exatos; a curva de backoff em si não é especificada por nenhum
documento de origem (decisão de detalhe do Backend, dentro de sua
autoridade, documentada no próprio código).

**(c) Mensagem de erro idêntica em ambos os casos (RF-07.3)** — ✅ confirmado
byte a byte: `diff` entre o corpo da 5ª tentativa (senha errada, ainda não
bloqueado) e o corpo da 6ª tentativa (bloqueado por rate limit) retornou
**zero diferenças** — `{"error":"Senha incorreta."}` nos dois casos, mesmo
status `401`, nenhum campo adicional (ex.: `retryAfter`) que permita
distinguir os dois motivos.

**(d) Toda rota de escrita retorna 401 sem sessão válida** — ✅ confirmado:
`POST /api/atletas` (rota de escrita representativa, ainda não implementada
como serviço de negócio — `BE-06` não iniciada — mas já coberta pelo
`matcher: ["/api/:path*"]` do middleware) sem cookie retornou `401
{"error":"Sessão inválida ou expirada."}`, antes de qualquer tentativa de
acesso à camada de dados (o handler de `/api/atletas` nem existe ainda —
o 401 vem do middleware, na camada anterior). `logout` confirmado
idempotente e efetivo: `Set-Cookie: sessao_interna=; Max-Age=0; HttpOnly;
SameSite=strict`.

**Veredito dos 4 itens do critério de aceite, como escrito**: **todos
satisfeitos**, reproduzido de ponta a ponta pelo QA contra um servidor real
e um Supabase local real — não apenas conferido pela suíte automatizada do
Backend (que também passou, 5/5, na execução do próprio QA).

### 5.3 `security-requirement-validation` (módulo de maior criticidade de segurança do projeto)

Verificação direta de cada requisito de segurança de arquitetura do
`SDD.md`/`ADR-004`/`TASK.md` Seção 1.3, um a um, não apenas do texto restrito
do critério de aceite de BE-04:

- **Hash argon2id, nunca texto puro** — ✅ confirmado por leitura de
  `password.ts` (`@node-rs/argon2`, `algorithm: 2` = Argon2id, fixado
  explicitamente, não por default implícito da lib) e pela migration
  (`hash_senha text not null`, comentário explícito proibindo texto puro).
  Hash real gerado pelo próprio QA nesta validação (`$argon2id$v=19$m=19456,
  t=2,p=1$...`) confirma os parâmetros na prática: `m=19456` (19 MiB),
  `t=2`, `p=1` — exatamente o piso mínimo recomendado pela OWASP para
  Argon2id, não um valor fraco.
- **Comparação em tempo constante do hash de senha** — ✅ confirmado: `verify()`
  da própria biblioteca `@node-rs/argon2` faz a comparação internamente
  (padrão de qualquer lib madura de hash de senha); nenhum `===`/
  `Buffer.compare` manual sobre o hash em nenhum ponto do código.
- **Comparação em tempo constante da assinatura de sessão** — ✅ confirmado:
  `session-token.ts` (`verifySessionToken`) acumula XOR byte a byte sem
  `break`/curto-circuito antecipado (`diff |= expected[i] ^ provided[i]`,
  loop completo sempre), porque a Web Crypto API (exigida para rodar em Edge
  Runtime no middleware) não expõe `crypto.timingSafeEqual` do
  `node:crypto` — implementação manual correta, verificada linha a linha.
- **Sem senha configurada não vaza timing** — ✅ confirmado (achado positivo,
  além do texto literal do critério): `verifyPasswordOrDummy` compara contra
  um hash "descartável" gerado uma vez por instância de servidor quando
  `app.auth_interno` não tem nenhuma linha, para que o tempo de resposta de
  "sistema sem senha configurada" seja indistinguível de "senha incorreta
  normal" — mesmo espírito de RF-07.3 aplicado por analogia pelo próprio
  Backend, sem ter sido pedido explicitamente. Evidência de que a equipe já
  pensa em timing side-channel como categoria de risco neste módulo,
  relevante para a avaliação do próximo item.
- **Rate limiting em tabela Postgres própria, nunca serviço externo** — ✅
  confirmado: `app.tentativa_login`, sem nenhuma dependência de Redis/fila
  externa (RNF-04). RLS deny-by-default + só `service_role`, confirmado
  empiricamente pelo QA (`curl` direto ao PostgREST local como `anon` contra
  `auth_interno`/`tentativa_login` → `42501 permission denied` nas duas, sem
  precisar de nenhuma policy adicional).
- **`DELETE` bloqueado em `auth_interno` mesmo fora de RLS** — ✅ confirmado
  empiricamente pelo QA, na condição mais rigorosa (superusuário Postgres via
  `psql`, não só `service_role`): `DELETE FROM app.auth_interno` retornou o
  erro exato da trigger (`trg_auth_interno_no_delete`) — mesma família de
  reforço estrutural já usada em `atleta`/`lancamento_pontos` (BE-02),
  aplicada corretamente aqui também.
- **TTL de sessão 8-12h, sem refresh token de longa duração** — ✅ confirmado:
  único token opaco assinado HMAC-SHA256, payload contém exclusivamente
  `exp` (nenhuma claim de identidade, RN-12); nenhum mecanismo de renovação
  automática/refresh em nenhum ponto do código — sessão expira e exige novo
  login, exatamente como o `ADR-004` exige.
- **Nenhum segredo commitado** — ✅ confirmado: `.env.example` só com
  placeholders para `SUPABASE_SERVICE_ROLE_KEY`/`SESSION_COOKIE_SECRET`;
  `git status` não mostra `.env.local` nem qualquer arquivo de segredo
  versionado; `SESSION_COOKIE_SECRET` ausente faz o módulo lançar erro
  explícito (`session-token.ts`) em vez de operar com um segredo vazio/
  previsível.

### 5.4 Achado de segurança sinalizado pelo Backend — avaliação do QA (timing side-channel entre "senha incorreta" e "bloqueado por rate limit")

O Backend relatou, no próprio código (`login/route.ts`,
`genericAuthFailureResponse`) e na nota de status de BE-04, que a resposta
de erro é idêntica byte a byte entre os dois casos, mas o **tempo de
execução não é artificialmente igualado**: o caminho bloqueado por rate
limit retorna antes de chamar `getHashSenhaVigente`/`verifyPasswordOrDummy`
(pula o `argon2id.verify`, que é deliberadamente lento), enquanto o caminho
de "senha incorreta normal" sempre executa a verificação completa.

**Reprodução empírica própria do QA** (servidor real, Supabase local real,
não simulação): medido o tempo de resposta HTTP de ponta a ponta (`curl`,
`time_total`) para os dois caminhos, com o rate limit já armado
previamente para os IPs do caminho "bloqueado" (5 tentativas falhas antes,
não cronometradas):

| Caminho | Amostras | Faixa observada | Mediana aproximada |
|---|---|---|---|
| Senha incorreta (executa `argon2id.verify`) | 20 requisições, IPs novos | 172–359 ms | ~196 ms |
| Bloqueado por rate limit (pula `argon2id.verify`) | 15 requisições, IPs já no limite | 133–177 ms | ~144 ms |

Diferença consistente de **~50 ms** entre os dois caminhos, mensurável via
`curl` simples (sem instrumentação estatística sofisticada, sem múltiplas
repetições por amostra para reduzir ruído de rede/SO) — confirma, na
prática e não só em tese, que a alegação do Backend é real: um observador
capaz de medir tempo de resposta (mesmo grosseiramente, como fez o QA aqui)
consegue distinguir "senha incorreta, ainda não bloqueado" de "bloqueado
por rate limit" **sem depender do conteúdo da resposta**, que é
idêntico. Na prática, isso permite a um atacante inferir quando o rate
limit está ativo para um IP — um oráculo de estado, não uma forma de
recuperar a senha em si (o `argon2id.verify` em si já é resistente a
timing attack de comparação de hash, conforme 5.3).

**Avaliação do QA sobre bloquear ou não a tarefa por este achado**:

1. **Texto literal do critério de aceite de BE-04** (citado no topo desta
   seção) exige mensagem de erro idêntica — não menciona tempo de resposta.
   `RF-07.3` (`PRD-TECNICO.md`) também é redigido em termos de **conteúdo**
   ("mensagem genérica... sem detalhar o motivo da falha"), não de tempo.
   `RNF-03` exige "proteção básica contra tentativas de força bruta (ex.:
   limite de tentativas/tempo de bloqueio)" — já satisfeito pelo rate
   limiting em si — sem qualquer menção a timing side-channel. **QA não
   reinterpreta o critério para incluir um requisito de tempo que não está
   escrito em nenhum dos três documentos de origem** (`TASK.md`/
   `PRD-TECNICO.md` RF-07.3/RNF-03) — isso seria exatamente o tipo de
   reinterpretação silenciosa que o guardrail deste agente proíbe.
2. **O próprio `SDD.md` (Seção "Riscos", linha da tabela sobre `ADR-004`)
   já antecipa esta exata categoria de lacuna, em nível de arquitetura,
   antes mesmo de `BE-04` existir**: *"Implementação custom de autenticação
   (ADR-004) carrega toda a responsabilidade de segurança sem a robustez
   'pronta' de um provedor de identidade especializado... hardening tático
   (**timing-safe compare**, revisão de biblioteca de hash) fica a cargo do
   DevSecOps antes de produção."* — isto é, o documento de arquitetura já
   nomeia "timing-safe compare" como item de hardening tático, com dono
   (`DevSecOps`) e prazo (`antes de produção`) explícitos, **antes** da
   decomposição em tarefas. `TASK.md` Seção 5, Risco #7, reitera o mesmo
   ponto com a mesma atribuição de dono/prazo. Ou seja: esta não é uma
   lacuna nova descoberta pelo QA — é um risco estrutural já identificado e
   roteado para outro agente/outra fase do pipeline, não para o critério de
   aceite desta tarefa específica.
3. **Severidade**: classificada como **Média** (não Baixa, porque é uma
   fraqueza de segurança real e reproduzida empiricamente — um oráculo de
   estado de rate limiting, não um problema cosmético; não Alta/Crítica,
   porque (a) não compromete a senha em si, (b) não permite bypass de
   autenticação, (c) o próprio conteúdo da resposta continua sem vazar
   informação, RF-07.3 continua 100% satisfeito, e (d) o vetor de exploração
   prática é estreito para o perfil de risco deste sistema — grupo amador,
   sem dado financeiro, RNF-04 já aceita risco residual proporcional ao
   contexto).
4. **Conclusão**: não bloqueia `BE-04` — nenhuma ação de reprovação em
   `TASK.md`. Registrado como débito de severidade média, com prazo já
   definido pelos próprios `SDD.md`/`TASK.md` ("antes de produção"), dono
   **DevSecOps** (não Backend — não é falha de execução da tarefa, é
   hardening de camada de segurança já delegado a outro agente/fase). QA
   reforça este achado explicitamente aqui, com evidência empírica de
   `curl` timing (Seção 5.4 acima), para que o `SECURITY-REVIEW.md` do
   DevSecOps tenha esse dado concreto ao decidir a mitigação (ex.: aplicar
   `verifyPasswordOrDummy` também no caminho de rate-limit-bloqueado, ou
   adicionar um atraso artificial calibrado ao tempo médio do caminho de
   verificação real). **Não é escalonamento ao Tech Lead** (não é padrão
   recorrente de bug de execução) nem nova entrada em `BLOCKERS.md` (o
   risco já está registrado, com dono e prazo, em `SDD.md` e `TASK.md`
   Seção 5 Risco #7 — uma nova entrada duplicaria rastreamento já
   existente); é reforço/evidência para o consumidor natural deste achado
   (`devsecops`, que lê `QA-REPORT.md` como um dos seus inputs).

---

**BUG-QA-BE04-01 — Severidade: Média (débito de segurança, prazo: antes de
produção — já definido em `SDD.md`/`TASK.md` Risco #7, não um prazo novo do
QA)**
- **Componente**: `app/api/auth/login/route.ts`
  (`genericAuthFailureResponse`/fluxo de `POST`), `src/modules/autenticacao/rate-limit.ts`.
- **Passos para reproduzir**: (1) registrar 5 tentativas de login com senha
  errada para um IP; (2) medir o tempo de resposta de uma 6ª tentativa
  (bloqueada por rate limit) para esse IP; (3) medir o tempo de resposta de
  uma tentativa de senha errada para um IP **novo**, ainda não bloqueado;
  (4) comparar.
- **Resultado esperado**: se o objetivo de segurança é que os dois casos
  sejam indistinguíveis por qualquer canal (não só pelo conteúdo da
  resposta), os tempos deveriam ser estatisticamente equivalentes.
- **Resultado obtido**: caminho "bloqueado" consistentemente mais rápido
  (~144 ms mediana, 15 amostras) que o caminho "senha incorreta, verificação
  real executada" (~196 ms mediana, 20 amostras) — diferença de ~50 ms,
  mensurável por `curl` simples, sem instrumentação estatística avançada.
  Causa raiz confirmada no código: o caminho bloqueado retorna antes de
  chamar `verifyPasswordOrDummy` (pula deliberadamente o `argon2id.verify`,
  que é lento por desenho).
- **Por que não bloqueia BE-04**: ver itens 1–3 da avaliação acima — o
  critério de aceite literal (conteúdo da mensagem) está 100% satisfeito;
  timing side-channel não é mencionado em `TASK.md`/`PRD-TECNICO.md` RF-07.3/
  RNF-03; e o próprio `SDD.md`/`TASK.md` já atribuem este hardening
  especificamente ao DevSecOps, antes de produção, como risco estrutural
  conhecido desde a fase de arquitetura.
- **Ação**: nenhuma ação exigida do Backend nesta tarefa. Recomendação
  registrada para o DevSecOps avaliar no `SECURITY-REVIEW.md`: equalizar o
  tempo do caminho "bloqueado" ao caminho de verificação real (ex.: chamar
  `verifyPasswordOrDummy` também quando `rateLimit.bloqueado === true`, antes
  de retornar a resposta genérica) ou aplicar um atraso artificial
  calibrado. Não configura padrão recorrente nem lacuna de decomposição de
  tarefas — é um risco único, já nomeado e roteado corretamente desde a
  arquitetura; não escalado a `tech-lead` nem novo registro em
  `BLOCKERS.md`.

---

### 5.5 Non-functional validation adicional

- **Cenário de erro (corpo malformado)**: `POST /api/auth/login` sem o
  campo `senha` retorna `400` (não `401`) — classe de erro corretamente
  diferente de RF-07.3 (que trata só de "senha incorreta" vs. "bloqueado"),
  confirmado pela suíte de integração e consistente com a leitura do código.
- **Cenário de erro (token de sessão malformado/adulterado)**: `middleware.ts`
  nunca lança exceção/500 para token corrompido — sempre `401`, confirmado
  por `middleware.test.ts` (cookie adulterado, sessão expirada) e pela
  leitura de `verifySessionToken` (todos os `try/catch` retornam `false`,
  nunca propagam erro).
- **Performance básica**: tempo de resposta do login (~150-200ms com
  Supabase local, incluindo hash argon2id real) é aceitável para o perfil
  RNF-04 deste projeto (grupo amador, sem exigência de SLA formal);
  argon2id com os parâmetros observados (19 MiB/t=2) não introduz latência
  perceptível para um usuário humano fazendo login.
- **Usabilidade**: não aplicável ainda em UI própria — `FE-01` (T01 Login,
  consumidora deste endpoint) consta como "Não iniciada" no `TASK.md`; a
  validação de usabilidade do fluxo de login fica para quando `FE-01` for
  concluída.
- **Integração cruzada Backend↔Frontend**: `API-CONTRACT.yaml` já documenta
  `POST /api/auth/login`/`POST /api/auth/logout` (publicado desde a sessão
  anterior do Backend); teste de integração de ponta a ponta com código
  Frontend real fica para a validação de `FE-01`/`FE-12`, ainda não
  iniciadas.

### 5.6 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite da tarefa foi testado e está passando —
      reproduzido de ponta a ponta pelo QA (servidor real, Supabase local
      real, `curl` próprio), não apenas conferido pela suíte automatizada
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bug de severidade média registrado como débito, com dono (DevSecOps)
      e prazo (antes de produção, já definido em `SDD.md`/`TASK.md` Risco
      #7 — ver **BUG-QA-BE04-01**)
- [x] Testes de integração cruzada — `API-CONTRACT.yaml` já documenta os
      dois endpoints; teste de ponta a ponta com Frontend real fica para
      `FE-01`/`FE-12` (ainda "Não iniciada")
- [x] Requisito não funcional relevante validado — `security-requirement-
      validation` completo (Seção 5.3), cenários de erro (Seção 5.5),
      performance básica (Seção 5.5)

### 5.7 Veredito

## **BE-04: Aprovado com ressalvas**

Os 4 itens do critério de aceite, lidos literalmente, estão satisfeitos —
verificado por **reprodução real de ponta a ponta**, não apenas leitura do
código ou aceite do relato do Backend: o QA subiu um Supabase local do zero,
rodou a suíte completa (151 testes unitários + 84 de integração, todos
verdes, reproduzido do zero pelo próprio QA), fez `build`/`start` reais numa
porta dedicada, semeou um hash argon2id real e emitiu `curl` diretos contra
os três endpoints relevantes — confirmando byte a byte o cookie
(`HttpOnly`/`SameSite=strict`/`Max-Age=36000`), o bloqueio idêntico da 6ª
tentativa, e o `401` genérico do middleware numa rota de escrita sem sessão.
`security-requirement-validation` dedicado (Seção 5.3) confirmou, um a um,
todos os requisitos de segurança de arquitetura do `SDD.md`/`ADR-004`:
argon2id com parâmetros no piso recomendado pela OWASP, comparação em tempo
constante (hash de senha via biblioteca, assinatura de sessão via loop XOR
manual — necessário porque o middleware roda em Edge Runtime), rate
limiting em tabela Postgres própria (nunca serviço externo), triggers de
bloqueio de `DELETE` reproduzidos empiricamente até em condição de
superusuário, TTL de sessão sem refresh token de longa duração, e nenhum
segredo commitado. `lint`/`typecheck`/`build` seguem limpos.

**Única ressalva, não bloqueante**: **BUG-QA-BE04-01** — o Backend já havia
sinalizado, no próprio código, que a resposta de erro é idêntica byte a byte
entre "senha incorreta" e "bloqueado por rate limit", mas o tempo de
execução não é artificialmente igualado entre os dois caminhos. O QA
**reproduziu empiricamente essa alegação** (diferença consistente de ~50ms
entre os dois caminhos, medida por `curl` direto contra o servidor real) e
avaliou que **não justifica reprovação**: o critério de aceite literal de
`BE-04` e `RF-07.3`/`RNF-03` (`PRD-TECNICO.md`) tratam exclusivamente do
**conteúdo** da resposta, nunca do tempo; e o próprio `SDD.md` (tabela de
riscos do `ADR-004`) e `TASK.md` (Seção 5, Risco #7) já atribuem esse
hardening específico (“timing-safe compare”) ao **DevSecOps**, com prazo
**antes de produção**, desde a fase de arquitetura — antes mesmo de `BE-04`
ser decomposta. Registrado como débito de severidade **Média**, dono
DevSecOps, prazo já definido pelos documentos de origem (não um prazo novo
criado pelo QA). Nenhuma ação de reprovação necessária em `TASK.md`; status
permanece `Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: quarto agente
de implementação validado nesta rodada (após FE-00, BE-02, BE-03); nenhum
padrão recorrente de bug de execução foi identificado — o achado desta
tarefa (timing side-channel) é de natureza estrutural/arquitetural, já
nomeado e roteado pelo próprio `SDD.md`/`TASK.md` antes da implementação,
não uma falha de execução do Backend. Guardrail de "só escala por padrão
recorrente" seguido — nenhuma entrada nova em `BLOCKERS.md` (o risco já
está rastreado, com dono e prazo, em `SDD.md`/`TASK.md` Seção 5 Risco #7).

---

## 6. FE-01 — T01 Login (senha única)

**Critério de aceite (`TASK.md`, Seção 3.2, texto exato)**: "Campo único de
senha com toggle acessível; erro genérico anunciado via
`aria-live="assertive"`; redireciona à última tela interna ou T05 por padrão
após sucesso; link de retorno ao ranking sempre visível."

**Skills aplicadas**: `acceptance-criteria-validation`,
`accessibility-implementation-check` (tela de autenticação, WCAG/ARIA
crítico), `non-functional-validation` (segurança do mecanismo de redirect),
`bug-documentation`.

**Método**: validação independente, com reprodução real, não apenas
conferência do relato do Frontend. `src/features/login/*` e
`app/login/page.tsx` foram lidos linha a linha (não só os testes). O QA
rodou a suíte completa do projeto, `lint`/`typecheck`/`format:check`/`build`
do zero (removendo `.next`/`tsconfig.tsbuildinfo` stale antes, para eliminar
falso negativo de cache), subiu o servidor de produção real
(`next build && next start`) e emitiu requisições `curl` próprias contra
`/login` e `POST /api/auth/login`. Adicionalmente, o QA escreveu e executou
um teste temporário próprio (removido após a execução, nunca commitado)
importando a função real `getSafeRedirectTarget` de `redirectTarget.ts` para
reproduzir empiricamente a suspeita de bypass de open redirect sinalizada
para investigação, e confirmou o comportamento resultante lendo o código-fonte
do próprio `next/navigation` (`node_modules/next/dist/client/components/
app-router.js`) instalado no projeto.

### 6.1 Verificação de comandos (independente do relato do Frontend)

| Comando | Resultado obtido pelo QA | Bate com o relato do Frontend? |
|---|---|---|
| `npm test` (`vitest run`) | ✅ **35 arquivos, 179 testes, 179 passando, 0 falha** (inclui os 23 novos desta tarefa: `loginApi.test.ts` 7, `redirectTarget.test.ts` 6, `LoginForm.test.tsx` 11, 0 violação `jest-axe`) | Sim |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run format:check` | ✅ limpo, exit code 0 (nenhuma pendência remanescente de `BUG-QA-FE00-01`/`BUG-QA-BE01-02` — os 2 arquivos de propriedade do Backend citados na nota do Frontend, `scripts/redefinir-senha-interna.ts` e o teste de integração de `redefinir-senha`, também vieram formatados; nenhum arquivo do Frontend pendente) | Sim |
| `npm run build` (após remover `.next`/`tsconfig.tsbuildinfo` — o cache local estava corrompido de uma sessão anterior, não é responsabilidade de FE-01) | ✅ `Compiled successfully`, `/login` gerado como rota estática (`○`) de 102 kB First Load JS, `/api/auth/login`/`/api/auth/logout` como `ƒ` (dinâmica, esperado para Route Handler) | Sim |
| `next start` real + `curl -s http://localhost:3701/login` | ✅ HTTP 200 | Confirma que a rota serve |
| `curl -s -X POST http://localhost:3701/api/auth/login -d '{}'` | ✅ `400` / `{"error":"Requisição inválida."}` — byte a byte igual ao relatado | Sim |

### 6.2 Verificação item a item do critério de aceite

**(a) Campo único de senha com toggle acessível** — ✅ confirmado por leitura
de `LoginForm.tsx` (único campo, `PasswordInput`, sem campo de usuário/e-mail,
consistente com RN-12/ADR-004) e de `PasswordInput.tsx` (design system,
FE-00): toggle é um `<button type="button">` real com `aria-pressed`
refletindo o estado e rótulo textual (`aria-label` + `<span className="sr-only">`)
"Mostrar senha"/"Ocultar senha" — nunca comunicado só pelo ícone. Confirmado
também pelos 179 testes reproduzidos pelo QA (`LoginForm.test.tsx`, teste de
toggle) e pelo wireframe da Seção 2/ponto 5.2 do `UX-SPEC.md` ("toggle...com
`aria-pressed` e rótulo textual, não só ícone de olho").

**(b) Erro genérico anunciado via `aria-live="assertive"`** — ✅ confirmado,
com a mesma leitura já aceita pelo QA em `FE-00`: `AlertBanner
variant="danger"` usa `role="alert"` (`AlertBanner.tsx`, linha 21), que
carrega semântica implícita `aria-live="assertive"` por especificação WAI-ARIA
(role `alert` = "implicit aria-live value of assertive") — não é um atributo
`aria-live` explícito, mas é tecnicamente equivalente, documentado no próprio
código, não é lacuna silenciosa. A mensagem exibida é sempre o texto
devolvido pelo servidor (nunca inferida pelo cliente), idêntica para "senha
incorreta" e "bloqueado por rate limiting" (RF-07.3/`GUARDRAILS.md` regra 15)
— confirmado em `loginApi.ts`/`loginApi.test.ts` e no teste dedicado de
`LoginForm.test.tsx` que verifica explicitamente a ausência da palavra
"bloquead[o]" na tela.

**(c) Redireciona à última tela interna ou T05 por padrão após sucesso** —
⚠️ **funcionalmente presente, mas com uma falha de severidade Alta na
proteção contra open redirect que o próprio mecanismo se propôs a
implementar** — ver `BUG-QA-FE01-01` abaixo. O caminho feliz (sem
`?redirect=`, ou com `?redirect=` interno válido) funciona exatamente como
descrito: redireciona para `ROUTES.lancamentoRodada` (`/rodadas/nova`, T05)
por padrão, ou para o caminho interno informado, confirmado por leitura de
`LoginForm.tsx`/`redirectTarget.ts` e pelos testes automatizados
correspondentes, reproduzidos pelo QA. O problema é que o texto do critério
diz "última tela **interna**" — e o mecanismo específico criado para
garantir isso (`getSafeRedirectTarget`) pode ser contornado, fazendo o
usuário ser enviado para um destino **externo** após um login bem-sucedido.

**(d) Link de retorno ao ranking sempre visível** — ✅ confirmado: presente
no estado inicial, de carregamento e de erro (o link nunca é removido do
DOM, `LoginForm.tsx` linha 94-96, fora de qualquer condicional), apontando
para `ROUTES.rankingPublico` (`/`), consistente com RF-07.2 ("o sistema deve
sempre permitir o acesso de consulta ao ranking público... sem exigir
senha") e com o wireframe da Seção 2 do `UX-SPEC.md`.

### 6.3 `accessibility-implementation-check` (tela de autenticação)

- Estrutura semântica correta: único `<main>`, `<h1>` ("Acesso interno"),
  `<form>` com `noValidate` (defesa em profundidade além da validação nativa
  do navegador, TASK.md Seção 1.0).
- Toggle de senha, mensagem de erro e link de retorno: ver 6.2 (a), (b), (d)
  acima.
- Estado de carregamento: botão com `aria-busy="true"` (via prop `loading`
  do `Button` de FE-00, já WCAG-revisado) e campo `disabled` durante o
  envio — usuário de leitor de tela é informado do estado ocupado.
- `focus-visible`, contraste e alvo de toque: `LoginForm.module.css` não
  introduz nenhuma cor nova nem sobrescreve foco — usa só tokens do design
  system (`--color-primary`, `--color-text-muted`, `--spacing-*`,
  `--tap-target-min` no link de retorno), herdando a revisão de contraste/
  foco já feita em `FE-00`. Nenhuma cor usada como único indicador de estado
  (WCAG 1.4.1 — não há indicador de estado nesta tela além do texto de erro).
- `jest-axe`: 0 violação no estado inicial e no estado de erro (reproduzido
  pelo QA, ver 6.1).
- Nenhuma violação de acessibilidade nova encontrada pelo QA nesta tela.

### 6.4 Achados do QA (bugs/débitos)

---

**BUG-QA-FE01-01 — Severidade: Alta (bloqueante — reprova a tarefa)**
- **Componente**: `src/features/login/redirectTarget.ts`
  (`getSafeRedirectTarget`), consumido por `src/features/login/LoginForm.tsx`
  via `router.replace(target)` após login bem-sucedido.
- **Passos para reproduzir**:
  1. Como atacante, montar a URL
     `https://<domínio-real-do-app>/login?redirect=/\evil.example.com`
     (uma única barra invertida logo após a barra inicial, antes do host
     malicioso) e enviá-la à vítima (phishing/link direto) — não é preciso
     nenhuma outra vulnerabilidade (XSS, etc.), é uma URL válida do próprio
     domínio legítimo.
  2. A vítima abre o link, digita a senha real e envia o formulário
     normalmente — o login é bem-sucedido de verdade (sessão emitida
     corretamente, isto **não** é um bypass de autenticação).
  3. `LoginForm.tsx` chama `getSafeRedirectTarget(searchParams.get("redirect"))`
     e depois `router.replace(target)`.
- **Resultado esperado**: `getSafeRedirectTarget` deveria recusar esse valor
  (por não ser um caminho interno seguro) e cair no destino padrão
  (`ROUTES.lancamentoRodada`), como já faz corretamente para
  `https://evil.example.com` e `//evil.example.com` (cobertos pelos testes
  existentes de `redirectTarget.test.ts`).
- **Resultado obtido**: `getSafeRedirectTarget("/\\evil.example.com")` **aceita
  o valor como seguro** e o devolve inalterado — reproduzido pelo QA
  diretamente contra o código real (teste temporário, removido após a
  execução):
  ```
  input: "/\\evil.example.com"
  getSafeRedirectTarget output: "/\\evil.example.com"
  is treated as safe (returned as-is)? true
  ```
  Isso acontece porque a validação atual só verifica
  `startsWith("/") && !startsWith("//")` e `!includes("://")` — uma única
  barra invertida (`\`) não aciona nenhuma das duas checagens, mas o
  `next/navigation` do App Router (`node_modules/next/dist/client/components/
  app-router.js`, função `useNavigate`) resolve o `href` recebido via
  `new URL(addBasePath(href), location.href)` **antes** de decidir se a
  navegação é interna ou externa (`isExternalURL`); por especificação WHATWG
  URL, para esquemas especiais (`http`/`https`) uma barra invertida é
  tratada como equivalente a uma barra normal na fase de parsing — logo
  `new URL("/\\evil.example.com", "https://app-real.example.com")` resolve
  para `"https://evil.example.com/"` (origem diferente), confirmado com o
  parser de URL do próprio Node.js usado pelo runtime do projeto:
  ```
  Next.js router would resolve this href to: https://evil.example.com/
  origin differs from app origin -> true
  ```
  Quando `isExternalURL(url)` retorna `true`, o próprio código do Next.js
  (`app-router.js`, dentro do efeito que trata `pushRef.mpaNavigation`)
  executa uma navegação real de página inteira:
  ```js
  if (pushRef.pendingPush) {
      location1.assign(canonicalUrl);
  } else {
      location1.replace(canonicalUrl);
  }
  ```
  ou seja, `router.replace(target)` chamado por `LoginForm.tsx` após um
  login bem-sucedido **de fato executa `window.location.replace("https://
  evil.example.com/")`** — a vítima autenticada é enviada para fora do
  domínio legítimo, num navegador real, sem nenhuma segunda camada de defesa
  (não há CSP com diretiva de navegação, e `middleware.ts` só atua sobre
  `/api/*`, nunca sobre a navegação client-side do App Router).
- **Por que bloqueia FE-01** (não é reinterpretação do critério, é leitura
  literal): o texto do critério de aceite é "redireciona à **última tela
  interna**... após sucesso" — sob este vetor, o destino não é uma tela
  interna, é um domínio externo controlado por um atacante. O próprio
  Frontend registrou, na nota de status do `TASK.md`, ter "validado contra
  open redirect" — essa validação existe e cobre corretamente dois vetores
  (URL absoluta, `//host`), mas não é completa; a alegação de proteção não se
  confirma para o vetor de barra invertida. Como o critério de aceite exige
  que o redirecionamento seja sempre para uma tela interna, e há um caminho
  reproduzível (sem qualquer outra vulnerabilidade auxiliar) que viola isso
  depois de uma autenticação real e bem-sucedida — numa tela de
  autenticação, a superfície mais sensível do sistema — o QA classifica como
  severidade **Alta**: não expõe a senha nem contorna a autenticação em si,
  mas permite phishing/redirecionamento pós-login a partir de um link do
  próprio domínio confiável do produto, um padrão de ataque conhecido e
  documentado (open redirect). Não é severidade Crítica porque exige que a
  vítima clique num link manipulado (não é um bypass silencioso/automático),
  e não compromete a confidencialidade da sessão ou da senha em si.
- **Ação recomendada (dono: Frontend)**: reescrever a validação de
  `getSafeRedirectTarget` para não depender de checagens de prefixo
  ad-hoc (`startsWith`/`includes`). Abordagem recomendada: resolver o valor
  candidato com `new URL(rawParam, "http://origem-interna.invalid")` (a
  mesma técnica de resolução usada pelo próprio Next.js) e aceitar o
  resultado **somente se** `url.origin === "http://origem-interna.invalid"`
  **e** `rawParam` não contiver `\`/`%5c`/`%5C` (o navegador normaliza
  antes do JavaScript enxergar, mas normalizar explicitamente evita
  depender de uma futura mudança de parsing) — ou, alternativa mais simples
  e igualmente robusta, usar uma lista de permissão de rotas internas
  conhecidas (`ROUTES`) em vez de aceitar qualquer string com prefixo `/`.
  Adicionar caso de teste para `"/\\evil.example.com"` (e variantes como
  `"/\\/evil.example.com"`, `"/%5cevil.example.com"`) em
  `redirectTarget.test.ts` antes de remarcar a tarefa como `Concluída`.
  `TASK.md` já revertido para `Em andamento` com esta mesma nota.
- **Nota para o DevSecOps (não é escalonamento ao Tech Lead — achado
  isolado, não padrão recorrente)**: diferente do `BUG-QA-BE04-01` (risco já
  nomeado no `SDD.md`/`TASK.md` antes da implementação), este é um achado
  **novo**, de execução, dentro de uma tentativa de mitigação que o próprio
  Frontend implementou por iniciativa própria (o critério de aceite de FE-01
  não pedia explicitamente proteção contra open redirect). Fica registrado
  aqui porque (1) é diretamente relevante à superfície de autenticação, e
  (2) o mesmo mecanismo (`redirectTarget.ts`) está desenhado para ser
  reaproveitado por `FE-12` (sessão expirada, retorno à tela de origem) —
  vale a pena o DevSecOps considerar incluir "validação de destino de
  redirect resolve para a mesma origem, testado com vetores de barra
  invertida/codificação" como item de checklist recorrente em
  `SECURITY-REVIEW.md` para qualquer feature futura que aceite um destino de
  navegação vindo de querystring/input do usuário (não só `FE-12`).

---

### 6.5 Non-functional validation

- **Cenário de erro (rede/servidor)**: `loginApi.ts` nunca deixa uma
  exceção de `fetch` sem tratamento (`try/catch` em torno do `fetch`) nem
  reaproveita a mensagem de "senha incorreta" para uma classe de erro
  diferente — confirmado em código e pelos testes de `loginApi.test.ts`
  (400, falha de rede, corpo malformado), reproduzidos pelo QA.
- **Cenário de erro (corpo vazio, servidor real)**: reproduzido empiricamente
  pelo QA contra um servidor real (`next start`), ver 6.1 — `400`/
  `{"error":"Requisição inválida."}`, byte a byte conforme
  `API-CONTRACT.yaml`.
- **Segurança (redirect)**: ver 6.2(c)/6.4 — único ponto de atenção desta
  tarefa, já registrado como `BUG-QA-FE01-01`.
- **Performance básica**: rota `/login` estática, 102 kB First Load JS,
  hidratação praticamente instantânea (sem fetch no carregamento inicial,
  só no submit) — sem sinal de regressão perceptível para um formulário de
  um único campo.
- **Usabilidade (`UX-SPEC.md`)**: layout/wireframe da Seção 2 (T01) seguido
  literalmente (bloco de marca, campo único, botão, mensagem de erro, link
  de retorno, nesta ordem); ausência do link "esqueci minha senha" já
  documentada como decisão pendente de `BE-05`/Tech Lead na própria Seção
  7.3 do `UX-SPEC.md`, não uma lacuna desta tarefa.

### 6.6 Checklist de "Pronto" (Definition of Done de QA)

- [x] Itens (a), (b) e (d) do critério de aceite testados e passando
- [ ] Item (c) do critério de aceite **não** está totalmente satisfeito —
      `BUG-QA-FE01-01` (severidade Alta, em aberto)
- [ ] Bug de severidade Alta em aberto (`BUG-QA-FE01-01`) — **reprova a
      tarefa**, conforme guardrail de QA
- [x] Testes de integração cruzada — `POST /api/auth/login` consumido
      exatamente como documentado em `API-CONTRACT.yaml`/validado por
      `BE-04`; reconfirmado nesta rodada contra servidor real
- [x] Requisito não funcional relevante validado (cenário de erro,
      performance básica, usabilidade, segurança — sendo a security a
      origem do único bloqueio)

### 6.7 Veredito

## **FE-01: Reprovado**

Três dos quatro itens do critério de aceite ("campo único de senha com
toggle acessível", "erro genérico anunciado via `aria-live="assertive"`" —
via semântica implícita de `role="alert"`, mesma leitura já aceita em
`FE-00` — e "link de retorno ao ranking sempre visível") estão satisfeitos e
foram verificados de forma independente pelo QA: suíte completa (179 testes,
0 falha, incluindo 0 violação `jest-axe`), `lint`/`typecheck`/`format:check`/
`build` limpos, e reprodução empírica contra um servidor real
(`next start` + `curl`) confirmando o par `400`/corpo de erro documentado em
`API-CONTRACT.yaml`.

O quarto item ("redireciona à última tela interna... após sucesso") **não
está totalmente satisfeito**: `BUG-QA-FE01-01` (severidade **Alta**) — a
função `getSafeRedirectTarget` (`src/features/login/redirectTarget.ts`),
criada pelo próprio Frontend especificamente para garantir que o
redirecionamento pós-login nunca saia do domínio interno, tem um bypass
reproduzível via um único caractere de barra invertida no valor de
`?redirect=` (ex.: `/\evil.example.com`), que o `next/navigation` do App
Router resolve para uma origem externa e efetivamente navega a página
inteira para lá via `window.location.replace`, verificado tanto por
reprodução direta contra o código real quanto por leitura do código-fonte
do `next` instalado no projeto. Como o critério de aceite exige
explicitamente que o destino seja uma tela **interna**, e o próprio
mecanismo de proteção documentado pelo Frontend (nota do `TASK.md`:
"validada contra open redirect") não cobre este vetor, **a tarefa é
reprovada** — não por reinterpretação do critério, mas porque a garantia
literal ("interna") falha sob um caminho reproduzível e de baixo esforço de
exploração, numa tela de autenticação.

`TASK.md` revertido de `Concluída` para `Em andamento` para `FE-01`, com
nota apontando para esta entrada. Retorna ao **Frontend** (não ao Tech
Lead) — ver ação recomendada em `BUG-QA-FE01-01` acima. Os demais três
itens do critério, já validados, não precisam ser refeitos; apenas a
validação de `redirectTarget.ts` precisa de correção e de um novo caso de
teste antes de remarcar a tarefa como `Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento ao Tech Lead)**:
quinto agente de implementação validado nesta rodada (após FE-00, BE-02,
BE-03, BE-04), primeiro achado de severidade Alta/bloqueante desta rodada.
É um achado isolado (não há ocorrência anterior do mesmo tipo em nenhuma
tarefa já validada) — guardrail de "só escala por padrão recorrente"
seguido; nenhuma entrada em `BLOCKERS.md` (que é reservado a escalonamento
ao Tech Lead por padrão recorrente, não a bugs individuais). A nota de
segurança para o DevSecOps acima é informativa/preventiva para `FE-12`, não
um escalonamento formal.

---

## 7. BE-05 — Procedimento de redefinição da senha única compartilhada

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Runbook
documentado (passo a passo + comando/script) permite trocar a senha sem
depender de fluxo de e-mail; testado manualmente uma vez em ambiente de
homologação."

**Skills aplicadas**: `acceptance-criteria-validation`,
`security-requirement-validation` (senha nunca exposta em texto claro em
nenhum canal — histórico de shell, `ps`, log de aplicação), `bug-documentation`.

**Método**: validação independente e **reprodução real de ponta a ponta**,
mesmo rigor de BE-02/03/04 — não apenas leitura do código ou aceite do
relato do Backend. O QA (a) leu linha a linha
`scripts/redefinir-senha-interna.ts`, `scripts/README.md`,
`src/modules/autenticacao/redefinir-senha.ts`,
`src/modules/autenticacao/__tests__/redefinir-senha.test.ts` e
`redefinir-senha.integration.test.ts`; (b) rodou a suíte de integração real
contra o Supabase local já em execução neste ambiente (não precisou subir
do zero — container já `healthy`), três vezes seguidas; (c) reproduziu
**ativamente** a race condition relatada pelo Backend, revertendo
temporariamente `fileParallelism` para `true` e rodando a suíte 5 vezes
(3/5 falharam, confirmando a causa raiz alegada), depois restaurou
`fileParallelism: false` e confirmou 3 execuções limpas adicionais; (d)
executou o próprio runbook manualmente contra o Supabase local — `npm run
senha:redefinir` via pipe não-TTY (fallback visível documentado no
próprio script), depois `npm run build && npm run start` numa porta
dedicada (3102, isolada) e `curl` diretos em `POST /api/auth/login` para
confirmar que a senha antiga passa a falhar e a nova passa a funcionar,
exatamente como o runbook em `scripts/README.md` prescreve como validação
de referência; (e) restaurou o estado de `app.auth_interno` para uma senha
neutra ao final (mesmo cuidado documentado no `afterAll` do próprio teste
de integração do Backend), sem deixar `.env.local` nem qualquer artefato de
teste manual no repositório.

### 6.1 Verificação item a item do critério de aceite

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Runbook documentado (passo a passo + comando/script) | Leitura de `scripts/README.md` linha a linha | ✅ Pré-requisitos, procedimento numerado (1-6), o que o procedimento NÃO faz, e validação manual de referência — todos presentes e tecnicamente corretos |
| Permite trocar a senha sem depender de fluxo de e-mail | Leitura do runbook + do código (`redefinirSenhaInterna`/CLI) — nenhum envio de e-mail/notificação em nenhum ponto | ✅ Fluxo é 100% local/CLI + banco, RN-12 respeitado (sem "para quem" notificar) |
| Testado manualmente uma vez em ambiente de homologação | Reproduzido pelo próprio QA (não apenas aceito do relato do Backend) contra Supabase local — mesmo ambiente-equivalente já usado por BE-02/03/04, dado que não há homologação real provisionada (`infra/README.md` Seção 2) | ✅ `npm run senha:redefinir` executado pelo QA via pipe, senha antiga (`senha-errada-qualquer`) rejeitada com `401`/`{"error":"Senha incorreta."}`, senha nova aceita com `200` e `Set-Cookie: sessao_interna=...; HttpOnly; SameSite=strict; Max-Age=36000` — reprodução independente do exato cenário que o runbook pede para validar |

**Veredito dos 2 itens do critério de aceite, como escrito**: **ambos
satisfeitos**, reproduzido de ponta a ponta pelo QA, não apenas conferido
por leitura ou aceite do relato do Backend.

### 6.2 Verificação de comandos (independente do relato do Backend)

| Comando | Resultado obtido pelo QA | Bate com o relato do Backend? |
|---|---|---|
| `npm test -- --run` | ✅ **35 arquivos, 179 testes, 179 passando, 0 falha** | Sim |
| `npm run test:integration` (Supabase local já em execução, 3 execuções seguidas) | ✅ **4 arquivos, 88 testes, 88 passando** em todas as 3 execuções (72 BE-02 + 6 BE-03 + 5 BE-04 + 4 BE-05, mais 1 caso adicional de `public-views` = 7, total 88) | Sim |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run format:check` | ✅ Limpo (`All matched files use Prettier code style!`) | Sim |
| `npm run build` | ✅ `Compiled successfully`, `/api/auth/login`/`/api/auth/logout` gerados, `Middleware 27.5 kB` | Sim |

### 6.3 `security-requirement-validation` — senha nunca exposta em texto claro (ponto de segurança relevante do enunciado)

Verificação direta, linha a linha, de todo o fluxo (não apenas confiança no
comentário do próprio código):

- **Nunca aceita a senha como argumento de CLI**: confirmado por leitura —
  `grep -n "argv"` em `scripts/redefinir-senha-interna.ts` e
  `src/modules/autenticacao/redefinir-senha.ts` não retorna nenhuma
  ocorrência; a única forma de entrada é via prompt interativo
  (`promptOculto`/`promptVisivel`), nunca `process.argv`. Confirma a
  alegação do Backend de que a senha nunca fica visível em `ps`/histórico
  de shell — não há vetor de linha de comando para ela em nenhum ponto.
- **Nunca ecoada no terminal (modo TTY real)**: `promptOculto` usa
  `stdin.setRawMode(true)` e nunca escreve o caractere digitado de volta em
  `stdout` (só avança `valor` internamente) — confirmado por leitura linha
  a linha de `onData`.
- **Nunca logada em nenhum `console.*`**: levantamento de toda ocorrência de
  `console.log`/`console.error`/`console.warn` em
  `scripts/redefinir-senha-interna.ts` (7 ocorrências) — nenhuma referencia
  `novaSenha`, `confirmacao` ou qualquer hash; todas são mensagens fixas
  (cabeçalho, aviso de não-TTY, erro de validação **pelo motivo**, nunca
  pelo valor digitado, confirmação de sucesso/cancelamento). Mesma
  verificação em `redefinir-senha.ts`: nenhum `console.*` no arquivo inteiro
  — a função lança `Error` só com a mensagem do Postgres (`error.message`),
  nunca com o hash/senha embutidos.
- **Reprodução empírica**: o QA rodou o CLI real (via pipe, fallback
  visível documentado — cenário em que a senha *seria* ecoada se o
  `console.log` da mensagem de sucesso, por exemplo, interpolasse a senha)
  e confirmou, lendo a saída completa capturada, que a string da senha
  digitada (`qa-validacao-be05-novasenha`) **não aparece em nenhum ponto**
  do stdout — só as mensagens fixas do script.
- **Runbook reforça a mesma disciplina para o operador humano**: o passo 6
  do `scripts/README.md` instrui explicitamente "nunca registre a senha em
  texto puro em nenhum lugar — issue, PR, mensagem, etc.", coerente com o
  restante do fluxo.

**Conclusão desta seção**: a alegação de segurança do Backend ("senha nunca
logada/exposta em texto claro em nenhum ponto do fluxo") se confirma
integralmente por verificação independente do QA, tanto por leitura de
código quanto por reprodução empírica.

### 6.4 Avaliação da mudança `fileParallelism: false` (`vitest.integration.config.ts`) — efeito colateral em BE-02/03/04

**Reprodução ativa da causa raiz alegada** (não apenas aceita a explicação
do comentário no arquivo): o QA reverteu temporariamente
`fileParallelism` para `true` e rodou `npm run test:integration` 5 vezes
seguidas contra o mesmo Supabase local — **3 das 5 execuções falharam**,
sempre no mesmo ponto (`app/api/auth/__tests__/auth.integration.test.ts:98`,
`expect(response.status).toBe(200)` recebendo um status diferente),
consistente com a causa raiz descrita: `redefinir-senha.integration.test.ts`
troca o hash vigente de `app.auth_interno` no meio da execução paralela de
`auth.integration.test.ts`, que depende do hash que ele mesmo acabou de
gravar. A falha é intermitente (não 5/5), como esperado de uma corrida real
dependente de escalonamento de I/O assíncrono, não de um bug determinístico
de lógica.

Restaurado `fileParallelism: false` (estado que o Backend efetivamente
entregou) e reexecutado 3 vezes seguidas: **88/88 em todas as 3
execuções**, nenhuma falha. Confirma que a correção resolve o problema
identificado.

**Efeito colateral sobre BE-02/03/04 (tabelas/tarefas já aprovadas pelo
QA)**: nenhum encontrado.
- Os 3 arquivos de integração de BE-02/03/04
  (`app-schema-rls.integration.test.ts`, `public-views.integration.test.ts`,
  `auth.integration.test.ts`) continuam sendo executados por completo, na
  mesma ordem determinística de descoberta de arquivo do Vitest, apenas sem
  sobreposição de tempo entre arquivos — nenhum teste interno a um arquivo
  muda de comportamento (`fileParallelism` não afeta paralelismo *dentro*
  de um arquivo, que já era serial por padrão do Vitest).
  BE-02 (72 casos)/BE-03 (7 casos)/BE-04 (5 casos) continuam 100% verdes,
  reproduzido pelo próprio QA nesta validação.
- **Performance**: diferença de duração irrelevante na escala atual (~1.8s
  em paralelo vs. ~3.0s em série, para 88 testes/4 arquivos) — não é um
  risco real de "suíte lenta" no estágio atual do projeto. Nota
  informativa, não um débito: se o número de arquivos `*.integration.test.ts`
  crescer muito (dezenas), a execução serial pode se tornar perceptível;
  como esta suíte não roda em CI ainda (nota já registrada em BE-02, DevOps
  como follow-up), não há impacto de pipeline hoje.
- **Isolamento de dados**: a mudança é estritamente sobre **quando** os
  arquivos rodam (nunca simultaneamente), não sobre **o que** cada teste
  grava — os `beforeAll`/seeds de BE-02/03/04 continuam usando os mesmos
  IDs/valores determinísticos de antes, sem depender de isolamento por
  arquivo que não existia mesmo antes desta mudança (o Postgres local já
  era compartilhado). Nenhuma tabela nova de BE-02/03/04 é tocada por
  `redefinir-senha.integration.test.ts` (que só escreve em
  `auth_interno`, a mesma tabela já compartilhada com `auth.integration.test.ts`
  desde BE-04) — não há novo ponto de contenção introduzido além do já
  existente e agora corrigido.

**Conclusão**: a mudança é uma correção real de um bug real (reproduzido
ativamente pelo QA), sem efeito colateral negativo detectado sobre as
tarefas já aprovadas (BE-02/03/04) — apenas uma nota informativa de
performance para o futuro, sem ação necessária agora.

### 6.5 Achados incidentais do Backend — avaliação do QA

- **Bug 1 (readline não-TTY, promessa pendurada)**: confirmado por leitura
  do comentário extenso em `scripts/redefinir-senha-interna.ts` (linhas
  159-178) e do código atual (iterador assíncrono único,
  `getSharedReadlineIterator`/`closeSharedReadline`) — a implementação
  final não usa `rl.question()` encadeado em nenhum ponto. Reproduzido
  indiretamente pelo próprio QA: o teste manual via pipe (Seção 6.1/6.3)
  pediu duas entradas (senha + confirmação) e ambas foram lidas
  corretamente na mesma execução, sem travamento — consistente com a
  correção estar de fato aplicada, não apenas descrita.
- **Bug 2 (race condition de `fileParallelism`)**: reproduzido **ativamente**
  pelo próprio QA, não apenas aceito (ver Seção 6.4) — causa raiz e
  correção confirmadas de forma independente.

Nenhum dos dois é um bug em aberto — ambos já corrigidos e verificados.
Não são débitos, são achados já resolvidos, registrados aqui por
completude do relato de validação.

### 6.6 Non-functional validation

- **Cenário de erro (senha curta, confirmação divergente, cancelamento)**:
  cobertos pelos 5 casos de `redefinir-senha.test.ts` (lidos e reexecutados
  pelo QA) — mensagens específicas por motivo, nunca uma lacuna silenciosa
  (`validacao.motivo` sempre presente); o CLI encerra com `exitCode = 1` sem
  gravar nada em caso de validação falha ou cancelamento explícito
  (`[s/N]` diferente de `s`).
- **Cenário de erro (stdin não-TTY)**: aviso explícito impresso
  (`"[aviso] entrada padrao nao e um terminal interativo..."`), nunca
  travamento silencioso — confirmado na execução manual do próprio QA.
- **Performance básica**: não aplicável de forma significativa (script de
  operação humana, não endpoint de negócio); tempo de execução do CLI e da
  suíte de integração são triviais nesta escala (ver 6.4).
- **Usabilidade**: não aplicável — BE-05 não entrega UI; o runbook em si é a
  "interface" (para o operador humano) e foi lido/seguido pelo QA sem
  ambiguidade — pré-requisitos, procedimento e "o que não faz" são claros e
  bateram com o comportamento real observado.
- **Integração cruzada**: nenhuma mudança em `API-CONTRACT.yaml` — correto,
  esta tarefa não expõe endpoint HTTP novo (script de acesso direto ao
  banco, decisão já registrada na Seção 6.2 item 4 do `TASK.md`). A
  integração de fato relevante (o hash gravado pelo CLI ser aceito pelo
  endpoint `POST /api/auth/login` de BE-04) foi verificada de ponta a ponta
  pelo próprio QA (Seção 6.1), não apenas inferida.

### 6.7 Achados do QA

Nenhum bug novo encontrado nesta validação — nenhuma entrada nova de
`BUG-QA-BE05-0X`. Os dois achados incidentais do próprio Backend foram
confirmados como corrigidos (Seção 6.5), não como débitos em aberto.

### 6.8 Checklist de "Pronto" (Definition of Done de QA)

- [x] Todo critério de aceite da tarefa foi testado e está passando —
      reproduzido de ponta a ponta pelo QA (CLI real via pipe, servidor
      real, `curl` próprio, Supabase local real), não apenas conferido pela
      suíte automatizada ou aceito do relato do Backend
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum débito novo de severidade baixa/média a registrar
- [x] Testes de integração cruzada — não aplicável a endpoint novo (esta
      tarefa não expõe HTTP), mas a integração de fato relevante (hash
      gravado pelo CLI aceito pelo login de BE-04) foi verificada de ponta
      a ponta pelo QA
- [x] Requisito não funcional relevante validado (cenários de erro,
      segurança — senha nunca exposta em texto claro, verificado por
      leitura e reprodução empírica; ver 6.3/6.6)

### 6.9 Veredito

## **BE-05: Aprovado**

Os 2 itens do critério de aceite, lidos literalmente ("runbook documentado
permite trocar a senha sem depender de fluxo de e-mail" + "testado
manualmente uma vez em ambiente de homologação"), estão satisfeitos —
verificado por **reprodução real de ponta a ponta**, não apenas leitura do
código ou aceite do relato do Backend: o QA executou o próprio runbook
(`npm run senha:redefinir` via pipe não-TTY) contra o Supabase local já em
execução neste ambiente, subiu o servidor real (`build`+`start` numa porta
dedicada) e confirmou via `curl` que a senha antiga passa a ser rejeitada
(`401`/`"Senha incorreta."`) e a nova passa a ser aceita (`200` +
`Set-Cookie` `HttpOnly`/`SameSite=strict`/`Max-Age=36000`) — exatamente o
cenário que o próprio runbook prescreve como validação de referência.
`security-requirement-validation` dedicado confirmou, por leitura linha a
linha e por reprodução empírica, que a senha nunca é aceita como argumento
de CLI (`process.argv` nunca referenciado), nunca ecoada em modo TTY real, e
nunca aparece em nenhum `console.*`/mensagem de erro — a alegação central de
segurança do enunciado desta validação se confirma integralmente.

O QA foi além da simples aceitação dos dois achados incidentais relatados
pelo Backend: **reproduziu ativamente** a race condition de
`fileParallelism` (revertendo a config para `true` e observando 3 falhas em
5 execuções, sempre no mesmo ponto do teste de BE-04, consistente com a
causa raiz alegada) e confirmou que a correção (`fileParallelism: false`)
resolve o problema (3 execuções limpas seguidas, 88/88). Avaliação de efeito
colateral sobre BE-02/03/04 (já aprovadas): **nenhum encontrado** — os 3
arquivos de integração dessas tarefas continuam passando 100%, o
paralelismo interno a cada arquivo não muda, e o único novo ponto de
contenção (tabela `auth_interno` compartilhada entre `auth.integration.test.ts`
e o teste novo desta tarefa) é exatamente o que a correção resolve, não um
problema novo introduzido por ela. Diferença de duração é irrelevante na
escala atual do projeto (nota informativa para o futuro, sem ação
necessária agora).

`npm test` (179 testes), `npm run test:integration` (88 testes, 3
execuções), `lint`/`typecheck`/`format:check`/`build` reproduzidos pelo QA e
verdes, batendo exatamente com o relato do Backend. Nenhum bug encontrado.
Nenhuma ação de reprovação necessária em `TASK.md`; status permanece
`Concluída`. Nenhum artefato de teste manual (`.env.local`, senha de teste)
permanece no repositório — removido pelo QA ao final desta validação,
`app.auth_interno` restaurado a uma senha neutra conhecida.

**Nota de rastreabilidade de padrão (não é escalonamento)**: sexto agente
de implementação validado nesta rodada (após FE-00, BE-02, BE-03, BE-04,
FE-01); nenhum padrão recorrente de bug de execução foi identificado — os
dois achados desta tarefa (readline não-TTY, race condition de integração)
são de natureza técnica isolada e específica de ambiente/plataforma
(Windows/Git Bash, Node 24; Supabase local compartilhado entre arquivos de
teste), sem relação de causa raiz com os achados de tarefas anteriores
(`format:check`/FE-00, integridade referencial/BE-02, limitação de ambiente
local/BE-03, timing side-channel/BE-04, `redirectTarget`/FE-01 — este
último, aliás, de severidade **Alta** e reprovado, categoria distinta dos
achados de baixa/média severidade desta tarefa). Guardrail de "só escala
por padrão recorrente" seguido — nenhuma entrada nova em `BLOCKERS.md`.

---

## 8. FE-01 — Revalidação de `BUG-QA-FE01-01` (fechamento do Lote L1)

**Escopo desta entrada**: conforme o próprio processo (`QA-REPORT.md` topo —
"QA retesta só o que foi corrigido + dependências, não o lote inteiro do
zero"), esta entrada **não repete** a validação completa de FE-01 (Seção 6,
itens (a)/(b)/(d), já aprovados) — só o retest de `BUG-QA-FE01-01` (item (c))
e a checagem de que a correção não introduziu regressão em nenhum caso já
coberto.

**Correção recebida do Frontend (2026-09-03)**: `getSafeRedirectTarget`
(`src/features/login/redirectTarget.ts`) substituiu a checagem de prefixo
ad-hoc por resolução real via `new URL(rawParam, INTERNAL_ORIGIN_SENTINEL)`,
aceitando o valor somente se `resolved.origin === INTERNAL_ORIGIN_SENTINEL`
(mesma técnica de resolução usada pelo próprio `next/navigation`), mantendo
em paralelo a checagem de prefixo único-`/`-sem-`//` (necessária porque a
resolução de URL sozinha aceitaria `"rodadas/nova"`, sem barra inicial, como
mesma origem). 3 casos de teste novos em `redirectTarget.test.ts`.

### 8.1 Retest do vetor original (`BUG-QA-FE01-01`)

- `npx vitest run src/features/login/redirectTarget.test.ts` → ✅ **9/9
  testes passando**, incluindo os 3 novos: vetor original (`/\evil.example.com`),
  variante com barra dupla (`/\/evil.example.com`) e barra invertida
  percent-encoded (`/%5cevil.example.com`, confirmado como caminho interno
  legítimo, não um vetor de bypass — o parser de URL não a renormaliza para
  host).
- Reprodução independente pelo QA, fora da suíte do Frontend (script próprio,
  removido após a execução, nunca commitado), chamando a função real com o
  payload exato do achado original:
  ```
  input: "/\evil.example.com"  → getSafeRedirectTarget → "/rodadas/nova"
  ```
  O vetor que antes navegava para `https://evil.example.com/` agora cai no
  destino padrão (`ROUTES.lancamentoRodada`). **`BUG-QA-FE01-01` confirmado
  corrigido.**

### 8.2 Checagem de regressão além do que o Frontend já cobriu

O QA foi além dos 3 casos novos do Frontend, testando vetores adicionais que
exploram a mesma classe de bug (normalização de string antes do parsing de
URL, não apenas o caractere `\` isolado) — script próprio, não commitado:

| Vetor adicional testado pelo QA | Resultado |
|---|---|
| `/\t/evil.example.com` (tab entre barras) | ✅ Rejeitado, cai no padrão — o `new URL()` real remove `\t`/`\n`/`\r` do input antes de parsear (comportamento do parser, não uma checagem manual de caractere), o que a resolução por `new URL()` captura automaticamente sem precisar de uma lista fechada de caracteres proibidos |
| `/\n/evil.example.com`, `/\r/evil.example.com` | ✅ Rejeitados, mesmo motivo |
| `/rodadas/nova?x=1`, `/historico/123#frag` (caminhos internos legítimos com querystring/fragmento) | ✅ Aceitos inalterados — **nenhuma regressão** nos casos de uso legítimos de redirect interno |
| `/historico/123`, `/rodadas/nova` (casos já cobertos por `redirectTarget.test.ts` antes da correção) | ✅ Aceitos inalterados |

A abordagem de resolução real de URL (em vez de lista de prefixos proibidos)
se mostra mais robusta do que a correção mínima pedida — cobre não só o
vetor relatado, mas toda uma classe de vetores que dependem de como o parser
de URL normaliza a string antes do parsing (tab/newline/CR), sem exigir uma
enumeração manual de caracteres. Nenhum vetor testado pelo QA (original nem
adicional) escapou da validação; nenhum caso legítimo de redirect interno já
coberto anteriormente foi quebrado.

### 8.3 Comandos reproduzidos (independente do relato do Frontend)

| Comando | Resultado |
|---|---|
| `npm test -- --run` (suíte completa) | ✅ **40 arquivos, 214 testes, 0 falha** (182 pré-existentes de FE-01 + 32 novos de `FE-12`, ver Seção 9) |
| `npm run lint` | ✅ 0 erros, 0 warnings |
| `npm run typecheck` | ✅ 0 erros |
| `npm run format:check` | ✅ limpo, exit code 0 |
| `npm run build` | ✅ `Compiled successfully`, `/login` gerado como rota estática (104 kB First Load JS, variação pequena e esperada frente à entrega anterior, sem sinal de regressão) |

### 8.4 Checklist de "Pronto" (Definition of Done de QA — retest)

- [x] `BUG-QA-FE01-01` (severidade Alta) confirmado corrigido, reproduzido
      de forma independente pelo QA, não apenas aceito do relato do Frontend
- [x] Nenhuma regressão introduzida nos 3 itens já aprovados de FE-01
      (Seção 6, itens (a)/(b)/(d)) nem nos casos legítimos de redirect
      interno já cobertos
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Testes de vetores adicionais (tab/newline/CR) além do relato do
      Frontend, sem achado novo

### 8.5 Veredito

## **FE-01: Reaprovado — Concluída**

`BUG-QA-FE01-01` (severidade Alta, único item pendente da Seção 6) está
**corrigido e confirmado** por reprodução independente do QA — o vetor
original (`/\evil.example.com`) e vetores adicionais explorando a mesma
classe de bug (tab/newline/CR) são todos rejeitados, caindo no destino
padrão; nenhum caso legítimo de redirect interno (incluindo com querystring/
fragmento) sofreu regressão. Os demais 3 itens do critério de aceite
permanecem aprovados (Seção 6.2), sem necessidade de reteste. `TASK.md`
reaberto de `Em andamento` para `Concluída` para `FE-01`, com nota apontando
para esta entrada.

---

## 9. FE-12 — Sessão e expiração transversal (primeira validação)

**Critério de aceite (`TASK.md`, Seção 3.2, texto exato)**: "Aviso
não-bloqueante 2 minutos antes da expiração estimada em toda tela interna;
qualquer 401 em ação de escrita preserva o que for tecnicamente possível e
redireciona corretamente."

**Skills aplicadas**: `acceptance-criteria-validation`,
`cross-platform-integration-testing`, `non-functional-validation`
(acessibilidade), `bug-documentation`.

**Método**: validação independente. `src/features/sessao/*` (6 módulos +
barrel) lidos linha a linha (não só os testes). O QA rodou a suíte completa
do projeto, `lint`/`typecheck`/`format:check`/`build` do zero, e conferiu
manualmente a integração cruzada com `BE-04` (`SESSION_TTL_MS`), com `FE-01`
(`getSafeRedirectTarget`, `ROUTES.login`) e com `FE-00`
(`SessionExpiryBanner`, `ToastProvider`), incluindo checagem de que o
componente não está montado em duplicidade em nenhum ponto da árvore atual
(`app/`).

### 9.1 Nota preliminar sobre o estado real do projeto (avaliação do enunciado)

A tarefa foi entregue com uma decisão de escopo explícita: nenhuma tela
interna real (`FE-04` em diante, lotes L3-L6) existe ainda nesta trilha de
execução — `FE-12` entrega a infraestrutura completa (marcador de expiração,
hook de aviso, casca de UI, tratamento de 401, preservação de dado não
salvo), testada isoladamente, mas **não montada em nenhuma tela real**
(confirmado por `grep -r "SessionExpiryStatus" app/` → nenhum resultado).

O QA avalia essa leitura como **razoável, não uma lacuna disfarçada de
decisão de detalhe**, pelos seguintes motivos, verificados diretamente:

1. **A própria decomposição do `TASK.md` (Seção 3.0) já sequencia assim**:
   `FE-12` está no Lote L1, com dependências declaradas de `FE-00`+`BE-04`
   apenas — nenhuma tela `FE-04`…`FE-11` (todas em lotes L3-L6, posteriores)
   é dependência de `FE-12`. Se o Tech Lead tivesse pretendido que `FE-12`
   só fosse validável contra uma tela real, a dependência estaria declarada
   e o lote seria outro — não é uma leitura do Frontend, é o grafo de
   dependências de 4.1/4.2 do próprio `TASK.md`.
2. **Há precedente já validado e aceito pelo QA no mesmo lote**: `FE-01`
   (Seção 6) constrói `redirectTarget.ts` "pronto para ser alimentado por
   FE-12... não exercitado por nenhuma tela real ainda além do próprio
   fallback" — o QA aprovou esse padrão em `FE-01` sem ressalva quanto a
   isso. Aplicar um padrão diferente agora para `FE-12` (mesmo padrão,
   direção inversa da mesma dependência) seria inconsistente.
3. **O texto do critério de aceite não exige uma tela específica** — diz
   "toda tela interna", uma afirmação universal sobre um conjunto que,
   hoje, é vazio (nenhuma tela interna existe). Uma afirmação universal
   sobre um conjunto vazio é vacuamente satisfeita; o que resta ao QA
   validar é se o **mecanismo em si** funciona corretamente quando exercido
   (via teste automatizado/hook isolado), não se existe uma tela real para
   clicar — não há tela real para clicar em nenhuma tarefa deste lote além
   de T01 (que não é "tela interna").
4. **Não é lacuna silenciosa** (`TASK.md` Seção 1.0): a nota de status da
   própria tarefa documenta isso explicitamente, com o precedente citado
   nominalmente ("mesmo padrão de 'infraestrutura pronta para consumo
   futuro' já usado por FE-01").

**Conclusão**: o QA valida `FE-12` como infraestrutura, com o rigor que a
suíte automatizada + inspeção de código permitem, e sinaliza (não como bug,
como nota de acompanhamento) que a validação de usabilidade **real** contra
uma tela com dado dinâmico fica pendente para quando `FE-04` (primeira tela
interna) for validado — mesmo texto de ressalva já usado por `FE-00`/`FE-01`
para os pontos de usabilidade que dependiam de tela real inexistente à
época.

### 9.2 Verificação de comandos (independente do relato do Frontend)

| Comando | Resultado obtido pelo QA | Bate com o relato? |
|---|---|---|
| `npm test -- --run` | ✅ **40 arquivos, 214 testes, 0 falha** (182 pré-existentes + 32 novos: `sessionExpiryMarker.test.ts` 7, `useSessionExpiryWarning.test.ts` 5, `SessionExpiryStatus.test.tsx` 4, `writeActionSession.test.ts` 10, `useHandleSessionExpired.test.ts` 6) | Sim |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run format:check` | ✅ limpo, exit code 0 — nenhum arquivo novo de `FE-12` pendente | Sim |
| `npm run build` | ✅ `Compiled successfully`, nenhuma rota nova gerada (esperado — `SessionExpiryStatus` não está montado em nenhuma página ainda), sem erro de bundling da nova pasta | Sim |

### 9.3 Verificação item a item do critério de aceite

**(a) Aviso não-bloqueante 2 minutos antes da expiração estimada em toda
tela interna** — ✅ mecanismo verificado como correto, dentro do escopo
possível (ver 9.1):
- `sessionExpiryMarker.ts`: marcador `agoraDoMount + SESSION_TTL_MS`
  persistido em `sessionStorage`, com degradação graciosa (nunca lança) se
  `sessionStorage` estiver bloqueado (navegação privada) — confirmado por
  leitura e pelo teste `sessionExpiryMarker.test.ts` (corrupção de valor
  armazenado, degradação).
- `useSessionExpiryWarning.ts`: `setTimeout` único (não polling) disparado
  exatamente aos 2 min antes (`SESSION_WARNING_BEFORE_EXPIRY_MS = 2*60*1000`,
  literal da UX-SPEC.md Seção 1.3), ou imediatamente se montado dentro da
  janela (cenário de segunda tela montando perto do fim do TTL) — confirmado
  por leitura e por `useSessionExpiryWarning.test.ts` (fake timers, os 5
  casos, incluindo o de "exatamente ao atingir 2 min": `advanceTimersByTime`
  1ms antes do limite → ainda oculto; +1ms → visível).
- `SessionExpiryStatus.tsx`: casca que liga o hook ao `SessionExpiryBanner`
  **já existente de FE-00**, reutilizado sem nenhuma variação paralela
  (confirmado: `SessionExpiryBanner.tsx` não foi editado por `FE-12`, `git
  diff` não mostra nenhuma mudança nesse arquivo) — mensagem exibida bate
  literalmente com o texto do `UX-SPEC.md` Seção 1.3 ("Sua sessão expira em
  breve — salve o que estiver fazendo"), confirmado por
  `SessionExpiryStatus.test.tsx` e reproduzido pelo QA via `npx vitest run`.
  `role="status"`/`aria-live="polite"` (não-bloqueante, não-modal —
  literalmente "não-bloqueante" do critério).
- **Não está montado em nenhuma tela real hoje** — ver 9.1, avaliado como
  decisão de escopo razoável, não bloqueante.

**(b) Qualquer 401 em ação de escrita preserva o que for tecnicamente
possível e redireciona corretamente** — ✅ mecanismo verificado como
correto, dentro do escopo possível (ver 9.1):
- `assertSessionAlive`/`SessionExpiredError` (`writeActionSession.ts`):
  lança especificamente em `status === 401`, devolve a resposta inalterada
  caso contrário (permite encadeamento). Confirmado consistente com o
  formato real de 401 emitido por `middleware.ts` (`{"error":"Sessão
  inválida ou expirada."}`, status 401) — mesmo middleware já validado em
  `BE-04` (Seção 5) — lido linha a linha para esta checagem cruzada (ver
  9.4).
- `saveUnsavedData`/`takeUnsavedData`: leitura única, nunca lança mesmo com
  dado não serializável (ex.: contém função) — "o que for tecnicamente
  possível" tratado literalmente: falha em silêncio na preservação (não
  bloqueia o redirecionamento, mais importante) — confirmado por
  `writeActionSession.test.ts` (degradação graciosa, round-trip,
  isolamento por chave).
- `useHandleSessionExpired.ts`: ordem verificada (preserva dado não salvo →
  limpa marcador de expiração → toast com a mensagem literal ("Sessão
  expirada, faça login novamente.") → `router.replace` para T01 com
  `?redirect=<origem>`) — confirmado por `useHandleSessionExpired.test.ts`
  (6 casos, incluindo a ordem e o encoding do `pathname` atual).
- **Redireciona corretamente**: `buildSessionExpiredRedirectUrl` monta
  `${ROUTES.login}?redirect=${encodeURIComponent(currentPath)}` — o QA
  confirmou por leitura cruzada (ver 9.4) que este valor é exatamente o
  formato que `getSafeRedirectTarget` (FE-01, já corrigido nesta rodada,
  Seção 8) espera e resolve de volta para `currentPath` corretamente, sem
  nenhuma segunda validação duplicada do lado de `FE-12` (delegação
  correta, não uma reimplementação paralela).
- **Não é exercitado por nenhuma ação de escrita real hoje** (nenhum
  Route Handler de escrita além de `/api/auth/*`, isento por desenho, e
  `/api/atletas` citado só como exemplo em `BE-04`) — mesmo raciocínio de
  9.1, avaliado como decisão de escopo razoável, não bloqueante.

### 9.4 `cross-platform-integration-testing` (integração cruzada dentro do Lote L1)

- **`FE-12` ↔ `BE-04` (`SESSION_TTL_MS`)**: confirmado por leitura de
  `src/modules/autenticacao/constants.ts` que o arquivo não importa nada
  (nenhum I/O, nenhum segredo, nenhum código Node-only) — seguro de
  reimportar em código client-side (`sessionExpiryMarker.ts`, `"use
  client"` implícito via hook). Reaproveitar em vez de duplicar o valor
  `10*60*60*1000` evita divergência silenciosa entre cliente e servidor se
  o TTL mudar — confirmado que é exatamente o mesmo valor usado pelo
  Route Handler de login e pelo middleware (nenhum valor hardcoded
  paralelo em `FE-12`).
- **`FE-12` ↔ `FE-01` (`getSafeRedirectTarget`)**: confirmado round-trip
  completo — `buildSessionExpiredRedirectUrl("/historico")` produz
  `/login?redirect=%2Fhistorico`; `useSearchParams().get("redirect")` do
  lado de `LoginForm.tsx` devolve `"/historico"` (decodificado
  automaticamente); `getSafeRedirectTarget("/historico")` devolve
  `"/historico"` inalterado (caminho interno legítimo). Reproduzido pelo
  QA com um script próprio simulando o ciclo completo (encode em
  `writeActionSession.ts` → decode implícito do `URLSearchParams` →
  validação de `redirectTarget.ts`), sem nenhuma divergência.
- **`FE-12` ↔ `FE-00` (`SessionExpiryBanner`, sem duplicação)**: confirmado
  por `grep -r "SessionExpiryBanner"` em `src/`/`app/` que o único
  consumidor do componente é `SessionExpiryStatus.tsx` — nenhuma tela ou
  outro módulo instancia `AlertBanner`/`SessionExpiryBanner` em paralelo
  para o mesmo propósito. O próprio código de `SessionExpiryStatus.tsx`
  documenta explicitamente a regra de montagem única ("Nenhuma tela
  individual deve montar este componente por conta própria") como guia
  para quem implementar o layout da área interna (`FE-04` em diante) —
  não há, hoje, nenhum ponto de montagem real para verificar a ausência de
  duplicação em runtime, mas a garantia estrutural (um único componente,
  um único consumidor) está correta no estado atual do código.
- **`FE-12` ↔ `ToastProvider` (FE-00)**: confirmado que `useToast()` (usado
  por `useHandleSessionExpired.ts`) depende do `ToastProvider` já montado
  globalmente em `app/layout.tsx` desde `FE-00` — não precisa de nenhum
  provider adicional; `variant: "warning"` cai na região `aria-live="polite"`
  do `ToastProvider` (não a `assertive`, reservada a `danger`), consistente
  com o caráter não-crítico da mensagem (o redirecionamento em si, não o
  toast, é o mecanismo funcional de recuperação).

Nenhuma inconsistência de contrato encontrada entre as três tarefas do lote.

### 9.5 Non-functional validation (acessibilidade — `SessionExpiryBanner`/toast)

- **`jest-axe` (`SessionExpiryStatus.test.tsx`)**: 0 violação com o aviso
  visível — reproduzido pelo QA (`npx vitest run
  src/features/sessao/SessionExpiryStatus.test.tsx`).
- **WCAG 2.2.1 (Timing Adjustable)**: aviso não-bloqueante, com tempo
  suficiente de reação (2 min) antes da expiração estimada, nunca expira
  em silêncio — texto informa a ação recomendada ("salve o que estiver
  fazendo"). Critério transversal já aprovado na origem em `FE-00`
  (Seção 2.3/2.4), reaplicado aqui corretamente via reuso do componente,
  não uma reimplementação.
- **WCAG 4.1.3 (mensagens de status via `aria-live`)**: `role="status"`
  (`AlertBanner` variant `info`, herdado de `FE-00`) para o aviso de
  expiração e `aria-live="polite"` para o toast de sessão expirada — nenhum
  dos dois interrompe o fluxo do usuário nem exige foco manual,
  consistente com "não-bloqueante" do critério de aceite.
- **Botão "Entendi" (dismiss)**: `<button>` real, focável, acionável por
  teclado (confirmado por `fireEvent.click` no teste + herda
  `:focus-visible` global de `app/globals.css`, já revisado em `FE-00`).
- **Alvo de toque**: `Button variant="ghost"` reaproveita o token
  `--tap-target-min: 44px` já aplicado transversalmente em `FE-00` —
  nenhuma variação de tamanho introduzida por `FE-12`.
- **Nota de estilo, não um bug**: a mensagem de 401
  (`SESSION_EXPIRED_MESSAGE = "Sessão expirada, faça login novamente."`) e
  o texto padrão do `SessionExpiryBanner`
  (`"Sua sessão expira em breve — salve o que estiver fazendo."`) incluem
  ponto final não presente no texto citado entre aspas no `UX-SPEC.md`
  Seção 1.3 — mesmo padrão de pontuação já usado sem ressalva em outras
  mensagens deste projeto (ex.: `LOGIN_GENERIC_ERROR_MESSAGE = "Senha
  incorreta."`, `BE-04`, nunca marcado como divergência). Não registrado
  como bug — é uma convenção de estilo consistente entre tarefas, não uma
  mudança de conteúdo/significado da mensagem.

### 9.6 Achados do QA

Nenhum bug encontrado nesta tarefa — mecanismo correto, testado, sem
regressão nas dependências cruzadas verificadas em 9.4.

### 9.7 Checklist de "Pronto" (Definition of Done de QA)

- [x] Critério de aceite testado e passando, dentro do escopo real
      disponível nesta fase de execução (ver 9.1) — nenhuma tela interna
      real existe ainda para exercitar o mecanismo em produção; a
      infraestrutura em si está correta e coberta por 32 testes novos
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum débito de severidade baixa/média a registrar
- [x] Testes de integração cruzada com `BE-04`/`FE-01`/`FE-00` (mesmo lote)
      executados e passando (ver 9.4)
- [x] Requisito não funcional relevante validado (acessibilidade do
      `SessionExpiryBanner`/toast, WCAG 2.2.1/4.1.3 — ver 9.5)

### 9.8 Veredito

## **FE-12: Aprovado**

Os 2 itens do critério de aceite estão satisfeitos **como infraestrutura
transversal**, verificados de forma independente pelo QA (leitura linha a
linha dos 6 módulos + 32 testes automatizados reproduzidos, 0 falha, 0
violação `jest-axe`) e confirmados corretos em integração cruzada com as
outras duas tarefas do lote (`BE-04`: `SESSION_TTL_MS` reaproveitado sem
duplicação; `FE-01`: round-trip completo de `?redirect=` sem validação
duplicada). Nenhuma tela interna real monta o mecanismo hoje — avaliado pelo
QA (Seção 9.1) como decisão de escopo coerente com a própria sequência de
lotes do `TASK.md` (nenhuma tela interna é dependência declarada de `FE-12`)
e com o precedente já aceito em `FE-01` no mesmo lote, não uma lacuna
disfarçada. Nenhuma inconsistência estrutural encontrada. Nenhuma ação de
reprovação necessária em `TASK.md`; status permanece `Concluída`.

**Nota de acompanhamento (não é bloqueio)**: a validação de usabilidade
**real** (aviso aparecendo de fato numa tela com dado dinâmico, preservação
de formulário real em um 401 real) fica pendente para quando `FE-04`
(primeira tela interna, L3) for validada — nesse momento o QA também vai
confirmar que a tela consome `SessionExpiryStatus`/`useHandleSessionExpired`
de `FE-12` em vez de reimplementar o tratamento, conforme o próprio código
de `FE-12` documenta como contrato de uso esperado.

---

## 10. Lote L1 — Autenticação (veredito agregado)

**Tarefas do lote** (`TASK.md` Seção 3.0): `BE-04`, `BE-05`, `FE-01`, `FE-12`.

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-04` | Aprovado com ressalvas (2 débitos de baixa severidade, nenhum bloqueante) | Seção 5 |
| `BE-05` | Aprovado (nenhum achado) | Seção 7 |
| `FE-01` | Reaprovado — `BUG-QA-FE01-01` (Alta) corrigido e confirmado nesta rodada | Seção 8 |
| `FE-12` | Aprovado (infraestrutura correta, integração cruzada confirmada) | Seção 9 |

### 10.1 Checklist de "Pronto" do lote (Definition of Done por lote)

- [x] Todo critério de aceite de cada tarefa do lote foi testado e está
      passando (`BE-04`/`BE-05` reconfirmados nesta rodada por herança das
      seções 5/7, já aprovadas anteriormente; `FE-01` reteste do item
      pendente na Seção 8; `FE-12` validação completa na Seção 9)
- [x] Nenhum bug de severidade alta/crítica em aberto em qualquer tarefa do
      lote — o único bug Alta do lote (`BUG-QA-FE01-01`) está confirmado
      corrigido
- [x] Todo bug de severidade baixa/média está registrado como débito, com
      prazo (débitos de `BE-04` — Seção 5 — herdados sem mudança; nenhum
      débito novo de `FE-01`/`FE-12` nesta rodada)
- [x] Testes de integração cruzada executados e passando: dentro do lote
      (`FE-12` ↔ `BE-04`/`FE-01`, Seção 9.4) e com dependência de lote já
      fechado (`L0`/`FE-00`: `SessionExpiryBanner`/`ToastProvider`
      reaproveitados sem duplicação, Seção 9.4)
- [x] Requisito não funcional relevante validado (segurança do redirect —
      Seções 6/8; acessibilidade do aviso de expiração — Seção 9.5)

### 10.2 Veredito agregado

## **Lote L1 — Autenticação: Aprovado com ressalvas**

As 4 tarefas do lote estão avaliadas: `BE-05` sem nenhum achado; `BE-04` com
2 débitos de severidade baixa, já registrados e sem prazo formal vencido
(Seção 5); `FE-01` reaprovada nesta rodada após confirmação independente de
que `BUG-QA-FE01-01` (severidade Alta, o único bloqueio do lote) está
corrigido, sem regressão nos itens já aprovados nem nos casos legítimos de
redirect interno; `FE-12` aprovada como infraestrutura transversal correta,
com integração cruzada confirmada contra as outras três tarefas do lote e
contra o componente de `FE-00` (`L0`, já fechado) que ela reutiliza.

O lote é classificado **"Aprovado com ressalvas"** (não "Aprovado" puro)
porque as ressalvas de baixa severidade de `BE-04` (Seção 5) permanecem em
aberto como débito — nenhuma delas bloqueante, nenhuma nova nesta rodada.
Não há nenhum bug de severidade alta/crítica em aberto em nenhuma das 4
tarefas. `TASK.md`: `FE-01` reaberta de `Em andamento` para `Concluída`
(Seção 8.5); `BE-04`/`BE-05`/`FE-12` permanecem `Concluída`, sem alteração.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps e,
em seguida, à aprovação do Tech Lead, conforme `EXECUTION-FLOW.md` §5 — não
há pausa obrigatória. Nenhum padrão recorrente de bug identificado entre as
tarefas deste lote (guardrail de "só escala por padrão recorrente" seguido);
nenhuma entrada nova em `BLOCKERS.md`.

---

## 11. Lote L6 — Montagem de Times, Restrições e Substituições

**Gatilho**: `BE-11`, `BE-12`, `BE-13`, `FE-09`, `FE-10`, `FE-11` (`TASK.md`
Seção 3.0) todas marcadas `Concluída` pelo Backend/Frontend — primeira
validação por QA de qualquer uma das 6 tarefas deste lote (nenhuma entrada
prévia neste relatório para `BE-11`/`BE-12`/`BE-13`/`FE-09`/`FE-10`/`FE-11`).

**Método (comum às 6 tarefas, aplicado uma vez, não repetido em cada
subseção)**: validação independente e **reprodução real**, mesmo rigor já
aplicado a `BE-02`/`BE-03`/`BE-04` — não apenas leitura das notas de status
extensas deixadas pelos times no `TASK.md`, nem aceite dos números de teste
relatados.

- `npm test -- --run` executado pelo QA: **101 arquivos / 788 testes, 0
  falha** — bate exatamente com o número relatado por `FE-10` (última tarefa
  do lote a fechar).
- `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm run
  format:check` executados pelo QA: todos limpos (0 erro/warning), incluindo
  as 3 rotas novas de página (`/times`, `/restricoes`) e as 8 rotas de API
  novas deste lote.
- Ambiente Supabase local resetado do zero pelo QA (`npx supabase db
  reset`) — as 30 migrations (27 de tabela/view/função + as 3 novas deste
  lote: `20260903150000_forbid_restricao_obrigatoria_delete.sql`,
  `20260903160000_create_confirmar_times_rodada_function.sql`, e a migration
  de trava do legado que não pertence a este lote) aplicadas sem erro.
  `npm run test:integration -- --run` executado **duas vezes seguidas**
  contra esse ambiente: **19 arquivos/190 testes** na primeira execução
  (bate exatamente com o relato de `BE-16`, a tarefa mais recente a rodar a
  suíte de integração completa) e **188 passando + 2 puladas** na segunda —
  as 2 puladas são `it.skipIf(flagJaExistiaAntesDesteArquivo)` em
  `src/lib/supabase/__tests__/trava-schema-legada.integration.test.ts`
  (BE-14, fora do escopo de L6), comportamento intencional e documentado no
  próprio arquivo (a flag testada é irreversível por desenho — RF-08.6 —,
  então os testes de "antes da flag" só fazem sentido na primeira execução
  contra um banco resetado); não é regressão nem falha de nenhuma tarefa
  deste lote.
- Verificação direta por `psql` no container do Postgres local (fora de
  qualquer helper do Backend), reproduzindo os pontos estruturais mais
  críticos citados nas notas de status de `BE-11`/`BE-12`/`BE-13`: (a) zero
  linhas em `information_schema.role_table_grants` para `grantee='anon'`
  nas 4 tabelas deste lote (`app.time`, `app.time_atleta`,
  `app.substituicao`, `app.restricao_obrigatoria`); (b) `DELETE FROM
  app.restricao_obrigatoria` como superusuário `postgres` (privilégio maior
  que `service_role`, bypassa RLS) bloqueado pelo trigger
  `forbid_restricao_obrigatoria_delete` com a mensagem exata da migration;
  (c) `has_function_privilege` confirma `app.confirmar_times_rodada`
  executável só por `service_role` (`anon`: `f`); (d) reconfirmação de
  times BLOQUEADA (`errcode TM001`) quando já existe `app.substituicao`
  registrada contra a divisão atual — reproduzido de ponta a ponta (rodada
  → confirmar times → registrar substituição → tentar reconfirmar → erro
  exato); (e) `TM002` (mesmo atleta em dois times na mesma chamada)
  reproduzido isoladamente. Ambiente limpo com novo `supabase db reset` ao
  final, sem deixar dado de teste do QA no banco.

### 11.1 BE-11 — Serviço de Times (heurística de duas fases, ADR-007/ADR-010)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Para `N` times,
gera divisão respeitando 100% das restrições obrigatórias ativas ou retorna
`status: "conflito"` com o contrato exato do ADR-010; nível técnico + idade
usados como soft constraint (RF-05.3); execução acima do timeout
configurado retorna erro de 'falha técnica real' (não trava a função
serverless)."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Divisão respeita 100% das restrições obrigatórias ativas, para `N` times | Leitura linha a linha de `src/modules/times/{grafo,backtracking,busca-local,montar}.ts` + 9 testes de integração reais (`app/api/times/sugestao/__tests__/sugestao.integration.test.ts`) reexecutados pelo QA contra Supabase local | ✅ `backtracking.ts` é backtracking genuíno (poda por forward-checking + retrocesso real via `cores.delete`, nunca uma gulosa pura — confirmado lendo o laço `for (const cor of ordemCores)` com `continue`/retrocesso), aplicado por componente conexo (`grafo.ts`, union-find com compressão de caminho + união por rank, determinístico); Fase 2 (`busca-local.ts`) nunca desfaz a garantia da Fase 1 (`rebalancearTamanhos`/`otimizarEquilibrio` só mexem em atribuições já válidas, `swapValido` sempre checado antes de aplicar) |
| `status: "conflito"` com contrato exato do ADR-010 | Comparação campo a campo de `presenter.ts` (`paraSugestaoConflitoResponse`) contra `API-CONTRACT.yaml` (`RestricaoConflitanteItem`/`GrupoConflitoItem`/`SugestaoTimesConflitoResponse`) | ✅ Nomes de campo idênticos (`restricao_id`/`atleta_a_id`/`atleta_a_nome`/`atleta_b_id`/`atleta_b_nome`/`motivo`/`grupo_conflito`; `grupo_conflito`/`atletas_ids`/`quantidade_times_solicitada`/`mensagem`), nenhum campo a mais/a menos (`additionalProperties: false` verdadeiro em ambos os lados) |
| Nível técnico + idade como soft constraint (RF-05.3) | Leitura de `calcularCusto`/`otimizarEquilibrio` (`busca-local.ts`) | ✅ Custo = variância das médias entre times, normalizada pela variância populacional (nível técnico + idade separadamente, somadas); idade `null` (sem `data_nascimento`, RF-08.3) excluída do cálculo, nunca tratada como `0` — confirmado por leitura de `mediasPorTime`/`calcularCusto` e pelo schema `AtletaMontadoResponse.idade` (`nullable: true`) do `API-CONTRACT.yaml` |
| Timeout → "falha técnica real", nunca trava a função serverless | Leitura de `timeout.ts` (`Deadline`/`TimeoutError`) + `montar.ts` (`try/catch` convertendo `TimeoutError` em `{ tipo: "falha_tecnica" }`) + `app/api/times/sugestao/route.ts` (`500`, corpo `{ error: "falha_tecnica", message }`) + 2 testes de integração dedicados (`src/modules/times/__tests__/montar.integration.test.ts`, via `orcamentoMsOverride` negativo, exclusivo de teste) reexecutados pelo QA | ✅ Semânticas diferentes por fase corretamente implementadas: Fase 1 usa `deadline.verificar()` (lança, converte em `500` — "ainda não provou nem ok nem conflito"), Fase 2 usa `deadline.vencido()` (não lança — devolve a melhor partição já válida encontrada); resposta HTTP sempre controlada, nunca um processo abortado sem resposta |

**Verificação adicional do QA, além do texto literal do critério**:
`quantidade_times` genuinamente parametrizável (`2..10`, validado em
`src/modules/times/validation.ts`, `.min(QUANTIDADE_TIMES_MINIMA).max(MAX_QUANTIDADE_TIMES)`,
mais `superRefine` rejeitando `quantidade_times > atletas_ids.length`) —
nunca hardcoded `N=2` no backend (o `N=2` fixo é uma decisão do **Frontend**
em `FE-09`, não do algoritmo). `POST /api/times/sugestao` corretamente
coberto por `WRITE_METHODS` do `middleware.ts` (`401` sem sessão,
reconfirmado por leitura + pela suíte de `middleware.test.ts`).

**GAP de persistência sinalizado pela própria nota de status de `BE-11`** —
avaliado pelo QA e confirmado como **resolvido**, não como lacuna aberta: o
próprio `BE-13` (Seção 11.3 abaixo) implementou `POST
/api/rodadas/{id}/times`, exatamente como a nota de `BE-11` antecipava
("ficará resolvido ali... se for esse o caso"). Não é uma reinterpretação do
critério de aceite de `BE-11` (que continua correto: o endpoint de `BE-11`
nunca persiste, por desenho) — é confirmação de que o desvio estrutural foi
tratado com decisão explícita de quem tem autoridade para isso (o usuário),
não absorvido silenciosamente.

**Achados**: nenhum. Todos os 3 itens do critério de aceite satisfeitos,
verificados de forma independente (leitura de código linha a linha + 11
testes de integração/atomicidade reexecutados pelo QA, incluindo os 2 de
timeout determinístico).

**Veredito**: **BE-11: Aprovado**, sem ressalva.

### 11.2 BE-12 — CRUD de Restrições Obrigatórias

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Desativar uma
restrição preserva o registro histórico com `desativado_em`, nunca exclui
fisicamente; qualquer sessão válida pode criar/editar/desativar (sem
hierarquia, RN-12)."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Desativar preserva histórico (`desativado_em`), nunca exclui fisicamente | (a) Leitura de `src/modules/times/restricoes/{repository,mutate}.ts` — só `UPDATE ativo=false/desativado_em=now()`, nenhum `DELETE`; (b) 9 testes de integração reais reexecutados (`app/api/restricoes/__tests__/restricoes.integration.test.ts`); (c) `DELETE FROM app.restricao_obrigatoria` emitido diretamente pelo QA via `psql`, **como superusuário Postgres** (privilégio maior que `service_role`, bypassa RLS por completo) | ✅ `UPDATE` idempotente confirmado (reativar/desativar de novo preserva a data original); `DELETE` direto bloqueado pelo trigger `forbid_restricao_obrigatoria_delete` com a mensagem exata da migration, reproduzido pelo QA numa condição ainda mais rigorosa que a suíte do Backend (que só testa via API/`service_role`, não via superusuário direto) — garantia estrutural, não apenas "a API não chama DELETE" |
| Qualquer sessão válida pode criar/editar/desativar, sem hierarquia (RN-12) | Leitura de todas as 5 rotas (`app/api/restricoes/**`) + módulo (`validation.ts`/`mutate.ts`/`repository.ts`) — busca por qualquer parâmetro de identidade/papel de quem chama | ✅ Nenhuma função ou rota deste módulo recebe/verifica identidade do chamador; a única checagem de autorização é a sessão válida binária do `middleware.ts` — RN-12 satisfeita por ausência estrutural, não por uma checagem condicional que poderia ser inconsistente |

**Reforço estrutural além do texto literal, verificado empiricamente**: o
trigger `forbid_restricao_obrigatoria_delete` (mesmo padrão já usado em
`app.atleta`/`app.lancamento_pontos`, BE-02) — reproduzido pelo QA como
parte do bloco de verificação comum da Seção 11 acima.

**`GET /api/restricoes` exige sessão mesmo sendo leitura** — confirmado por
leitura de `middleware.ts` (`INTERNAL_READ_PROTECTED_PREFIXES` inclui
`/api/restricoes`) e pelos 2 casos de `middleware.test.ts` (401 sem sessão /
passagem com sessão válida), reexecutados pelo QA na suíte completa.

**Decisão de detalhe do Backend, avaliada pelo QA (não escalada, dentro da
autoridade delegada)**: adição de `POST /api/restricoes/{id}/reativar`, não
citado literalmente no texto de RF-05.5 ("cadastrar, editar, desativar").
Confirmado como consistente — o `UX-SPEC.md` (T10, linha da Seção 4:
"Toast de sucesso + lista atualizada"; wireframe da Seção 2) já desenha um
botão "Reativar" para toda restrição desativada, e RN-11 nunca descreve a
desativação de restrição como irreversível (diferente da anonimização de
atleta, ADR-011) — sem esse endpoint, `FE-10` (que de fato o consome, ver
11.5) ficaria sem suporte de API para uma ação já aprovada a montante. Não é
extrapolação de escopo, é fechamento de uma dependência real da mesma
cadeia de execução.

**Achados**: nenhum. Todos os itens do critério satisfeitos, reforço
estrutural reproduzido pelo QA numa condição mais rigorosa que a própria
suíte do Backend.

**Veredito**: **BE-12: Aprovado**, sem ressalva.

### 11.3 BE-13 — Serviço de Substituições (RF-06) + persistência de times (escopo ampliado)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Registrar
substituição não altera saldo de nenhum atleta; múltiplas substituições na
mesma rodada sem limite (RF-06.2); tentar usar o mesmo atleta em 'sai' e
'entra' é bloqueado com mensagem clara."

**Nota preliminar de QA sobre o escopo ampliado**: a nota de status de
`BE-13` no `TASK.md` registra que esta mesma execução também implementou
`POST /api/rodadas/{id}/times` (persistência de `app.time`/`app.time_atleta`),
por **decisão explícita do usuário**, não do próprio Backend, para resolver
o GAP estrutural sinalizado por `BE-11`. O QA confirma que essa é a leitura
correta do limite de autoridade do Backend (TASK.md Seção 1.0/limite de
autoridade dos agentes de implementação: desvio estrutural de decomposição
não pode ser absorvido silenciosamente por quem implementa) — o registro no
`TASK.md` é explícito quanto à origem da decisão, não uma alegação
verificável de forma independente pelo QA (decisão de processo, não de
código); o QA valida os DOIS blocos de funcionalidade entregues, como
qualquer código real da árvore de trabalho.

**Parte 1 — critério de aceite literal de `BE-13` (Serviço de Substituições)**:

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Registrar substituição não altera saldo de nenhum atleta | Leitura de `src/modules/times/substituicoes/{repository,mutate}.ts` (única escrita do módulo é `INSERT` em `app.substituicao`) + 8 testes de integração reais reexecutados (`app/api/rodadas/[id]/substituicoes/__tests__/substituicoes.integration.test.ts`), incluindo o caso que consulta `app.lancamento_pontos` da rodada e confirma **zero linhas** após o registro | ✅ Prova negativa direta (não apenas ausência de código que escreva em `lancamento_pontos`), reexecutada pelo QA |
| Múltiplas substituições na mesma rodada sem limite (RF-06.2) | Leitura de `validation.ts`/`repository.ts` (nenhuma checagem de teto/contagem) + teste de integração com 5 substituições sucessivas na mesma rodada, `GET` listando todas em ordem cronológica | ✅ Nenhum limite implementado, comportamento confirmado por teste real |
| Mesmo atleta em "sai"/"entra" bloqueado com mensagem clara | Leitura de `substituicaoBodySchema.refine` (zod, mensagem citando "diferentes") + constraint `substituicao_atletas_distintos_check` já existente no banco (BE-02, defesa em profundidade) + teste de integração (`400`, nada persistido) | ✅ Bloqueio em duas camadas (validação de aplicação + constraint de banco), mensagem clara confirmada nos dois níveis |

**Parte 2 — persistência de times (`app.confirmar_times_rodada`, escopo
ampliado), verificação por reprodução real e direta pelo QA (além dos 10
testes de integração do Backend, também reexecutados)**:

- Atomicidade "tudo ou nada": reproduzido pelo QA — atleta inexistente
  recusa com `404` **antes** de qualquer chamada à função PL/pgSQL
  (`confirmarTimes` em `mutate.ts` valida existência via
  `buscarAtletasParaMontagem` primeiro), confirmado por leitura de código;
  o próprio teste do Backend confirma nada persistido nesse caso
  consultando `app.time` diretamente.
- Reconfirmação substitui a divisão anterior por completo — reproduzido
  diretamente pelo QA via `psql`: rodada nova → `confirmar_times_rodada`
  (2 times) → confirma de novo com outra composição → `app.time`/
  `app.time_atleta` refletem só a divisão mais recente.
- Bloqueio de reconfirmação quando já existe substituição registrada
  (`errcode TM001`, fidelidade histórica RF-06.1) — reproduzido de ponta a
  ponta pelo QA: rodada → confirmar times → registrar 1 substituição →
  tentar reconfirmar → erro exato `"...não é possível
  reconfirmar/substituir a divisão (fidelidade histórica, RF-06.1)"`,
  batendo com o texto da migration e com o `409`/`ErroSubstituicaoExistenteBloqueiaReconfirmacao`
  publicado em `API-CONTRACT.yaml`.
- Defesa em profundidade `TM002` (mesmo atleta em dois times na mesma
  chamada) — reproduzido isoladamente pelo QA, mensagem exata confirmada.
- `GRANT EXECUTE`/`REVOKE` da função — confirmado por
  `has_function_privilege`: `anon` = `false`, `service_role` = `true`.
- Uso de função PL/pgSQL dedicada, justificado por necessidade técnica de
  atomicidade multi-tabela (o cliente `service_role` fala com o Postgres
  exclusivamente via PostgREST, sem transação client-side abrangendo
  múltiplas chamadas) — racional lido e considerado válido pelo QA, mesmo
  padrão arquitetural já usado por `lancar_rodada`/`excluir_rodada`/
  `anonimizar_atleta` (ADR-006), aplicado aqui por analogia correta (não
  porque a operação altera saldo, que não altera).

**Middleware**: `/api/rodadas` corretamente adicionado a
`INTERNAL_READ_PROTECTED_PREFIXES` por causa de `GET .../substituicoes`
(leitura interna sem dado pessoal sensível, mas exclusiva da área interna,
mesmo racional de `GET /api/restricoes`) — confirmado por leitura +
suíte de `middleware.test.ts`.

**Convenção de rollback de CI**: reexecutado pelo QA o mesmo grep do job
`migration-convention-check` contra as migrations novas — `DROP FUNCTION`
presente dentro do bloco `-- ROLLBACK:` de ambas (`forbid_restricao_obrigatoria_delete`,
`confirmar_times_rodada`); nenhuma falha.

**Achados**: nenhum bloqueante. Ambas as partes (Serviço de Substituições +
persistência de times) satisfazem seus respectivos critérios, verificadas
por reprodução real direta contra o banco, não apenas pela suíte fornecida.

**Veredito**: **BE-13: Aprovado**, sem ressalva (inclui a parte de escopo
ampliado, avaliada com o mesmo rigor da parte de critério literal).

### 11.4 FE-09 — T09 Montagem de Times

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Geração de
sugestão com indicadores de equilíbrio por time; estado de conflito
consumindo `restricoes_conflitantes`/`grupos_conflito` via `ConflictList`
(`role="alert"`); 'Trocar jogador' via modal de seleção (nunca só
drag-and-drop); layout desta release fixo em 2 colunas (decisão Seção 6);
estado de 'falha técnica real' reaproveitado para o caso de timeout do
backend."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Geração de sugestão com indicadores de equilíbrio por time | Leitura de `TimesResultado.tsx` + `times.test.ts` (`recomputeTeamStats`) | ✅ `Card` por time com nível técnico médio/idade média, "—" quando `null` (nunca inventado); `swapAtletas` recalcula só os dois times afetados, sem nova chamada de rede |
| Estado de conflito via `ConflictList` (`role="alert"`) consumindo `restricoes_conflitantes`/`grupos_conflito` | Leitura de `MontagemTimesShell.tsx` (mapeamento `conflito.restricoes_conflitantes`/`conflito.grupos_conflito` → props de `ConflictList`) + `ConflictList.tsx` (`role="alert"` no `div` wrapper, confirmado por leitura direta) + 6 testes de `ConflictList.test.tsx` reexecutados | ✅ Consumo fiel do contrato real do ADR-010 (mesmos nomes de campo verificados na Seção 11.1); ícone `⚡` sempre `aria-hidden` com texto associado ("não podem ficar juntos") — WCAG 1.1.1/1.4.1 |
| "Trocar jogador" via modal de seleção, nunca só drag-and-drop | Leitura de `TrocarJogadorModal.tsx` — nenhum atributo/listener de `draggable`/`dragstart`/`drop` em nenhum arquivo de `src/features/times/` | ✅ Candidatos são `button` nativo, focável/navegável por teclado; nenhum drag-and-drop implementado nesta release, consistente com a decisão documentada (Seção 6.2 do `UX-SPEC.md`: atalho de arrastar é "pode oferecer", não "deve") |
| Layout fixo em 2 colunas (decisão Seção 6) | Leitura de `TimesResultado.module.css` | ✅ `grid-template-columns: 1fr` em `base`, `1fr 1fr` só a partir de `@media (min-width: 1024px)` — bate exatamente com `UX-SPEC.md` Seção 6.2 ("T09... `lg`: Times lado a lado (colunas)"); "2 colunas" refere-se à quantidade de times desta release (`QUANTIDADE_TIMES = 2` em `times.ts`), não a um layout de grade arbitrário |
| Estado de "falha técnica real" reaproveitado para timeout do backend | Leitura de `timesApi.ts` (`TimesFalhaTecnicaError`) + `MontagemTimesShell.tsx` (mensagem de erro genérica em `erroGeracao`) | ✅ Nenhuma tela nova criada para o caso de timeout — reaproveita o mesmo estado de erro de geração já previsto pelo `UX-SPEC.md` Seção 4 ("falha técnica real... Não foi possível gerar a sugestão, tente novamente") |

**Integração cruzada Frontend↔Backend (dentro do lote + com `BE-16`, `L5`,
dependência cruzada de lote)**: `timesApi.ts` confirmado, por leitura direta,
chamando exatamente `POST /api/times/sugestao` e `POST
/api/rodadas/{id}/times` (BE-11/BE-13, L6) e `GET /api/rodadas`/`GET
/api/rodadas/{id}` (BE-16, L5) — nenhum mock, nenhuma URL divergente do
`API-CONTRACT.yaml`. O QA reexecutou a suíte de integração real do Backend
(Seção 11, bloco comum) que cobre `BE-16` (`listar.integration.test.ts`/
`detalhar.integration.test.ts`, 8 testes) — todos passando de forma
independente. **Observação (não bloqueante, não é achado de bug)**:
`BE-16` pertence ao Lote L5, ainda sem veredito agregado formal de QA neste
relatório (L5 segue pendente de fechamento próprio); a dependência de `FE-09`
sobre esse endpoint foi verificada funcionalmente aqui (contrato + testes
reais passando), mas o fechamento formal do Lote L5 em si é responsabilidade
de uma validação própria daquele lote, não substituída por esta.

**Achados**: nenhum. Todos os 5 itens do critério satisfeitos, contrato de
dado consumido fielmente, WCAG confirmado por leitura + `jest-axe` (0
violação nos 85 testes novos, incluindo `MontagemTimesShell.test.tsx`).

**Veredito**: **FE-09: Aprovado**, sem ressalva.

### 11.5 FE-10 — T10 Gestão de Restrições Obrigatórias

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "CRUD de pares com
soft-delete visível (data de desativação, nunca remoção da lista);
autocomplete de atleta nos dois seletores."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| CRUD de pares completo | Leitura de `RestricoesList.tsx`/`RestricaoFormModal.tsx`/`restricoesApi.ts` | ✅ Criar (`RestricaoFormModal`, modo `create`), editar (modo `edit`, só para ativas — decisão de detalhe consistente, sem paralelo funcional para editar uma restrição já desativada), desativar/reativar (ação direta na lista) — os 4 verbos de `RF-05.5` + `reativar` (`BE-12`) todos exercitados |
| Soft-delete visível (data de desativação, nunca remoção da lista) | Leitura de `RestricoesList.tsx` (linhas 219–256) + `RestricoesList.test.tsx` (caso "ambos os status simultâneos na lista") | ✅ Restrição desativada permanece na lista com `"Desativada em DD/MM/AAAA"` (`formatDataDesativacao`, pt-BR) + botão "Reativar"; ativa mostra "Ativa" + "Editar"/"Desativar" — as duas linhas coexistem, confirmado por teste explícito, nunca uma remove a outra da tela |
| Autocomplete de atleta nos dois seletores | Leitura de `Combobox.tsx` + `RestricaoFormModal.tsx` (2 instâncias de `Combobox`, um por atleta) | ✅ Implementa o padrão ARIA 1.2 "Combobox with List Autocomplete" — `role="combobox"` no `<input>` real (nunca um `<div>` estilizado), `aria-expanded`/`aria-controls`/`aria-autocomplete="list"`/`aria-activedescendant` corretos, `listbox`/`option` reais com `aria-selected`; filtro tolerante a acento/caixa (`normalize`, `NFD`); seleção sempre exige opção real da lista, nunca aceita texto livre (`onChange("")` ao digitar, até nova seleção) |

**Verificação independente adicional do QA no `Combobox`**: o padrão ARIA
1.2 recomenda (não exige para WCAG 4.1.2, mas é boa prática da APG)
`aria-haspopup="listbox"` no input além dos atributos já presentes — **não
implementado**. Registrado como **BUG-QA-FE10-01** abaixo (severidade
baixa, não bloqueia — 4.1.2 já está satisfeito pelo `role="combobox"` +
`aria-expanded`/`aria-controls` presentes, que já comunicam nome/função/
valor corretamente; `aria-haspopup` é reforço redundante nesse caso, não
uma lacuna de nome/função/valor).

**Integração cruzada Frontend↔Backend**: `restricoesApi.ts` confirmado
chamando exatamente os 5 endpoints publicados por `BE-12`
(`GET`/`POST /api/restricoes`, `PUT /api/restricoes/{id}`, `POST
.../desativar`, `POST .../reativar`) — nenhum mock. `GET /api/restricoes`
exigindo sessão confirmado (Seção 11.2).

**Achados**: 1 débito de baixa severidade (ver abaixo). Nenhum bloqueio.

---

**BUG-QA-FE10-01 — Severidade: Baixa (débito, sem prazo formal — polimento de acessibilidade)**
- **Componente**: `src/components/ui/Combobox/Combobox.tsx`.
- **Passos para reproduzir**: ler o JSX do `<input role="combobox" ...>` —
  nenhum atributo `aria-haspopup`.
- **Resultado esperado** (WAI-ARIA Authoring Practices, padrão "Combobox
  with List Autocomplete", citado no próprio comentário do componente como
  referência seguida): `aria-haspopup="listbox"` no input, além dos
  atributos já presentes.
- **Resultado obtido**: atributo ausente. `role="combobox"` +
  `aria-expanded`/`aria-controls`/`aria-autocomplete="list"`/
  `aria-activedescendant` já presentes e corretos — WCAG 4.1.2 (nome/
  função/valor) já satisfeito sem este atributo adicional, que é reforço de
  boa prática da APG, não um critério de sucesso WCAG isolado.
- **Por que não bloqueia FE-10**: o critério de aceite literal ("autocomplete
  de atleta nos dois seletores") não menciona `aria-haspopup`
  especificamente, e nenhuma violação foi reportada por `jest-axe` (0
  violação nos 41 testes novos de `FE-10`, incluindo `Combobox.test.tsx`).
- **Ação**: débito de baixa severidade, atribuído ao Frontend — adicionar
  `aria-haspopup="listbox"` ao `<input>` do `Combobox` na próxima janela de
  manutenção do componente, junto com a formalização já sinalizada pelo
  próprio Frontend na Seção 3.2/3.3 do `UX-SPEC.md` (mesmo ponto pendente
  para `Select`, FE-11) — sem prazo formal, não bloqueia nenhuma tarefa
  dependente.

---

**Veredito**: **FE-10: Aprovado com ressalvas** (1 débito de baixa
severidade, `BUG-QA-FE10-01`, não bloqueante).

### 11.6 FE-11 — T11 Substituição no Intervalo

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Acessível a
partir de T09; '+ Registrar outra' sempre disponível; bloqueio acessível ao
selecionar o mesmo atleta em 'sai'/'entra'; reforço textual de 'não altera
pontos'."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Acessível a partir de T09 | Leitura de `TimesResultado.tsx` (botão "Substituições" por time, gated por `confirmados`) + `TimesResultado.test.tsx` (2 casos novos de gating) | ✅ Botão só aparece quando existe uma divisão de fato persistida (`POST /api/rodadas/{id}/times` já confirmado, `BE-13`) e casa por `label` com o time exibido; some após gerar nova sugestão/"Gerar mesmo assim" (confirmação anterior invalidada) — implementado como `Modal` aberto a partir de T09, `onClose` cumprindo o papel do "←" do wireframe |
| "+ Registrar outra" sempre disponível | Leitura de `SubstituicoesModal.tsx` (`handleRegistrarOutra`, botão fora de qualquer condicional de estado) | ✅ Botão sempre visível abaixo da lista (vazia ou não), nunca escondido — limpa os campos e devolve o foco ao seletor "Sai" |
| Bloqueio acessível ao selecionar o mesmo atleta em "sai"/"entra" | Leitura de `SubstituicoesModal.tsx` (`mesmoAtleta`, propagado como prop `error` do `Select` "Entra") + `Select.tsx` (`aria-invalid`/`aria-describedby` via `FormField`) | ✅ Mensagem "Escolha um atleta diferente do que já está saindo." associada ao campo via `aria-describedby`/`aria-invalid` (nunca só desabilitar o submit em silêncio); botão "Registrar Substituição" também desabilitado enquanto a condição persistir — dupla sinalização, uma delas sempre perceptível por leitor de tela |
| Reforço textual "não altera pontos" | Leitura de `SubstituicoesModal.tsx`, linha 184-186 | ✅ Texto literal "Substituição não altera pontos, apenas registro histórico." sempre visível no topo, antes de qualquer estado de carregamento/erro/lista |

**Verificação independente adicional do QA**: "Entra" lista todo atleta
ativo, deliberadamente sem excluir o roster do time atual — confirmado que
isso é necessário (não uma falha de filtro) para que o cenário de bloqueio
acessível seja de fato alcançável pela interface (se "Entra" excluísse quem
já está no time, o par idêntico nunca poderia ser selecionado, e o bloqueio
nunca seria exercitado pelo usuário real). `rosterAtualDoTime`
(`substituicoes.ts`) recalcula corretamente o roster "ao vivo" a partir da
divisão persistida + histórico de substituições em ordem cronológica —
verificado por leitura + 7 testes unitários próprios (`substituicoes.test.ts`),
reexecutados pelo QA.

**Componente `Select` (novo do design system)** — mesma verificação de
FE-00: label sempre visível (`<label for>`), erro associado via
`aria-describedby`/`aria-invalid`; nenhuma decisão visual nova (reaproveita
100% o wrapper `FormField`/`input.module.css` de `TextInput`). Nenhum
achado.

**Integração cruzada Frontend↔Backend**: `substituicoesApi.ts` confirmado
chamando exatamente `GET`/`POST /api/rodadas/{id}/substituicoes` (`BE-13`) —
nenhum mock.

**Achados**: nenhum. Todos os 4 itens do critério satisfeitos.

**Veredito**: **FE-11: Aprovado**, sem ressalva.

### 11.7 Checklist de "Pronto" do lote (Definition of Done por lote)

- [x] Todo critério de aceite de cada uma das 6 tarefas do lote foi testado
      e está passando — verificado item a item nas Seções 11.1 a 11.6,
      reproduzido de forma independente (código lido linha a linha, testes
      reexecutados, consultas SQL diretas para os pontos estruturais mais
      críticos)
- [x] Nenhum bug de severidade alta/crítica em aberto em qualquer tarefa do
      lote
- [x] Todo bug de severidade baixa/média está registrado como débito, com
      prazo — único achado do lote é `BUG-QA-FE10-01` (baixa, sem prazo
      formal, não bloqueante)
- [x] Testes de integração cruzada executados e passando: dentro do lote
      (`FE-09`↔`BE-11`/`BE-13`, `FE-10`↔`BE-12`, `FE-11`↔`BE-13`, Seções
      11.4/11.5/11.6) e com dependência de lote não-L6 (`FE-09`↔`BE-16`,
      `L5` — funcionalmente verificado, ver observação da Seção 11.4 sobre
      o fechamento formal do próprio `L5` ainda estar pendente em separado)
- [x] Requisito não funcional relevante validado: acessibilidade WCAG dos
      componentes novos (`ConflictList` — `role="alert"`, ícone `aria-hidden`
      com texto associado; `Select`/`Combobox` — padrão ARIA nativo/1.2
      Combobox with List Autocomplete; todos com 0 violação `jest-axe`
      confirmada na suíte completa) e responsividade conforme `UX-SPEC.md`
      Seção 6.2 (T09: 1 coluna em `base`, 2 colunas a partir de `lg`/1024px,
      confirmado por leitura direta do CSS Module)

### 11.8 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-11` | Aprovado | Seção 11.1 |
| `BE-12` | Aprovado | Seção 11.2 |
| `BE-13` | Aprovado (inclui escopo ampliado) | Seção 11.3 |
| `FE-09` | Aprovado | Seção 11.4 |
| `FE-10` | Aprovado com ressalvas (1 débito de baixa severidade) | Seção 11.5 |
| `FE-11` | Aprovado | Seção 11.6 |

## **Lote L6 — Montagem de Times, Restrições e Substituições: Aprovado com ressalvas**

As 6 tarefas do lote foram validadas de forma independente pelo QA —
código-fonte lido linha a linha (não apenas as notas de status extensas
deixadas pelos times no `TASK.md`), suíte completa (788 testes) e suíte de
integração real (190 testes, contra Supabase local resetado do zero)
reexecutadas com os mesmos números relatados, `lint`/`typecheck`/
`format:check`/`build` confirmados limpos, e os pontos estruturais mais
críticos (deny-by-default de `anon` nas 4 tabelas do lote, trigger de
não-exclusão de `restricao_obrigatoria` numa condição mais rigorosa que a
suíte do Backend, atomicidade/bloqueio de reconfirmação de
`confirmar_times_rodada`, `GRANT EXECUTE` restrito a `service_role`)
reproduzidos empiricamente pelo QA via `psql` direto, além da suíte
automatizada.

O lote é classificado **"Aprovado com ressalvas"** (não "Aprovado" puro)
por um único débito de severidade baixa (`BUG-QA-FE10-01` — atributo
`aria-haspopup` ausente no `Combobox`, sem impacto WCAG confirmado, sem
prazo formal), não bloqueante. Nenhum bug de severidade alta/crítica em
aberto em nenhuma das 6 tarefas. Nenhuma ação de reprovação necessária em
`TASK.md` — todas as 6 tarefas permanecem `Concluída`.

**Observação de escopo (não é achado de bug, não bloqueia este lote)**:
`FE-09` depende funcionalmente de `BE-16` (`GET /api/rodadas`/`GET
/api/rodadas/{id}`), tarefa do Lote L5 já `Concluída` e cujos testes reais
foram reexecutados com sucesso pelo QA como parte da integração cruzada
desta validação — mas o fechamento formal agregado do próprio Lote L5
segue pendente de validação própria, em separado, não substituída por esta
entrada.

**Nota de rastreabilidade de padrão (não é escalonamento)**: nenhum padrão
recorrente de bug foi identificado entre as 6 tarefas deste lote nem em
relação aos achados de lotes anteriores (os achados de `format:check`/
`AppNav` de `L0` já estavam resolvidos antes de `L1`; o débito de
segurança de `BE-04` é de natureza distinta do achado de acessibilidade
aqui). Guardrail de "só escala por padrão recorrente" seguido — nenhuma
entrada nova em `BLOCKERS.md`.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps e,
em seguida, à aprovação do Tech Lead, conforme `EXECUTION-FLOW.md` §5.

---

## 12. Fechamento retroativo dos Lotes L2–L5 (2026-09-04)

**Contexto**: `EXECUTION-LOG.md` (Lote L6, "Achado de processo sinalizado")
registrou que os Lotes L2, L3, L4 e L5 nunca receberam veredito agregado de
QA como unidade fechada, apesar de todas as suas tarefas estarem
`Concluída` em `TASK.md` desde antes do fechamento de L6, e de o código já
estar em produção (`DEPLOY.md`). O CTO priorizou fechar esse gap agora. As
Seções 13 a 16 abaixo aplicam o mesmo rigor já usado em L1 (Seções 8-10) e
L6 (Seção 11): validação independente contra o critério de aceite literal
de cada tarefa, reexecução real da suíte automatizada (não aceite dos
números relatados), teste de integração cruzada dentro do lote e entre
lotes, validação de requisito não funcional relevante, e veredito por
tarefa/lote.

**Método comum às Seções 13-16 (aplicado uma vez, não repetido em cada
subseção)**, mesmo protocolo de reprodução independente já usado em L6:

- `npm test -- --run`: **102 arquivos / 793 testes, 0 falha**.
- `npm run lint`: limpo (0 erro/warning). `npx tsc --noEmit`: limpo.
- `npm run format:check`: 1 arquivo com problema de formatação —
  `app/api/auth/__tests__/login.timing.test.ts` — **fora do escopo de
  L2-L5** (tarefa de segurança de `L1`/autenticação, já `Concluída`/fechada
  antes desta validação, commit `56d9047`); não é um achado novo de nenhuma
  tarefa de L2-L5, registrado aqui só para não ficar oculto, sem afetar o
  veredito de nenhum dos 4 lotes desta seção.
- `npm run build` (env placeholders, mesmo método já usado desde `BE-01`):
  compila limpo, gera as 21 rotas esperadas, incluindo todas as rotas de
  página/API de L2-L5 (`/`, `/atletas`, `/atletas/[id]`, `/atletas/novo`,
  `/rodadas/nova`, `/historico`, `/historico/auditoria`,
  `/rodadas/[id]/corrigir`, `/api/atletas*`, `/api/rodadas*`,
  `/api/log-auditoria`).
- Ambiente Supabase local resetado do zero (`npx supabase db reset`) — as
  30 migrations existentes aplicadas sem erro. `npm run test:integration
  -- --run` executado **duas vezes seguidas**: **19 arquivos / 183 testes**
  na primeira execução, **181 passando + 2 puladas** na segunda (mesmas 2
  puladas de sempre, `trava-schema-legada.integration.test.ts`, fora do
  escopo de L2-L5, comportamento intencional já documentado em L6) — sem
  colisão, sem regressão.
- Verificação direta via `psql` (container `supabase_db_...`, fora de
  qualquer helper do Backend): (a) `has_function_privilege` confirma que as
  6 funções PL/pgSQL introduzidas por L3/L4/L5
  (`anonimizar_atleta`/`lancar_rodada`/`excluir_rodada`/
  `corrigir_participacao_rodada`/`calcular_correcao_participacao_rodada`/
  `simular_correcao_rodada`) são executáveis **só** por `service_role`
  (`anon`: `f` nas 6, `service_role`: `t` nas 6); (b)
  `information_schema.role_table_grants` confirma que `anon`/`public` têm
  `SELECT` **só** em `ranking_publico`/`presenca_mensal_publica` — nenhum
  grant novo em nenhuma tabela base introduzido por L3/L4/L5; (c) `UPDATE`/
  `DELETE` em `app.lancamento_pontos` e `DELETE` em `app.atleta`
  reproduzidos como superusuário `postgres` (privilégio maior que
  `service_role`, bypassa RLS) — ambos bloqueados pelos triggers de BE-02
  com a mensagem exata das migrations, dados de teste revertidos em
  seguida; (d) `app.configuracao_pontuacao` seedada por `BE-08` confere
  byte a byte com a tabela fixa de RN-05
  (`presenca=+2, ausencia=0, gol=+3, cartao_amarelo=-1,
  cartao_vermelho=-3`, `vigente_desde=2000-01-01`).
- Verificação empírica adicional (além do que L6 fez): `npm run build &&
  npm run start` real contra o Supabase local, `curl` direto (sem cookie de
  sessão) contra `GET /api/atletas`, `GET /api/rodadas`, `GET
  /api/restricoes` e `GET /api/log-auditoria` — os 4 devolvem `401`
  (`{"error":"Sessão inválida ou expirada."}`) e `GET /api/health` devolve
  `200`, confirmando `INTERNAL_READ_PROTECTED_PREFIXES` (`middleware.ts`)
  em produção real, não só na suíte de `middleware.test.ts`.

**Achado estrutural transversal, não bloqueante**: a Seção 3.0 de
`TASK.md` (tabela de lotes) lista `L5` como `BE-09, BE-10, FE-06, FE-07,
FE-08` — mas a própria linha de `BE-16` (Seção 3.1) marca sua coluna
`Lote` como `L5`, e o próprio `QA-REPORT.md` Seção 11.4 (fechamento de
L6) já tratou `BE-16` como pertencente a `L5` ("`BE-16` pertence ao Lote
L5..."). `BE-16` existe precisamente porque `FE-06`/`FE-07` (ambas
literalmente em L5) dependem dela para funcionar contra API real — tratar
`BE-16` como fora de L5 deixaria a validação de integração cruzada de
`FE-06`/`FE-07` sem cobertura de nenhum lote. Este agente segue o mesmo
critério já usado no fechamento de L6 (trata `BE-16` como parte de L5,
validada na Seção 16 abaixo) e sinaliza a inconsistência textual da tabela
da Seção 3.0 (nunca atualizada para incluir `BE-16` explicitamente) como
achado de processo a corrigir pelo Tech Lead — não decidido
silenciosamente aqui, e não bloqueia o fechamento de L5.

---

## 13. Lote L2 — Ranking e Presença Pública

**Gatilho**: `BE-03`, `FE-02`, `FE-03` (`TASK.md` Seção 3.0) todas
`Concluída`. `BE-03` já tem veredito individual "Aprovado" (Seção 4,
incremento de `ausencias` também "Aprovado", Seção 4.7) — **não repetido
aqui**, apenas referenciado. `FE-02`/`FE-03` nunca tiveram validação
individual de QA — primeira validação de ambas nesta seção.

### 13.1 FE-02 — T02 Ranking Público

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "Lista ordenada
por RN-08 (cascata completa); nunca solicita `contato`/`data_nascimento` à
view; top 3 com destaque textual, não só visual; vira `<table>` real em
`lg` (Seção 6.2); timestamp de atualização visível."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Lista ordenada por RN-08 (cascata completa) | Leitura de `rankingApi.ts` — 4 `.order()` encadeados | ✅ `pontuacao_acumulada desc → presencas desc → cartoes asc → nome_exibicao asc`, exatamente a cascata de RN-08, aplicada explicitamente na consulta (não depende do `ORDER BY` implícito da view) |
| Nunca solicita `contato`/`data_nascimento` à view | Leitura de `rankingApi.ts` (`RANKING_PUBLICO_COLUMNS`) | ✅ Lista literal de 5 colunas (`atleta_id, nome_exibicao, pontuacao_acumulada, presencas, cartoes`), nunca `select("*")`, nenhuma referência a `contato`/`data_nascimento` em nenhum ponto do módulo |
| Top 3 com destaque textual, não só visual | Leitura de `RankingList.tsx` | ✅ Ordinal textual (`formatOrdinal`, "1º"/"2º"/"3º") sempre renderizado; medalha decorativa com `aria-hidden="true"` — destaque nunca depende só de cor/ícone (WCAG 1.4.1) |
| Vira `<table>` real em `lg` | Leitura de `RankingList.module.css` (regra `@media (min-width: 1024px)`) + `RankingList.tsx` (`role="table"`/`"rowgroup"`/`"row"`/`"columnheader"`/`"cell"` explícitos em todo breakpoint) | ✅ `display: grid` (cartão) em `base`, `display: table*` real a partir de `lg`; papel ARIA explícito garante semântica de tabela mesmo quando `display` não é `table` em `base`/`sm` — nunca removida via CSS |
| Timestamp de atualização visível | Leitura de `RankingList.tsx` (`state.updatedAt`, capturado no fetch bem-sucedido) + `format.ts` (`formatUpdatedAt`) | ✅ "Atualizado em: DD/MM/AAAA" sempre renderizado no estado de sucesso |

**Reexecução real dos testes**: 21 testes deste módulo (`format.test.ts`,
`rankingApi.test.ts`, `RankingList.test.tsx`, `PublicHomeShell.test.tsx`,
`app/page.test.tsx`) incluídos na reexecução completa da Seção 12 (793
testes, 0 falha) — 0 violação `jest-axe` confirmada nos estados de
sucesso/erro.

**Achado de processo — não é reprovação de `FE-02`, critério de aceite
literal 100% satisfeito** (guardrail deste agente: nunca reinterpretar o
critério de aceite ao validar): `BLOCKER-004`/`BLOCKER-005`
(`BLOCKERS.md`) foram resolvidos confirmando `RF-03.1` como requisito
firme ("o sistema deve sempre exibir... número de presenças e número de
ausências") e determinando que a view `app.ranking_publico` ganhasse um
campo `ausencias` (o que de fato aconteceu — sub-item de `BE-03`, Seção
4.7, coluna confirmada presente no banco por este agente via `psql`) **e**
que o Frontend incrementasse `FE-02` para consumir/exibir a coluna nova —
isso nunca aconteceu (`types.ts`/`rankingApi.ts` de `FE-02` não têm nenhuma
referência a `ausencias`, e o comentário de `types.ts` ainda cita
`BLOCKER-004` como "aguardando confirmação do `ux-ui`", desatualizado
desde a resolução do próprio bloqueio). Adicionalmente, um commit posterior
directo do proprietário do produto (`d9b77e5`, 2026-09-04, fora da cadeia
de agentes deste pipeline, autoria confirmada via `git log`) **removeu**
as colunas de presenças/cartões da tabela pública inteiramente ("decisão de
produto do organizador... diverge de RF-03.1/UX-SPEC.md Seção 2/6.2"),
documentado no próprio commit e no arquivo de teste — não escondido. O
resultado prático: a tabela pública de ranking em produção hoje mostra
só Posição/Atleta/Pontos, e nem `PRD-TECNICO.md` RF-03.1 nem
`UX-SPEC.md` Seção 2/6.2 foram atualizados para refletir essa decisão —
`BLOCKER-004`/`BLOCKER-005` seguem marcados "Resolvido" descrevendo um
estado que a produção real não tem mais. **Não bloqueia `FE-02`** (o
critério de aceite literal desta tarefa, como escrito em `TASK.md`, nunca
citou presenças/cartões/ausências) e **não é uma reinterpretação deste
agente** do critério de `FE-02` — é sinalização de que a documentação de
produto (`PRD-TECNICO.md`/`UX-SPEC.md`/`BLOCKERS.md`) está desatualizada
em relação ao que está de fato em produção, sinal de retorno ao Tech
Lead/BA para reconciliar formalmente (fechar `BLOCKER-004`/`BLOCKER-005`
como superados pela decisão do organizador, ou reverter a decisão —
decisão de produto, fora da autoridade de QA).

**Veredito**: **FE-02: Aprovado**, sem ressalva de bug (achado de processo
acima registrado separadamente, não conta como débito de severidade contra
esta tarefa).

### 13.2 FE-03 — T03 Presença Mensal (público)

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "Navegação por
mês civil (RN-09) com accordion de presentes por rodada; estado 'nenhuma
rodada lançada' tratado."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Navegação por mês civil (RN-09) | Leitura de `PresencaMensal.tsx` (`shiftMesCivil`, mês inicial calculado só em `useEffect`) + `format.ts` | ✅ Mês inicial é o mês civil corrente (nunca calculado no render inicial, evita divergência de hidratação); `shiftMesCivil` faz rollover de ano corretamente em ambas as direções — confirmado por leitura + 7 testes de `format.test.ts` reexecutados |
| Accordion de presentes por rodada | Leitura de `PresencaMensal.tsx` (componente `Accordion`, reaproveitado do design system, fechado por padrão) | ✅ Um painel por rodada do mês, título `"DD/MM · Presentes: N"`, `nomes_presentes` exibido já ordenado alfabeticamente pela própria view (nunca reordenado no cliente) |
| Estado "nenhuma rodada lançada" tratado | Leitura de `PresencaMensal.tsx` | ✅ `EmptyState title="Nenhuma rodada lançada neste mês"` quando o mês não tem rodadas; rodada com `total_presentes = 0` tratada à parte, dentro do próprio painel ("Nenhum presente registrado nesta rodada.") — nunca um painel vazio sem explicação |

**Verificação adicional do QA**: `presencaMensalApi.ts` nunca usa
`select("*")` (`PRESENCA_MENSAL_COLUMNS`, 6 colunas literais, nunca
`contato`/`data_nascimento`) e filtra no servidor via `.eq("ano", ...)
.eq("mes", ...)` — evita trazer o histórico inteiro só para descartar no
cliente, reforçado por `.order("rodada_data", { ascending: true })`
explícito (o contrato não garante ordem formal para este endpoint, ao
contrário de `ranking_publico`). Região `aria-live="polite"` envolvendo o
corpo abaixo do navegador de mês, confirmada por leitura direta —
reforço de acessibilidade além do exigido literalmente pelo critério.

**Reexecução real dos testes**: 21 testes deste módulo
(`format.test.ts`, `presencaMensalApi.test.ts`, `PresencaMensal.test.tsx`)
incluídos na reexecução completa da Seção 12 — 0 violação `jest-axe`.

**Integração cruzada Frontend↔Backend**: `presencaMensalApi.ts` confirmado
chamando exatamente `presenca_mensal_publica` (view real de `BE-03`, já
aprovada) via `getAnonClient()` — nenhum mock; suíte de integração real de
`BE-03` (`public-views.integration.test.ts`, 7 testes, incluindo os casos
de `ausencias`/`lesionado` do sub-item da Seção 4.7) reexecutada pelo QA
como parte do bloco comum da Seção 12, passando.

**Achados**: nenhum. Todos os 3 itens do critério satisfeitos.

**Veredito**: **FE-03: Aprovado**, sem ressalva.

### 13.3 Checklist de "Pronto" do lote (Definition of Done por lote)

- [x] Todo critério de aceite de cada uma das 3 tarefas do lote foi testado
      e está passando — `BE-03` por herança dos vereditos já registrados
      nas Seções 4/4.7 (não repetido); `FE-02`/`FE-03` validadas item a
      item nas Seções 13.1/13.2
- [x] Nenhum bug de severidade alta/crítica em aberto em qualquer tarefa do
      lote
- [x] Todo bug de severidade baixa/média está registrado como débito, com
      prazo — nenhum débito de bug neste lote (o achado da Seção 13.1 é um
      achado de processo/documentação, não um bug de severidade contra
      `FE-02`, tratado à parte, sem numeração `BUG-QA-*`)
- [x] Testes de integração cruzada executados e passando: `FE-02`↔`BE-03`
      (Seção 13.1), `FE-03`↔`BE-03` (Seção 13.2), suíte de integração real
      de `BE-03` reexecutada (Seção 12, bloco comum)
- [x] Requisito não funcional relevante validado: acessibilidade (`jest-axe`
      0 violação em ambos os módulos, papel ARIA explícito de tabela em
      `FE-02`, região `aria-live` em `FE-03`), nenhum dado sensível
      solicitado às views por nenhum dos dois módulos (verificado por
      leitura direta das listas de colunas)

### 13.4 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-03` | Aprovado (validado anteriormente, não repetido) | Seções 4, 4.7 |
| `FE-02` | Aprovado (achado de processo não bloqueante, ver 13.1) | Seção 13.1 |
| `FE-03` | Aprovado | Seção 13.2 |

## **Lote L2 — Ranking e Presença Pública: Aprovado com ressalvas**

As 3 tarefas do lote estão avaliadas: `BE-03` já aprovada em validação
anterior própria (Seções 4/4.7, incluindo o incremento de `ausencias`);
`FE-02`/`FE-03` validadas pela primeira vez nesta sessão, ambas aprovadas
sem bug de nenhuma severidade. O lote é classificado **"Aprovado com
ressalvas"** — não por um bug, mas pelo achado de processo da Seção 13.1
(documentação de produto — `PRD-TECNICO.md` RF-03.1, `UX-SPEC.md` Seção
2/6.2, `BLOCKERS.md` `BLOCKER-004`/`BLOCKER-005` — desatualizada em
relação ao que está de fato em produção desde a decisão direta do
organizador de remover presenças/cartões da tabela pública), que precisa
de reconciliação formal do Tech Lead/BA, mas não impede o uso real da
funcionalidade nem corresponde a um defeito de código. Nenhum bug de
severidade alta/crítica em aberto. Nenhuma ação de reprovação necessária
em `TASK.md` — as 3 tarefas permanecem `Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: o achado de
`FE-02` é isolado (documentação de produto desatualizada após uma decisão
de negócio pontual) — não é um padrão recorrente de bug de execução, não
se enquadra no guardrail de escalonamento ao Tech Lead por padrão
recorrente. Recomendação registrada aqui para quem tiver autoridade sobre
`BLOCKERS.md`/`PRD-TECNICO.md` decidir o encaminhamento (fechar os dois
bloqueios como superados, ou reabrir `FE-02` como nova tarefa incremental)
— não decidido por este agente.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps e,
em seguida, à aprovação do Tech Lead, conforme `EXECUTION-FLOW.md` §5.

---

## 14. Lote L3 — Cadastro de Atletas

**Gatilho**: `BE-06`, `BE-07`, `FE-04` (`TASK.md` Seção 3.0) todas
`Concluída` — primeira validação de QA de qualquer uma das 3.

### 14.1 BE-06 — Serviço de Atletas (CRUD, nível técnico, duplicidade, consentimento)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Cadastro com
idade <18 anos bloqueia salvar sem checkbox de consentimento marcado; nome
duplicado dispara alerta antes de confirmar; nível técnico calculado
corretamente com fallback de pontuação inicial para atleta sem presença."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Idade <18 bloqueia salvar sem consentimento | Leitura linha a linha de `src/modules/atletas/validation.ts` (`calcularIdade`/`exigeConsentimentoResponsavel`/`atletaBodySchema.superRefine`) + 25 testes de `validation.test.ts` reexecutados | ✅ Aritmética de idade em UTC (não depende do fuso do processo); `superRefine` recusa quando `idade < 18` e `consentimento_responsavel_obtido !== true`; bloqueio reaplicado tanto em `POST` quanto em `PUT` (RF-01.6, "idade sempre calculada em relação a agora", não só na criação) |
| Nome duplicado dispara alerta antes de confirmar | Leitura de `encontrarDuplicatasDeNome`/`normalizarNomeCompleto` + `mutate.ts` (orquestração `409` + `confirmar_duplicidade`) + teste de integração real (`atletas.integration.test.ts`) reexecutado | ✅ Comparação normalizada (trim + colapso de espaço + case-insensitive) contra atletas `ativo=true`, exclui o próprio id na edição; `409` com lista de duplicatas quando `confirmar_duplicidade` não é `true`; reenvio com `confirmar_duplicidade: true` persiste — confirmado empiricamente contra Supabase local real, não só a resposta HTTP |
| Nível técnico com fallback de pontuação inicial | Leitura da migration `20260903100000_create_atleta_nivel_tecnico_view.sql` (`app.atleta_nivel_tecnico`) + teste de integração ponta a ponta reexecutado (gol +3 numa rodada, cartão amarelo −1 noutra com `lesionado`, gol +5 numa rodada `excluida` que não deve contar → `(3 + (-1)) / 2 = 1`) | ✅ Fallback = `pontuacao_inicial` quando não há nenhuma `participacao_rodada` com `status IN (presente, lesionado)` em rodada `lancada`; `GRANT SELECT` só para `service_role` (confirmado por `psql`, Seção 12) |

**Verificação adicional do QA**: `middleware.ts` estendido corretamente —
`GET /api/atletas`/`GET /api/atletas/{id}` exigem sessão válida mesmo
sendo leitura (primeira rota de leitura interna a devolver `contato`/
`data_nascimento`, RN-01) — confirmado por leitura de
`INTERNAL_READ_PROTECTED_PREFIXES` **e** empiricamente via `curl` direto
contra o servidor real (`GET /api/atletas` sem cookie → `401`, Seção 12).
Nenhuma rota de `DELETE` físico existe para `atleta` (GUARDRAILS.md regra
9) — confirmado por leitura de `app/api/atletas/**/route.ts`, único
método de "remoção" é `POST .../anonimizar` (BE-07).

**Reexecução real dos testes**: 28 testes unitários
(`validation.test.ts`/`presenter.test.ts`) + 11 testes de integração
(`atletas.integration.test.ts`) incluídos nas reexecuções completas da
Seção 12 — 0 falha em ambas.

**Achados**: nenhum. Todos os 3 itens do critério satisfeitos.

**Veredito**: **BE-06: Aprovado**, sem ressalva.

### 14.2 BE-07 — Função `anonimizar_atleta` (ADR-011)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Chamar a função
sobrescreve `nome_completo`/`apelido_exibicao`/`contato`/`data_nascimento`,
marca `ativo=false` e `anonimizado_em`, desativa `restricao_obrigatoria`
associadas — tudo em uma transação;
`lancamento_pontos`/`participacao_rodada`/`time_atleta`/`substituicao` não
sofrem nenhuma alteração; `log_auditoria` grava `valores_antes` só com
marcadores redigidos."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Sobrescrita dos 4 campos + `ativo=false` + `anonimizado_em`, em uma transação | Leitura de `20260903110000_create_anonimizar_atleta_function.sql` (função PL/pgSQL única, `UPDATE` + `INSERT` de log na mesma chamada) | ✅ `nome_completo → 'Atleta anonimizado'`, `apelido_exibicao → 'Atleta #' \|\| 8 primeiros chars do id`, `contato`/`data_nascimento → NULL`, `ativo=false`, `anonimizado_em=now()` — tudo dentro do corpo de uma única função (transação implícita única do Postgres) |
| Desativa `restricao_obrigatoria` associadas | Mesma leitura + teste de integração reexecutado (`anonimizar.integration.test.ts`) | ✅ Toda restrição ativa onde o atleta é `atleta_a_id`/`atleta_b_id` desativada (`ativo=false`, `desativado_em=now()`) na mesma chamada |
| Tabelas de histórico intocadas | Teste de integração reexecutado — cenário cria participação/lançamento/time/substituição envolvendo o alvo, confirma byte a byte inalterados após anonimizar | ✅ Nenhuma referência a `lancamento_pontos`/`participacao_rodada`/`time_atleta`/`substituicao` em nenhum ponto da função — confirmado por leitura e por asserção empírica do teste |
| `log_auditoria.valores_antes` só com marcadores redigidos | Leitura da função (nunca lê/atribui o valor real de nenhum dos 4 campos antes de sobrescrever) + teste de integração (asserção negativa: JSON serializado de `valores_antes` não contém o nome/contato/nascimento reais em nenhum ponto) | ✅ `valores_antes` grava exatamente `"[REDACTED]"` nos 4 campos — dado pessoal real nunca chega a existir em variável de execução da função |

**Verificação adicional do QA**: reprocessar um atleta já anonimizado é
recusado pela própria função (`errcode='AN001'` → `409`) em vez de
sobrescrever de novo silenciosamente — confirmado por `psql`
(`has_function_privilege`, Seção 12) que `GRANT EXECUTE` é exclusivo de
`service_role`, e por teste de integração que a segunda chamada não gera
uma segunda linha de log. `SELECT ... FOR UPDATE` serializa chamadas
concorrentes para o mesmo `atleta_id` — confirmado por leitura (não
reproduzido concorrentemente pelo QA, mesmo padrão de confiança já usado
para `BE-08`/L4 em L6).

**Reexecução real dos testes**: 2 testes de integração
(`anonimizar.integration.test.ts`) incluídos nas reexecuções completas da
Seção 12 — 0 falha.

**Achados**: nenhum. Todos os 4 itens do critério satisfeitos.

**Veredito**: **BE-07: Aprovado**, sem ressalva.

### 14.3 FE-04 — T04 Cadastro/Edição de Atleta (núcleo + anonimização)

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "**Núcleo**:
formulário completo com aviso de privacidade, bloco de consentimento
condicional anunciado via `aria-live`, modal de duplicidade, nível técnico
somente-leitura. **Incremento de anonimização**: ação 'Solicitar
exclusão/anonimização' em zona de risco, `TypedConfirmationModal` (digitar
'ANONIMIZAR', foco inicial em 'Cancelar', botão destrutivo `aria-disabled`
até o texto bater), estado pós-anonimização com campos `aria-readonly` e
placeholder, toast de sucesso/erro dedicado."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Aviso de privacidade + bloco de consentimento `aria-live` | Leitura de `AtletaForm.tsx` (linhas ~278-370) | ✅ Aviso fixo no topo; `<div aria-live="polite">` **permanente** (nunca `display:none`), aparece quando idade local calculada é <18 **ou** quando o servidor devolve erro de RF-01.3 mesmo com bloco oculto no cliente — defesa contra divergência de relógio, achado do próprio Frontend já corrigido |
| Modal de duplicidade | Leitura de `AtletaForm.tsx` (`handleConfirmDuplicidade`, `duplicidadeCancelRef`) | ✅ `Modal` do design system lista duplicatas, foco inicial em "Cancelar", reenvia com `confirmar_duplicidade: true` ao confirmar |
| Nível técnico somente-leitura | Leitura de `AtletaForm.tsx`/`AtletasList.tsx` | ✅ Nunca um campo de entrada — texto somente-leitura na edição e na lista, nunca na criação |
| `TypedConfirmationModal` ("ANONIMIZAR", foco em "Cancelar", `aria-disabled`) | Leitura de `src/components/ui/TypedConfirmationModal/` + `AnonimizacaoZona.tsx` | ✅ Construído sobre `Modal` existente; foco inicial herdado em "Cancelar"; botão de ação usa `aria-disabled` (não `disabled` nativo) até o texto bater, com `aria-describedby` associado |
| Estado pós-anonimização (`aria-readonly` + placeholder) | Leitura de `AtletaForm.tsx` | ✅ 4 campos pessoais com `readOnly` + `aria-readonly="true"`; placeholders exatamente como a API real devolve (`"Atleta anonimizado"`/`"Atleta #" + 8 chars`, conferido campo a campo contra a migration de `BE-07`); "Zona de risco"/"Salvar Atleta" somem inteiramente |
| Toast de sucesso/erro dedicado | Leitura de `AnonimizacaoZona.tsx` | ✅ "Dados pessoais anonimizados" (sucesso) / "Não foi possível anonimizar. Nenhuma alteração foi salva." (erro, texto literal da Seção 4 do `UX-SPEC.md`, nunca para `401`, que segue o fluxo de sessão expirada) |

**Verificação adicional do QA (integração cruzada dentro do lote)**:
`atletasApi.ts` confirmado chamando exatamente `POST/GET /api/atletas`,
`GET/PUT /api/atletas/{id}`, `POST /api/atletas/{id}/anonimizar` (BE-06/
BE-07) — nenhum mock; formato de erro `400`/`404`/`409` conferido campo a
campo contra `API-CONTRACT.yaml`. `GET /api/atletas*` exige sessão mesmo
sendo leitura (BE-06) — 401 tratado pelo mecanismo já existente de `FE-12`
(`assertSessionAlive`/`SessionExpiredError`), reaproveitado sem
duplicação — confirmado por leitura de `AtletasList.tsx`/`AtletaForm.tsx`/
`AnonimizacaoZona.tsx` capturando `SessionExpiredError`.

**Reexecução real dos testes**: 80 testes deste módulo
(`TypedConfirmationModal.test.tsx`, `idade.test.ts`, `format.test.ts`,
`atletasApi.test.ts`, `AnonimizacaoZona.test.tsx`, `AtletasList.test.tsx`,
`AtletaForm.test.tsx`, `InternalShell.test.tsx`) incluídos na reexecução
completa da Seção 12 — 0 falha, 0 violação `jest-axe` em todo estado
testado (criação, edição, pós-anonimização, modal de duplicidade,
`TypedConfirmationModal` aberto).

**Achados**: nenhum. Todos os itens do critério (núcleo + incremento)
satisfeitos.

**Veredito**: **FE-04: Aprovado**, sem ressalva.

### 14.4 Checklist de "Pronto" do lote (Definition of Done por lote)

- [x] Todo critério de aceite das 3 tarefas do lote testado e passando —
      Seções 14.1 a 14.3
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum débito de baixa/média severidade neste lote — nenhum achado
- [x] Testes de integração cruzada executados e passando: `FE-04`↔`BE-06`/
      `BE-07` (Seção 14.3); dependência de lote já fechado (`L1`/`BE-04`:
      sessão exigida em toda rota nova, `FE-12`: mecanismo de expiração
      reaproveitado sem duplicação, confirmado por leitura)
- [x] Requisito não funcional relevante validado: LGPD/segurança de dado
      pessoal (dado real nunca em variável de execução da função de
      anonimização, `GRANT EXECUTE` restrito a `service_role`, verificado
      via `psql` na Seção 12), acessibilidade (`jest-axe` 0 violação em
      todos os estados de `FE-04`)

### 14.5 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-06` | Aprovado | Seção 14.1 |
| `BE-07` | Aprovado | Seção 14.2 |
| `FE-04` | Aprovado | Seção 14.3 |

## **Lote L3 — Cadastro de Atletas: Aprovado**

As 3 tarefas do lote foram validadas de forma independente pelo QA pela
primeira vez — código-fonte lido linha a linha, suíte completa e suíte de
integração reexecutadas com os números batendo, `lint`/`typecheck`/
`format:check`/`build` confirmados limpos, e os pontos estruturais mais
críticos (idade/consentimento em UTC, duplicidade normalizada,
`GRANT EXECUTE` de `anonimizar_atleta` restrito a `service_role`, dado
pessoal nunca em variável de execução da função de anonimização,
`middleware.ts` exigindo sessão em toda leitura de `/api/atletas`)
reproduzidos empiricamente via `psql`/`curl` direto, além da suíte
automatizada. Nenhum achado de nenhuma severidade em nenhuma das 3
tarefas — lote classificado **"Aprovado"**, sem ressalva. Nenhuma ação de
reprovação necessária em `TASK.md`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: nenhum padrão
recorrente identificado. Guardrail seguido — nenhuma entrada nova em
`BLOCKERS.md`.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps e,
em seguida, à aprovação do Tech Lead, conforme `EXECUTION-FLOW.md` §5.

---

## 15. Lote L4 — Lançamento de Rodada

**Gatilho**: `BE-08`, `FE-05` (`TASK.md` Seção 3.0) ambas `Concluída` —
primeira validação de QA de ambas.

### 15.1 BE-08 — Serviço de Rodadas/Eventos

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Confirmar
lançamento aplica pontos corretos por evento; tentar lançar gol/cartão
para atleta ausente retorna erro bloqueante; lançar rodada com data já
existente exige confirmação explícita; toda a operação é atômica (uma
transação)."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Pontos corretos por evento | Leitura de `20260903120100_create_lancar_rodada_function.sql` + teste de integração reexecutado (presente com 2 gols + 1 cartão amarelo = `2+2×3-1=7`; lesionado com 1 gol = `2+3=5`; ausente = `0`) | ✅ Valores lidos de `app.configuracao_pontuacao` vigente na data da rodada (confirmado seed via `psql`, Seção 12); um `lancamento_pontos` por atleta agregando presença+eventos, ledger append-only |
| Gol/cartão para ausente → erro bloqueante | Leitura de `validation.ts` (`superRefine`, defesa de borda) **e** da função PL/pgSQL (`errcode='RF026'`, defesa estrutural real) + teste de integração reexecutado (`400`, nenhuma rodada criada) | ✅ Duas camadas — a validação de borda é só otimização de UX, a barreira real é a função PL/pgSQL, que nenhuma chamada direta à RPC consegue contornar |
| Data duplicada exige confirmação explícita | Leitura de `repository.ts`/`lancar.ts` (checagem pré-RPC) + teste de integração reexecutado (`409` sem `confirmar_duplicidade`, `201` reenviando com `true`) | ✅ Alerta, não bloqueio (mesmo contrato de RF-01.5); rodada `excluida` na mesma data não dispara o alerta (pontos já revertidos) |
| Atomicidade (uma transação) | Teste de integração reexecutado — chamada direta à RPC (contornando a API) com 1º atleta válido processado e 2º atleta ausente com evento ilegal, confirma reversão de 100% da transação incluindo o 1º atleta já processado | ✅ `raise exception` no meio do `loop` reverte tudo (comportamento padrão de função PL/pgSQL de chamada única — sem `savepoint`/captura de exceção intermediária que permitisse commit parcial, confirmado por leitura) |

**Verificação adicional do QA**: `GRANT EXECUTE` em `app.lancar_rodada`
restrito a `service_role` (confirmado por `psql`, Seção 12); rota `POST
/api/rodadas` coberta por `WRITE_METHODS` do `middleware.ts` (confirmado
por leitura + `curl` direto → `401` sem sessão, Seção 12).

**Reexecução real dos testes**: 12 testes unitários
(`validation.test.ts`) + 6 testes de integração
(`rodadas.integration.test.ts`) incluídos nas reexecuções completas da
Seção 12 — 0 falha.

**Achados**: nenhum. Todos os 4 itens do critério satisfeitos.

**Veredito**: **BE-08: Aprovado**, sem ressalva.

### 15.2 FE-05 — T05 Lançamento de Rodada (stepper 3 etapas)

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "3 etapas
navegáveis com `Stepper`; controles de evento desabilitados (não
escondidos) + texto explicativo para ausentes; etapa 3 dispara transação
atômica com estado de carregamento explícito; erro nunca sugere
salvamento parcial."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| 3 etapas navegáveis com `Stepper` | Leitura de `LancamentoRodadaForm.tsx` | ✅ Etapa 1 (Presença) → Etapa 2 (Eventos) → Etapa 3 (Revisão), "Continuar" bloqueado até a data ser preenchida |
| Controles desabilitados (não escondidos) + texto explicativo para ausente | Leitura de `EventosStep.tsx`, linhas 27-61 | ✅ `disabled={bloqueado}` real (`bloqueado = participacao.status === "ausente"`) em `StepperCounter` de gol/cartão amarelo/cartão vermelho — nunca `display:none`; texto "Eventos bloqueados — atleta ausente (RF-02.6)" visível acima; contadores zerados em memória ao mudar para ausente, nunca "pendurado" para reenvio |
| Transação atômica única com loading explícito | Leitura de `LancamentoRodadaForm.tsx` (etapa 3) | ✅ Um único `POST /api/rodadas` (etapas 1/2 só editam estado local); `aria-busy`/spinner no botão de confirmação; "← Voltar" removido (não só desabilitado) durante o envio |
| Erro nunca sugere salvamento parcial | Leitura de `LancamentoRodadaForm.tsx` (mensagem de erro) | ✅ "Não foi possível lançar a rodada. Nada foi salvo — tente novamente." — texto literal do `UX-SPEC.md`, nunca reformulado |

**Verificação adicional do QA (integração cruzada dentro do lote)**:
`rodadasApi.ts` confirmado chamando exatamente `POST /api/rodadas`
(`BE-08`) — nenhum mock; corpo de `confirmar_duplicidade` conferido campo
a campo. Duplicidade de data (RF-02.8): como `API-CONTRACT.yaml` não expõe
checagem antecipada, o alerta é implementado via modal na tentativa de
envio (mesmo padrão de `AtletaForm`/`FE-04`) — decisão de detalhe
consistente com o que o contrato de API realmente permite verificar, não
uma lacuna. Estado vazio ("sempre há lista de atletas ativos"): se `GET
/api/atletas` devolve zero atletas ativos, redireciona para `/atletas/novo`
com toast — confirmado por leitura, dependência de tela tratada
corretamente, não um estado vazio próprio inventado.

**Reexecução real dos testes**: 30 testes deste módulo
(`format.test.ts`, `participacaoState.test.ts`, `rodadasApi.test.ts`,
`LancamentoRodadaForm.test.tsx`) incluídos na reexecução completa da
Seção 12 — 0 falha, 0 violação `jest-axe` nas 3 etapas.

**Achados**: nenhum. Todos os 4 itens do critério satisfeitos.

**Veredito**: **FE-05: Aprovado**, sem ressalva.

### 15.3 Checklist de "Pronto" do lote (Definition of Done por lote)

- [x] Todo critério de aceite das 2 tarefas do lote testado e passando —
      Seções 15.1/15.2
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum débito de baixa/média severidade neste lote — nenhum achado
- [x] Testes de integração cruzada executados e passando: `FE-05`↔`BE-08`
      (Seção 15.2); dependência de lote já fechado (`L3`/`BE-06`: `GET
      /api/atletas` reaproveitado sem duplicação para a lista de presença)
- [x] Requisito não funcional relevante validado: atomicidade da
      transação de lançamento (reproduzida empiricamente via chamada
      direta à RPC, Seção 15.1), acessibilidade (`jest-axe` 0 violação nas
      3 etapas do wizard, `SegmentedControl`/`StepperCounter` já WCAG AA
      desde `FE-00`)

### 15.4 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-08` | Aprovado | Seção 15.1 |
| `FE-05` | Aprovado | Seção 15.2 |

## **Lote L4 — Lançamento de Rodada: Aprovado**

As 2 tarefas do lote foram validadas de forma independente pelo QA pela
primeira vez — código-fonte lido linha a linha, suíte completa e suíte de
integração reexecutadas com os números batendo, `lint`/`typecheck`/
`format:check`/`build` confirmados limpos, e o ponto estrutural mais
crítico (atomicidade real da transação de lançamento, incluindo reversão
de gravações já feitas no meio do loop quando um atleta posterior falha a
validação) reproduzido empiricamente pela suíte de integração real
reexecutada, além do `GRANT EXECUTE` restrito a `service_role` confirmado
via `psql`. Nenhum achado de nenhuma severidade em nenhuma das 2 tarefas —
lote classificado **"Aprovado"**, sem ressalva. Nenhuma ação de reprovação
necessária em `TASK.md`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: nenhum padrão
recorrente identificado. Guardrail seguido — nenhuma entrada nova em
`BLOCKERS.md`.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps e,
em seguida, à aprovação do Tech Lead, conforme `EXECUTION-FLOW.md` §5.

---

## 16. Lote L5 — Correção, Histórico e Auditoria de Rodadas

**Gatilho**: `BE-09`, `BE-10`, `FE-06`, `FE-07`, `FE-08` (`TASK.md` Seção
3.0) todas `Concluída`. Este agente também valida `BE-16` como parte deste
lote (Seção 12, "Achado estrutural transversal") — sua própria linha em
`TASK.md` Seção 3.1 marca `Lote: L5`, e `FE-06`/`FE-07` (formalmente em
L5) dependem funcionalmente dela. Primeira validação de QA das 6.

### 16.1 BE-09 — Serviço de Correção/Estorno

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Excluir uma
rodada reverte 100% dos pontos daquela rodada para todos os atletas
afetados numa única transação; corrigir um valor aplica só a diferença;
toda correção/exclusão gera entrada em `log_auditoria` sem campo de autor;
consulta do log ordena do mais recente ao mais antigo."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Exclusão reverte 100% numa única transação | Leitura de `20260903130000_create_excluir_rodada_function.sql` (linha a linha, reproduzida acima) + teste de integração reexecutado | ✅ Para cada atleta, um novo lançamento `origem='estorno'` com `pontos_delta` = negativo da soma líquida já gravada (soma de TODOS os lançamentos, não só o original) — `sum(pontos_delta)` por atleta+rodada sempre `0` após, verificado por leitura direta do ledger no teste; `lancamento_pontos` original nunca alterado (ledger append-only) |
| Correção aplica só a diferença | Leitura de `20260903130100_create_corrigir_participacao_rodada_function.sql` + teste de integração reexecutado (exatamente 2 linhas em `lancamento_pontos` — original + ajuste — para presente+1gol→presente+2gols) | ✅ `pontos_delta` do novo lançamento é exatamente a diferença (inclusive quando `0` — RN-07, "toda correção gera log, inclusive correções triviais"); cálculo usa `configuracao_pontuacao` vigente **na data da rodada**, nunca "agora" |
| `log_auditoria` sem campo de autor | Leitura de ambas as funções (`INSERT INTO log_auditoria` sem nenhuma coluna de autoria — a própria tabela, `BE-02`, não tem essa coluna) | ✅ Confirmado estruturalmente (não há onde gravar um autor mesmo que quisesse) — RN-12 satisfeito por desenho de schema, não só por convenção de aplicação |
| Consulta do log ordena do mais recente ao mais antigo | Leitura de `repository.ts` (`GET /api/log-auditoria`, `.order("ocorrido_em", { ascending: false })`) + teste de integração reexecutado (2 entradas reais sequenciais, ordem confirmada) | ✅ `ocorrido_em desc` |

**Verificação adicional do QA**: reexcluir uma rodada já `excluida`
recusado (`errcode='RD001'` → `409`, sem novo estorno/log) — confirmado
por leitura e teste de integração; RF-02.6 repetido dentro da função de
correção como defesa em profundidade (mesmo `errcode='RF026'` de `BE-08`).
`GRANT EXECUTE` de ambas as funções restrito a `service_role` (confirmado
via `psql`, Seção 12). `GET /api/log-auditoria` exige sessão — confirmado
por leitura de `INTERNAL_READ_PROTECTED_PREFIXES` **e** empiricamente por
`curl` direto (`401` sem cookie, Seção 12) — cobertura vazia em
`middleware.test.ts` para este path específico (existe cobertura genérica
do prefixo via outros paths, mas nenhum teste automatizado dedicado a
`/api/log-auditoria` em si); registrado como **débito de cobertura de
teste**, não de comportamento (ver `BUG-QA-BE09-01` abaixo).

---

**BUG-QA-BE09-01 — Severidade: Baixa (débito, sem prazo formal — lacuna de
cobertura de teste, não de comportamento)**
- **Componente**: `__tests__/middleware.test.ts`.
- **Passos para reproduzir**: ler o arquivo — há casos dedicados para
  `/api/restricoes`, `/api/rodadas` e `/api/rodadas/.../substituicoes`
  (401 sem sessão + 200 com sessão), mas nenhum caso dedicado para
  `/api/log-auditoria` apesar de o prefixo estar em
  `INTERNAL_READ_PROTECTED_PREFIXES` desde `BE-09`.
- **Resultado esperado**: cobertura automatizada explícita, mesmo padrão
  já aplicado aos outros 3 prefixos.
- **Resultado obtido**: comportamento real está correto — confirmado
  empiricamente por este agente via `curl` direto contra o servidor real
  (`GET /api/log-auditoria` sem cookie → `401`, Seção 12) — mas a garantia
  hoje depende só da leitura do código-fonte compartilhado
  (`exigeSessaoParaLeitura`) mais essa verificação manual do QA, não de um
  teste automatizado que impeça regressão futura especificamente deste
  path.
- **Por que não bloqueia `BE-09`**: o critério de aceite literal de `BE-09`
  não exige teste de middleware algum (é uma tarefa de correção/estorno,
  não de autenticação); a exigência de sessão em si está funcionalmente
  correta e verificada empiricamente por este agente.
- **Ação**: débito de baixa severidade, atribuído ao Backend — adicionar 2
  casos (`401`/sessão válida) para `/api/log-auditoria` em
  `__tests__/middleware.test.ts`, mesmo padrão já usado para
  `/api/restricoes`, na próxima janela de manutenção deste arquivo — sem
  prazo formal, não bloqueia nenhuma tarefa dependente.

---

**Veredito**: **BE-09: Aprovado com ressalvas** (1 débito de baixa
severidade, `BUG-QA-BE09-01`, não bloqueante).

### 16.2 BE-10 — RPC `simular_correcao_rodada` (preview read-only)

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Chamar a função
com um valor hipotético novo retorna o delta de pontos calculado sem
gravar nenhuma linha nova; usa a mesma tabela `configuracao_pontuacao`
vigente que a correção real usaria."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Sem gravar nenhuma linha nova | Leitura de `20260903140000_.../calcular_correcao_participacao_rodada` (só `SELECT`, inclusive `FOR UPDATE`, nenhum `INSERT`/`UPDATE`/`DELETE`) + teste de integração reexecutado (snapshot antes/depois idêntico) | ✅ Helper puramente de leitura; `simular_correcao_rodada` só chama o helper e devolve o resultado |
| Mesma configuração de pontuação vigente que a correção real usaria | Teste de integração reexecutado — preview e `PATCH` real no mesmo cenário produzem o mesmo `pontos_delta` exato | ✅ `corrigir_participacao_rodada` (`BE-09`) foi redefinida via `CREATE OR REPLACE FUNCTION` para delegar ao mesmo helper — nenhuma query de cálculo duplicada entre quem grava e quem previsualiza, divergência estruturalmente impossível |

**Verificação adicional do QA**: confirmado que a migration de `BE-10` usa
`CREATE OR REPLACE FUNCTION` sobre `corrigir_participacao_rodada`, nunca
editando o arquivo de migration já aplicado de `BE-09` (`supabase/migrations/README.md`,
convenção seguida). Achado incidental do próprio Backend (renomeação de
`OUT params` com prefixo `o_` para evitar `column reference ... is
ambiguous`) confirmado presente no arquivo atual (`o_participacao_id`,
`o_status_atual`, ..., `o_delta`) — corrigido, não uma lacuna hoje. `GRANT
EXECUTE` restrito a `service_role` (confirmado via `psql`, Seção 12). Rota
`POST .../simular-correcao` (método `POST`, não `GET`) já coberta por
`WRITE_METHODS` — decisão de detalhe documentada, sem lacuna de sessão.

**Reexecução real dos testes**: 7 testes de integração
(`simular-correcao.integration.test.ts`) incluídos na reexecução completa
da Seção 12 — 0 falha.

**Achados**: nenhum. Ambos os itens do critério satisfeitos.

**Veredito**: **BE-10: Aprovado**, sem ressalva.

### 16.3 BE-16 — Leitura de rodadas (`GET /api/rodadas`, `GET /api/rodadas/{id}`)

Tarefa criada fora da decomposição original (Seção 12, "Achado estrutural
transversal") para fechar um GAP real que bloqueava `FE-06`/`FE-07`
(ambas em L5) — validada aqui como parte do fechamento de L5.

**Critério de aceite (TASK.md, Seção 3.1, texto exato)**: "Listagem
devolve rodadas em ordem cronológica decrescente; detalhe devolve
status/eventos/pontos por atleta corretamente, incluindo rodada `excluida`
(status visível, nunca escondida); id inexistente retorna 404; leitura
exige sessão válida."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Listagem cronológica decrescente | Leitura de `repository.ts` (`listarRodadasResumo`, `data desc, criado_em desc`) + teste de integração reexecutado (3 rodadas criadas em ordem crescente, devolvidas em ordem inversa) | ✅ |
| Detalhe correto por atleta, incluindo `excluida` visível | Leitura de `detalhar.ts`/`presenter.ts` + teste de integração reexecutado | ✅ `pontos_delta` do detalhe é o total líquido (soma de todos os lançamentos, `lancamento`+`correcao`+`estorno`) — para rodada excluída é sempre `0` (100% estornado), confirmado; status da rodada sempre visível, nunca omitido |
| Id inexistente → 404 | Teste de integração reexecutado | ✅ |
| Leitura exige sessão válida | Leitura de `middleware.ts` (`/api/rodadas` já em `INTERNAL_READ_PROTECTED_PREFIXES` desde `BE-13`, nenhuma mudança necessária) + 4 casos de `middleware.test.ts` reexecutados + `curl` direto (Seção 12) | ✅ |

**Achados**: nenhum. Todos os 4 itens do critério satisfeitos.

**Veredito**: **BE-16: Aprovado**, sem ressalva.

### 16.4 FE-06 — T06 Histórico de Rodadas (lista)

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "Lista
cronológica decrescente; menu por rodada com 'Corrigir'/'Excluir'; link
permanente para T08."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Lista cronológica decrescente | Leitura de `historicoApi.ts` (`listarRodadas()`, chama `GET /api/rodadas` real desde a finalização com `BE-16`) + `HistoricoRodadasList.tsx` (`ordenarDecrescente`, defesa em profundidade, desempate por `criado_em`) | ✅ GAP original (endpoint inexistente) confirmado fechado — `HistoricoIndisponivelError` removida, nenhum caminho real a alcança mais (confirmado por leitura, nenhuma referência residual no código) |
| Menu "Corrigir"/"Excluir" | Leitura de `RodadaActionMenu.tsx` | ✅ Disclosure simples com fechamento por `Escape`/clique fora, foco inicial no primeiro item, foco devolvido ao gatilho ao fechar; "Corrigir" navega para `ROUTES.corrigirRodada(id)` (`FE-07`); "Excluir" abre `ExcluirRodadaModal` |
| "Excluir" funcional contra API real | Leitura de `ExcluirRodadaModal.tsx` + teste de integração real de `BE-09` (`excluir.integration.test.ts`) reexecutado | ✅ `DELETE /api/rodadas/{id}` real, foco inicial em "Cancelar", 401 tratado por `useHandleSessionExpired` |
| Link permanente para T08 | Leitura de `HistoricoRodadasList.tsx` (rodapé) | ✅ `ROUTES.logAuditoria` sempre visível, inclusive nos estados de erro |

**Verificação adicional do QA**: rodada `excluida` nunca escondida da
lista — `Badge variant="neutral"` textual "Excluída" (nunca só cor,
confirmado por leitura de `RodadaListItem.tsx`); ações do menu permanecem
visíveis para rodada excluída (reexclusão tratada pelo `409`/`RD001` já
existente).

**Reexecução real dos testes**: 19 testes atualizados/novos
(`historicoApi.test.ts`, `HistoricoRodadasList.test.tsx`,
`RodadaListItem.test.tsx`) + testes herdados
(`RodadaActionMenu.test.tsx`/`ExcluirRodadaModal.test.tsx`) incluídos na
reexecução completa da Seção 12 — 0 falha.

**Achados**: nenhum. Todos os 3 itens do critério satisfeitos.

**Veredito**: **FE-06: Aprovado**, sem ressalva.

### 16.5 FE-07 — T07 Correção/Estorno (detalhe)

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "Correção de
campo único usa preview inline (não modal) consumindo BE-10; exclusão usa
modal bloqueante explicando efeito em cascata antes de confirmar; foco
inicial em 'Cancelar'."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Preview inline (não modal), consumindo `BE-10` | Leitura de `ParticipacaoCorrecaoRow.tsx` — `useEffect` (linhas ~125-161) dispara `simularCorrecao` a cada mudança de `status`/`eventos`; `corrigirParticipacao` (PATCH real) só existe dentro de `handleConfirmar` (linha 170), nunca no `useEffect` | ✅ Separação estrutural confirmada por leitura direta — preview e escrita real são caminhos de código fisicamente distintos, impossível o preview disparar o `PATCH` por acidente; resultado renderizado em região `aria-live="polite"` com `DiffViewer`, nunca um `Modal` |
| Exclusão via modal bloqueante, efeito em cascata explicado, foco em "Cancelar" | Leitura de `CorrecaoRodadaDetalhe.tsx` (reaproveita `ExcluirRodadaModal` de `FE-06` integralmente, sem variação paralela) | ✅ Mesmo modal/foco/focus trap já testados por `FE-06`; zona de risco some quando `status === "excluida"` (nada a excluir de novo) |

**Verificação adicional do QA**: rodada já `excluida` (detalhe de
`BE-16`) tratada em modo somente-leitura (`Badge` por status, nunca
controles que o Backend recusaria com `409`) — confirmado por leitura de
`CorrecaoRodadaDetalhe.tsx` (linhas 141-196). `DiffViewer` (novo
componente de design system, reaproveitado depois por `FE-08`) — `<dl>`
semântico, "(alterado)" textual, nunca só cor (WCAG 1.4.1).

**Reexecução real dos testes**: 42 testes deste módulo
(`DiffViewer.test.tsx`, `correcaoApi.test.ts`,
`ParticipacaoCorrecaoRow.test.tsx`, `CorrecaoRodadaDetalhe.test.tsx`)
incluídos na reexecução completa da Seção 12 — 0 falha, incluindo a
asserção explícita de que o preview nunca chama o `PATCH` real.

**Integração cruzada Frontend↔Backend (dependência de `BE-16`, mesmo
lote)**: `correcaoApi.ts` confirmado chamando `GET /api/rodadas/{id}`
(`BE-16`) para o detalhe — nenhum mock; suíte de integração real de
`BE-16` reexecutada (Seção 12, bloco comum), passando.

**Achados**: nenhum. Ambos os itens do critério satisfeitos.

**Veredito**: **FE-07: Aprovado**, sem ressalva.

### 16.6 FE-08 — T08 Log de Auditoria

**Critério de aceite (TASK.md, Seção 3.2, texto exato)**: "Lista somente
leitura, mais recente → mais antigo; nunca exibe campo de autor, nem como
placeholder."

| Item do critério | Verificado por QA | Resultado |
|---|---|---|
| Lista somente leitura | Leitura de `LogAuditoriaEntry.tsx`/`LogAuditoriaList.tsx` | ✅ Nenhum callback de mutação, nenhum elemento interativo de escrita |
| Ordenação mais recente → mais antigo | Leitura de `LogAuditoriaList.tsx` (`ordenarDecrescente`, reforço no cliente) + `BE-09` já devolve `ocorrido_em desc` | ✅ |
| Nunca exibe campo de autor, nem como placeholder | Leitura de `types.ts`/`entryPresenter.ts` (nenhum campo de autoria a renderizar em nenhum tipo) + teste automatizado de busca textual (`entryPresenter.test.ts`/`LogAuditoriaList.test.tsx`, "autor"/variações, todos os 3 `tipo_evento`) reexecutado | ✅ Garantia estrutural (não há onde um autor seria colocado), não só ausência de conteúdo |

**Verificação adicional do QA (o achado mais relevante deste lote, mas
não um bug — reforço de segurança)**: `entryPresenter.ts`
(`montarDiffAnonimizacao`) confirmado, por leitura direta (linhas ~225-244),
só monta uma linha "antes" para uma chave se `valores_antes[chave]` for
**exatamente** o literal `"[REDACTED]"` — o valor exibido é sempre o texto
fixo `"Dado redigido"`, nunca `valores_antes[chave]` em si. Modo de falha
fechado: mesmo que o Backend um dia gravasse acidentalmente um dado
pessoal real ali, esta tela nunca o renderizaria — confirmado por teste
automatizado explícito com um "vazamento hipotético" no fixture
(`entryPresenter.test.ts`), reexecutado pelo QA, confirmando que o valor
real nunca aparece no DOM.

**Reexecução real dos testes**: 49 testes deste módulo (`format.test.ts`,
`enrichment.test.ts`, `entryPresenter.test.ts`, `logAuditoriaApi.test.ts`,
`LogAuditoriaEntry.test.tsx`, `LogAuditoriaList.test.tsx`) incluídos na
reexecução completa da Seção 12 — 0 falha, 0 violação `jest-axe`.

**Integração cruzada Frontend↔Backend**: `logAuditoriaApi.ts` confirmado
chamando `GET /api/log-auditoria` (`BE-09`) — nenhum mock. Enriquecimento
(`buildLookupMaps`) usa `listarRodadas()`/`FE-06` (`BE-16`) e
`fetchAtletas()`/`FE-04` (`BE-06`) via `Promise.allSettled` — melhor
esforço, nunca bloqueante, confirmado por leitura + `enrichment.test.ts`
(4 casos, incluindo as 3 combinações de falha parcial/total).

**Achados**: nenhum. Todos os 3 itens do critério satisfeitos.

**Veredito**: **FE-08: Aprovado**, sem ressalva.

### 16.7 Checklist de "Pronto" do lote (Definition of Done por lote)

- [x] Todo critério de aceite das 6 tarefas do lote testado e passando —
      Seções 16.1 a 16.6
- [x] Nenhum bug de severidade alta/crítica em aberto em qualquer tarefa
      do lote
- [x] Todo bug de severidade baixa/média está registrado como débito, com
      prazo — único achado do lote é `BUG-QA-BE09-01` (baixa, sem prazo
      formal, débito de cobertura de teste, não de comportamento — o
      comportamento real foi confirmado correto empiricamente por este
      agente)
- [x] Testes de integração cruzada executados e passando: dentro do lote
      (`FE-06`↔`BE-16`, `FE-07`↔`BE-09`/`BE-10`/`BE-16`, `FE-08`↔`BE-09`/
      `BE-16`/`BE-06`(L3), Seções 16.4/16.5/16.6) e com dependência de
      lote já fechado (`L4`/`BE-08`: `lancar_rodada` é a origem dos dados
      que `BE-16` lista/detalha, confirmado por leitura de
      `listarLancamentosPorRodada` reaproveitado)
- [x] Requisito não funcional relevante validado: LGPD/defesa em
      profundidade contra vazamento de dado pessoal redigido (`FE-08`,
      Seção 16.6, modo de falha fechado confirmado por teste), RN-12 (sem
      campo de autor, garantido estruturalmente por ausência de coluna no
      schema, `BE-09`), acessibilidade (`jest-axe` 0 violação em todos os
      módulos novos deste lote)

### 16.8 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-09` | Aprovado com ressalvas (1 débito de baixa severidade) | Seção 16.1 |
| `BE-10` | Aprovado | Seção 16.2 |
| `BE-16` | Aprovado | Seção 16.3 |
| `FE-06` | Aprovado | Seção 16.4 |
| `FE-07` | Aprovado | Seção 16.5 |
| `FE-08` | Aprovado | Seção 16.6 |

## **Lote L5 — Correção, Histórico e Auditoria de Rodadas: Aprovado com ressalvas**

As 6 tarefas do lote (incluindo `BE-16`, ver Seção 12) foram validadas de
forma independente pelo QA — código-fonte lido linha a linha, suíte
completa e suíte de integração reexecutadas com os números batendo,
`lint`/`typecheck`/`format:check`/`build` confirmados limpos, e os pontos
estruturais mais críticos (reversão de 100% dos pontos via ledger
append-only, cálculo de correção compartilhado entre preview e escrita
real por construção — nunca divergente —, `GRANT EXECUTE` restrito a
`service_role` nas 4 funções novas, ausência estrutural de campo de autor
no schema, modo de falha fechado do `DiffViewer` de anonimização em
`FE-08`) reproduzidos empiricamente pelo QA via `psql`/`curl` direto, além
da suíte automatizada.

O lote é classificado **"Aprovado com ressalvas"** (não "Aprovado" puro)
por um único débito de severidade baixa (`BUG-QA-BE09-01` — lacuna de
cobertura de teste automatizado para `/api/log-auditoria` em
`middleware.test.ts`, comportamento real já confirmado correto
empiricamente por este agente), não bloqueante. Nenhum bug de severidade
alta/crítica em aberto em nenhuma das 6 tarefas. Nenhuma ação de
reprovação necessária em `TASK.md` — todas as 6 tarefas permanecem
`Concluída`.

**Nota de rastreabilidade de padrão (não é escalonamento)**: nenhum padrão
recorrente de bug identificado entre as 6 tarefas deste lote nem em
relação aos achados de lotes anteriores (o débito de `BE-09` é uma lacuna
pontual de cobertura de teste, de natureza distinta do achado de
acessibilidade de `L6`/`BUG-QA-FE10-01` e do achado de processo/
documentação de `L2`). Guardrail de "só escala por padrão recorrente"
seguido — nenhuma entrada nova em `BLOCKERS.md`.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps e,
em seguida, à aprovação do Tech Lead, conforme `EXECUTION-FLOW.md` §5.

---

## 17. Resumo consolidado — Fechamento retroativo de L2, L3, L4, L5 (2026-09-04)

| Lote | Tarefas | Veredito agregado | Referência |
|---|---|---|---|
| **L2** — Ranking e Presença Pública | `BE-03`, `FE-02`, `FE-03` | **Aprovado com ressalvas** (achado de processo não bloqueante — documentação de produto desatualizada, não é bug de código) | Seção 13 |
| **L3** — Cadastro de Atletas | `BE-06`, `BE-07`, `FE-04` | **Aprovado** (nenhum achado) | Seção 14 |
| **L4** — Lançamento de Rodada | `BE-08`, `FE-05` | **Aprovado** (nenhum achado) | Seção 15 |
| **L5** — Correção, Histórico e Auditoria de Rodadas | `BE-09`, `BE-10`, `BE-16`, `FE-06`, `FE-07`, `FE-08` | **Aprovado com ressalvas** (1 débito de baixa severidade, `BUG-QA-BE09-01`, cobertura de teste) | Seção 16 |

**Nenhuma das 4 tarefas/lotes foi reprovada.** Nenhum bug de severidade
alta/crítica encontrado em nenhuma das 13 tarefas validadas nesta sessão
(`BE-06`, `BE-07`, `BE-08`, `BE-09`, `BE-10`, `BE-16`, `FE-02`, `FE-03`,
`FE-04`, `FE-05`, `FE-06`, `FE-07`, `FE-08` — `BE-03` referenciada, não
revalidada). Nenhuma tarefa reaberta em `TASK.md`; nenhuma coluna de
Status alterada por este fechamento.

**Débitos/achados que seguem carregados, sem prazo formal, nenhum
bloqueante**:
- Achado de processo de `L2` (Seção 13.1) — `PRD-TECNICO.md` RF-03.1/
  `UX-SPEC.md` Seção 2/6.2/`BLOCKERS.md` `BLOCKER-004`/`BLOCKER-005`
  desatualizados em relação à decisão de produto do organizador (commit
  `d9b77e5`) de remover presenças/cartões da tabela pública — recomendado
  ao Tech Lead/BA reconciliar formalmente.
- `BUG-QA-BE09-01` (Seção 16.1) — cobertura de teste de middleware para
  `/api/log-auditoria`, baixa severidade.
- Achado estrutural transversal (Seção 12) — `TASK.md` Seção 3.0 (tabela
  de lotes) não lista `BE-16` sob `L5` apesar de a própria linha de
  `BE-16` marcar `Lote: L5` — recomendado ao Tech Lead atualizar a tabela
  para refletir a composição real de 6 tarefas do lote.
- `1` arquivo de `format:check` fora do escopo de L2-L5
  (`app/api/auth/__tests__/login.timing.test.ts`, tarefa de `L1`, Seção
  12) — sinalizado, não corrigido nem cobrado aqui.
- Débitos já herdados de `L0`/`L1`/`L6` (`DEBT-01`/`DEBT-02`/`DEBT-04` em
  `SECURITY-REVIEW.md`, `BUG-QA-FE10-01` em `L6`) — reconfirmados sem
  mudança de severidade/prazo por este fechamento, fora do escopo desta
  sessão de validação funcional.

**Auditoria de DevSecOps e aprovação do Tech Lead para L2, L3, L4 e L5**:
**pendentes** — este fechamento cobre exclusivamente a validação
funcional/QA (`test-strategy-planning` → `acceptance-criteria-validation`
→ `cross-platform-integration-testing` → `bug-documentation` →
`non-functional-validation` → `qa-report-drafting`, conforme escopo deste
agente). A auditoria completa de segurança (`static-security-analysis`/
`security-requirement-validation`, `SECURITY-REVIEW.md`) e a aprovação
formal do Tech Lead (`EXECUTION-FLOW.md` §5) sobre estes 4 lotes **não
foram executadas nesta sessão** — seguem como próximo passo explícito,
fora da autoridade/escopo deste agente QA.

---

## 18. Lote RD0 — Fundação do Redesenho (Design System Atômico)

**Contexto**: primeiro lote da Parte II (`TASK.md`, Redesenho Visual) a fechar
todas as suas tarefas. `RD0` = `FE-R00` + `FE-R12` (`TASK.md` Seção 3.0),
ambas `Concluída` na Seção 3.2. Por `TASK.md` Seção 3.0/4.1, `RD0` é
pré-condição de merge (não de desenvolvimento) para **todos** os lotes
`RD1`-`RD4` seguintes — validação deste lote é, portanto, gate duro para todo
o resto da iniciativa, não apenas para as duas tarefas em si.

**Método**: mesmo rigor aplicado aos fechamentos de lote da Parte I —
validação independente por leitura de código linha a linha, reexecução real
de toda a suíte de comandos (não aceite do relato do Frontend), recálculo
manual e independente de todos os pares de contraste WCAG citados (fórmula de
luminância relativa 1.4.3/1.4.11, script próprio, não apenas conferência
visual), inspeção direta do manifesto de fontes do `next/font/google`
instalado no projeto, e `git show --stat`/`git diff` nos dois commits do PR
de fundação para confirmar isolamento estrutural (Guardrail 38/Seção 1.2-R).

### 18.1 `FE-R00` — Fundação do Design System

**Critério de aceite (`TASK.md` Parte II, Seção 3.2, texto exato)**:
"Substituição atômica de 8 tokens novos + 3 alterados; integração
`next/font/google` (3 fontes); componente novo `Icon`; componente novo
`BrandCrest` (+ `BrandCrest` compacto no `TopNav` existente);
`accessibility-review` completo pré-merge sobre os 17 componentes existentes;
commit isolado (Seção 1.2-R)."

#### 18.1.1 Isolamento de commit (Guardrail 38/Seção 1.2-R/6.2-R item 4)

| Verificação | Comando | Resultado |
|---|---|---|
| Commit 1 (`5c7bad0`) contém só tokens/fontes | `git show 5c7bad0 --stat` | ✅ `app/layout.tsx` (43 linhas, só `next/font/google`) + `src/design-system/tokens.css` (159 linhas) — **nenhum** outro arquivo tocado; nenhuma tela/composição no diff |
| Commit 2 (`efaf297`) contém só componentes novos, sem consumidor de tela | `git show efaf297 --stat` | ✅ 12 arquivos, todos dentro de `src/components/ui/Icon/`, `src/components/ui/BrandCrest/`, `src/components/ui/AppNav/` (integração do crest compacto no `TopNav` já existente, não uma tela nova) e `app/dev/design-system/page.tsx` (vitrine interna de QA manual, não uma tela de produto) — bate exatamente com a descrição da Seção 6.2-R item 4 |
| `vercel.json` intocado por ambos os commits | `git diff 40a6400 HEAD -- vercel.json` | ✅ diff vazio — `font-src 'self'` inalterado |
| Nenhum mecanismo de tema/feature-flag de paleta introduzido (Guardrail 31, proibição explícita da Seção 1.2-R) | Leitura de `tokens.css` completo | ✅ um único bloco `:root`, sem `[data-theme]`/`prefers-color-scheme` aplicado à paleta; nenhum arquivo de tokens paralelo criado |

**Veredito deste item**: ✅ satisfeito, verificado por `git show`/`git diff`
diretamente, não apenas pela mensagem de commit.

#### 18.1.2 Comandos reexecutados de forma independente

| Comando | Resultado obtido pelo QA | Bate com o relato do Frontend? |
|---|---|---|
| `npm test` (`vitest run`) | ✅ **105 arquivos, 827 testes, 827 passando, 0 falha** — inclui `Icon.test.tsx` (18 testes) e `BrandCrest.test.tsx` (6 testes, com `jest-axe` para as 2 variantes + modo decorativo) | Sim, exatamente |
| `npm run lint` | ✅ `No ESLint warnings or errors` | Sim |
| `npm run typecheck` (`tsc --noEmit`) | ✅ 0 erros | Sim |
| `npm run build` | ✅ `Compiled successfully`, 21 rotas geradas (incluindo `/dev/design-system`), sem erro de download de fonte em build-time | Sim — confirma que o self-host de fonte funciona de fato, não só compila |
| `npm run format:check` | ❌ falha em **7 arquivos**, mas **nenhum** pertence a `FE-R00`/`FE-R12` — todos são de trabalho em andamento de `BE-R01`/`BE-R02` (`app/api/rodadas/__tests__/listar.integration.test.ts`, `src/modules/rodadas/confronto.ts`, `src/modules/rodadas/listar.ts`, `src/modules/rodadas/repository.ts`, `src/lib/supabase/__tests__/ranking-publico-recentes.integration.test.ts`), de `L1` já fechado (`app/api/auth/__tests__/login.timing.test.ts`) e de `FE-04`/L3 já fechado (`src/features/atletas/AtletaForm.tsx`) | Não se aplica a este lote — nenhum arquivo de `Icon`/`BrandCrest`/`tokens.css`/`AppNav` está na lista; registrado apenas como observação de escopo, não como achado de `RD0` (ver 18.5) |

#### 18.1.3 Verificação independente do `accessibility-review` alegado

Não aceito apenas o relato — recalculado manualmente cada par cor-de-fundo ×
cor-de-texto citado em `tokens.css`, usando a fórmula de luminância relativa
do WCAG 2.1 (script Node próprio, mesma fórmula usada pela ferramenta):

| Par | Valor no comentário de `tokens.css`/`FE-R00` | Recalculado pelo QA | Confere? |
|---|---|---|---|
| `--color-primary` (`#1c6e46`) vs. branco | 6,23:1 | 6,23:1 | ✅ |
| `--color-danger` (`#a4231b`) vs. `--color-danger-bg` (`#fbe9e7`) | 6,32:1 (achado do Frontend: `UX-SPEC.md` erra ao registrar 7,41:1 para este par) | **6,32:1** | ✅ — achado do Frontend confirmado como correto de forma independente |
| `--color-danger` vs. branco | 7,41:1 | 7,41:1 | ✅ — confirma a causa raiz apontada pelo Frontend: o número do `UX-SPEC.md` (7,41:1) é, de fato, o par "texto sobre branco", não "texto sobre `--color-danger-bg`" |
| `--color-warning` (`#8a5a10`) vs. `--color-warning-bg` (`#fbedd0`) | 5,11:1 | 5,11:1 | ✅ |
| Branco vs. `--color-brand-navy` (`#16234a`) | 15,29:1 | 15,29:1 | ✅ |
| `--color-brand-gold` (`#d9b64a`) vs. `--color-brand-navy` | 7,82:1 | 7,82:1 | ✅ |
| `--color-brand-gold` vs. branco (uso proibido como texto, Seção 1.5-R) | 1,96:1, reprova | 1,96:1 | ✅ — confirma que a proibição da Seção 1.5-R é matematicamente necessária, não apenas uma regra arbitrária |
| `--color-brand-gold-contrast` (`#4a3a0d`) vs. `--color-brand-gold` | 5,65:1 | 5,65:1 | ✅ |
| `--color-brand-gold-text-safe` (`#8a6d1b`) vs. branco | 4,90:1 | 4,90:1 | ✅ (margem apertada sobre o piso 4,5:1, mas passa) |
| `--color-focus-ring-on-dark` (`#d9b64a`) vs. `--color-brand-navy` | 7,82:1 | 7,82:1 | ✅ |
| `--color-focus-ring` padrão (verde, `#1c6e46`) vs. `--color-brand-navy` | 2,45:1, reprova 1.4.11 | 2,45:1 | ✅ — confirma que a proibição de usar o anel de foco padrão sobre navy (Seção 1.5-R) é matematicamente correta |
| `--color-primary` vs. `--color-pitch-bg` (`#e6f2ea`) | 5,42:1 | 5,42:1 | ✅ |
| `--color-brand-navy` vs. `--color-navy-tint` (`#eef1f8`) | 13,52:1 | 13,52:1 | ✅ |

**Todos os 13 pares recalculados batem exatamente com o valor documentado em
`tokens.css`**, incluindo a divergência intencionalmente sinalizada
(`--color-danger`/`--color-danger-bg`). Confirmado por leitura direta de
`UX-SPEC.md` Parte II, linha 2033, que o documento de fato registra "7,41:1"
para esse par — o achado do Frontend está correto e é, de fato, apenas uma
imprecisão de documentação do `UX-SPEC.md` (não do código), sem efeito de
conformidade (ambos os números reais passam AA/AAA com folga).

**Achado adicional do QA, não relatado pelo Frontend (severidade baixa, não
bloqueante)**: o comentário pré-existente de `--color-info` em `tokens.css`
("`#1d4ed8` sobre branco ≈ 5.6:1") também diverge do cálculo direto da
fórmula, que dá **6,70:1** — mesma classe de imprecisão de comentário que o
achado do Frontend para `--color-danger`, só que não documentada. Este token
**não foi alterado por `FE-R00`** ("inalterado... não aparece no CSS do
mockup", conforme o próprio comentário do arquivo) — não é uma regressão
desta tarefa, é uma imprecisão de comentário pré-existente da baseline
(Parte I), fora do escopo de correção de `FE-R00`. Não bloqueia (6,70:1
passa AA com folga maior ainda que o número errado registrado), mas fica
registrado como **BUG-QA-RD0-01** (ver 18.5) para o UX/UI corrigir na mesma
janela em que corrigir o número de `--color-danger`.

**Varredura de hex hardcoded fora de `tokens.css`** (alegação do Frontend de
que "nenhuma cor escapou da substituição atômica"): `grep` recursivo por
`#[0-9a-fA-F]{3,8}` em `src/components/ui/**/*.{css,tsx}` excluindo
`tokens.css` — **zero ocorrências**, confirmado de forma independente (nem
mesmo em `BrandCrest.module.css`, que usa só `var(--color-...)`).

**Fontes (ADR-012/Seção 1.1-R)**: a alegação de que "Bebas Neue só existe em
peso 400 no catálogo do Google Fonts" foi verificada **não pela documentação
pública do Google Fonts, mas diretamente no manifesto interno do
`next/font/google` já instalado no projeto**
(`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`,
chave `"Bebas Neue"`) — resultado: `"weights": ["400"]`, confirmando a
checagem obrigatória da Seção 1.1-R de forma ainda mais direta do que o
Frontend relatou (o Frontend não especifica onde conferiu; o QA confirma que
o pacote de fato instalado no `node_modules` bate com a afirmação).
Nenhum `<link>`/`@import` para `fonts.googleapis.com`/`fonts.gstatic.com`
encontrado em `app`/`src` (só menções em comentário explicando a ausência).

**`BrandCrest`/governança de asset (Seção 1.6-R/4.3)**: confirmado por
leitura de `BrandCrest.tsx` e `git show efaf297` que o componente renderiza
exclusivamente um `<svg>` geométrico autoral (`fill="var(--color-brand-navy)"`,
não uma imagem) — **nenhuma referência a `logo.jpg`/`grupo-rola-crest.*`**
existe em nenhum arquivo de código deste commit. Isso é consistente com a
leitura de que o bloqueio de merge da Seção 1.6-R ("o PR que introduz
`BrandCrest` ... não deve ser mesclado em `main` antes de confirmação de
direito de uso") se aplica ao **asset real** do brasão, não ao componente com
placeholder próprio — leitura já explicitada e resolvida pelo próprio Tech
Lead na nota de conclusão desta linha do `TASK.md` ("não bloqueia esta
tarefa, só o merge futuro do asset real"), não uma reinterpretação do QA.
Nenhuma violação de governança encontrada: o que de fato foi mesclado em
`main` é geometria própria, sem risco de direito autoral de terceiro.

**Nenhum componente compartilhado reimplementado**: `src/components/ui/index.ts`
exporta `Icon`/`BrandCrest` uma única vez cada, junto aos demais componentes
já validados em `FE-00` (Seção 2 acima) — nenhuma duplicação.

**Veredito dos itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificado de forma independente.

### 18.2 `FE-R12` — Sessão e expiração transversal

**Critério de aceite (`TASK.md` Parte II, Seção 3.2, texto exato)**:
"`SessionExpiryBanner`/`Toast` herdam tokens automaticamente; validar que
qualquer indicador sobre chrome navy usa `--color-focus-ring-on-dark`, não o
verde padrão (Seção 1.5-R)."

#### 18.2.1 Verificação da constatação central ("nenhuma superfície navy real hoje")

A tarefa conclui que nenhuma tela real expõe `SessionExpiryStatus`/
`AlertBanner`/`Toast` sobre fundo navy hoje, logo nenhuma mudança de
`--color-focus-ring` era necessária. Reproduzido de forma independente:

- `grep -rn "brand-navy" src` → exatamente 6 arquivos: `tokens.css` (fonte),
  `BrandCrest.tsx` (preenchimento do SVG, não uma superfície de fundo),
  `AppNav.module.css` (só um comentário apontando repintura futura, não uso
  real), e os 3 comentários de auditoria citados pelo Frontend
  (`SessionExpiryStatus.tsx`, `AlertBanner.tsx`, `ToastProvider.tsx`) — **nenhum
  uso real de `--color-brand-navy` como `background`/`background-color` em
  nenhum CSS Module hoje**, confirmando a alegação central.
- Leitura de `AlertBanner.tsx`/`ToastProvider.tsx`: ambos os componentes
  confirmam, em comentário datado, que renderizam sempre sobre fundo opaco
  próprio (`--color-{variant}-bg`) — verificado contra `Toast.module.css`,
  que de fato define `background` próprio por variante, nunca transparente.
- `InternalShell` (citado no comentário de `SessionExpiryStatus.tsx`) monta o
  banner como irmão do `AppNav`, fora do `TopNav` — consistente com a
  composição real hoje (nenhuma tela `FE-R01`…`FE-R11` está `Concluída`
  ainda, então não há chrome navy real em produção interna).

**Veredito**: constatação correta, verificada por leitura direta do CSS/JSX,
não apenas aceite do comentário do próprio código.

#### 18.2.2 Achado do QA — divergência factual na própria nota de conclusão (severidade baixa, não bloqueante)

A nota de conclusão de `FE-R12` afirma: *"a própria célula desta linha
referencia 'Seção 1.5-R', que não existe como tal no documento; o conteúdo
substantivo da regra ... está de fato na Seção 5.3/5.4"*. **Isso não procede**:
`TASK.md` Parte II **tem**, de fato, uma Seção `1.5-R` própria (linha 754,
"Regras de contraste obrigatórias") e ela contém **exatamente** a mesma regra
substantiva que a nota atribui a "5.3/5.4" do `UX-SPEC.md` — inclusive o
texto quase idêntico: *"Proibido: `--color-focus-ring` padrão (verde) sobre
qualquer superfície navy (2,45:1, reprova 1.4.11) — usar
`--color-focus-ring-on-dark` (dourado)..."*. A referência "Seção 1.5-R" no
critério de aceite de `FE-R12` é uma citação interna correta ao próprio
`TASK.md` (mesmo padrão usado, sem ambiguidade, na linha de `FE-R01` logo
abaixo) — não uma referência quebrada ao `UX-SPEC.md`.

- **Por que não bloqueia**: o conteúdo técnico auditado está correto (o
  `UX-SPEC.md` Seção 5.3/5.4 de fato também contém a mesma regra, então a
  citação alternativa não muda a conclusão da auditoria), e a ação tomada
  pela tarefa (nenhuma mudança de CSS, por ausência de superfície navy real)
  está correta independentemente de qual documento é citado. É um erro de
  rastreabilidade documental, não um bug de código ou de comportamento.
- **Ação**: registrado como **BUG-QA-RD0-02** (débito de baixa severidade,
  ver 18.5) — recomendado ao Frontend corrigir a nota de conclusão desta
  linha do `TASK.md` (não o código) para citar corretamente `TASK.md` Seção
  1.5-R como a fonte primária (que já é onde a regra foi originalmente
  traduzida do `UX-SPEC.md` para diretriz prática, conforme o preâmbulo da
  própria Seção 1 do `TASK.md`, "Diretrizes de Implementação (delta)").

#### 18.2.3 Comandos reexecutados

Mesma execução de 18.1.2 (`FE-R00` e `FE-R12` compartilham a mesma árvore de
trabalho/commit final) — **105 arquivos / 827 testes / 827 passando**, bate
exatamente com o número citado na nota de conclusão de `FE-R12`
("105 arquivos/827 testes"). `tsc --noEmit` limpo, conforme relatado.

**Veredito dos itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificado de forma independente. A única ressalva é de
rastreabilidade documental (18.2.2), não de comportamento/código.

### 18.3 `cross-platform-integration-testing`

**Não aplicável a este lote**: `FE-R00`/`FE-R12` não têm dependência de
contrato de API com Backend/Mobile (`TASK.md` Seção 3.0: "`BE-R01`/`BE-R02`/
`SPK-02` não dependem deste lote... não tocam `tokens.css`") e nenhuma tela
de composição (`FE-R01`…`FE-R11`) está `Concluída` ainda para exercitar
integração cruzada real. A única "integração" deste lote é interna ao próprio
Frontend (`Icon`/`BrandCrest` consumidos pelo `TopNav` já existente),
verificada em 18.1/18.2 acima via os testes de `AppNav.test.tsx` (4/4
passando, incluindo `jest-axe`), reexecutados individualmente pelo QA.

### 18.4 Non-functional validation

- **Performance básica**: `npm run build` gerou 21 rotas sem erro; bundle
  compartilhado de 87,3 kB (First Load JS), consistente com o baseline já
  registrado em `FE-00` (87,1 kB) — nenhuma regressão de tamanho perceptível
  pela adição de `Icon`/`BrandCrest` (ambos SVG inline, sem asset de imagem
  carregado). Download de fonte em build-time confirmado funcional (não
  apenas compilação) — self-host real, sem requisição de rede em runtime.
- **Cenário de erro**: não aplicável de forma nova — `FE-R00`/`FE-R12` não
  introduzem fluxo de erro próprio (são fundação de tokens/componentes
  atômicos, não uma tela com estado de erro).
- **Usabilidade (`UX-SPEC.md`)**: os 13 pares de contraste centrais da nova
  paleta foram verificados matematicamente (18.1.3), incluindo as duas
  regras "proibidas" da Seção 1.5-R (dourado como texto sobre claro; verde
  padrão sobre navy) — ambas as proibições são numericamente corretas, não
  apenas convenções arbitrárias. `aria-hidden`/`role="img"`/`aria-label` de
  `Icon`/`BrandCrest` verificados por leitura direta do código e por teste
  `jest-axe` próprio (0 violações nas 2 variantes de cada componente).

### 18.5 Achados do QA (bugs/débitos) — nenhum bloqueante

---

**BUG-QA-RD0-01 — Severidade: Baixa (débito, sem prazo formal)**
- **Componente**: `src/design-system/tokens.css`, comentário do token
  `--color-info` (pré-existente, não alterado por `FE-R00`).
- **Passos para reproduzir**: calcular a razão de contraste WCAG (luminância
  relativa) entre `#1d4ed8` e `#ffffff`.
- **Resultado esperado**: bater com o comentário do arquivo ("≈ 5.6:1").
- **Resultado obtido**: **6,70:1** pela fórmula direta — mesma classe de
  imprecisão que o achado já sinalizado pelo próprio Frontend para
  `--color-danger`/`--color-danger-bg` (7,41:1 documentado vs. 6,32:1 real),
  só que não documentada nesta tarefa por não fazer parte dos tokens
  alterados por `FE-R00`.
- **Por que não bloqueia**: `--color-info` não foi tocado por `FE-R00`
  ("inalterado... não aparece no CSS do mockup", conforme o próprio
  comentário) — fora do escopo desta tarefa. O valor real (6,70:1) passa AA
  com folga ainda maior que o número documentado, então não há risco de
  conformidade, apenas imprecisão de comentário.
- **Ação**: débito de baixa severidade, sem prazo formal, atribuído ao
  UX/UI — corrigir o comentário de `--color-info` na mesma revisão em que
  corrigir o número de `--color-danger` já sinalizado por `FE-R00`
  (`UX-SPEC.md` Parte II Seção 5.3, linha 2033).

---

**BUG-QA-RD0-02 — Severidade: Baixa (débito, sem prazo formal)**
- **Componente**: `TASK.md` Parte II, nota de conclusão da linha `FE-R12`
  (documentação de processo, não código).
- **Passos para reproduzir**: ler `TASK.md` Parte II Seção 1.5-R (existe,
  linha 754) e comparar com a afirmação da nota de conclusão de `FE-R12` de
  que "Seção 1.5-R... não existe como tal no documento".
- **Resultado esperado**: a nota citar corretamente a seção existente.
- **Resultado obtido**: a Seção 1.5-R existe e contém a regra substantiva
  idêntica que a nota atribui só à Seção 5.3/5.4 do `UX-SPEC.md` — a
  afirmação de "não existe" é factualmente incorreta (ver 18.2.2).
- **Por que não bloqueia**: a conclusão técnica da auditoria (nenhuma
  mudança de CSS necessária, ausência de superfície navy real) está correta
  e foi verificada de forma independente pelo QA (18.2.1) — o erro é
  puramente de citação de fonte dentro da própria narrativa de conclusão,
  sem efeito em código/comportamento.
- **Ação**: débito de baixa severidade, sem prazo formal, atribuído ao
  Frontend — ajustar a nota de conclusão de `FE-R12` na próxima revisão do
  `TASK.md` para citar `TASK.md` Seção 1.5-R como fonte primária.

---

**Nota de rastreabilidade de padrão (não é escalonamento)**: os dois achados
acima são de naturezas distintas entre si (imprecisão de cálculo em
comentário de token vs. citação de seção incorreta em nota de conclusão) e
distintos dos achados de lotes anteriores (`BUG-QA-FE00-01`/`02` eram sobre
`format:check`; achados de `L2`/`L5` eram sobre documentação de produto/
cobertura de teste). Nenhum padrão recorrente de bug de **execução** (código)
identificado — os dois achados de `RD0` são sobre precisão de comentário/nota,
não sobre comportamento funcional incorreto. Guardrail de "só escala por
padrão recorrente" seguido — nenhuma entrada nova em `BLOCKERS.md`.

### 18.6 Checklist de "Pronto" (Definition of Done de QA, por lote)

- [x] Todo critério de aceite de cada tarefa do lote foi testado e está
      passando (`FE-R00`: 18.1; `FE-R12`: 18.2)
- [x] Nenhum bug de severidade alta/crítica em aberto em qualquer tarefa do
      lote
- [x] Todo bug de severidade baixa/média está registrado como débito, com
      prazo de correção ou justificativa de ausência de prazo formal
      (`BUG-QA-RD0-01`, `BUG-QA-RD0-02` — ambos sem prazo formal, por serem
      correções de comentário/documentação sem código de produto afetado)
- [x] Testes de integração cruzada executados e passando — não aplicável a
      este lote especificamente (18.3), nenhuma dependência cruzada real
      ainda existente para `RD0`
- [x] Requisito não funcional relevante validado (performance básica,
      usabilidade/contraste, ausência de fluxo de erro novo — 18.4)

### 18.7 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `FE-R00` | Aprovado com ressalvas (1 débito de baixa severidade, `BUG-QA-RD0-01`) | Seção 18.1 |
| `FE-R12` | Aprovado com ressalvas (1 débito de baixa severidade, `BUG-QA-RD0-02`) | Seção 18.2 |

## **Lote RD0 — Fundação do Redesenho (Design System Atômico): Aprovado com ressalvas**

As 2 tarefas do lote foram validadas de forma independente pelo QA — leitura
linha a linha de `tokens.css`, `Icon.tsx`, `BrandCrest.tsx`, `AppNav.tsx`,
`AppNav.module.css` e dos 3 arquivos auditados por `FE-R12`; reexecução real
de `npm test` (827/827), `npm run lint`, `npm run typecheck` e `npm run
build`, todos limpos; recálculo manual e independente dos 13 pares de
contraste WCAG citados (todos batendo, incluindo a confirmação do achado do
próprio Frontend sobre `--color-danger`/`UX-SPEC.md`); verificação do
manifesto real do `next/font/google` instalado (Bebas Neue = peso 400 único,
confirmado); `git show --stat`/`git diff` confirmando isolamento estrutural
dos 2 commits (`5c7bad0` só tokens/fontes, `efaf297` só componentes novos,
`vercel.json` intocado em ambos) — Guardrail 38/Seção 1.2-R satisfeitos.

O lote é classificado **"Aprovado com ressalvas"** (não "Aprovado" puro) por
dois débitos de severidade baixa, nenhum bloqueante e nenhum de código de
produto: **(1) `BUG-QA-RD0-01`** — comentário pré-existente de
`--color-info` em `tokens.css` também impreciso (mesma classe do achado já
sinalizado pelo Frontend para `--color-danger`), não introduzido por
`FE-R00`; **(2) `BUG-QA-RD0-02`** — a nota de conclusão de `FE-R12` cita
incorretamente que "Seção 1.5-R não existe" quando ela de fato existe em
`TASK.md` e contém a mesma regra substantiva atribuída ao `UX-SPEC.md`. Nenhum
dos dois achados afeta código/comportamento em produção. **Nenhum bug de
severidade alta/crítica em aberto.** Nenhuma ação de reprovação necessária em
`TASK.md`; ambas as tarefas permanecem `Concluída`.

**Governança de asset (`BrandCrest`/Seção 1.6-R)**: confirmado que nenhuma
referência a `logo.jpg`/asset real de marca existe no código mesclado — o
componente usa exclusivamente um placeholder SVG autoral. O bloqueio de
merge da Seção 1.6-R (pendente de confirmação de PM+stakeholder) aplica-se
ao asset real, não ao componente com placeholder, conforme a própria decisão
já registrada pelo Tech Lead na nota de conclusão de `FE-R00` — nenhuma
violação de governança encontrada nesta validação.

**Nota de rastreabilidade de padrão (não é escalonamento)**: nenhum padrão
recorrente de bug de execução (código) identificado neste lote nem em
relação aos achados de lotes anteriores — os dois achados são de natureza
documental/citação, categoria distinta dos achados de `format:check` (`FE-00`)
ou de cobertura de teste (`L5`). Guardrail de "só escala por padrão
recorrente" seguido — nenhuma entrada nova em `BLOCKERS.md`.

**Observação de escopo, não achado de `RD0`**: `npm run format:check` falha
hoje em 7 arquivos, mas nenhum pertence a `FE-R00`/`FE-R12` — são de
`BE-R01`/`BE-R02` (trabalho em andamento, lote `RD1`/`RD3`, ainda não
`Concluída`) e de tarefas de lotes já fechados da Parte I (`L1`/`L3`).
Sinalizado apenas para visibilidade; não é responsabilidade deste lote
corrigir, e será reavaliado quando `RD1`/`RD3` fecharem.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps sobre
`RD0`, conforme `EXECUTION-FLOW.md` §5 — este QA não dispara essa etapa,
apenas libera o gate. Por `TASK.md` Seção 3.0/4.1, o fechamento deste lote
também libera o **merge** (não o desenvolvimento, que já podia ocorrer em
paralelo) dos lotes `RD1`-`RD4`, condicionado a este `accessibility-review`
estar "fechado sem violação bloqueante" — condição satisfeita, verificada de
forma independente em 18.1.3.

## 19. Lote RD1 — Telas Públicas Redesenhadas (Ranking e Presença)

**Contexto**: segundo lote da Parte II a fechar todas as suas tarefas. `RD1`
= `FE-R02` + `FE-R03` + `BE-R01` (`TASK.md` Seção 3.0), todas `Concluída` na
Seção 3.1/3.2. `BE-R01` já havia sido implementada e relatada como
`Concluída` antes de `RD1` existir como conceito formal de fechamento de
lote — este QA dá a ela, aqui, seu **primeiro veredito independente de
lote** (não foi validada isoladamente em nenhuma seção anterior deste
relatório), no mesmo momento em que valida `FE-R02`/`FE-R03`, exatamente
porque a regra deste agente é validar o lote inteiro fechado, nunca uma
tarefa isolada fora desse fechamento.

**Método**: mesmo rigor de `RD0` (Seção 18) — leitura de código linha a
linha (componentes novos, migration SQL, view de contrato), reexecução real
de toda a suíte de comandos (não aceite do número relatado pelo Frontend/
Backend), leitura direta da migration/`API-CONTRACT.yaml` para confirmar
ausência de PII nas duas rotas públicas, e leitura da suíte de integração
real de `BE-R01` (não apenas o relato de "5/5 passando").

### 19.1 `BE-R01` — Exposição pública da matriz de últimas N rodadas

**Critério de aceite (`TASK.md` Parte II, Seção 3.1, texto exato)**: "View
retorna, por atleta, os status (`presente`/`ausente`/`lesionado`) das
últimas `N=7` rodadas lançadas + `rodadas_jogadas` (contagem total do
grupo) + `media_presenca` (%); nunca expõe `contato`/`data_nascimento`; RLS
herdada da política já aprovada da schema `app`; `API-CONTRACT.yaml`
incrementado, changelog registrado; não inclui 'próxima rodada'."

| Verificação | Método | Resultado |
|---|---|---|
| Mecanismo `ROW_NUMBER() OVER (PARTITION BY atleta_id ORDER BY data_rodada DESC)`, corte em N=7 | Leitura direta de `supabase/migrations/20260904090000_create_ranking_publico_recentes_view.sql` | ✅ exatamente como especificado — CTE `participacoes_numeradas`/`recentes_por_atleta`, `posicao <= 7` |
| Nunca expõe `contato`/`data_nascimento` | Leitura da definição da view (nenhuma das duas colunas aparece em nenhum `select`) + reexecução do teste de integração com `select("*")` contra a chave `anon` real | ✅ view não seleciona as colunas; teste `"nunca retorna contato/data_nascimento, mesmo com select *"` passou contra Supabase local real |
| Exclusão de atleta anonimizado/inativo (ADR-011) e rodada `excluida` | Reexecução do teste de integração (`atletaAnonimizadoId` inserido ativo=false, esperado ausente da view; rodada com `status='excluida'` inserida, esperada fora de `rodadas_recentes`) | ✅ ambos os casos passaram contra dado real inserido pelo próprio teste, não fixture estático |
| Corte em N=7 com ordem mais-recente-primeiro, preservação do status literal `lesionado` | Reexecução do teste (`atletaComOitoRodadasId` com 8 participações lançadas) | ✅ 7 elementos retornados, a mais antiga (índice 0) fora, ordem mais-recente-primeiro confirmada, status `lesionado` preservado (não reescrito para `presente`/`ausente`) |
| `rodadas_jogadas`/`media_presenca` são estatísticas de GRUPO (mesmo valor em toda linha) | Reexecução do teste de asserção por delta (snapshot "antes" via `service` role, comparado ao "depois" após inserção de 8 rodadas + 2 atletas ativos + 5 presenças) | ✅ valor idêntico em todas as linhas retornadas; delta bate exatamente com a fórmula documentada no comentário da migration |
| Atleta ativo sem nenhuma rodada aparece com array vazio (nunca omitido) | Reexecução do teste (`atletaSemRodadaId`) | ✅ `rodadas_recentes: []`, linha presente |
| `GRANT`/RLS | Leitura do final da migration | ✅ `revoke all ... from public` explícito, `grant select ... to anon`/`to service_role` — nenhuma tabela base recebe grant novo, mesmo padrão de `BE-03` |
| "Próxima rodada" não implementada | Leitura da migration e de `API-CONTRACT.yaml` `RankingPublicoRecentesItem` | ✅ nenhum campo correspondente existe — consistente com a exclusão de escopo já registrada em `TASK.md` Seção 6.1-R item 1 |
| `API-CONTRACT.yaml` incrementado, changelog registrado | Leitura de `.md/API-CONTRACT.yaml` (`RodadaRecenteStatus`/`RankingPublicoRecentesItem`, `GET /ranking_publico_recentes`, entrada de changelog `0.13.0`) | ✅ presente, consistente com a migration; versão atual do documento é `0.14.0` (incremento posterior de `BE-R02`, não altera nada deste schema) |
| Suíte de integração própria reexecutada | `npm run test:integration` | ✅ `src/lib/supabase/__tests__/ranking-publico-recentes.integration.test.ts` — **5/5 testes passando** contra Supabase local real (não pulado — variáveis `TEST_SUPABASE_*` presentes), bate com o relatado por `BE-R01` |

**Achado do QA (débito, ver 19.7)**: `npm run format:check` reprova
`ranking-publico-recentes.integration.test.ts` — conteúdo correto (todos os
5 testes passam), só formatação Prettier pendente, nunca rodada antes de
marcar a tarefa `Concluída`.

**Veredito dos itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificados de forma independente contra um Supabase local
real (não apenas leitura do SQL).

### 19.2 `FE-R02` — T02 Ranking Público (redesenho)

**Critério de aceite (`TASK.md` Parte II, Seção 3.2, texto exato)**:
"Reescrita estrutural: de cartão-por-atleta com contagem agregada para
matriz atleta×últimas N rodadas (dots `P`/`A`/`L` com rótulo textual) +
`MedalBadge` (com correção de a11y obrigatória) + painel 'Resumo da
temporada' (desktop, 2 de 3 métricas) + `TopNav` com `BrandCrest`/pill
dourado."

| Verificação | Método | Resultado |
|---|---|---|
| Matriz atleta × últimas rodadas, reconciliação de colunas entre atletas com históricos de tamanhos diferentes | Leitura de `matrix.ts` + reexecução de `matrix.test.ts` (8 testes, incluindo dedup por `rodada_id`, caso de borda de histórico mais curto, corte em `limit` preservando as mais recentes) | ✅ união de `rodada_id`, ordenação correta, caso de borda coberto e passando |
| `MedalBadge` — correção de a11y obrigatória (texto ordinal `sr-only` para os 3 primeiros) | Leitura de `MedalBadge.tsx` + reexecução de `MedalBadge.test.tsx` (4 testes) + `jest-axe` | ✅ emoji `aria-hidden`, texto `"1º lugar"`/`"2º lugar"`/`"3º lugar"` sempre presente via `sr-only`, 0 violação axe |
| `PresenceDot` — nunca letra solta por voz | Leitura de `PresenceDot.tsx` + reexecução de `PresenceDot.test.tsx` (5 testes) + `jest-axe` | ✅ `role="img"`+`aria-label` por extenso quando não `decorative`; modo `decorative` corretamente `aria-hidden` sem `role="img"` duplicado quando um texto adjacente já anuncia o status (uso real em `RankingList.tsx`/legenda e em `PresencaMensal.tsx`) |
| Painel "Resumo da temporada" — 2 de 3 métricas, "Próxima rodada" ausente | Leitura de `RankingList.tsx` + `RankingList.test.tsx` | ✅ só `Rodadas jogadas`/`Média de presença`; teste afirma explicitamente `queryByText(/próxima rodada/i)).not.toBeInTheDocument()` |
| `TopNav`/hero com `BrandCrest`/pill dourado, sem duplicar `Tabs` | Leitura de `PublicHomeShell.tsx` | ✅ `Tabs` permanece único controle de navegação; hero é irmão de `<main>` (landmark `banner` top-level, correção de a11y documentada e verificada abaixo) |
| Nunca solicita/renderiza `contato`/`data_nascimento` | Leitura de `rankingApi.ts`/`rankingRecentesApi.ts` (listas de coluna explícitas, nunca `select("*")`) + `RankingList.test.tsx` (`queryByText(/contato\|nascimento/i)`) | ✅ ambas as camadas (fetch explícito + asserção de teste) confirmam ausência |
| `jest-axe` na composição completa (`PublicHomeShell`) | Reexecução de `PublicHomeShell.test.tsx` (5 testes) | ✅ 0 violação, incluindo o cenário de sucesso com hero + tabs + tabela renderizados |
| Landmark `banner`/`contentinfo` top-level (achado de a11y corrigido durante a implementação) | Leitura de `PublicHomeShell.tsx` (`<header>`/`<footer>` como irmãos de `<main>`, não descendentes) | ✅ confirmado — estrutura correta, consistente com a regra `landmark-banner-is-top-level` do axe |
| CSS responsivo (mobile mostra 5 de até 7 colunas; painel resumo só desktop) | Leitura de `RankingList.module.css` — `@media (min-width: 1024px)` puro, `display:none`/`display:block` incondicional por JS | ✅ nenhuma lógica JS de breakpoint (evita divergência SSR/hidratação); alternância real não exercitada por teste unitário (limitação conhecida de `jsdom` com `@media`, mesma nota já documentada em `AppNav.test.tsx`/`RD0`), consistente com o padrão já aceito no projeto |

**Suíte reexecutada** (não aceito o número relatado sem reexecutar):

| Comando | Resultado obtido pelo QA | Bate com o relatado (853 testes/109 arquivos)? |
|---|---|---|
| `npm test -- --run` | ✅ **109 arquivos, 853 testes, 853 passando, 0 falha** | Sim, exatamente |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npm run typecheck` | ✅ 0 erros | Sim |
| `npm run build` | ✅ `Compiled successfully`, 21 rotas, `/` como rota estática (90,3 kB / 196 kB First Load JS) | Sim |
| `npm run format:check` | ❌ reprova 5 arquivos de propriedade de `FE-R02` (`RankingList.tsx`, `format.test.ts`, `matrix.test.ts`, `PublicHomeShell.test.tsx`, `rankingRecentesApi.test.ts`) | **Não bate** — a nota de conclusão de `FE-R02` não menciona `format:check`; ver 19.7/`BUG-QA-RD1-01` |

**Veredito dos itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificado de forma independente. A única ressalva é o
débito de formatação (19.7), sem efeito de comportamento/acessibilidade.

### 19.3 `FE-R03` — T03 Presença Mensal (redesenho)

**Critério de aceite (`TASK.md` Parte II, Seção 3.2, texto exato)**:
"Repintura de tokens; `Accordion` deixa de ser necessário (mockup real
mostra a matriz do mês diretamente) — redutor de esforço frente à Parte I."

| Verificação | Método | Resultado |
|---|---|---|
| `Accordion` removido, lista de presentes exibida diretamente (sem expandir/recolher) | Leitura de `PresencaMensal.tsx` + `PresencaMensal.test.tsx` (asserção explícita `queryByRole("button", { name: /05\/09/ })).not.toBeInTheDocument()`) | ✅ nenhum controle de expandir/recolher por rodada |
| Reuso literal de `PresenceDot` (mesmo componente/estilo de T02) | Leitura de `PresencaMensal.tsx` (`<PresenceDot status="presente" decorative .../>`) | ✅ mesmo componente do design system, modo `decorative` correto (nome já anunciado pelo texto adjacente) |
| Repintura de tokens "zero-esforço" (nenhuma variável CSS renomeada) | Leitura de `PresencaMensal.module.css` — só `var(--color-...)`, nenhum hex hardcoded | ✅ confirmado, consistente com a alegação |
| Nunca solicita/renderiza `contato`/`data_nascimento` | Leitura de `presencaMensalApi.ts` (lista de coluna explícita) + `PresencaMensal.test.tsx` (`queryByText(/contato\|nascimento/i)`) | ✅ confirmado nas duas camadas |
| `jest-axe` nos 3 estados (sucesso, vazio, erro) | Reexecução de `PresencaMensal.test.tsx` (9 testes) | ✅ 0 violação nos 3 estados |
| Região viva (`aria-live="polite"`) ao trocar de mês | Leitura de `PresencaMensal.tsx` | ✅ presente, envolvendo o conteúdo dependente de `state.status` |
| Mês inicial calculado só após o primeiro efeito (evita divergência SSR) | Leitura de `PresencaMensal.tsx` (`mesCivil` inicia `null`, calculado em `useEffect`) | ✅ mesmo padrão já usado em `RankingList.tsx`/Parte I |

**Suíte reexecutada**: mesma execução de 19.2 (`PresencaMensal.test.tsx`
faz parte dos 853 testes/109 arquivos confirmados acima) —
`PresencaMensal.test.tsx` isoladamente: **9/9 testes passando**.
`npm run format:check` reprova `PresencaMensal.test.tsx` (débito, ver
19.7/`BUG-QA-RD1-01`) — mesma ressalva de 19.2, nenhum efeito de
comportamento.

**Veredito dos itens do critério de aceite, como escrito**: **todos
satisfeitos**, verificado de forma independente. Ver 19.6 para a avaliação
específica do `BLOCKER-010` (divergência contra `UX-SPEC.md`, não contra o
critério de aceite desta linha do `TASK.md`).

### 19.4 `cross-platform-integration-testing`

Contrato de API `ranking_publico_recentes` (`BE-R01`) verificado de ponta a
ponta contra o consumidor real (`FE-R02`):

- Lista de colunas pedidas por `rankingRecentesApi.ts`
  (`atleta_id, nome_exibicao, rodadas_recentes, rodadas_jogadas,
  media_presenca`) confere exatamente com as colunas expostas pela view
  (migration) e com o schema `RankingPublicoRecentesItem` de
  `API-CONTRACT.yaml` — nenhum campo pedido pelo Frontend que a view não
  produza, nenhum campo sensível pedido.
- Junção por `atleta_id` entre `ranking_publico` (BE-03, ordem/pontuação) e
  `ranking_publico_recentes` (BE-R01, matriz/estatísticas de grupo) em
  `RankingList.tsx` verificada por leitura de código e pelo teste de
  sucesso de `RankingList.test.tsx` (dados de fixture com os dois
  endpoints combinados, posições/pontos/matriz todos corretos na saída
  renderizada).
- Cenário de falha parcial (só `ranking_publico_recentes` falha) testado
  explicitamente em `RankingList.test.tsx` — mensagem de erro genérica,
  sem vazar qual das duas fontes falhou, com retentativa que rebusca as
  duas.
- `FE-R03`/`presenca_mensal_publica` (`BE-03`, já `Concluída`/validada em
  lote anterior de Parte I) — nenhuma mudança de contrato nesta tarefa;
  reconfirmado que `presencaMensalApi.ts` só pede as colunas já existentes
  do contrato inalterado.

**Veredito**: integração cruzada Backend↔Frontend deste lote correta,
verificada de forma independente (não apenas aceite do relato de ambos os
lados).

### 19.5 Non-functional validation

- **Performance básica**: `npm run build` gerou 21 rotas sem erro; `/`
  (shell público, T02+T03) é uma rota estática (`○`) de 90,3 kB / 196 kB
  First Load JS — sem chamada de rede em build-time (dados buscados
  client-side, mesma decisão já documentada na Parte I).
- **Usabilidade (`UX-SPEC.md`)**: estrutura da matriz de T02 (Seção 2.2),
  legenda de 3 itens (`Presente`/`Ausente`/`Lesionado`), painel "Resumo da
  temporada" com 2 métricas e ausência do emoji-sem-texto nas medalhas —
  todos verificados por leitura direta de `UX-SPEC.md` Parte II Seção 2.2
  contra o código/teste real, não apenas aceite da alegação de conformidade
  do Frontend.
- **Cenário de erro**: `RankingList.tsx`/`PresencaMensal.tsx` — mensagem
  sempre genérica ao público (nunca vaza detalhe técnico do erro real,
  verificado por teste que injeta um erro com mensagem sensível e afirma
  que ela não aparece na tela), botão "Tentar novamente" que rebusca,
  `role="alert"` correto.
- **Acessibilidade**: `jest-axe` reexecutado em todos os componentes/telas
  novos deste lote (`MedalBadge`, `PresenceDot`, `RankingList`,
  `PublicHomeShell`, `PresencaMensal` nos 3 estados) — **0 violações em
  todos**, confirmado por reexecução real, não por aceite do relato.

### 19.6 Avaliação do `BLOCKER-010`

`BLOCKER-010` (`BLOCKERS.md`) foi aberto por `FE-R03` alegando que
`UX-SPEC.md` Parte II Seção 2.3 descreve uma matriz atleta × data completa
para T03, mas a view pública real (`app.presenca_mensal_publica`, `BE-03`,
inalterada nesta tarefa) só suporta uma estrutura por rodada
(`nomes_presentes`, sem distinguir `ausente` de `lesionado`, sem o universo
de atletas ativos do período).

Verificado de forma independente pelo QA, lendo a definição real da view
(`supabase/migrations/20260902101300_create_public_views.sql`,
`create view app.presenca_mensal_publica`): confirmado — a view é
literalmente `select ... from app.rodada r left join (agregado de
nomes_presentes por rodada) ... where r.status = 'lancada'`, uma linha por
rodada, com apenas `total_presentes`/`nomes_presentes` (array de nomes
presentes). Não há nenhuma coluna/junção que produza `ausente`/`lesionado`
por atleta, nem uma linha por atleta. A alegação de `BLOCKER-010` é
factualmente correta — não é uma leitura equivocada do dado real pelo
Frontend.

Também confirmado, por leitura de `UX-SPEC.md` Parte II Seção 2.3 (linhas
1540-1554), que o documento de fato descreve "uma matriz atleta × data do
mês inteiro (dots `P`/`A`/`L`... com legenda 'Presente/Ausente/Lesionado')"
— texto que, lido ao pé da letra, exige uma estrutura que o dado real desta
tarefa não sustenta.

**Classificação do QA**: mesma régua já aplicada a `BLOCKER-004`/
`BLOCKER-005` (precedente citado pela própria `FE-R03`) — é um **achado de
dado/especificação** (a Seção 2.3 do `UX-SPEC.md` aparentemente herdou a
descrição de T02 sem ajuste à fonte de dado real, mais restrita, de T03),
não um bug de implementação. `FE-R03` implementou corretamente o critério
de aceite **literal** desta linha do `TASK.md` ("mostra a matriz do mês
diretamente", sem `Accordion`) usando o dado real disponível, documentou a
divergência de forma visível (comentário de topo do arquivo + `BLOCKER-010`
aberto no mesmo dia), e reduziu a legenda para não anunciar uma distinção
que os dados não sustentam — nenhuma tentativa de esconder a lacuna. Não
bloqueia o fechamento de `RD1` pelo mesmo motivo já usado para
`BLOCKER-005`: a tela está correta contra seu próprio critério de aceite no
`TASK.md`, a divergência é só contra uma seção do `UX-SPEC.md` que precisa
de correção/decisão de escopo maior (novo endpoint de Backend), fora da
autoridade de `FE-R03` resolver sozinha. Nenhuma ação de QA além de
confirmar a classificação — o encaminhamento (`ux-ui`/`software-architect`
decidirem entre corrigir o `UX-SPEC.md` ou abrir uma nova tarefa de
Backend) já está corretamente registrado em `BLOCKERS.md`.

### 19.7 Achados do QA (bugs/débitos)

---

**BUG-QA-RD1-01 — Severidade: Baixa (débito, prazo: antes do próximo push
que dispare o pipeline de CI compartilhado)**
- **Componente**: `npm run format:check` (`.github/workflows/ci.yml`,
  passo "Format check", gate obrigatório do job `build-and-test`) — 7
  arquivos de propriedade das 3 tarefas deste lote: `RankingList.tsx`,
  `format.test.ts`, `matrix.test.ts`, `PublicHomeShell.test.tsx`,
  `rankingRecentesApi.test.ts` (`src/features/ranking-publico/`, todos
  `FE-R02`); `PresencaMensal.test.tsx`
  (`src/features/presenca-mensal/`, `FE-R03`);
  `ranking-publico-recentes.integration.test.ts`
  (`src/lib/supabase/__tests__/`, `BE-R01`).
- **Passos para reproduzir**: `npm run format:check` (`prettier --check .`)
  na raiz do projeto, estado atual da árvore.
- **Resultado esperado**: exit code 0, nenhum arquivo listado.
- **Resultado obtido**: exit code 1, `Code style issues found in 13 files`
  — 7 desses 13 são de propriedade deste lote (os outros 6 são de `BE-R02`/
  `RD3`, ainda não fechado, e de tarefas de lotes já fechados de outras
  iniciativas, fora do escopo desta validação — mesma disciplina de
  atribuição já usada em `RD0`, Seção 18.1.2).
- **Por que não bloqueia a aprovação funcional**: reformatação pura
  (confirmado por leitura de diff — quebras de linha/indentação, nenhuma
  mudança de token/lógica), sem efeito em comportamento, segurança ou
  acessibilidade; os 853 testes (incluindo os das 3 tarefas) passam
  normalmente com o conteúdo atual dos arquivos.
- **Por que é tratado com peso maior que uma nota de rodapé**: esta é a
  **terceira ocorrência consecutiva do mesmo tipo de achado no Frontend**
  (após `BUG-QA-BE01-02`/`BUG-QA-FE00-01`, `QA-REPORT.md` Seções 2/3) e a
  primeira vez que o Backend também aparece na mesma classe de achado
  (`BE-R01`) — cruzando o limiar que o próprio QA já havia anunciado em
  Seção 3 ("escalar ao Tech Lead via `BLOCKERS.md` se reaparecer numa
  terceira tarefa do Frontend"). Se qualquer uma das 3 tarefas for
  pusheada como está, o gate "Format check" do `CI` real reprova — mesmo
  mecanismo já confirmado e resolvido em `BLOCKER-007`.
- **Ação**: débito de baixa severidade (conteúdo correto, fix mecânico de
  um comando), **mas com escalonamento ao Tech Lead via `BLOCKERS.md`
  (`BLOCKER-011`)** por ser padrão recorrente de execução que já atingiu o
  limiar pré-anunciado — Frontend/Backend devem rodar `prettier --write`
  nos 7 arquivos antes do próximo push; Tech Lead avalia adicionar
  `format:check` explicitamente à Definição de Pronto e a viabilidade de
  um hook de pre-commit, para não depender do hábito individual de cada
  agente.

---

**Nenhum outro bug/débito de código encontrado neste lote** — os únicos
dois achados de divergência (`BLOCKER-010`, avaliado em 19.6, e o débito de
formatação acima) já estavam documentados de forma proativa pelo próprio
Frontend/Backend antes da chegada do QA; nenhum dos dois foi descoberto de
forma independente pelo QA a partir do zero (o QA confirmou e classificou
ambos).

### 19.8 Checklist de "Pronto" (Definition of Done de QA, por lote)

- [x] Todo critério de aceite de cada tarefa do lote foi testado e está
      passando (`BE-R01`: 19.1; `FE-R02`: 19.2; `FE-R03`: 19.3)
- [x] Nenhum bug de severidade alta/crítica em aberto em qualquer tarefa do
      lote
- [x] Todo bug de severidade baixa/média está registrado como débito, com
      prazo de correção (`BUG-QA-RD1-01`, prazo: antes do próximo push que
      dispare o `CI` compartilhado)
- [x] Testes de integração cruzada executados e passando (19.4 — contrato
      `ranking_publico_recentes` verificado de ponta a ponta entre `BE-R01`
      e `FE-R02`, junção com `ranking_publico`/BE-03 confirmada)
- [x] Requisito não funcional relevante validado (performance básica,
      usabilidade/`UX-SPEC.md`, cenário de erro, acessibilidade — 19.5)

### 19.9 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-R01` | Aprovado com ressalvas (1 débito de baixa severidade, `BUG-QA-RD1-01`) | Seção 19.1 |
| `FE-R02` | Aprovado com ressalvas (1 débito de baixa severidade, `BUG-QA-RD1-01`) | Seção 19.2 |
| `FE-R03` | Aprovado com ressalvas (1 débito de baixa severidade, `BUG-QA-RD1-01`; `BLOCKER-010` avaliado e classificado como achado de dado/spec, não de implementação) | Seção 19.3/19.6 |

### 19.10 Reconfirmação independente (Validador, chapéu QA — pipeline consolidado de 4 agentes)

**Contexto**: esta seção reconfirma o veredito de 19.1-19.9 a partir do estado
real atual do repositório, numa sessão distinta da que produziu o veredito
original — mesmo rigor de uma primeira validação (reexecução real de comandos,
sem aceitar o número já registrado), não uma cópia do texto anterior.

**Confirmação de que nenhuma das 3 tarefas foi tocada desde o veredito
original**: `git log --oneline -- <caminho>` para cada um dos arquivos de
propriedade de `BE-R01`/`FE-R02`/`FE-R03` (view/migration, `RankingList.tsx`,
`PublicHomeShell.tsx`, `matrix.ts`, `rankingRecentesApi.ts`, `MedalBadge.*`,
`PresenceDot.*`, `PresencaMensal.*`, `ranking-publico-recentes.integration.test.ts`)
mostra que o último commit a tocar qualquer um deles continua sendo `d81fc99`
— o mesmo commit que introduziu esta Seção 19 originalmente. `HEAD` atual
(`ff3221d`) está dois commits à frente (`0a162fc`, `ff3221d`), nenhum dos dois
tocando qualquer arquivo do lote (ambos são consolidação de agentes/comando
`/validar`, fora do código do produto). `git status` no início desta sessão
confirma que as únicas mudanças não commitadas afetam `src/features/historico/`,
`src/features/times/SubstituicoesModal.tsx` e `TASK.md` — nenhum arquivo de
RD1.

**Reexecução real e independente dos comandos**:

| Comando | Resultado obtido agora | Bate com o registrado em 19.2? |
|---|---|---|
| `npm run format:check` | ❌ 16 arquivos reprovados no total; os mesmos **7 de propriedade de RD1** continuam na lista, byte a byte os mesmos nomes (`RankingList.tsx`, `format.test.ts`, `matrix.test.ts`, `PublicHomeShell.test.tsx`, `rankingRecentesApi.test.ts`, `PresencaMensal.test.tsx`, `ranking-publico-recentes.integration.test.ts`) | Sim, para os 7 de RD1 — o total subiu de 13→16 só por arquivos de outras tarefas concluídas depois (`FE-R06`/`FE-R09`/outras), fora do escopo desta validação, mesma disciplina de atribuição da 19.7 |
| `npm test -- --run` | ✅ 111 arquivos, **894 testes, 894 passando, 0 falha** | Cresceu de 109/853 por tarefas de outros lotes concluídas depois (`FE-R06`, `FE-R09`, `FE-R11`); nenhuma regressão em nenhum arquivo de RD1 |
| `npm run lint` | ✅ 0 erros, 0 warnings | Sim |
| `npx tsc --noEmit` | ✅ 0 erros | Sim |
| `npm run build` | ✅ `Compiled successfully`, 21 rotas, `/` estática, 90,3 kB / 197 kB First Load JS | Sim (variação de 196→197 kB é ruído de build de tarefas de outros lotes, não de RD1) |
| `npm run test:integration` | ✅ 20 arquivos, **190 passando + 2 puladas de 192** | Sim, exatamente |
| `npx vitest run --config vitest.integration.config.ts ranking-publico-recentes` (isolado) | ✅ **5/5 testes passando**, contra Supabase local real | Sim, exatamente |

**Avaliação independente do achado registrado em `BLOCKER-011` (Aberto,
confirmado ainda Aberto nesta data em `BLOCKERS.md`)**: reclassificando o
achado com a própria régua deste agente (Crítica vs. Simples), não copiando a
classificação prévia — é **Simples**. Razão: o `diff` de cada um dos 7
arquivos contra a versão formatada por `prettier --write` (já confirmado por
leitura em 19.7) é só quebra de linha/indentação, sem qualquer mudança de
token, lógica, comportamento ou saída de teste; nenhum dos critérios de
aceite literais de `BE-R01` (19.1), `FE-R02` (19.2) ou `FE-R03` (19.3) menciona
formatação de código como parte do critério central, e nenhuma tarefa deste
lote (ou de outro) depende do resultado de `format:check` para funcionar —
a suíte de 894 testes, incluindo os 21 testes novos das 3 tarefas deste lote,
passa integralmente com o conteúdo atual dos 7 arquivos, sem formatação. Não
é, portanto, um achado que "compromete o critério de aceite central... ou
quebra algo que outra tarefa do lote depende" — não há reversão de `Concluída`
para `Em andamento` em nenhuma das 3 linhas de `TASK.md`.

Consequência prática desta reclassificação, sob a convenção do pipeline
consolidado (que não existia como tal quando `BLOCKER-011` foi aberto): um
achado **Simples** devia ter virado uma tarefa no lote `Refatoração Lote-RD1`
em vez de (ou além de) uma entrada em `BLOCKERS.md` escalada a `tech-lead`.
Verificado que essa tarefa **ainda não existe** em `TASK.md` (nenhuma
ocorrência de "Refatoração Lote" no documento) — sinalizado ao `coordenador`
para criá-la na checagem estrutural deste mesmo comando `/validar`, cobrindo
os 7 arquivos de RD1 (o débito de `FE-R06`/`FE-R09`/outros, se ainda em
aberto, é achado de lotes distintos, fora desta reconfirmação). `BLOCKER-011`
permanece útil como registro do padrão recorrente (3ª ocorrência consecutiva
no Frontend, 1ª no Backend) que motivou o escalonamento a Tech Lead sobre a
causa raiz estrutural (ausência de hook de pre-commit) — isso é preocupação
de processo, não muda a classificação funcional do achado em si.

**Veredito da reconfirmação**: nenhuma mudança de código nas 3 tarefas do
lote desde o veredito original; todos os comandos reexecutados batem
(exceto pelo crescimento esperado de números agregados por tarefas de outros
lotes, sem afetar nenhum arquivo de propriedade de RD1); o achado de
formatação é reafirmado como débito de baixa severidade/Simples, não
bloqueante. **O veredito "Aprovado com ressalvas" de RD1 é mantido, sem
alteração.**

## **Lote RD1 — Telas Públicas Redesenhadas (Ranking e Presença): Aprovado com ressalvas**

As 3 tarefas do lote foram validadas de forma independente pelo QA —
leitura linha a linha da migration de `BE-R01`, de `MedalBadge.tsx`/
`PresenceDot.tsx`/`matrix.ts`/`RankingList.tsx`/`PublicHomeShell.tsx`/
`PresencaMensal.tsx`, e da view real `app.presenca_mensal_publica`
consumida por `FE-R03`; reexecução real de `npm test` (853/853), `npm run
lint`, `npm run typecheck`, `npm run build` e `npm run test:integration`
(190 passando + 2 puladas de 192, 20 arquivos, incluindo os 5 testes novos
de `BE-R01` contra Supabase local real), todos limpos exceto
`format:check`; confirmação independente de que `contato`/`data_nascimento`
nunca são pedidos nem retornados em nenhuma das duas rotas públicas de T02/
T03 (camada de banco + camada de fetch + asserção de teste, 3 camadas);
`jest-axe` reexecutado em todos os componentes/telas novos (`MedalBadge`,
`PresenceDot`, `RankingList`, `PublicHomeShell`, `PresencaMensal` × 3
estados) — **0 violações em todos**.

O lote é classificado **"Aprovado com ressalvas"** (não "Aprovado" puro)
por um débito de severidade baixa, não bloqueante e sem efeito de
comportamento: **`BUG-QA-RD1-01`** — `npm run format:check` reprova 7
arquivos de propriedade das 3 tarefas deste lote (conteúdo correto, só
formatação Prettier pendente). Diferente dos achados equivalentes de
lotes anteriores (que ficaram só como nota de acompanhamento), este achado
**é escalado ao Tech Lead via `BLOCKERS.md` (`BLOCKER-011`)** por ser a
terceira ocorrência consecutiva do mesmo tipo no Frontend (limiar
pré-anunciado pelo próprio QA na Seção 3) e a primeira vez que o Backend
também é atingido — indício de que o hábito individual de rodar
`format:check` antes de marcar `Concluída`, sem um hook automático, não é
suficiente por si só. **Nenhum bug de severidade alta/crítica em aberto.**
`BLOCKER-010` (achado de `FE-R03` sobre divergência entre `UX-SPEC.md`
Seção 2.3 e o dado real disponível) foi avaliado de forma independente em
19.6 e confirmado como achado de dado/especificação — mesma régua já usada
para `BLOCKER-004`/`BLOCKER-005` — corretamente **não bloqueante** para
este fechamento. Nenhuma ação de reprovação necessária em `TASK.md`; as 3
tarefas permanecem `Concluída`.

**Integração cruzada Backend↔Frontend**: contrato de
`ranking_publico_recentes` (`API-CONTRACT.yaml` v0.13.0/atual v0.14.0)
verificado de ponta a ponta — colunas pedidas por `FE-R02` batem
exatamente com as expostas pela view e com o schema documentado; junção
com `ranking_publico`/BE-03 por `atleta_id` correta; cenário de falha
parcial de uma das duas fontes tratado com mensagem genérica única.

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps
sobre `RD1`, conforme `EXECUTION-FLOW.md` §5 — este QA não dispara essa
etapa, apenas libera o gate. `BUG-QA-RD1-01`/`BLOCKER-011` devem ser
resolvidos (commit de formatação isolado) antes do próximo push que
dispare o `CI` compartilhado, sob risco de reprovar o gate "Format check"
para qualquer lote — não é, porém, condição para este veredito de QA, que
já avaliou o conteúdo funcional das 3 tarefas como correto.

**Reconfirmação (Seção 19.10)**: veredito revalidado de forma independente
em sessão posterior, contra o estado real do repositório (`HEAD` `ff3221d`,
dois commits à frente do commit `d81fc99` que originou este veredito, nenhum
deles tocando arquivo de propriedade de RD1) — todos os comandos
reexecutados batem, o achado de formatação persiste idêntico nos mesmos 7
arquivos e é reclassificado explicitamente como **Simples** (não Crítica),
com sinalização ao `coordenador` para abrir a tarefa `Refatoração Lote-RD1`
ainda inexistente em `TASK.md`. **Veredito "Aprovado com ressalvas" mantido
sem alteração.**

---

## 20. Lote RD3 — Histórico e Times Redesenhados

Primeiro veredito de QA sobre este lote (`BE-R02`, `SPK-02`, `FE-R09`,
`FE-R06`, `FE-R11`, `TASK.md` Parte II — Iniciativa de Redesenho Visual,
todas já `Concluída`). `FE-R09`/`FE-R11`/`BE-R02`/`SPK-02` chegam
mesclados em `main` (commit `d81fc99`); `FE-R06` (a última a fechar o
lote, nota de fechamento completo em `TASK.md`) ainda está só na árvore
de trabalho, não commitada — validada como está (diff contra `HEAD`),
sem que isso afete o veredito; sinalizado ao `coordenador`/`gestor` só
como observação operacional (commit pendente antes de `/deploy`).

Mudanças de outros escopos vistas em `git status` durante esta validação
(`src/features/login/*`, `src/features/rodadas/EventosStep.tsx`/
`PresencaStep.tsx`/`RevisaoStep.tsx`, `AtletaParticipacaoRow.tsx`,
`RodadaStatTiles.tsx`) são de outra sessão em paralelo (fora do escopo de
RD3, mesmo padrão já avisado pela nota de ambiente desta validação) —
não inspecionadas, não fazem parte deste veredito.

### 20.1 `BE-R02` — Exposição de "Confronto"/"Status" em `GET /api/rodadas`

Critério de aceite literal (`TASK.md` Seção 3.1): confirmado item a
item. `GET /api/rodadas` retorna `confronto: {colete, sem_colete} | null`
e `status_correcao: "encerrada" | "corrigida"` — lidos diretamente de
`src/modules/rodadas/confronto.ts`/`listar.ts`/`repository.ts` e
confirmados via `API-CONTRACT.yaml` 0.14.0 (`RodadaResumoItem.confronto`/
`.status_correcao`, schema `ConfrontoRodada`, ambos em `required`).
Confirmado empiricamente, não só por leitura de código, que o campo novo
é `status_correcao` e não `status` — o `status` de ciclo de vida de
`app.rodada` (`"lancada"`/`"excluida"`) permanece intocado, exatamente
como a nota de conclusão registra; risco de colisão de nome citado no
ponto de atenção desta validação não se concretiza.

`calcularConfronto` (`confronto.ts`) retorna `null` quando
`times.length !== 2`, nunca lança erro — comportamento confirmado por
teste unitário dedicado (`confronto.test.ts`, 9 casos) e por integração
real (ver 20.6). Mapeamento posicional `times[0]` → `colete`/`times[1]`
→ `sem_colete`, ordenado por `label asc, id asc` (não `criado_em`,
correção da própria tarefa) — decisão de detalhe documentada, dentro do
critério de aceite literal (que não especifica correspondência semântica
a `app.time.label`).

Reexecução independente: suíte de integração real contra Supabase local
(`npm run test:integration`, sem `db reset` para não perturbar sessões
paralelas) — **190 passed | 2 skipped, 20 arquivos**, batendo exatamente
com o número reportado pela própria nota de conclusão. O describe
`BE-R02 — confronto/status_correcao (T06 redesenhado)` dentro de
`listar.integration.test.ts` passou, incluindo o caso "confronto soma
pontos de gol por time... primeiro time = colete, segundo = sem_colete"
contra dado real. Achado de formatação: ver 20.8 (`BUG-QA-RD3-01`).

**Veredito**: Aprovado com ressalva (débito de formatação, não bloqueante
— 20.8).

### 20.2 `SPK-02` — Disponibilidade de dado legado para "Confronto"

Spike, não tarefa de entrega — critério de saída era uma resposta
binária documentada, não código. Conferido: a resposta ("Não" — dado
insuficiente em 100% da amostra de `presencas_rodada`, 0 gols em 770
linhas) é coerente com a decisão de `BE-15` de não migrar
`app.time`/`app.time_atleta` e com o fallback `confronto: null`
efetivamente implementado por `BE-R02` para toda rodada de origem
legado. Nenhuma contradição entre o que o spike concluiu e o que o
código faz. **Veredito**: Aprovado (nada a reprovar num spike já
absorvido corretamente por quem o consome).

### 20.3 `FE-R09` — T09 Montagem de Times (redesenho)

Maior tarefa da iniciativa — validada com mais profundidade, conforme
solicitado.

- **`PitchBackground`/`PlayerChip` (componentes novos, Guardrail 31)**:
  código lido linha a linha. `PlayerChip` é um `<button>` real
  (`PlayerChip.tsx`), `aria-label` explícito inclui nível técnico (RN-03)
  mesmo não pintado no chip — reconcilia a célula resumida da Seção 3.2
  com o comp aprovado, decisão de detalhe aceitável (não reabre nenhum
  requisito visual fechado). `draggable` sempre presente no DOM, sem
  `matchMedia` — aceitável porque a API nativa de DnD não dispara por
  toque em nenhum navegador-alvo (RNF-09), e o `onClick`/modal
  `TrocarJogadorModal` continua sendo a única via obrigatória em qualquer
  viewport (Guardrail 30 respeitado — DnD é atalho, não substituto).
  `aria-hidden="true"` aplicado só a `.centerLine` (puramente decorativa),
  nunca ao contêiner — confirmado em `PitchBackground.tsx`; jogadores/times
  reais continuam expostos a tecnologia assistiva, consequência exigida
  pelo `ADR-014`.
- **Testes de acessibilidade**: `PlayerChip.test.tsx`/
  `PitchBackground.test.tsx` incluem `jest-axe` — confirmados passando na
  reexecução completa da suíte (20.7).
- **Renomeação "Time A"/"Time B" → "Colete"/"Sem Colete"**: `labelParaIndice`
  (`times.ts`) altera o valor persistido em `app.time.label` a partir
  desta tarefa; compatibilidade com a convenção posicional de `BE-R02`
  confirmada por leitura direta ("Colete" ainda ordena antes de "Sem
  Colete" em `label asc`, preservando `times[0]`) — nenhuma quebra de
  contrato entre as duas tarefas, mesmo sendo tarefas "irmãs" do mesmo
  lote com uma dependência de fato não declarada formalmente no `TASK.md`
  (`BE-R02` não lista `FE-R09` como dependência, mas a nota de conclusão
  de `BE-R02` já antecipa a renomeação corretamente).
- **Banner "✓ Restrição respeitada" — integração cruzada com `BE-11`/
  `BE-12`/`BE-13`**: ponto de maior atenção desta validação. Confirmado
  que `restricoesRespeitadas` (`times.ts`) reconcilia inteiramente no
  cliente `GET /api/restricoes` (schema `RestricaoObrigatoriaResponse`,
  `atleta_a_id`/`atleta_a_nome`/`atleta_b_id`/`atleta_b_nome`/`ativo` —
  conferido campo a campo contra `API-CONTRACT.yaml`) com a divisão atual
  de times — nenhuma mudança em `POST /api/times/sugestao`
  (`TimeMontadoResponse`/`SugestaoTimesResultado` inalterados, conferido
  no contrato). Wiring de ponta a ponta confirmado por leitura direta:
  `MontagemTimesShell.tsx` busca `listarRestricoes` (degradação silenciosa
  para `[]` em erro, nunca quebra o fluxo principal) e passa para
  `TimesResultado.tsx`, que chama `restricoesRespeitadas(times,
  restricoes)` e renderiza o banner por par respeitado. Nenhuma quebra de
  contrato com `BE-11`/`BE-12`/`BE-13` — confirmado empiricamente, não só
  por leitura: suíte de integração real (`sugestao.integration.test.ts`,
  `times.integration.test.ts`, `restricoes.integration.test.ts`) passa
  100% na reexecução (20.6).
- **Correção do "Novo sorteio" sem feedback de erro na fase "resultado"**:
  confirmado em `MontagemTimesShell.tsx` — `erroGeracao` agora também
  renderiza um `AlertBanner` na fase "resultado", não só na "seleção".
  Achado genuíno de UX corrigido pela própria tarefa, não uma lacuna
  remanescente.
- **Achado de formatação**: ver 20.8 (`BUG-QA-RD3-01`) — 4 arquivos de
  propriedade desta tarefa fora do padrão Prettier, incluindo
  `TimesResultado.tsx` (produção, não só teste).

**Veredito**: Aprovado com ressalva (débito de formatação, não bloqueante
— 20.8).

### 20.4 `FE-R06` — T06 Histórico de Rodadas (Confronto/Status)

Ponto de atenção específico desta validação — confirmado por leitura
direta do diff (working tree, não commitado): `RodadaHistoricoItem` usa
literalmente `status_correcao` (`types.ts`), nunca confundido com
`status` (comentário explícito "ATENÇÃO... NÃO confundir" no próprio
arquivo). Nenhum novo componente criado (Guardrail 31) — pill "Status"
reaproveita `Badge` já existente (`variant="success"`/`"warning"`, cores
já validadas pelo `accessibility-review` de `FE-R00`).

Placeholder de `confronto: null` — WCAG 1.4.1 confirmado por leitura e
por teste: `<span role="img" aria-label="Confronto não disponível para
esta rodada">—</span>` (`RodadaListItem.tsx`), nunca célula vazia; teste
dedicado `RodadaListItem.test.tsx` inclui `jest-axe` explicitamente para
o caso "Confronto null" (`"sem violação de acessibilidade (axe) com
'Confronto' null (placeholder '—')"`), confirmado passando na reexecução
completa.

Escopo de mockup deliberadamente não implementado (2ª linha de
lesionados/ausentes, `<table>` desktop) — decisão de detalhe documentada,
consistente com o critério de aceite literal ("duas colunas novas") e com
a "Correção sobre a revisão 1" da própria Seção 2.5 do `UX-SPEC.md`, que
lista só "Confronto"/"Status". Não reinterpretado como omissão.

Achado de formatação: nenhum — confirmado isoladamente
(`npx prettier --check` nos 8 arquivos de propriedade desta tarefa:
"All matched files use Prettier code style!"), a única das 3 tarefas de
Frontend deste lote sem esse débito.

**Veredito**: Aprovado.

### 20.5 `FE-R11` — T11 Substituição no Intervalo (auditoria)

Ponto de atenção específico desta validação: confirmar que "zero mudança
funcional" é uma conclusão correta, não uma tarefa não-testada. Confirmado
por `git diff` — a única mudança em `SubstituicoesModal.tsx` é um bloco de
comentário de auditoria (nenhuma linha de código executável alterada).
Reexecução da suíte confirma contagem idêntica de testes antes/depois
(888, mesma contagem de `FE-R09`) — consistente com "nenhum teste novo
necessário porque nenhum comportamento mudou", não com uma tarefa que
pulou validação. `PlayerChip` avaliado e descartado como substituto dos
`Select` de "Sai"/"Entra" — justificativa (lista selecionável por teclado
≠ componente de jogador posicionado) é tecnicamente correta e não reabre
o critério de aceite. Achado de formatação corretamente identificado
(16 arquivos, não os desta tarefa) e corretamente **não corrigido** por
esta tarefa (fora de seu limite de autoridade, risco de conflito com
outra sessão) — mesma disciplina já vista em `FE-R03`/RD1.

**Veredito**: Aprovado.

### 20.6 `cross-platform-integration-testing`

Reexecução real e independente (sem `supabase db reset`, para não
perturbar sessões paralelas usando a mesma instância local):

- `npm run test:integration` — **190 passed | 2 skipped (192), 20
  arquivos**, incluindo `listar.integration.test.ts` (describe `BE-R02`),
  `sugestao.integration.test.ts`, `times.integration.test.ts`,
  `restricoes.integration.test.ts` — nenhuma quebra de contrato entre
  `BE-R02`/`FE-R09` e `BE-11`/`BE-12`/`BE-13`, confirmado empiricamente,
  não presumido a partir da nota de implementação.
- Contrato `API-CONTRACT.yaml` 0.14.0 conferido campo a campo contra o
  código real dos dois lados (Backend `presenter.ts`/`listar.ts` e
  Frontend `types.ts`/`historicoApi.ts`) para `confronto`/
  `status_correcao`; `RestricaoObrigatoriaResponse`/`TimeMontadoResponse`/
  `SugestaoTimesResultado` conferidos como inalterados, batendo com a
  premissa de "zero mudança de contrato" das notas de `BE-R02`/`FE-R09`.

### 20.7 Non-functional validation

- **Acessibilidade**: `npm test -- --run` reexecutado — **897 passed
  (111 arquivos)** — inclui todos os `jest-axe` de `PitchBackground`,
  `PlayerChip`, `RodadaListItem` (com e sem `confronto`), sem violação.
  (Contagem de 897 é maior que os 894/888 citados pelas notas de `FE-R06`/
  `FE-R09`/`FE-R11` porque a árvore de trabalho atual também contém
  mudanças não commitadas de outra sessão/lote, fora do escopo de RD3 —
  nenhum teste de propriedade das 5 tarefas deste lote falhou ou foi
  removido.)
- **Build/typecheck/lint**: `npx tsc --noEmit` limpo (sem saída);
  `npm run lint` → `✔ No ESLint warnings or errors`; `npm run build` →
  `✓ Compiled successfully`, 21 rotas geradas — nenhuma regressão.
- **Usabilidade (UX-SPEC.md)**: rótulos "Colete"/"Sem Colete" propagados
  de forma consistente entre T09 (`PitchTeamHeader`) e T11
  (`labelDoTime`, confirmado sem hardcode residual de "Time A"/"Time B").

### 20.8 Achados do QA (bugs/débitos)

---

**`BUG-QA-RD3-01` — Severidade: Baixa (débito, não bloqueante)**

- **Componente**: `npm run format:check` (`prettier --check .`) — **8
  arquivos de propriedade das tarefas deste lote** fora do padrão:
  `src/modules/rodadas/confronto.ts`, `src/modules/rodadas/listar.ts`,
  `src/modules/rodadas/repository.ts`,
  `app/api/rodadas/__tests__/listar.integration.test.ts` (todos
  `BE-R02`); `src/features/times/times.test.ts`,
  `src/features/times/TimesResultado.test.tsx`,
  `src/features/times/TimesResultado.tsx`,
  `app/dev/design-system/page.tsx` (parcial — parágrafo de vitrine
  próprio, o resto do arquivo é de `FE-R02`/RD1) (todos `FE-R09`).
- **Passos para reproduzir**: `npm run format:check` na raiz do projeto,
  estado atual do repositório (`HEAD` `d81fc99` + `FE-R06` não commitada).
- **Resultado esperado**: exit code 0.
- **Resultado obtido**: exit code 1, `Code style issues found in 16
  files` — 8 desses 16 são de propriedade deste lote (os outros 8: 7 já
  registrados e escalados em `BLOCKER-011`/`BUG-QA-RD1-01` (RD1, ainda
  sem a tarefa `REF-RD1-01` executada) + `AtletaForm.tsx`, de tarefa fora
  de RD1/RD3, fora do escopo desta validação).
- **Contradição relevante com a expectativa registrada em `TASK.md`**: a
  nota de fechamento parcial do lote (ao concluir `FE-R06`) afirma que os
  "16 arquivos remanescentes... pertencem a `FE-R09`/`BE-R01`/`BE-R02`/
  outras tarefas já concluídas" sem cravar quantos são de `BE-R01`
  (RD1, já tratado) vs. `BE-R02`/`FE-R09` (RD3, deste veredito) — esta
  validação fecha essa ambiguidade por contagem direta: são exatamente 4
  arquivos de `BE-R02` + 4 de `FE-R09`, nenhum de `BE-R01` além dos já
  computados em `BUG-QA-RD1-01`.
- **Por que não bloqueia a aprovação funcional**: confirmado por
  `npx prettier <arquivo> | diff` em todos os 8 arquivos — 100% quebra de
  linha/indentação por `printWidth: 90`, nenhuma mudança de token, string,
  lógica ou valor de asserção; os 897 testes (incluindo os das 5 tarefas
  deste lote) e a suíte de integração (190/192) passam normalmente com o
  conteúdo atual.
- **Classificação**: **Simples** (não Crítica) — mesma régua de
  `BUG-QA-RD1-01`/Seção 19.10: ajuste pontual, baixo esforço, não
  compromete critério de aceite central de `BE-R02`/`FE-R09` nem quebra
  nenhuma outra tarefa do lote (confirmado pela suíte de integração
  cruzada, 20.6). Nenhum retorno ao `executor` — `BE-R02`/`FE-R09`
  permanecem `Concluída`.
- **Ação**: confirma a previsão já registrada em `BLOCKER-011` ("é
  razoável esperar uma quarta e quinta ocorrência nos lotes RD2/RD3/RD4
  restantes") — esta é a ocorrência de RD3. Sinalizado ao `coordenador`
  para criar `Refatoração Lote-RD3` (mesmo padrão de `Refatoração
  Lote-RD1`/`REF-RD1-01`, ainda não executada) cobrindo estes 8 arquivos,
  na checagem estrutural deste mesmo comando `/validar`. `BLOCKER-011`
  não precisa de uma nova entrada — já cobre a causa raiz estrutural
  (ausência de hook de pre-commit); esta ocorrência é só mais um dado
  confirmando o padrão já escalado, sem elevar a severidade.

---

**Nenhum outro bug/débito de código encontrado neste lote.** Nenhum achado
de severidade alta/crítica em nenhuma das 5 tarefas.

### 20.9 Checklist de "Pronto" (Definition of Done de QA, por lote)

- [x] Todo critério de aceite de cada tarefa do lote foi testado e está
      passando (`BE-R02`: 20.1; `SPK-02`: 20.2; `FE-R09`: 20.3; `FE-R06`:
      20.4; `FE-R11`: 20.5)
- [x] Nenhuma reprovação crítica em aberto
- [x] Toda reprovação simples virou tarefa em `Refatoração Lote-X`
      (`BUG-QA-RD3-01` → sinalizado para `Refatoração Lote-RD3`, 20.8)
- [x] Testes de integração cruzada executados e passando (20.6 — contrato
      `BE-R02`↔`FE-R06` e `BE-11`/`BE-12`/`BE-13`↔`FE-R09` verificados de
      ponta a ponta, sem quebra)
- [x] Requisito não funcional relevante ao lote validado (20.7 —
      acessibilidade/`jest-axe`, build/lint/typecheck, usabilidade)

### 20.10 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `BE-R02` | Aprovado com ressalvas (débito de baixa severidade, `BUG-QA-RD3-01`) | Seção 20.1 |
| `SPK-02` | Aprovado | Seção 20.2 |
| `FE-R09` | Aprovado com ressalvas (débito de baixa severidade, `BUG-QA-RD3-01`) | Seção 20.3 |
| `FE-R06` | Aprovado | Seção 20.4 |
| `FE-R11` | Aprovado | Seção 20.5 |

**Encaminhamento**: lote elegível para seguir à auditoria do DevSecOps
sobre RD3, conforme `EXECUTION-FLOW.md` §5 — este QA não dispara essa
etapa, apenas libera o gate. `BUG-QA-RD3-01` deve virar a tarefa
`Refatoração Lote-RD3` (coordenador) antes do próximo push que dispare o
`CI` compartilhado, sob risco de reprovar o gate "Format check" — não é,
porém, condição para este veredito de QA. Recomenda-se também commitar
`FE-R06` (hoje só na árvore de trabalho) antes de qualquer `/deploy`
deste lote.

## **Lote RD3 — Histórico e Times Redesenhados: Aprovado com ressalvas**

---

## 21. Lote Refatoração RD1 — `REF-RD1-01` (correção de `BUG-QA-RD1-01`/`BLOCKER-011`)

**Contexto**: lote de refatoração pura, tarefa única `REF-RD1-01`
(`TASK.md` Seção 3.3, Parte II), já `Concluída`. Aplica `npx prettier
--write` aos 7 arquivos identificados em `BUG-QA-RD1-01`/Seção 19.7/19.10
(propriedade de `BE-R01`/`FE-R02`/`FE-R03`, já validados e aprovados com
ressalvas no fechamento do Lote RD1, Seção 19) — mudança puramente de
formatação, sem reabrir nenhuma das 3 tarefas de origem. Validação aplicada
de forma proporcional ao risco (baixíssimo, escopo mecânico de um único
comando), sem pular etapa.

**Método**: `git diff` linha a linha dos 7 arquivos (não aceite da nota de
conclusão do Executor) para confirmar 100% reformatação; reexecução real
das suítes de teste afetadas; reexecução de `npm run format:check` para
confirmar que os 7 arquivos saíram da lista de reprovados.

### 21.1 Confirmação por `git diff` — reformatação pura

| Arquivo | Resultado |
|---|---|
| `src/features/ranking-publico/RankingList.tsx` | ✅ só quebra de linha/indentação (`printWidth`), nenhum token/classe/string alterado |
| `src/features/ranking-publico/format.test.ts` | ✅ idem — asserções e valores esperados idênticos |
| `src/features/ranking-publico/matrix.test.ts` | ✅ idem |
| `src/features/ranking-publico/PublicHomeShell.test.tsx` | ✅ idem |
| `src/features/ranking-publico/rankingRecentesApi.test.ts` | ✅ idem |
| `src/features/presenca-mensal/PresencaMensal.test.tsx` | ✅ idem |
| `src/lib/supabase/__tests__/ranking-publico-recentes.integration.test.ts` | ✅ maior diff em linhas (reflow de objetos/`Promise.all` multilinha), mas todo `status`/`rodada_id`/`atleta_id`/expressão de cálculo (`Math.round(...)`) permanece byte-a-byte idêntico ao original — confirmado por leitura completa do diff, não amostragem |

Nenhuma das 7 diferenças altera string, nome de coluna, valor de asserção,
lógica de teste ou comportamento de produção.

### 21.2 Suíte reexecutada

| Comando | Resultado |
|---|---|
| `npx vitest run src/features/ranking-publico src/features/presenca-mensal` | ✅ 9 arquivos, **57/57 testes passando** |
| `npx vitest run --config vitest.integration.config.ts` (`ranking-publico-recentes.integration.test.ts`) | ✅ **5/5 testes passando**, contra Supabase local real |
| `npx prettier --check` nos 7 arquivos | ✅ `All matched files use Prettier code style!` |
| `npm run format:check` (repositório inteiro) | ✅ `All matched files use Prettier code style!` — nenhum dos 7 arquivos (nem nenhum outro) reprovado nesta data |

### 21.3 Achados

Nenhum achado novo. `BLOCKER-011` permanece útil como registro da causa raiz
estrutural (ausência de hook de pre-commit, Tech Lead) — este veredito trata
apenas da correção mecânica dos 7 arquivos de RD1, não da ação estrutural
item (2) do próprio `BLOCKER-011`.

### 21.4 Checklist de "Pronto" (Definition of Done de QA, por lote)

- [x] Todo critério de aceite da tarefa do lote foi testado e está passando
      (único critério: reformatar os 7 arquivos sem alterar comportamento —
      21.1/21.2)
- [x] Nenhuma reprovação crítica ou simples em aberto
- [x] Testes de integração cruzada executados e passando (21.2 —
      `ranking-publico-recentes.integration.test.ts` reexecutado contra
      Supabase local real)
- [x] Requisito não funcional relevante validado (nenhum aplicável além de
      "sem regressão de comportamento", já coberto pela suíte completa)

### 21.5 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `REF-RD1-01` | Aprovado (sem ressalva) | Seção 21.1/21.2 |

**Encaminhamento**: lote elegível para a auditoria enxuta do DevSecOps
(`SECURITY-REVIEW.md`) e, em seguida, para a checagem estrutural do
Coordenador — sem retorno ao `executor`.

## **Lote Refatoração RD1 (`REF-RD1-01`): APROVADO (sem ressalva)**

Os 7 arquivos de propriedade de `BE-R01`/`FE-R02`/`FE-R03` (Lote RD1, já
aprovado com ressalvas na Seção 19) foram confirmados como 100%
reformatação Prettier — nenhuma string, token, valor de asserção ou lógica
alterada, verificado por leitura completa do `git diff` de cada um dos 7
arquivos, não por amostragem nem pela nota de conclusão do Executor. As 57
verificações unitárias de `ranking-publico`/`presenca-mensal` e as 5
verificações de integração de `ranking-publico-recentes` continuam passando
sem qualquer alteração de resultado. `npm run format:check` confirma que
nenhum dos 7 arquivos (nem nenhum outro, nesta data) permanece fora do
padrão. `BUG-QA-RD1-01`/`BLOCKER-011` está resolvido na sua ação item (1)
(correção mecânica dos 7 arquivos); a ação estrutural item (2) (hook de
pre-commit) permanece sob responsabilidade do Tech Lead, sem prazo formal.

**Encaminhamento**: liberado para a auditoria do DevSecOps sobre este mesmo
lote (`SECURITY-REVIEW.md`) e, com a dupla aprovação, para a checagem
estrutural do Coordenador. Nenhuma entrada nova em `BLOCKERS.md` — nenhum
achado deste lote exige retorno ao time de implementação.

---

## 22. Lote Refatoração RD3 — `REF-RD3-01` (correção de `BUG-QA-RD3-01`)

**Contexto**: lote de refatoração pura, tarefa única `REF-RD3-01`
(`TASK.md` Seção 3.3, Parte II), já `Concluída`. Aplica `npx prettier
--write` aos 8 arquivos identificados em `BUG-QA-RD3-01`/Seção 20.8
(propriedade de `BE-R02`/`FE-R09`, já validados e aprovados com ressalvas
no fechamento do Lote RD3, Seção 20) — mudança puramente de formatação,
sem reabrir nenhuma das 2 tarefas de origem. Arquivos totalmente disjuntos
dos 7 de `REF-RD1-01`/Seção 21 (confirmado por `TASK.md` Seção 3.0).
Validação aplicada de forma proporcional ao risco (baixíssimo, escopo
mecânico de um único comando), sem pular etapa.

**Método**: `git diff` linha a linha dos 8 arquivos (não aceite da nota de
conclusão do Executor) para confirmar 100% reformatação; reexecução real
das suítes de teste afetadas; reexecução de `npm run format:check` para
confirmar que o repositório inteiro está limpo.

### 22.1 Confirmação por `git diff` — reformatação pura

| Arquivo | Resultado |
|---|---|
| `src/modules/rodadas/confronto.ts` | ✅ só quebra de linha do corpo de uma função (`printWidth`), nenhum token/valor alterado |
| `src/modules/rodadas/listar.ts` | ✅ idem — reflow de um `Promise.all` multilinha, mesma ordem/mesmos argumentos |
| `src/modules/rodadas/repository.ts` | ✅ idem — mensagem de erro (`throw new Error`) byte-a-byte idêntica, só quebrada em mais linhas |
| `app/api/rodadas/__tests__/listar.integration.test.ts` | ✅ reflow de assinatura de função e de objetos de teste multilinha + um `it()` desindentado (bloco não é mais `async () => {...}` extra-indentado); asserções, nomes de teste e valores esperados idênticos |
| `src/features/times/times.test.ts` | ✅ reflow de objetos literais multilinha, mesmos valores de campo |
| `src/features/times/TimesResultado.test.tsx` | ✅ reflow de chamada `getByRole` multilinha, mesmo texto de `name` |
| `src/features/times/TimesResultado.tsx` | ✅ reflow de props JSX de um `<Button>`, mesmos valores/handlers |
| `app/dev/design-system/page.tsx` | ✅ reflow de texto de parágrafo (rewrap de prosa, JSX colapsa espaço em branco em renderização — zero mudança de conteúdo renderizado). **Observação de precisão**: a nota de conclusão do Executor (`TASK.md`) e a descrição do achado (20.8) dizem que só o parágrafo de vitrine de `FE-R09` (`PitchBackground`/`PlayerChip`) seria tocado; o `git diff` real mostra que os parágrafos de `MedalBadge`/`PresenceDot` (`FE-R02`, fora do escopo nominal desta tarefa) também foram reformatados. Isso é uma consequência inevitável de `npx prettier --write <arquivo>` operar em granularidade de arquivo inteiro, não de parágrafo — não é possível restringir Prettier a um trecho de um arquivo. Não é reprovação: (1) o critério de aceite formal da tarefa restringe a **arquivos** ("restrito exatamente a estes 8 arquivos"), não a parágrafos, e nenhum arquivo fora da lista foi tocado; (2) o conteúdo textual dos 3 parágrafos é idêntico, só o ponto de quebra de linha mudou, sem efeito no HTML renderizado; (3) `FE-R02`/RD1 já está `Concluída` e não depende de layout de linha-fonte desta página de vitrine interna (`app/dev/design-system`, não é tela de produção). Registrado aqui só para manter a nota de conclusão da tarefa precisa — não é um achado que exija ação. |

Nenhuma das 8 diferenças altera string, nome de campo/coluna, valor de
asserção, lógica de teste ou comportamento de produção.

### 22.2 Suíte reexecutada

| Comando | Resultado |
|---|---|
| `npx vitest run src/modules/rodadas src/features/times` | ✅ 11 arquivos, **160/160 testes passando** |
| `npx vitest run --config vitest.integration.config.ts app/api/rodadas` | ✅ 8 arquivos, **52/52 testes passando**, contra Supabase local real (inclui `listar.integration.test.ts`, 8/8) |
| `npm run format:check` (repositório inteiro) | ✅ `All matched files use Prettier code style!` — zero arquivo pendente nesta data; confirma que este era o último achado de formatação em aberto (`BUG-QA-RD1-01` e `BUG-QA-RD3-01` ambos resolvidos) |

### 22.3 Achados

Nenhum achado novo de comportamento/segurança. Único ponto registrado é a
observação de precisão da Seção 22.1 sobre o alcance real da reformatação
em `app/dev/design-system/page.tsx` (informativo, não bloqueante, não gera
tarefa nova — sem efeito de conteúdo renderizado nem conflito com `FE-R02`/
RD1, já `Concluída`).

### 22.4 Checklist de "Pronto" (Definition of Done de QA, por lote)

- [x] Todo critério de aceite da tarefa do lote foi testado e está passando
      (único critério: reformatar os 8 arquivos sem alterar comportamento —
      22.1/22.2)
- [x] Nenhuma reprovação crítica ou simples em aberto
- [x] Testes de integração cruzada executados e passando (22.2 —
      `app/api/rodadas` reexecutado contra Supabase local real, 52/52)
- [x] Requisito não funcional relevante validado (`npm run format:check`
      limpo no repositório inteiro, 22.2)

### 22.5 Veredito agregado

| Tarefa | Veredito | Referência |
|---|---|---|
| `REF-RD3-01` | Aprovado (sem ressalva) | Seção 22.1/22.2 |

**Encaminhamento**: lote elegível para a auditoria enxuta do DevSecOps
(`SECURITY-REVIEW.md`) e, em seguida, para a checagem estrutural do
Coordenador — sem retorno ao `executor`.

## **Lote Refatoração RD3 (`REF-RD3-01`): APROVADO (sem ressalva)**

Os 8 arquivos de propriedade de `BE-R02`/`FE-R09` (Lote RD3, já aprovado
com ressalvas na Seção 20) foram confirmados como 100% reformatação
Prettier — nenhuma string, token, valor de asserção ou lógica alterada,
verificado por leitura completa do `git diff` de cada um dos 8 arquivos,
não por amostragem nem pela nota de conclusão do Executor. As 160
verificações unitárias de `src/modules/rodadas`/`src/features/times` e as
52 verificações de integração de `app/api/rodadas` continuam passando sem
qualquer alteração de resultado. `npm run format:check` confirma que o
repositório inteiro está limpo nesta data — este era o último achado de
formatação pendente entre `REF-RD1-01` e `REF-RD3-01`. `BUG-QA-RD3-01`
está resolvido; `BLOCKER-011` (causa raiz estrutural, ausência de hook de
pre-commit) permanece sob responsabilidade do Tech Lead, sem prazo formal,
inalterado por este lote.

**Encaminhamento**: liberado para a auditoria do DevSecOps sobre este mesmo
lote (`SECURITY-REVIEW.md`) e, com a dupla aprovação, para a checagem
estrutural do Coordenador. Nenhuma entrada nova em `BLOCKERS.md` — nenhum
achado deste lote exige retorno ao time de implementação.

---

