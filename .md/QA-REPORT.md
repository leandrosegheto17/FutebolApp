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

