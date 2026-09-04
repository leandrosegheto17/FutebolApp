# SECURITY-REVIEW.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: DevSecOps Engineer
**Skills aplicadas**: `static-security-analysis` (contínua, todo o repositório),
`security-requirement-validation`, `compliance-validation`,
`sensitive-data-exposure-check`, `finding-severity-classification`,
`security-report-drafting`.
**Primeira execução deste artefato** — `static-security-analysis` deveria ter
rodado desde o início do projeto em paralelo à implementação, mas nunca havia
sido disparada; esta entrada cobre o scan contínuo retroativo sobre todo o
código atual e a auditoria completa (5 skills) sobre o lote **L0** (BE-01,
BE-02, FE-00), única unidade formalmente elegível hoje (`QA-REPORT.md`
Seções 1-3, todas `Aprovado com ressalvas`).
**Referências**: `SDD.md` Seção 7, `GUARDRAILS.md` (36 regras),
`CTO-REVIEW.md` (Gates 1-3, `risk-and-compliance-check`), `API-CONTRACT.yaml`
(v0.1.0+), `QA-REPORT.md` Seções 1-3 (L0) e Seção 6 (FE-01, fora de escopo,
referenciada apenas como contexto do scan contínuo).

**Atualização (2026-09-03, reauditoria pontual pós-BLOCKER-006)**: escopo
restrito à mudança de dependência (`next`, `vitest`) aplicada pelo Backend em
resposta ao bloqueio de `CRIT-01`. Não repete as 5 skills completas sobre
BE-01/BE-02/FE-00 (nenhuma mudança de lógica de negócio nessas tarefas) — ver
Seção 0.1 abaixo para o método desta rodada específica e Seção 1 (`CRIT-01`,
fechado), Seção 3 (`DEBT-01` atualizado, `DEBT-04` novo) e Seção 7 (veredito
revisado).

**Atualização (2026-09-03, segunda auditoria completa por lote — Lote L1,
Autenticação)**: o QA aprovou o Lote L1 inteiro (`BE-04`, `BE-05`, `FE-01`,
`FE-12`) com ressalvas (`QA-REPORT.md` Seções 5, 7, 8, 9, 10 — veredito
agregado "Aprovado com ressalvas", nenhum bug alta/crítica em aberto,
`BUG-QA-FE01-01` corrigido e reconfirmado). As 5 skills de auditoria completa
por lote rodam agora, pela primeira vez, sobre estas 4 tarefas — ver Seção 9
(método), Seções 10-13 (achados), Seção 14 (LGPD), Seção 15 (checklist),
Seção 16 (veredito) e Seção 17 (`BLOCKERS.md`). O scan contínuo
(`static-security-analysis`) já cobria este código desde a reauditoria
anterior (Seção 0.1) — não repetido do zero, mas reconfirmado nesta rodada
(Seção 9) que os 4 débitos herdados de L0 (`DEBT-01`-`04`) mantêm a mesma
classificação.

**Atualização (2026-09-04, terceira auditoria completa por lote — Lote L6,
Montagem de Times, Restrições e Substituições)**: o QA aprovou o Lote L6
inteiro (`BE-11`, `BE-12`, `BE-13`, `FE-09`, `FE-10`, `FE-11`) com ressalvas
(`QA-REPORT.md` Seção 11 — veredito agregado "Aprovado com ressalvas",
único achado `BUG-QA-FE10-01`, baixa severidade, acessibilidade, não
bloqueante). As 5 skills de auditoria completa rodam agora sobre estas 6
tarefas — ver Seção 18 (método), Seções 20-22 (achados de segurança,
nenhum novo), Seção 23 (exposição de dado sensível), Seção 24 (LGPD),
Seção 25 (requisitos operacionais), Seção 26 (checklist), Seção 27
(veredito: **Aprovado**, sem débito de segurança novo) e Seção 28
(`BLOCKERS.md`). Nesta rodada, `DEBT-01` (Seção 3) teve sua reavaliação
formal — devida "antes do fechamento de L2", mas nunca disparada por um
gap de governança no fechamento daquele lote — realizada por antecipação
(Seção 19): classificação mantida em Baixa, sem mudança de fato desde L1.

---

## 0. Método

- **Escopo formal desta auditoria (5 skills completas)**: lote **L0** —
  BE-01 (setup Next.js), BE-02 (migrations + RLS deny-by-default), FE-00
  (fundação do design system). As três aprovadas com ressalvas pelo QA
  (débitos de baixa severidade já registrados: `BUG-QA-BE01-01/02`,
  `BUG-QA-FE00-01/02`, `BUG-QA-BE02-01` — nenhum deles é achado de
  segurança novo, são herdados e não reclassificados aqui).
- **Escopo do scan contínuo (`static-security-analysis`, 1 skill)**: todo o
  repositório no estado atual, incluindo trabalho já escrito de L1 (BE-04,
  BE-05, FE-01) — FE-01 está `Em andamento`, reprovada pelo QA por
  `BUG-QA-FE01-01` (open redirect, severidade Alta, já em aberto e sob
  responsabilidade do Frontend; não duplicado aqui, apenas referenciado na
  Seção 5).
- **Comandos executados diretamente** (não apenas leitura de código):
  `npm audit --json`/`--audit-level=high`, leitura linha a linha das 16
  migrations em `supabase/migrations/`, leitura de todo `src/lib/config`,
  `src/lib/supabase`, `src/modules/autenticacao`, `middleware.ts`,
  `.github/workflows/ci.yml`, `vercel.json`, `.env.example`/`.gitignore`,
  `git grep` para padrões de segredo hardcoded/`console.log` de dado
  sensível/`dangerouslySetInnerHTML`/comparação insegura de senha.
- **CTO-REVIEW.md**: presente e lido (Gates 1-3). Nenhum achado de
  compliance estratégico pendente de decisão de negócio identificado nesta
  rodada, além do que já está coberto pelas regras 35/36 do
  `GUARDRAILS.md` (ambas já tratadas como contexto herdado pelo Software
  Architect/DevOps, não um achado novo — ver nota no fim da Seção 3).
- **API-CONTRACT.yaml**: presente. L0 (BE-01/BE-02/FE-00) não publica
  nenhum endpoint próprio — nenhuma superfície de payload a comparar nesta
  rodada; será o insumo central quando a auditoria de L2/L1 rodar.

---

## 0.1 Método da reauditoria pontual (2026-09-03)

- **Gatilho**: `BLOCKERS.md` `BLOCKER-006` marcado `Resolvido` pelo Backend
  (`next` 14.2.5→14.2.35, `vitest` 2.0.5→2.1.9, suíte completa verde).
- **Comandos executados**: `npm audit --json` (íntegro) e `npm audit
  --audit-level=high --omit=dev` (para isolar o que afeta dependências de
  produção do que é só toolchain de dev/CI); leitura de `package.json`
  (scripts `dev`/`build`/`start`/`test`/`test:watch`), `next.config.mjs`,
  `.github/workflows/ci.yml`; `git grep`/`Grep` para confirmar ausência de
  Pages Router (`pages/`), `next/image`, `next/script`, `"use server"`/
  Server Actions, `rewrites`, CSP nonces e servidor HTTP customizado
  (`createServer`) no código deste projeto — necessário para avaliar a
  aplicabilidade real dos achados que o `npm audit` reporta para `next` hoje
  (ver `DEBT-04` abaixo), não apenas aceitar a severidade agregada do npm
  audit sem contexto (mesma metodologia já usada para `CRIT-01` na primeira
  execução).
- **Não repetido nesta rodada**: as 5 skills completas sobre o código de
  BE-01/BE-02/FE-00 (RLS, triggers, minimização de dado, LGPD Seção 5) — sem
  mudança de lógica de negócio nessas tarefas, apenas de versão de
  dependência compartilhada; a conclusão original da Seção 5 (compliance)
  permanece válida sem necessidade de nova verificação.

---

## 1. Achados críticos (bloqueiam deploy)

### CRIT-01 — Dependência `next@14.2.5` vulnerável a bypass de autorização em Middleware (CVE-2025-29927 / GHSA-f82v-jwr5-mffw) — **RESOLVIDO**

- **Status atualizado (2026-09-03)**: **Fechado.** Confirmado por
  reauditoria pontual: `package.json`/`package-lock.json` resolvem `next` em
  `14.2.35` (`node_modules/next/package.json` confirma a mesma versão).
  `npm audit --json` re-executado nesta data **não lista mais**
  `GHSA-f82v-jwr5-mffw` em nenhuma entrada — a faixa vulnerável documentada
  (`>=14.0.0 <14.2.25`) não cobre `14.2.35`. A entrada `next` do `npm audit`
  atual existe por **outras** advisories, não relacionadas a este CVE (ver
  `DEBT-04`, novo achado desta rodada, Seção 3). CRIT-01 não bloqueia mais
  deploy. Detalhes originais do achado preservados abaixo para rastreabilidade.

- **Severidade**: **Crítica** (CVSS 9.1, CWE-285/CWE-863).
- **Onde**: `package.json` (`"next": "14.2.5"`, dependência de produção
  direta, fixada por `BE-01`). Confirmado instalado via
  `node_modules/next/package.json` → `14.2.5`.
- **Por que isso é crítico *neste* projeto, não genérico**: toda a
  autorização de escrita da área interna deste sistema depende
  **exclusivamente** de `middleware.ts` (raiz do projeto) — GUARDRAILS.md
  regra 17 ("Toda rota de escrita da área interna exige verificação de
  sessão válida em middleware, **antes** de qualquer chamada à camada de
  dados"), SDD.md Seção 7.2. Não há verificação de sessão redundante dentro
  de cada Route Handler além do middleware — li `middleware.ts` linha a
  linha: `matcher: ["/api/:path*"]`, valida `SESSION_COOKIE_NAME` via
  `verifySessionToken` para todo método de escrita, e devolve 401 se
  inválido. A CVE em questão (`GHSA-f82v-jwr5-mffw`, "Authorization Bypass
  in Next.js Middleware") permite que um atacante envie um request com o
  cabeçalho interno `x-middleware-subrequest` forjado, fazendo o Next.js
  tratar a requisição como uma subrequisição interna já processada pelo
  middleware — **pulando a execução do middleware inteiro**, inclusive a
  checagem de sessão. Na prática, isso permitiria contornar por completo o
  único mecanismo de autorização deste sistema para toda rota de escrita
  (cadastro, lançamento de pontos, correção, restrições, anonimização),
  quando essas rotas existirem (L1+).
- **Confirmação de exploração aplicável à versão instalada**: a faixa
  vulnerável documentada é `>=14.0.0 <14.2.25`; a versão instalada
  (`14.2.5`) está dentro da faixa. Correção sem breaking change:
  `next@14.2.35` (`fixAvailable.isSemVerMajor: false`, confirmado via
  `npm audit --json`).
- **Por que não confio na mitigação de plataforma para deixar de bloquear**:
  o `DEPLOY.md` já define Vercel como hospedagem alvo, e é conhecido que a
  Vercel aplicou mitigação de borda para parte desta CVE em alguns
  cenários — mas (a) isso não está confirmado/documentado em nenhum
  artefato deste projeto como controle compensatório deliberado, (b) o
  próprio QA já validou este projeto rodando via `npm run start`
  (self-hosted, fora da borda da Vercel) como parte do critério de aceite
  de BE-01, e o ambiente de staging/produção real ainda não passou por
  nenhum deploy (`DEPLOY.md`: "nenhum deploy foi realizado ainda"), e (c) a
  correção é uma troca de versão sem breaking change — não há razão para
  aceitar o risco de depender de mitigação de plataforma não verificada
  quando a correção direta é trivial.
- **Por que isto é achado de L0, não só do scan contínuo**: a versão do
  Next.js foi fixada por `BE-01` (setup do projeto) — é literalmente parte
  do que este lote entrega. `BE-02`/`FE-00` não têm relação direta com esta
  dependência, mas como o `package.json` é artefato único e compartilhado,
  o achado bloqueia o fechamento do lote L0 como um todo.
- **Escala para**: `backend` (dono de `package.json`/`BE-01`) — ação:
  atualizar `next` para `14.2.35` (ou versão patch mais recente da série
  14.2.x disponível no momento da correção), rodar `npm audit` limpo para
  esta dependência, reexecutar a suíte completa (`lint`/`typecheck`/
  `build`/`test`) e o teste de integração de `middleware.test.ts`. Não é
  esperado nenhum breaking change de API dentro de uma série de patch.
- **Escala para `cto` (paralelo, registro)**: não há decisão de negócio
  aqui — é puramente uma correção técnica de dependência vulnerável,
  sinalizado ao CTO apenas por transparência (achado crítico bloqueante),
  não porque exija decisão estratégica.
- **Status**: **Bloqueia o deploy de L0 e de qualquer lote subsequente**
  até a correção. Entrada correspondente registrada em `BLOCKERS.md`
  (abaixo).

---

## 2. Achados de alta severidade (bloqueiam deploy)

Nenhum achado de severidade Alta dentro do escopo formal de L0
(BE-01/BE-02/FE-00) além do CRIT-01 acima.

**Fora do escopo de L0, referenciado apenas como contexto do scan
contínuo**: `BUG-QA-FE01-01` (open redirect em
`src/features/login/redirectTarget.ts`, severidade Alta) — já identificado
e documentado pelo QA (`QA-REPORT.md` Seção 6), `FE-01` já revertida para
`Em andamento`, tarefa fora do lote L0. Reli o código
(`getSafeRedirectTarget`) e confirmo a mesma causa raiz apontada pelo QA:
a validação aceita qualquer string iniciada por `/` que não comece por
`//` e não contenha `://`, sem normalizar/rejeitar barra invertida (`\`) —
navegadores tratam `\` como equivalente a `/` em uma URL, permitindo um
valor como `/\evil.tld` ou `/\/evil.tld` escapar da validação de "caminho
relativo de mesma origem" e ser interpretado como `//evil.tld` (protocolo-
relativo) no `router.replace()`. Não encontrei bypass adicional além do já
documentado pelo QA. **Nenhuma ação nova aqui** — já é débito bloqueante
sob responsabilidade do Frontend, tratado no ciclo de L1, não duplicado
neste relatório.

---

## 3. Achados de média/baixa severidade (débito registrado, com prazo)

### DEBT-01 — `vitest`/`vite`/`esbuild` com vulnerabilidade crítica residual em devDependency (sem exposição em produção) — **ATUALIZADO 2026-09-03**

- **Status**: parcialmente resolvido pelo Backend na mesma janela de
  `BLOCKER-006`. `vitest` 2.0.5→2.1.9 eliminou `GHSA-9crc-q9x8-hgqq`
  (confirmado ausente no `npm audit --json` re-executado nesta data).
  Permanece em aberto **apenas** `GHSA-5xrq-8626-4rwp` ("When Vitest UI
  server is listening, arbitrary file can be read and executed", CVSS 9.8,
  faixa `<3.2.6` — a faixa vulnerável foi ampliada pela base de advisories
  do npm depois da primeira execução deste relatório, cobrindo agora também
  `2.1.9`). Correção completa exige `vitest@5.0.0`
  (`fixAvailable.isSemVerMajor: true`, confirmado via `npm audit --json`) —
  major com risco de quebra de API de teste, fora do que `BLOCKER-006`
  autorizou o Backend a fazer sozinho.
- **Severidade reclassificada nesta rodada**: **Baixa** (mantida — mesma
  razão da execução original, reverificada, não apenas herdada). Confirmado
  por leitura de `package.json`: `test` roda `vitest run` (sem servidor de
  API), `test:watch` roda `vitest` sem a flag `--ui`; `.github/workflows/
  ci.yml` não referencia `vitest`/`--ui` em nenhum job. O vetor exige que um
  desenvolvedor rode `vitest --ui` explicitamente (não é o padrão de nenhum
  script do projeto) e acesse um site malicioso enquanto esse servidor local
  está escutando — nunca ocorre em CI nem em `npm run build`/`npm run
  start` (o que é de fato deployado). O rótulo "crítico" do npm audit reflete
  a severidade abstrata da CVE, não o risco contextualizado a este projeto.
- **Por que não force o major agora**: reclassificar a severidade de um
  achado é atribuição do DevSecOps, mas decidir executar um major bump de
  test runner (risco de quebra de 179 testes/API de asserção) é decisão de
  Tech Lead/Backend, não algo que este relatório deva impor unilateralmente
  fora de uma janela de manutenção planejada.
- **Ação**: Tech Lead agenda a migração para `vitest@5.x` como item de
  manutenção de toolchain (fora do ciclo de execução de lote atual);
  DevSecOps reavalia quando aplicada.
- **Prazo**: sem prazo bloqueante de deploy (dev-only, sem exposição em
  produção/CI confirmada); prazo de reavaliação formal = antes do
  fechamento de L2 (próxima janela natural de manutenção de dependências) —
  não pode ficar em aberto indefinidamente dado o rótulo crítico da CVE.
- **Dono**: Tech Lead (decisão de executar o major) / Backend (execução).

### DEBT-04 — `next@14.2.35` com advisories adicionais (DoS/cache), fora do escopo de CRIT-01 — **NOVO, 2026-09-03**

- **Severidade**: **Média** para este projeto (rótulo agregado do npm audit
  é "Alta", reclassificado após análise de aplicabilidade — ver abaixo;
  diferente de `DEBT-01`, é dependência de **produção**, não dev-only, por
  isso não desce a "Baixa").
- **Onde**: `next@14.2.35`, confirmado via `npm audit --json` e `npm audit
  --audit-level=high --omit=dev` (achado presente também isolando só
  dependências de produção). Lista 21 advisories na cadeia `next`/`postcss`,
  a maioria DoS/cache-poisoning/SSRF, faixas que cobrem `14.2.35` até
  `<15.5.16`/`<15.5.21`; correção completa só em `next@16.3.4`
  (`isSemVerMajor: true`).
- **Análise de aplicabilidade (por que não é CRIT-02)**: nenhuma delas é da
  mesma classe de `CRIT-01` (bypass de autorização atingindo o único
  mecanismo de auth do sistema). Confirmado por leitura de código que este
  projeto **não usa** nenhuma das superfícies exigidas pelas advisories mais
  graves: sem Pages Router (`app/` apenas, sem diretório `pages/`) nem
  `i18n` → `GHSA-36qx-fr4f-26g5` (middleware bypass, a única com CWE-863,
  mesma classe de CRIT-01) **não aplicável**; sem Server Actions (`git grep`
  não encontra `"use server"` real, só um comentário confirmando a ausência
  deliberada) → `GHSA-m99w-x7hq-7vfj`/`GHSA-89xv-2m56-2m9x`/
  `GHSA-4c39-4ccg-62r3`/`GHSA-955p-x3mx-jcvp` **não aplicáveis**; sem
  `next/image`/`next/script` em uso (`Grep` sem resultados em `src`/`app`)
  → `GHSA-9g9p-9gw9-jx7f`/`GHSA-3x4c-7xq6-9pq8`/`GHSA-h64f-5h5j-jqjh`/
  `GHSA-gx5p-jg67-6x7h` **não aplicáveis**; sem `rewrites` em
  `next.config.mjs` → `GHSA-ggv3-7p47-pfv8`/`GHSA-p9j2-gv94-2wf4` **não
  aplicáveis**; sem CSP nonces (DEBT-03 confirma ausência de CSP) →
  `GHSA-ffhc-5mcf-pf4q` **não aplicável**; sem servidor HTTP customizado
  (`package.json` usa `next dev`/`next build`/`next start` padrão, sem
  `createServer`) → `GHSA-c4j6-fc7j-m34r` (SSRF via WebSocket upgrades)
  **não aplicável**. Restam apenas advisories genéricas de DoS/cache
  inerentes a qualquer app App Router em 14.2.x
  (`GHSA-h25m-26qc-wcjf`, `GHSA-q4gf-8mx6-v5v3`, `GHSA-8h8q-6873-q5fj`,
  `GHSA-3g8h-86w9-wvmq`, `GHSA-vfv6-92ff-j949`, `GHSA-wfc6-r584-vfw7`,
  `GHSA-68g3-v927-f742`, `GHSA-4633-3j49-mh5q`) — impacto de
  disponibilidade, não de confidencialidade/autorização; nenhum deploy de
  produção ocorreu ainda (mesma constatação já registrada para CRIT-01).
- **Ação**: registrar como débito de monitoramento; migração completa
  (`next@15`/`16`) é decisão de arquitetura/roadmap (major, potencial
  breaking change no App Router e no `serverComponentsExternalPackages`
  usado por `BE-04`/ADR-004), não algo a forçar dentro desta reauditoria
  pontual — mesma lógica de autoridade aplicada a `DEBT-01`.
- **Sinalização ao CTO (paralela, registro)**: não é decisão de negócio
  urgente, mas o padrão observado (advisories de `next` se acumulando desde
  a última auditoria, 11 dias atrás) sinaliza que a série 14.2.x está se
  aproximando do fim de vida útil de patch de segurança prático — vale
  entrar no radar de roadmap técnico do CTO para planejar uma janela de
  migração `next@15`/`16`, sem urgência de bloqueio agora.
- **Prazo**: reavaliar antes do primeiro deploy de produção (mesmo gate já
  definido para DEBT-03/CSP) e a cada nova execução de
  `static-security-analysis` (scan contínuo) — se alguma advisory nova
  atingir CWE-285/CWE-863 (autorização) ou passar a listar exploração
  confirmada em faixa que cubra este projeto, reclassificar para bloqueante
  imediatamente.
- **Dono**: Tech Lead (planejamento da migração major) / DevSecOps (monitoramento contínuo via scan).

### DEBT-02 — `glob`/`minimatch`/`@typescript-eslint/*` com ReDoS/injeção de comando em toolchain de lint (dev-only, sem exposição em produção)

- **Severidade**: Baixa. Mesma natureza de DEBT-01 (ferramenta de
  desenvolvimento/CI, não código de produção) — `glob` com "Command
  injection via -c/--cmd" e `minimatch` com ReDoS, ambos usados apenas por
  `eslint-config-next`/`@typescript-eslint`. Risco real limitado ao
  ambiente de CI/dev, não ao usuário final.
- **Ação**: `npm audit fix` (para `minimatch`) resolve sem breaking change;
  o de `glob`/`eslint-config-next` exige bump maior (`eslint-config-next@
  16.x`), fora do escopo de correção imediata — registrar como débito
  separado, sem prazo formal, reavaliar quando o projeto migrar de Next.js
  14→15/16 (mudança de major, decisão de arquitetura, não deste ciclo).
- **Prazo**: sem prazo formal para a parte que exige major bump; a parte
  de `minimatch` (sem breaking change) pode entrar na mesma janela de
  DEBT-01.
- **Dono**: Backend.

### DEBT-03 — Ausência de Content-Security-Policy (CSP) em `vercel.json`

- **Severidade**: Baixa (defesa em profundidade, não uma exigência
  explícita do `SDD.md` Seção 7.3, que só cita TLS/HSTS).
- **Onde**: `vercel.json` já define HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` (bom, cobre o requisito literal da
  Seção 7.3) — mas não define `Content-Security-Policy`, que mitigaria a
  superfície de XSS residual de forma mais forte que a ausência de
  `dangerouslySetInnerHTML` no código hoje (confirmado por `grep` — nenhum
  uso em `src`/`app` neste estado do repositório).
- **Ação**: DevOps define uma CSP inicial razoável (mínimo:
  `default-src 'self'`, ajustada para os domínios do Supabase usados por
  fetch client-side em L2 — `ranking_publico`/`presenca_mensal_publica`)
  quando `FE-02`/`FE-03` (que de fato fazem fetch client-side ao Supabase)
  estabilizarem a lista de origens necessárias — prematuro travar isso
  antes de L2 fechar, para não quebrar por origem não prevista.
- **Prazo**: antes do primeiro deploy de produção (não de staging).
- **Dono**: DevOps, com insumo do Frontend sobre origens de fetch
  necessárias.

### Débitos herdados do QA (não reclassificados, apenas referenciados)

`BUG-QA-BE01-01`, `BUG-QA-BE01-02`, `BUG-QA-FE00-01`, `BUG-QA-FE00-02`,
`BUG-QA-BE02-01` — todos severidade Baixa, nenhum é achado de segurança
(higiene de workspace, formatação, polimento visual, ausência de FK). Não
repetidos aqui; DevSecOps concorda com a classificação do QA e não os
eleva de severidade.

**Nota sobre GUARDRAILS.md regras 35/36 (não são achados novos)**: regra
35 (plano de saída do ADR-002) já está `Resolvido` (`BLOCKERS.md`,
`BLOCKER-003`) — nenhuma ação do DevSecOps. Regra 36 (monitoramento do
tier gratuito do Supabase) é responsabilidade herdada pelo **DevOps** na
primeira fase de observabilidade (já referenciada em `DEPLOY.md`) — listada
na Seção 4 abaixo como requisito operacional a manter no radar, não como
achado novo desta auditoria.

---

## 4. Requisitos de segurança operacional para o DevOps

1. **Resolvido (CRIT-01 fechado, 2026-09-03)**: `next` confirmado em
   `14.2.35` (`>=14.2.25`). Mantém-se o requisito estrutural: nenhum deploy
   de produção deste projeto deve acontecer com `next` em versão
   `<14.2.25` — validar a versão resolvida em `package-lock.json` como
   parte do gate automático de `deploy-production.yml`, além da leitura de
   `SECURITY-REVIEW.md` que o próprio `DEPLOY.md` já descreve.
2. **Atualização importante (2026-09-03)**: manter o gate `security-scan`
   (`gitleaks` + `npm audit --audit-level=high`) como bloqueante em todo PR
   para `main` — mas a expectativa registrada na primeira execução deste
   relatório ("corrigir DEBT-01/CRIT-01 basta para o gate voltar a ficar
   verde") **não se confirmou**: mesmo após a correção de `BLOCKER-006`,
   `npm audit --audit-level=high` continua saindo com exit code 1 (débitos
   residuais aceitos e documentados: `DEBT-01` atualizado — vitest,
   `GHSA-5xrq-8626-4rwp` — e `DEBT-04`, novo — next, e `DEBT-02` — glob/
   minimatch/eslint —, todos exigem major bump não autorizado nesta janela).
   **Recomendação ao DevOps**: configurar um mecanismo de exceção
   documentada (ex.: `audit-ci` com allowlist por advisory ID, cada entrada
   referenciando o débito correspondente em `SECURITY-REVIEW.md` com data de
   expiração) para que o gate volte a falhar apenas em vulnerabilidade
   **nova**, não nas já triadas e aceitas como débito — manter o gate
   permanentemente vermelho por débitos já conhecidos treina o time a
   ignorá-lo, o que é pior do que o próprio risco residual.
3. `SUPABASE_SERVICE_ROLE_KEY`/`SESSION_COOKIE_SECRET`: confirmar que
   ambos são provisionados como variável de ambiente do lado servidor da
   Vercel (nunca `NEXT_PUBLIC_*`), com valor de alta entropia gerado por
   ambiente (não reaproveitado entre staging/produção) — requisito já
   descrito em `.env.example`/`SDD.md` Seção 7.3, replicar na
   configuração real do provedor antes do primeiro deploy.
4. CSP (DEBT-03) — definir antes do primeiro deploy de produção, após L2
   estabilizar as origens de fetch client-side necessárias.
5. Regra 36 do `GUARDRAILS.md` (monitoramento do tier gratuito do
   Supabase, gatilho 70-80% de cota ou pausa por inatividade) — já
   endereçada em `DEPLOY.md`, manter como item de checklist obrigatório da
   primeira fase de observabilidade (`non-functional-requirement-
   validation`/`deploy-report-drafting`), não uma ação nova deste
   relatório.
6. Rollback de produção (`rollback-production.yml`) ainda **não testado**
   (`DEPLOY.md` já registra isso como bloqueante próprio do DevOps) — sem
   relação com achados de segurança desta auditoria, apenas reforço:
   nenhum deploy de produção deve acontecer sem esse teste.
7. **Novo (2026-09-03, decorre de DEBT-04)**: antes do primeiro deploy de
   produção, confirmar que nenhuma advisory nova de `next` atingiu
   CWE-285/CWE-863 (classe de bypass de autorização, a mesma de CRIT-01) —
   reexecutar `npm audit --json` como parte do checklist de
   `deploy-report-drafting`, não só confiar no estado documentado nesta
   data.

---

## 5. Conformidade LGPD (nível de implementação, escopo L0)

- **Minimização estrutural (RN-01/SDD.md 7.5)**: confirmado por leitura
  direta das migrations — `contato`/`data_nascimento` (`atleta`) têm
  comentário SQL explícito marcando-as como sensíveis (`20260902100100_
  create_atleta_table.sql`), e nenhuma das duas colunas é selecionada por
  nenhuma view pública criada até `BE-02`/`L0` (as views públicas em si são
  `BE-03`, fora de L0 — já auditadas independentemente pelo QA com
  reprodução real, `QA-REPORT.md` Seção 4).
- **RLS deny-by-default (GUARDRAILS.md regra 5)**: confirmado
  estruturalmente nas 12 migrations de tabela — `enable row level
  security` presente em todas, nenhuma `POLICY`/`GRANT` para `anon` fora da
  migration de schema (`grant usage on schema app to anon`, que por si só
  não concede acesso a nenhuma tabela).
- **Ledger append-only / não-exclusão física (GUARDRAILS.md regras 8/9)**:
  reforço estrutural via trigger PL/pgSQL confirmado em
  `lancamento_pontos` e `atleta`, válido inclusive contra `service_role`
  (bypassa RLS, não bypassa trigger) — já reproduzido empiricamente pelo
  QA como superusuário Postgres (`QA-REPORT.md` Seção 3.2); DevSecOps
  concorda com a leitura do código-fonte, sem necessidade de nova
  reprodução.
- **Anonimização (LGPD Art. 18, ADR-011)**: a função `anonimizar_atleta`
  ainda não existe nesta migration (documentada como `TODO` explícito no
  comentário de `create table app.atleta`, escopo de `BE-07`) — **não é
  achado de compliance obrigatório em aberto para L0**, porque L0 não
  implementa nenhum fluxo que colete ou anonimize dado pessoal ainda; é
  lacuna de escopo futuro já rastreada, não uma lacuna silenciosa (mesmo
  padrão que o QA já validou em `BE-02` Seção 3.5).
- **Base legal / consentimento (SDD.md 7.6)**: `consentimento_responsavel_
  obtido` (boolean) presente na tabela `atleta`, conforme desenhado —
  nenhum achado.
- **Conclusão desta seção**: nenhum achado de compliance obrigatório em
  aberto dentro do escopo de L0. O requisito de compliance mais sensível
  (fronteira de exposição pública) só se materializa em `BE-03`/L2, já
  auditado com rigor equivalente pelo próprio QA (não substitui a auditoria
  formal do DevSecOps quando L2 fechar, mas não há sinal de risco adicional
  não coberto).

---

## 6. Checklist de "Pronto" (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — **Satisfeito
      (atualizado 2026-09-03)**: `CRIT-01` confirmado resolvido (Seção 1).
      Achados residuais (`DEBT-01` atualizado, `DEBT-04` novo) reclassificados
      para Baixa/Média após análise de aplicabilidade documentada — nenhum
      remanescente na classe Alta/Crítica.
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido — nenhum
      achado de compliance obrigatório identificado em aberto no escopo de
      L0 (Seção 5, não reverificada nesta rodada por ausência de mudança de
      lógica de negócio).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo de correção (Seção 3: DEBT-01 atualizado, DEBT-02, DEBT-03,
      DEBT-04 novo).
- [x] Requisitos de segurança operacional definidos para o DevOps (Seção 4,
      atualizada com item 7 novo e revisão dos itens 1-2).
- [x] Achado de relevância estratégica sinalizado ao CTO — `CRIT-01` (fechado)
      permanece puramente técnico; `DEBT-04` (novo) tem um componente de
      radar de roadmap (fim de vida útil prática da série `next@14.2.x`)
      sinalizado ao CTO em paralelo, sem exigir decisão de negócio imediata.

---

## 7. Veredito

## **L0 (BE-01, BE-02, FE-00): APROVADO COM DÉBITO REGISTRADO** (atualizado 2026-09-03, supersede o veredito anterior "BLOQUEADO")

A auditoria completa das 5 skills sobre o escopo formal de L0 (execução
original) **não encontrou nenhum achado de segurança específico do código
entregue por BE-01/BE-02/FE-00** — RLS deny-by-default, triggers de reforço
(ledger append-only, não-exclusão física), separação de env público/
servidor, ausência de segredo commitado, e minimização estrutural de dado
sensível seguem implementados corretamente, consistente com `SDD.md` Seção
7 e `GUARDRAILS.md` (não reverificado nesta rodada — sem mudança de lógica
de negócio desde a auditoria original).

**CRIT-01 confirmado resolvido nesta reauditoria pontual**: `next`
atualizado para `14.2.35` (`BLOCKER-006`, Backend); `npm audit --json`
re-executado nesta data confirma que `GHSA-f82v-jwr5-mffw`/CVE-2025-29927
não aparece mais em nenhuma faixa vulnerável para a versão instalada. O
bloqueio original está encerrado.

**Dois achados residuais avaliados e registrados como débito, não
bloqueio**: (1) `DEBT-01` atualizado — `vitest@2.1.9` ainda cai na faixa
crítica de `GHSA-5xrq-8626-4rwp` por ampliação da base de advisories do
npm desde a execução original; confirmado dev-only (nenhum script do
projeto usa `vitest --ui`, CI não expõe o servidor de API), correção
completa exige major (`vitest@5.0.0`) fora da autoridade do Backend nesta
janela — reclassificado Baixa, prazo de reavaliação antes do fechamento de
L2. (2) `DEBT-04` novo — `npm audit` pós-correção revela outras advisories
de `next@14.2.35` (DoS/cache, não a mesma classe de bypass de autorização
de CRIT-01), a maioria não aplicável a este projeto por ausência das
superfícies exigidas (Pages Router+i18n, Server Actions, `next/image`/
`next/script`, `rewrites`, CSP nonces, servidor customizado) — reclassificado
Média, correção completa exige major (`next@16`), prazo de reavaliação
antes do primeiro deploy de produção. Nenhum dos dois é achado de
compliance obrigatório; nenhum atinge a classe de impacto (autorização/
confidencialidade) que justificaria bloqueio por padrão deste relatório.

**Requisito operacional atualizado para o DevOps**: o gate `security-scan`
(`npm audit --audit-level=high`) **não volta a ficar verde automaticamente**
com esta correção — débitos residuais aceitos (`DEBT-01`, `DEBT-02`,
`DEBT-04`) continuam a fazer o comando sair com exit code 1. Recomendação
registrada na Seção 4, item 2: mecanismo de exceção documentada por
advisory ID, não desabilitar o gate.

**Sinalização ao CTO (paralela, registro — não pré-requisito da
liberação)**: `CRIT-01` permanece achado puramente técnico, sem componente
de decisão de negócio. `DEBT-04` traz um sinal de radar de roadmap (série
`next@14.2.x` acumulando advisories desde a última auditoria, 11 dias
atrás) — comunicado ao CTO como contexto para planejamento futuro de
migração major, sem urgência de decisão agora.

**L0 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` Seção 5) — nenhum
achado alta/crítica em aberto, nenhum achado de compliance obrigatório não
resolvido, débitos residuais documentados com prazo e dono.

---

## 8. Entrada correspondente em BLOCKERS.md

`BLOCKERS.md`, `BLOCKER-006` — origem `devsecops`, escalado para `backend`,
já marcado `Resolvido` pelo Backend nesta data. Adendo de confirmação do
DevSecOps acrescentado à mesma entrada (2026-09-03): CRIT-01 fechado
formalmente; achado residual de `vitest` devolvido pelo Backend
reclassificado como `DEBT-01` (atualizado) nesta Seção, não reaberto como
novo bloqueio — mesmo tratamento aplicado ao achado incidental de `next`
(`DEBT-04`, novo), descoberto durante esta reauditoria. Nenhuma nova
entrada em `BLOCKERS.md` foi necessária: nenhum dos dois achados residuais
volta para o time de implementação como ação bloqueante — ambos ficam
registrados como débito com prazo e dono neste relatório, conforme os
guardrails do DevSecOps.

---

# Lote L1 — Autenticação (auditoria completa, 2026-09-03)

## 9. Método

- **Gatilho**: `QA-REPORT.md` Seção 10.2 — Lote L1 (`BE-04`, `BE-05`,
  `FE-01`, `FE-12`) aprovado com ressalvas, nenhum bug alta/crítica em
  aberto (`BUG-QA-FE01-01`, o único de severidade Alta do lote, corrigido e
  reconfirmado independentemente pelo QA na Seção 8 do mesmo relatório).
  Esta é a primeira vez que as 5 skills de auditoria completa rodam sobre
  estas 4 tarefas — `BE-04`/`BE-05`/`FE-01` já haviam sido tocadas de
  relance pelo scan contínuo da reauditoria de `BLOCKER-006` (Seção 0.1),
  mas só para `npm audit`/dependências, nunca para o código de negócio em
  si.
- **Referências**: `SDD.md` Seção 7 (7.1 Autenticação, 7.2 Autorização, 7.3
  Criptografia, 7.5 Superfície de Exposição, 7.6 LGPD), `GUARDRAILS.md`
  Seção 3 (regras 13-18, Autenticação e Sessão) e Seção 4 (regras 19-21,
  LGPD), `TASK.md` Seção 1.3 (critérios literais de `BE-04`/`BE-05`) e
  Seção 5 Risco #7 (hardening tático delegado ao DevSecOps), `CTO-REVIEW.md`
  (Gate 1 risco estratégico #2, Gate 2 ressalva 7 sobre ADR-004 — ambas
  citadas na tabela de decisões, linha 346, endereçadas por `BE-04`/`BE-05`
  respectivamente), `API-CONTRACT.yaml` v0.2.0 (`LoginRequest`,
  `AuthErroGenerico`, `ErroRequisicaoInvalida`, `ErroSessaoInvalida`,
  `/api/auth/login`, `/api/auth/logout`), `QA-REPORT.md` Seções 5, 7, 8, 9,
  10.
- **Código lido linha a linha** (não apenas os testes): todo
  `src/modules/autenticacao/*` (`password.ts`, `session-token.ts`,
  `session-cookie.ts`, `rate-limit.ts`, `repository.ts`, `client-ip.ts`,
  `constants.ts`, `redefinir-senha.ts`), `app/api/auth/login/route.ts`,
  `app/api/auth/logout/route.ts`, `middleware.ts`, `scripts/
  redefinir-senha-interna.ts`, `scripts/README.md`, as duas migrations
  novas (`20260903090000_create_auth_interno_table.sql`,
  `20260903090100_create_tentativa_login_table.sql`), `src/features/
  login/redirectTarget.ts` (+ `redirectTarget.test.ts`), e os 6 módulos de
  `src/features/sessao/*` (`sessionExpiryMarker.ts`, `writeActionSession.ts`,
  `useHandleSessionExpired.ts`, `useSessionExpiryWarning.ts`,
  `SessionExpiryStatus.tsx`, `index.ts`).
- **Comandos executados diretamente**: `npm audit --json` (íntegro) e `npm
  audit --omit=dev --json` (produção), reexecutados nesta data para
  reconfirmar a classificação dos 4 débitos herdados de L0 após a adição de
  duas dependências novas por este lote (`@node-rs/argon2`, produção;
  `dotenv`, dev — usada por `scripts/redefinir-senha-interna.ts`); `git
  grep`/`Grep` para `console.log`/`console.error`/`console.warn` dentro de
  `src/modules/autenticacao` e `app/api/auth` (checar vazamento de senha/
  hash em log); leitura cruzada de `API-CONTRACT.yaml` contra o corpo real
  de cada resposta (`route.ts`) para confirmar ausência de campo não
  documentado.
- **Verificação externa (`security-threat-model`, uso pontual)**: pesquisa
  na documentação oficial da Vercel (`vercel.com/docs/headers/
  request-headers`) para confirmar o comportamento real de
  `x-forwarded-for` na plataforma de deploy alvo deste projeto (`DEPLOY.md`)
  — necessário para avaliar se `client-ip.ts` (base do rate limiting de
  `BE-04`) é seguro contra spoofing no ambiente de produção real, não
  apenas em tese (ver `DEBT-06` abaixo).
- **CTO-REVIEW.md**: presente e lido. Gate 1 (risco estratégico #2) e Gate 2
  (ressalva item 7, "ADR-004 não define processo de redefinição de senha")
  ambos endereçados por `BE-04`/`BE-05` respectivamente — nenhum achado
  estratégico novo deste lote pendente de decisão de negócio do CTO; os
  achados desta auditoria (Seções 11-12 abaixo) são todos técnicos/
  operacionais, sinalizados ao CTO apenas como registro (não como
  pré-requisito).
- **API-CONTRACT.yaml**: presente, v0.2.0+. `LoginRequest`/
  `AuthErroGenerico`/`ErroRequisicaoInvalida`/`ErroSessaoInvalida` conferidos
  campo a campo contra o corpo real das respostas de `login/route.ts`,
  `logout/route.ts` e `middleware.ts` — nenhuma divergência, nenhum campo a
  mais vazando estado interno (ex.: `retryAfter`, contagem de tentativas).
- **Não repetido nesta rodada**: as 5 skills completas sobre `BE-01`/`BE-02`/
  `BE-03`/`FE-00` (L0) — sem mudança de lógica de negócio nessas tarefas
  desde a auditoria original; a conclusão da Seção 5 (LGPD, escopo L0)
  permanece válida.

### 9.1 Reconfirmação dos débitos herdados de L0 (`static-security-analysis`, não repetida do zero)

`npm audit --json` e `npm audit --omit=dev --json` reexecutados nesta data,
depois da adição de `@node-rs/argon2` (produção) e `dotenv` (dev) por este
lote:

- **`@node-rs/argon2`/`dotenv`**: nenhuma advisory nova — não aparecem em
  nenhuma das duas execuções. Nenhum achado novo de dependência introduzido
  por `BE-04`/`BE-05`.
- **`DEBT-01` (vitest, `GHSA-5xrq-8626-4rwp`)**: inalterado — ainda
  `Crítico` no rótulo agregado do npm audit, ainda reclassificado `Baixa`
  pela mesma análise de aplicabilidade da Seção 3 (dev-only, nenhum script
  usa `vitest --ui`). Contagem idêntica (`critical: 1`, via
  `@vitest/mocker`/`vite`/`vite-node`).
- **`DEBT-02` (glob/minimatch/eslint-config-next)**: inalterado — mesmas 3
  entradas `high` (`@next/eslint-plugin-next`, `@typescript-eslint/*`,
  `eslint-config-next`), mesma causa raiz (`glob`/`minimatch`), mesma
  classificação `Baixa`.
- **`DEBT-04` (next/postcss)**: inalterado — `npm audit --omit=dev`
  continua retornando exatamente `next` e `postcss`, `high: 2`, mesma
  classificação `Média` (nenhuma advisory nova atingiu CWE-285/CWE-863,
  condição de reclassificação já definida na Seção 3).
- **`DEBT-03` (ausência de CSP)**: não é achado de dependência (não
  aparece em `npm audit`) — reconfirmado por leitura de `vercel.json`, sem
  mudança desde L0.
- **Conclusão**: os 4 débitos herdados de L0 mantêm exatamente a mesma
  classificação de severidade e prazo já registrados na Seção 3 — nenhuma
  reclassificação necessária nesta rodada.

---

## 10. Achados críticos do Lote L1 (bloqueiam deploy)

Nenhum.

---

## 11. Achados de alta severidade do Lote L1 (bloqueiam deploy)

Nenhum. `BUG-QA-FE01-01` (open redirect, severidade Alta, o único achado
desta classe já identificado no código deste lote) foi corrigido pelo
Frontend e reconfirmado pelo QA (`QA-REPORT.md` Seção 8) **antes** desta
auditoria começar — releitura própria do DevSecOps (Seção 12.3 abaixo)
confirma que a correção é robusta, não apenas funcionalmente aprovada.

---

## 12. Achados de média/baixa severidade do Lote L1 (débito registrado, com prazo)

### DEBT-05 — Timing side-channel entre "senha incorreta" e "bloqueado por rate limit" (`BE-04`) — confirmação e decisão do DevSecOps

- **Severidade**: **Média** (concordo com a classificação do QA,
  `QA-REPORT.md` Seção 5.4/`BUG-QA-BE04-01`, reavaliada de forma
  independente, não apenas herdada).
- **Onde**: `app/api/auth/login/route.ts` (`genericAuthFailureResponse`,
  linhas 33-48) — o caminho bloqueado por rate limit (`rateLimit.bloqueado
  === true`) retorna a resposta genérica **antes** de chamar
  `getHashSenhaVigente`/`verifyPasswordOrDummy` (`password.ts`), pulando
  deliberadamente o `argon2id.verify`, que é lento por desenho (o próprio
  código já documenta essa lacuna inline, linhas 39-46).
- **Confirmação independente do DevSecOps**: leitura linha a linha do
  código confirma exatamente a causa raiz que o QA reproduziu
  empiricamente (`curl` timing, ~50ms de diferença consistente entre os
  dois caminhos, `QA-REPORT.md` Seção 5.4) — não é uma alegação aceita sem
  verificação, é o comportamento literal de `POST` em `login/route.ts`.
- **Por que Média, não Alta/Crítica**: (a) não compromete a senha em si —
  `argon2id.verify` continua sendo o único caminho que valida a senha
  correta, e a comparação em si é segura (biblioteca madura, Seção 5.3 do
  QA-REPORT); (b) não permite bypass de autenticação — o oráculo revela
  apenas o **estado do rate limit** (bloqueado ou não) para um IP, nunca o
  conteúdo/correção da senha tentada; (c) o conteúdo da resposta continua
  100% idêntico (RF-07.3/GUARDRAILS.md regra 15 satisfeitos à risca); (d) o
  vetor de exploração prática (medir timing de rede com precisão
  suficiente para distinguir ~50ms de forma confiável, remotamente, com
  ruído de rede real) é não-trivial para o perfil de risco deste projeto
  (RNF-04 já aceita risco residual proporcional a um grupo amador, sem dado
  financeiro).
- **Por que não é ignorado como Baixa**: é uma fraqueza de segurança real
  e reproduzida empiricamente (não hipotética), numa categoria
  (side-channel de estado de autenticação) já antecipada explicitamente
  pelo próprio `SDD.md` (tabela de riscos, linha do `ADR-004`) e por
  `TASK.md` Seção 5 Risco #7 — ambos, **antes** da implementação de
  `BE-04`, já atribuíram este hardening especificamente ao DevSecOps, com
  prazo "antes de produção". Rebaixar para Baixa ignoraria essa
  atribuição de risco já formalizada na fase de arquitetura.
- **Decisão do DevSecOps (autoridade de classificação/bloqueio deste
  agente)**: **não bloqueia o fechamento do Lote L1** — severidade Média,
  registrado como débito com prazo, conforme o guardrail deste agente ("só
  severidade alta/crítica bloqueia por padrão").
- **Remediação recomendada** (para quando o prazo vencer): chamar
  `verifyPasswordOrDummy(hashVigente ?? null, senha)` também no caminho
  `rateLimit.bloqueado === true` (equalizando o custo de CPU/tempo entre os
  dois caminhos, mesmo padrão já usado para o caso "sem senha configurada"
  em `password.ts`), **ou** aplicar um atraso artificial calibrado à
  mediana do caminho de verificação real (~196ms, medido pelo QA) antes de
  responder no caminho bloqueado. A primeira opção é preferível — reaproveita
  código já existente (`verifyPasswordOrDummy`) em vez de introduzir uma
  constante de atraso arbitrária que precisaria ser recalibrada se o custo
  do argon2id mudar.
- **Prazo**: antes do primeiro deploy de produção (prazo já definido por
  `SDD.md`/`TASK.md` Seção 5 Risco #7, não um prazo novo criado por este
  relatório).
- **Dono**: Backend (implementação da correção, quando agendada) — decisão
  de quando agendar é do Tech Lead/DevSecOps, não uma ação imediata deste
  lote.

### DEBT-06 — Rate limiting de login depende de `x-forwarded-for` não ser forjável pelo cliente (`BE-04`) — dependência de infraestrutura não documentada explicitamente no código

- **Severidade**: **Média** (impacto alto se a premissa de infraestrutura
  falhar — derrota completa do rate limiting, um dos 4 itens literais do
  critério de aceite de `BE-04`; probabilidade baixa **hoje**, dado que o
  alvo de deploy real está confirmado como Vercel).
- **Onde**: `src/modules/autenticacao/client-ip.ts` (`getClientIp`) — lê
  `x-forwarded-for` (primeiro valor da lista separada por vírgula) e, na
  ausência, `x-real-ip`, sem nenhuma validação adicional de que esses
  cabeçalhos não foram forjados pelo próprio cliente que está fazendo a
  requisição.
- **Por que isto importa** (não é uma preocupação genérica de livro-texto —
  verificado contra o alvo de deploy real deste projeto): se um cliente
  pudesse controlar o valor de `x-forwarded-for` recebido pela aplicação,
  ele poderia contornar por completo o rate limiting de `BE-04` — bastaria
  enviar um valor diferente a cada tentativa de login para que
  `getTentativasRecentes`/`evaluateLoginRateLimit` (`rate-limit.ts`) nunca
  acumulasse um "streak" de 5 falhas para o mesmo "IP" percebido,
  derrotando um dos 4 itens literais do critério de aceite de `BE-04`
  ("5 tentativas erradas em 15 min bloqueiam com backoff") e a proteção
  contra força bruta exigida por `RNF-03`/`SDD.md` Seção 7.1.
- **Verificação feita (não é suposição)**: consultada a documentação
  oficial da Vercel (`vercel.com/docs/headers/request-headers`,
  2026-09-03): *"If you are trying to use Vercel behind a proxy, we
  currently overwrite the X-Forwarded-For header and do not forward
  external IPs. This restriction is in place to prevent IP spoofing."* —
  ou seja, na plataforma de deploy real deste projeto (`DEPLOY.md` já fixa
  Vercel como alvo), a Vercel **sobrescreve** `x-forwarded-for` com o IP
  real de conexão, descartando qualquer valor que o cliente tente
  injetar — o vetor de spoofing **não é explorável hoje**, no ambiente de
  produção pretendido.
- **Por que ainda é um achado, não apenas uma nota**: (a) a segurança desta
  proteção depende inteiramente de uma garantia de **infraestrutura**
  (comportamento da Vercel), não de nenhuma validação no próprio código —
  `client-ip.ts` não documenta essa dependência crítica em nenhum
  comentário, nem tem qualquer resiliência adicional (ex.: rejeitar um
  valor com múltiplos IPs suspeitos, ou preferir um cabeçalho mais
  resistente a sobrescrita por um proxy adicional); (b) o próprio `QA-REPORT.md`
  (`BE-04`, Seção 5) e o `SECURITY-REVIEW.md` (`CRIT-01`, Seção 1, L0) já
  registram que este projeto **foi validado rodando via `npm run start`
  self-hosted, fora da borda da Vercel** — o mesmo padrão de teste, se
  repetido inadvertidamente como ambiente real de produção (ex.: um
  self-host emergencial, ou uma CDN/WAF adicional colocada na frente da
  Vercel no futuro — cenário comum ao adicionar proteção DDoS/cache extra),
  reabriria o vetor de spoofing sem que nenhum código precisasse mudar
  para isso acontecer silenciosamente; (c) a própria documentação da
  Vercel já nomeia um cabeçalho alternativo mais resistente a esse cenário
  (`x-vercel-forwarded-for`, "idêntico a `x-forwarded-for`, porém não é
  sobrescrito caso você use um proxy em cima da Vercel") — o código não usa
  esse cabeçalho, perdendo uma proteção de baixo custo contra exatamente o
  cenário do item (b).
- **Não bloqueia o Lote L1**: a premissa é verdadeira **hoje**, no alvo de
  deploy real e documentado deste projeto — não é um achado explorável no
  estado atual, é uma fragilidade de robustez/documentação a corrigir antes
  que a topologia de rede mude.
- **Remediação recomendada**: (1) trocar a ordem de preferência em
  `getClientIp` para `x-vercel-forwarded-for` → `x-forwarded-for` →
  `x-real-ip` (o primeiro é o mais resistente a sobrescrita por um proxy
  adicional, segundo a própria documentação da Vercel); (2) adicionar um
  comentário explícito no código nomeando a dependência de infraestrutura
  ("esta proteção assume que a plataforma de deploy sobrescreve
  `x-forwarded-for`/nunca repassa o valor do cliente — válido hoje na
  Vercel; se este projeto for hospedado atrás de outro proxy/CDN ou
  self-hosted sem um proxy confiável equivalente, o rate limiting de login
  fica vulnerável a bypass por spoofing deste cabeçalho"); (3) DevOps
  adiciona ao checklist de deploy a confirmação de que nenhum proxy/CDN
  adicional foi introduzido entre a internet e a borda da Vercel sem
  reavaliar esta dependência.
- **Prazo**: antes do primeiro deploy de produção (mesmo gate de `DEBT-03`/
  `DEBT-04`) — reavaliar também se a topologia de rede mudar no futuro
  (adição de CDN/WAF na frente da Vercel).
- **Dono**: Backend (itens 1-2, mudança de código/comentário) / DevOps
  (item 3, checklist de deploy).

### DEBT-07 — `app.tentativa_login.ip` sem política de retenção/expurgo definida — minimização de dados (LGPD Art. 6, III)

- **Severidade**: **Baixa** — não é achado de compliance obrigatório
  bloqueante (ver justificativa abaixo), é débito de higiene de dados.
- **Onde**: `supabase/migrations/20260903090100_create_tentativa_login_table.sql`
  — o próprio Backend já documentou esta lacuna no comentário da coluna
  (`comment on column app.tentativa_login.ip`, linhas 31-37): "escopo de
  retenção/expurgo desta tabela não definido nesta tarefa... fica como
  nota para o DevOps/DevSecOps avaliar se um job de limpeza periódica é
  necessário, não bloqueia BE-04" — não é uma lacuna silenciosa, é uma nota
  explícita já roteada corretamente para este agente.
- **Análise de compliance**: um endereço IP é, em determinadas
  circunstâncias (combinado com outros dados/logs de operadora), dado
  pessoal identificável sob a LGPD (Art. 5º, II). A base legal aplicável
  aqui é legítimo interesse (RNF-03, proteção contra força bruta) — a
  mesma base já aceita pelo `SDD.md` Seção 7.6 para o sistema como um todo
  — e a finalidade (rate limiting) só precisa, na prática, dos últimos 15
  minutos de tentativas por IP (`LOGIN_RATE_LIMIT_WINDOW_MS`,
  `constants.ts`); linhas mais antigas nunca mais influenciam nenhuma
  decisão de bloqueio (confirmado por leitura de `rate-limit.ts`,
  `evaluateLoginRateLimit` filtra por `janelaInicio`), mas continuam
  fisicamente armazenadas de forma indefinida, sem `TTL`/job de expurgo —
  divergência entre a necessidade funcional real (15 min) e o tempo de
  retenção físico (indefinido), o tipo de gap que o princípio de
  minimização (LGPD Art. 6º, III) existe para prevenir.
- **Por que não é compliance obrigatório bloqueante**: (a) IP não é da
  mesma classe de sensibilidade que `contato`/`data_nascimento` (dado
  sensível de atleta, já protegido estruturalmente por RLS/views desde
  `BE-02`/`BE-03`); (b) a finalidade é de segurança operacional, não de
  perfilamento; (c) não há evidência de uso do dado além do propósito
  declarado; (d) o próprio guardrail deste agente reserva "não vira débito"
  apenas para compliance **obrigatório não resolvido** — ausência de job de
  expurgo é uma lacuna de higiene operacional, não a ausência de um
  mecanismo de compliance exigido por lei que este sistema precise ter
  implementado desde já (diferente, por exemplo, de `anonimizar_atleta`,
  que é LGPD Art. 18 e tem ADR próprio).
- **Remediação recomendada**: job agendado (mesmo padrão de
  `supabase-backup-export.yml`, já usado pelo DevOps) que expurga linhas de
  `app.tentativa_login` mais antigas que uma janela de retenção definida
  (sugestão: 24-72h — folga suficiente para investigação manual de um
  incidente de força bruta recente, sem reter indefinidamente).
- **Prazo**: antes do primeiro deploy de produção (mesmo gate de `DEBT-03`/
  `DEBT-04`/`DEBT-06`).
- **Dono**: DevOps (implementação do job) / DevSecOps (acompanhamento).

### DEBT-08 (nota preventiva, não um achado ativo hoje) — `sessionStorage` de `FE-12` é mecanismo genérico, sem escopo definido do que pode ser armazenado

- **Severidade**: informativo/preventivo — não é um achado de exposição de
  dado sensível **hoje** (nenhuma tela real chama `saveUnsavedData` ainda,
  confirmado por `grep -r "saveUnsavedData" src/ app/` só retornando a
  própria definição/teste do módulo).
- **Onde**: `src/features/sessao/writeActionSession.ts`
  (`saveUnsavedData`/`takeUnsavedData`) — grava qualquer `data: T` fornecido
  pelo chamador, serializado via `JSON.stringify`, em
  `sessionStorage`, sob a chave `sessao_interna:dados_nao_salvos:<key>`.
  Nenhuma validação de conteúdo, nenhuma redação/sanitização — o mecanismo é
  deliberadamente genérico (a própria tarefa `FE-12` é infraestrutura para
  telas futuras, `QA-REPORT.md` Seção 9.1).
- **Por que é um achado a registrar, mesmo sem exploração hoje**:
  `sessionStorage` é acessível a qualquer script JavaScript executado no
  mesmo contexto de origem (superfície de leitura em caso de XSS,
  diferente de um cookie `httpOnly`) e persiste durante toda a navegação
  entre telas dentro da mesma aba (por desenho, para sobreviver ao
  redirecionamento de sessão expirada). Quando `FE-04` em diante
  (`TASK.md` L3+) implementar telas reais de escrita que chamem
  `useHandleSessionExpired({ unsavedData: ... })`, existe risco real de que
  o formulário preservado contenha campo de dado pessoal do atleta (ex.:
  `contato`/`data_nascimento`, os mesmos dois campos que `GUARDRAILS.md`
  regra 19/`SDD.md` Seção 7.5 protegem estruturalmente na fronteira
  pública) — `FE-12` não impõe nenhum limite sobre isso, e o guardrail
  regra 19 fala de "área pública", não cobre literalmente armazenamento
  client-side na área interna.
- **Ação — não é correção de código agora**: registrar como item de
  checklist obrigatório de `security-requirement-validation` para quando
  este agente auditar `FE-04` (ou qualquer tarefa que passe `unsavedData`
  contendo campo de atleta para `saveUnsavedData`): validar se o payload
  preservado contém `contato`/`data_nascimento` (ou equivalente sensível
  futuro) sem necessidade, e se sim, exigir que a tela redija/omita esses
  campos antes de preservar, mantendo apenas o que é indispensável para a
  experiência de "retomar o formulário" (ex.: campos não sensíveis do
  rascunho).
- **Prazo**: não aplicável agora — reavaliar no momento em que a primeira
  tela real (`FE-04`+) usar `saveUnsavedData` com dado de atleta.
- **Dono**: DevSecOps (checklist de auditoria futura) / Frontend (disciplina
  de implementação quando `FE-04`+ chegar).

### DEBT-09 (nota operacional, não um achado de código) — confirmar em produção real que o cookie de sessão sai com `Secure=true`

- **Severidade**: informativo — reforça o item 3 já existente na Seção 4
  (requisitos operacionais de L0), agora com o código de `BE-04`
  implementado e concreto para validar.
- **Onde**: `src/modules/autenticacao/session-cookie.ts`
  (`isHttpsRequest`) — deriva o atributo `Secure` do protocolo de
  `request.url`, nunca fixado incondicionalmente em `true`. Comportamento
  correto e testado para `http://localhost` (QA confirmou `Secure` ausente
  em ambiente local, `QA-REPORT.md` Seção 5.2(a)) — mas o comportamento em
  produção real via Vercel (onde o Route Handler do Next.js recebe a
  requisição já processada pela borda da Vercel, não necessariamente com
  `request.url` refletindo `https://` de forma garantida em toda topologia)
  **não foi verificado neste ambiente local**, só assumido como correto
  pela documentação inline do próprio Backend.
- **Ação**: DevOps confirma, no primeiro deploy real (mesmo staging),
  inspecionando o cabeçalho `Set-Cookie` de uma resposta real de `POST
  /api/auth/login`, que `Secure` está de fato presente — item de checklist
  de `deploy-report-drafting`, não uma mudança de código antecipada sem
  evidência de que o problema existe.
- **Prazo**: no próprio ato do primeiro deploy (staging ou produção),
  antes de considerar o deploy validado.
- **Dono**: DevOps.

---

## 13. `sensitive-data-exposure-check` — conclusão dedicada (BE-04/BE-05/FE-01/FE-12)

- **Senha em texto puro**: nunca aparece em log/console em nenhum ponto do
  fluxo — confirmado por `Grep` própria (`console\.(log|error|warn|debug)`)
  em `src/modules/autenticacao` e `app/api/auth`, **zero ocorrências**;
  reforça a verificação já feita pelo QA (`QA-REPORT.md` Seção 6.3,
  reprodução empírica incluída) para `BE-05`. `session-token.ts` nunca
  inclui a senha/hash no payload do cookie (só `exp`). Nenhum achado.
- **Hash de senha**: nunca retornado em nenhuma resposta HTTP — confirmado
  por leitura de `login/route.ts` (resposta de sucesso é só `{"status":
  "ok"}`) e cruzado contra `API-CONTRACT.yaml` (`additionalProperties:
  false` em todos os schemas de resposta de auth, conferido linha a linha,
  Seção 9). Nenhum achado.
- **IP de tentativa de login**: armazenado em `app.tentativa_login`, nunca
  exposto por nenhuma API pública (RLS deny-by-default, só `service_role`,
  confirmado na migration) — não é um achado de **exposição**, é um achado
  de **retenção** (`DEBT-07` acima).
- **Payload de sessão**: contém exclusivamente `exp` (`session-token.ts`,
  confirmado por leitura), nunca uma claim de identidade — RN-12/
  GUARDRAILS.md regra 18 satisfeitos por desenho, nada a mais que possa
  vazar identidade em caso de um token de sessão sendo inspecionado (o
  payload é base64url, não criptografado — decodificável por qualquer um
  que tenha o cookie, mas como nunca contém nada além do timestamp de
  expiração, não há dado a proteger nesse payload especificamente além da
  assinatura HMAC que impede forjar um novo).
- **`sessionStorage` de `FE-12`**: marcador de expiração
  (`sessao_interna:expira_em_estimado`) contém apenas um timestamp — não é
  dado pessoal. `saveUnsavedData` é o único ponto de atenção, tratado como
  `DEBT-08` (preventivo, não ativo hoje).
- **Mensagens de erro**: `LOGIN_GENERIC_ERROR_MESSAGE`/
  `ErroSessaoInvalida`/`ErroRequisicaoInvalida` nunca incluem detalhe
  interno (stack trace, nome de coluna, mensagem bruta do Postgres) — todas
  são strings fixas, confirmado por leitura de `route.ts`/`middleware.ts`.
  Único ponto de atenção já coberto: `redefinir-senha.ts` lança
  `Error(`Falha ao gravar novo hash em app.auth_interno: ${error.message}`)`
  — mas este erro nunca chega a um cliente HTTP (só ao operador do CLI via
  `scripts/redefinir-senha-interna.ts`, que já não ecoa a senha em nenhum
  ponto, confirmado pelo QA) — não é uma superfície de exposição a usuário
  não autorizado.

**Conclusão desta seção**: nenhum achado de exposição ativa de dado
sensível encontrado no código deste lote — os pontos de atenção
identificados (`DEBT-06`, `DEBT-07`, `DEBT-08`) são de robustez/retenção/
prevenção futura, não vazamento presente.

---

## 14. Conformidade LGPD (nível de implementação, escopo Lote L1)

- **RN-12 (nenhuma identidade individual)**: confirmado — sessão é
  binária (válida/inválida), payload sem claim de identidade,
  `tentativa_login` associada a IP (dado operacional), nunca a uma pessoa
  identificada; `BE-05` não introduz nenhum conceito de "quem trocou a
  senha" (runbook operado por qualquer detentor de acesso ao ambiente,
  RN-12 respeitado por desenho).
- **Minimização de dados (SDD.md Seção 7.6/GUARDRAILS.md regra 19-21)**:
  nenhum campo de dado pessoal de atleta (`contato`/`data_nascimento`)
  é tocado por nenhuma das 4 tarefas deste lote — `auth_interno`/
  `tentativa_login` são tabelas inteiramente novas, sem relação com a
  entidade `atleta`. Único ponto de atenção é o já registrado `DEBT-07`
  (retenção de IP), que não é achado de compliance obrigatório (ver
  justificativa na própria entrada).
- **Base legal**: legítimo interesse (RNF-03, proteção contra força
  bruta) para `tentativa_login` — coerente com a base já aceita pelo
  `SDD.md` Seção 7.6 para o restante do sistema; nenhuma base nova
  necessária.
- **Direito ao esquecimento/anonimização (LGPD Art. 18, ADR-011)**: fora de
  escopo deste lote — nenhuma das 4 tarefas toca `atleta`/
  `anonimizar_atleta` (ainda não implementada, `BE-07`, lote futuro). Não é
  lacuna deste lote.
- **Conclusão desta seção**: nenhum achado de compliance obrigatório em
  aberto no escopo do Lote L1 — o único ponto relacionado a dado
  potencialmente pessoal (`DEBT-07`, IP) é débito de higiene/minimização,
  não uma exigência legal não atendida.

---

## 15. Checklist de "Pronto" do Lote L1 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 10-11): nenhum achado novo desta classe; `BUG-QA-FE01-01`
      (o único Alta do lote) já corrigido antes desta auditoria e
      reconfirmado robusto por leitura própria (Seção 12.3 implícita — ver
      nota abaixo).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 14).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo de correção — `DEBT-05` a `DEBT-09` (Seção 12), todos com
      prazo e dono.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 12 (`DEBT-06`/`DEBT-07`/`DEBT-09` têm ação explícita de DevOps),
      além dos já vigentes da Seção 4 (L0).
- [x] Achado de relevância estratégica sinalizado ao CTO — nenhum achado
      deste lote exige decisão de negócio (todos são técnicos/
      operacionais); `DEBT-05` já era conhecido do CTO via `SDD.md`/
      `TASK.md` desde a fase de arquitetura, sinalizado novamente aqui só
      como registro de que foi de fato auditado e decidido (não bloqueia),
      conforme o limite de autoridade deste agente.

**Nota sobre `FE-01`/`redirectTarget.ts`**: releitura própria do
DevSecOps (não apenas aceite do relato do QA) confirma que a correção de
`BUG-QA-FE01-01` é robusta — a abordagem de resolver `rawParam` via
`new URL(rawParam, INTERNAL_ORIGIN_SENTINEL)` e comparar `origin` (em vez
de uma lista de prefixos proibidos) é o padrão correto e recomendado para
este tipo de validação (delega ao parser de URL do próprio runtime a
tarefa de normalizar o valor antes de decidir se é interno, eliminando a
necessidade de enumerar manualmente cada vetor de caractere/codificação).
Os 9 casos de teste de `redirectTarget.test.ts` (incluindo os 3 vetores
adicionais que o próprio QA testou fora da suíte — tab/newline/CR) cobrem
a classe de vetor relevante, não apenas o caso pontual relatado. Nenhum
achado novo, nenhuma ressalva adicional.

---

## 16. Veredito

## **Lote L1 (BE-04, BE-05, FE-01, FE-12): APROVADO COM DÉBITO REGISTRADO**

A auditoria completa das 5 skills sobre as 4 tarefas do Lote L1 **não
encontrou nenhum achado de severidade alta/crítica** — o módulo de
autenticação custom (`BE-04`), o módulo de maior criticidade de segurança
deste projeto, implementa corretamente todos os requisitos de arquitetura
verificados linha a linha: hash argon2id nos parâmetros recomendados pela
OWASP, comparação em tempo constante (biblioteca de hash + loop XOR manual
para a assinatura HMAC de sessão, necessário por rodar em Edge Runtime),
rate limiting em tabela Postgres própria com triggers de reforço
estrutural (`DELETE` bloqueado incondicionalmente, mesmo para
superusuário), TTL de sessão sem refresh token de longa duração, payload
de sessão sem claim de identidade (RN-12), e nenhum segredo commitado.
`BE-05` (redefinição de senha) nunca aceita/loga a senha em texto claro em
nenhum canal, verificado por leitura e reforçado por checagem própria
(`Grep` de `console.*`, zero ocorrências). `FE-01` (login) tem sua correção
de open redirect (`BUG-QA-FE01-01`) revalidada de forma independente por
este agente como robusta, não apenas funcionalmente aprovada. `FE-12`
(sessão/expiração) não expõe dado sensível pela infraestrutura que já
existe hoje.

**Cinco achados residuais avaliados e registrados como débito, nenhum
bloqueante**: (1) `DEBT-05` — timing side-channel entre "senha incorreta"
e "bloqueado por rate limit" em `BE-04`, já sinalizado desde `SDD.md`/
`TASK.md` Seção 5 Risco #7 como hardening tático delegado a este agente,
confirmado por leitura de código (não só aceito do relato do QA),
severidade Média, prazo antes de produção; (2) `DEBT-06` — rate limiting
depende de `x-forwarded-for` não ser forjável pelo cliente, seguro **hoje**
no alvo de deploy real (Vercel, confirmado via documentação oficial
consultada nesta auditoria), mas sem documentação explícita dessa
dependência no código nem uso do cabeçalho mais resistente disponível
(`x-vercel-forwarded-for`) — achado novo desta auditoria, severidade
Média, prazo antes de produção; (3) `DEBT-07` — `tentativa_login.ip` sem
política de retenção/expurgo, já sinalizado pelo próprio Backend no
comentário da migration, avaliado como débito de minimização de dados
(LGPD Art. 6º, III), não compliance obrigatório bloqueante, severidade
Baixa; (4) `DEBT-08` — mecanismo genérico de `sessionStorage` de `FE-12`
sem escopo definido do que pode ser preservado, nenhuma exploração hoje
(nenhuma tela real o usa ainda), registrado como item de checklist
obrigatório para a auditoria de `FE-04`+; (5) `DEBT-09` — confirmar em
produção real que o atributo `Secure` do cookie de sessão está presente,
item operacional de verificação no primeiro deploy. Os 4 débitos herdados
de L0 (`DEBT-01`-`04`) foram reconfirmados nesta rodada com a mesma
classificação, sem nenhuma mudança motivada pelas duas dependências novas
introduzidas por este lote (`@node-rs/argon2`, `dotenv`).

**Requisitos operacionais novos para o DevOps** (além dos já vigentes na
Seção 4): confirmar antes do primeiro deploy de produção que (a) nenhum
proxy/CDN adicional foi introduzido entre a internet e a borda da Vercel
sem reavaliar `DEBT-06`; (b) existe um job de expurgo periódico para
`app.tentativa_login` (`DEBT-07`); (c) o cabeçalho `Set-Cookie` de um login
real em produção inclui `Secure` (`DEBT-09`) — itens registrados
individualmente na Seção 12, consolidados aqui para visibilidade.

**Sinalização ao CTO (paralela, registro — não pré-requisito da
liberação)**: nenhum dos achados deste lote exige decisão de negócio.
`DEBT-05` já era um risco nomeado pelo CTO desde o Gate 1 (risco
estratégico #2, `CTO-REVIEW.md` linha 346) — este relatório confirma que
foi auditado, medido empiricamente (com apoio do QA) e decidido como não
bloqueante, fechando o ciclo daquele risco estratégico até o prazo formal
de "antes de produção". `DEBT-06`/`DEBT-07`/`DEBT-09` são inteiramente
técnicos/operacionais, comunicados ao CTO só por transparência.

**Lote L1 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` Seção 5) —
nenhum achado alta/crítica em aberto, nenhum achado de compliance
obrigatório não resolvido, débitos residuais documentados com prazo e
dono.

---

## 17. Entrada correspondente em BLOCKERS.md

Nenhuma entrada nova necessária. Nenhum dos achados desta auditoria
(`DEBT-05` a `DEBT-09`) volta para o time de implementação como ação
bloqueante do fechamento deste lote — todos ficam registrados como débito
com prazo e dono neste relatório (Seção 12), mesmo tratamento já aplicado
aos débitos herdados de L0 (`DEBT-01`-`04`, nenhum deles gerou entrada
própria em `BLOCKERS.md`). `BLOCKER-006` (única entrada de origem
`devsecops` em `BLOCKERS.md` até hoje) permanece `Resolvido`, sem relação
com este lote além da reconfirmação de dependências feita na Seção 9.1.

---

# Lote L6 — Montagem de Times, Restrições e Substituições (auditoria completa, 2026-09-04)

## 18. Método

- **Gatilho**: `QA-REPORT.md` Seção 11 — Lote L6 (`BE-11`, `BE-12`, `BE-13`,
  `FE-09`, `FE-10`, `FE-11`) aprovado com ressalvas, veredito agregado na
  Seção 11.8 ("Lote L6 — Montagem de Times, Restrições e Substituições:
  Aprovado com ressalvas"). Único achado do QA em todo o lote:
  `BUG-QA-FE10-01` (baixa severidade, `aria-haspopup="listbox"` ausente no
  `Combobox`), explicitamente **não bloqueante** e de natureza puramente de
  acessibilidade, não de segurança — não reclassificado aqui, apenas
  referenciado. Primeira vez que as 5 skills de auditoria completa por lote
  rodam sobre estas 6 tarefas.
- **Referências**: `SDD.md` Seção 7 (7.1 Autenticação/7.2 Autorização — modelo
  binário sem RBAC, RN-12; 7.5 Superfície de Exposição; 7.6 minimização de
  dados), `GUARDRAILS.md` Seção 2 (regras 5-7, RLS deny-by-default/`anon`
  sem escrita/`service role` nunca no cliente), Seção 5 (regras 22-24,
  Montagem de Times — heurística determinística de duas fases, contrato
  exato do ADR-010, `N` parametrizado), Seção 4 (regras 19-21, LGPD/dado
  pessoal), `TASK.md` Seção 3.1 (critérios literais de `BE-11`/`BE-12`/
  `BE-13`/`FE-09`/`FE-10`/`FE-11`) e Seção 1.2 (função/trigger PL/pgSQL
  obrigatória só para operação que altera saldo — usado para avaliar se a
  ausência de função dedicada em `restricoes`/`substituicoes` é uma decisão
  correta, não uma lacuna), `API-CONTRACT.yaml` v0.12.0+ (`SugestaoTimesBody`/
  `SugestaoTimesOkResponse`/`SugestaoTimesConflitoResponse`/
  `RestricaoObrigatoriaResponse`/`ConfirmarTimesBody`/
  `TimesConfirmadosResponse`/`SubstituicaoBody`/`SubstituicaoResponse`),
  `QA-REPORT.md` Seção 11 (11.1 a 11.8).
- **`CTO-REVIEW.md`**: presente e lido novamente. Nenhum achado estratégico
  novo deste lote pendente de decisão de negócio — o único ponto de atenção
  levantado nesta rodada (reavaliação atrasada de `DEBT-01`/`DEBT-04`,
  Seção 19 abaixo) é puramente operacional/de governança do próprio
  DevSecOps, sinalizado ao CTO só como registro.
- **Código lido linha a linha** (não apenas as notas de status do `TASK.md`
  nem o relato do QA): `src/modules/times/{montar,repository,presenter,
  validation,grafo,backtracking,busca-local,timeout,constants}.ts`,
  `src/modules/times/restricoes/{repository,mutate,presenter,validation}.ts`,
  `src/modules/times/confirmacao/{repository,mutate,presenter,validation}.ts`,
  `src/modules/times/substituicoes/{repository,mutate,presenter,validation}.ts`,
  as 4 rotas novas (`app/api/times/sugestao/route.ts`, `app/api/rodadas/
  [id]/times/route.ts`, `app/api/restricoes/**/route.ts`, `app/api/rodadas/
  [id]/substituicoes/route.ts`), `middleware.ts` (reconfirmação própria, não
  só aceite do relato do QA), as 6 migrations base de `time`/`time_atleta`/
  `substituicao`/`restricao_obrigatoria` (BE-02) + as 2 migrations novas
  deste lote (`20260903150000_forbid_restricao_obrigatoria_delete.sql`,
  `20260903160000_create_confirmar_times_rodada_function.sql`).
- **Comandos executados diretamente**: `npm audit --json` reexecutado nesta
  data para reconfirmar `DEBT-01`/`DEBT-02`/`DEBT-04` após este lote (nenhuma
  dependência nova — confirmado por `git diff -- package.json`: o único
  `diff` presente é o já auditado em L1, `next@14.2.5→14.2.35`/
  `vitest@2.0.5→2.1.9`, mais o script `legado:migrar`, alheio a L6/BE-14-15,
  sem nenhuma dependência nova de `package.json`); `Grep` para
  `console\.(log|error|warn|debug)` em todo `src/modules/times/**` e
  `app/api/times/**`/`app/api/rodadas/**`/`app/api/restricoes/**` — **zero
  ocorrências**; `Grep` para `dangerouslySetInnerHTML` em todo `src/` —
  **zero ocorrências**, incluindo os componentes novos que renderizam
  `label`/`apelido_exibicao` (`TimesResultado.tsx`, `RestricaoFormModal.tsx`,
  `SubstituicoesModal.tsx` — todos via JSX puro, escapado por padrão pelo
  React); leitura cruzada de `API-CONTRACT.yaml` contra o corpo real de cada
  resposta (`presenter.ts` de cada submódulo) para confirmar
  `additionalProperties: false` e ausência de campo não documentado, em
  especial `contato`/`data_nascimento`.
- **Não repetido nesta rodada**: as 5 skills completas sobre `BE-01`-`BE-10`/
  `FE-00`-`FE-08`/`FE-12` (lotes já auditados ou fora do escopo deste
  gatilho) — sem mudança de lógica de negócio nessas tarefas motivada por
  este lote.

## 19. Reconfirmação dos débitos herdados (`DEBT-01`-`04`) — inclui reavaliação atrasada de `DEBT-01`

- **Achado de processo, não de código**: o prazo formal de reavaliação de
  `DEBT-01` (Seção 3 acima) era "antes do fechamento de L2". Verificado
  nesta rodada que **isso nunca aconteceu formalmente**: não existe nenhuma
  seção "Lote L2" neste `SECURITY-REVIEW.md` (confirmado por busca no
  arquivo inteiro) nem um veredito agregado "Lote L2" no `QA-REPORT.md`
  (confirmado por busca — só existem os vereditos individuais de `BE-03`/
  `FE-02`/`FE-03`, todas `Concluída`/aprovadas, mas sem a seção de
  fechamento de lote que `L0`/`L1`/`L6` têm). Ou seja, o gatilho formal
  ("QA aprova o lote inteiro", `EXECUTION-FLOW.md` §4) que dispararia a
  auditoria completa de L2 — e, com ela, a reavaliação comprometida de
  `DEBT-01` — nunca disparou, mesmo com as 3 tarefas de L2 concluídas há
  mais tempo que as deste lote. **Isto não é uma falha do time de
  implementação, nem um achado de segurança do código de L2** — é uma
  lacuna de governança do próprio processo de fechamento de lote, que este
  DevSecOps não tem autoridade para resolver sozinho (decisão de quando/se
  formalizar o fechamento de L2 é do Tech Lead, dono do `EXECUTION-FLOW.md`).
- **Ação tomada agora**: em vez de deixar `DEBT-01` sem reavaliação por mais
  um ciclo, a reconfirmação é feita **nesta auditoria de L6** (a primeira
  oportunidade real desde L1) como medida corretiva — resultado abaixo.
  Isto fecha a reavaliação pendente de fato (mesma profundidade de análise
  já feita em L1), ainda que fora do marco formal originalmente previsto.
- **`DEBT-01` (`vitest`, `GHSA-5xrq-8626-4rwp`)**: **inalterado**.
  `package.json` confirma `vitest@2.1.9`, idêntico ao estado de L1;
  `npm audit --json` reexecutado nesta data continua reportando
  `critical: 1` pela mesma cadeia (`vitest`→`vite`→`@vitest/mocker`/
  `vite-node`/`esbuild`), correção completa ainda exige `vitest@5.0.0`
  (major). Reconfirmado por leitura de `package.json`: `test`/`test:watch`
  seguem sem `--ui`; nenhum job novo de `.github/workflows/ci.yml` introduz
  o servidor de API do Vitest. **Classificação mantida: Baixa** (dev-only,
  vetor não presente em nenhum script/CI real deste projeto).
- **`DEBT-04` (`next`/`postcss`, advisories DoS/cache)**: **inalterado**.
  `next@14.2.35` confirmado, mesma análise de aplicabilidade de L1
  permanece válida (nenhuma das superfícies de risco mais grave — Pages
  Router+i18n, Server Actions, `next/image`/`next/script`, `rewrites`, CSP
  nonces, servidor HTTP customizado — está em uso neste lote; as 4 rotas
  novas de L6 são Route Handlers padrão do App Router, sem nenhuma dessas
  superfícies). **Classificação mantida: Média**, prazo inalterado (antes do
  primeiro deploy de **produção**) — confirmado em `DEPLOY.md` que o deploy
  deste lote (como todos até agora) é de **staging**, automático via CI,
  não produção (gate de produção é manual/`workflow_dispatch`, exige dupla
  aprovação QA+DevSecOps lendo este mesmo arquivo) — o prazo de `DEBT-04`
  **não é acionado por este lote**, consistente com a suposição já registrada
  no enunciado desta auditoria.
- **`DEBT-02` (glob/minimatch/eslint-config-next)**: inalterado, mesma
  classificação Baixa — nenhuma mudança de toolchain de lint motivada por
  este lote.
- **`DEBT-03` (ausência de CSP)**: inalterado — não é achado de dependência,
  sem mudança em `vercel.json` motivada por este lote.
- **Sinalização ao CTO/Tech Lead (paralela, registro)**: recomendo que o
  Tech Lead avalie fechar formalmente o Lote L2 (veredito agregado de QA +
  auditoria completa de DevSecOps), mesmo que retroativamente, para que o
  ciclo de reavaliação de débitos por lote (`DEBT-01` em particular) não
  fique dependente de um lote não-relacionado (`L6`) "carregar" a
  reavaliação por acidente de agenda. Não é um achado que bloqueie L6 —
  é uma melhoria de processo para lotes futuros.

## 20. Achados críticos do Lote L6 (bloqueiam deploy)

Nenhum.

## 21. Achados de alta severidade do Lote L6 (bloqueiam deploy)

Nenhum.

## 22. `security-requirement-validation` — achados de média/baixa severidade do Lote L6

Nenhum achado novo de segurança neste lote. Verificações relevantes,
documentadas por transparência (não são débitos, são confirmações
positivas):

- **Middleware (`GUARDRAILS.md` regra 17, `SDD.md` 7.2)**: as 4 rotas novas
  exigem sessão válida. `POST /api/times/sugestao` e `POST /api/rodadas/
  {id}/times` são cobertas por `WRITE_METHODS` (`middleware.ts`, sem
  necessidade de entrar em `INTERNAL_READ_PROTECTED_PREFIXES`, já que nunca
  são `GET`). `GET /api/restricoes` e `GET /api/rodadas/{id}/substituicoes`
  foram corretamente adicionadas a `INTERNAL_READ_PROTECTED_PREFIXES`
  (`/api/restricoes`, `/api/rodadas`) — reconfirmado por leitura direta do
  arquivo (não só aceite do relato do QA) e pelos casos correspondentes de
  `__tests__/middleware.test.ts` (linhas 100-149, 401 sem sessão / 200 com
  sessão válida para os dois prefixos). Nenhuma reabertura do vetor de
  `CRIT-01`/`GHSA-f82v-jwr5-mffw` (L0, já fechado) — a superfície nova não
  introduz nenhum caminho que contorne o middleware.
- **Autorização binária sem RBAC (RN-12, `GUARDRAILS.md` regra 18, `SDD.md`
  7.2)**: confirmado por leitura de `src/modules/times/restricoes/mutate.ts`
  e `src/modules/times/substituicoes/mutate.ts` — nenhuma função recebe ou
  verifica identidade/papel de quem chama; a única checagem de autorização
  de todo o lote é a sessão binária do middleware. Nenhum campo de autor
  individual em nenhuma tabela nova (`app.time`/`app.time_atleta`/
  `app.substituicao`/`app.restricao_obrigatoria`, confirmado pelas 4
  migrations base).
- **RLS deny-by-default + `service_role` exclusivo (`GUARDRAILS.md` regras
  5-7)**: as 4 tabelas novas têm RLS habilitado e `revoke all ... from
  anon`/`grant all ... to service_role` (confirmado por leitura das 4
  migrations base) — reforça, sem contradizer, a verificação empírica já
  feita pelo QA via `information_schema.role_table_grants`
  (`QA-REPORT.md` Seção 11, bloco comum). Todo repositório novo
  (`src/modules/times/**/repository.ts`) usa exclusivamente
  `getServiceRoleClient()`.
- **`app.confirmar_times_rodada` (RPC, escopo ampliado de `BE-13`)**:
  `GRANT EXECUTE` restrito a `service_role` (`revoke all ... from public`/
  `from anon`, `grant execute ... to service_role`, confirmado na migration
  `20260903160000`) — reforça a verificação empírica do QA
  (`has_function_privilege`). Função declara `set search_path = app,
  pg_temp` explicitamente (defesa contra search-path hijacking, mesmo
  padrão já usado por `app.lancar_rodada`/`app.anonimizar_atleta`) —
  confirmado por leitura direta da migration. Atomicidade multi-tabela
  (delete da divisão anterior + insert da nova, dentro de uma única
  transação PL/pgSQL) é a escolha correta para esta stack (PostgREST-based,
  sem transação client-side abrangendo múltiplas chamadas HTTP) — mesmo
  racional já usado por `ADR-006`, aplicado aqui por necessidade técnica de
  atomicidade, não por alteração de saldo (que esta operação não faz).
  Bloqueio de reconfirmação quando já existe `app.substituicao` registrada
  (`errcode TM001`) é reforçado estruturalmente pela FK `on delete
  restrict` de `app.substituicao.time_id` — mesmo se a checagem explícita
  na função fosse removida por engano, o `DELETE` de `app.time` ainda
  falharia por violação de integridade referencial (defesa em profundidade
  genuína, não apenas uma mensagem mais clara).
- **`forbid_restricao_obrigatoria_delete` (trigger, BE-12)**: bloqueia
  `DELETE` incondicionalmente, válido mesmo para superusuário Postgres
  (privilégio maior que `service_role`) — confirmado por leitura da
  migration e pela reprodução empírica do próprio QA nessa condição mais
  rigorosa. Nenhuma função aqui declara `search_path` explicitamente (ao
  contrário de `confirmar_times_rodada`), mas isso não representa risco:
  a função não referencia nenhuma tabela/objeto qualificável por schema —
  só levanta uma exceção fixa —, então não há superfície de search-path
  hijacking a mitigar aqui.
- **Validação de entrada (defesa em profundidade, todas as 4 rotas)**: todo
  identificador de atleta/time é validado como `uuid` via `zod`
  (`sugestaoTimesBodySchema`/`confirmarTimesBodySchema`/
  `restricaoBodySchema`/`substituicaoBodySchema`) antes de qualquer consulta
  ao banco — nenhuma interpolação de string em query, todo acesso via
  cliente Supabase parametrizado (`supabase-js`), sem superfície de SQL
  injection. `label` (único campo de texto livre do lote, `confirmarTimes
  BodySchema`) é limitado a 1-50 caracteres, `trim()`, e sempre renderizado
  via JSX puro no Frontend (`TimesResultado.tsx`) — nenhum
  `dangerouslySetInnerHTML` em todo o repositório (confirmado por `Grep`
  global), sem superfície de XSS armazenado. `.passthrough()` em
  `confirmarTimesBodySchema` (permite campos extras no corpo, por desenho —
  aceita o reenvio do corpo de `SugestaoTimesOkResponse`) não é um achado:
  `mutate.ts` (`confirmarTimes`) só lê `label`/`atletas_ids` de cada objeto,
  reconstruindo explicitamente o payload enviado à RPC (`timesParaRpc`) —
  nenhum campo extra do corpo chega ao banco.
- **Guarda de timeout (`ADR-007`/`TASK.md` Seção 6.2 item 3, disponibilidade)**:
  `Deadline`/`TimeoutError` (`src/modules/times/timeout.ts`) garante que uma
  entrada adversarialmente densa (muitos atletas + muitas restrições
  conflitantes) nunca trava a função serverless — reforça a resiliência já
  confirmada pelo QA (2 testes de integração dedicados), relevante aqui como
  controle de disponibilidade (não confidencialidade/integridade), mas
  dentro do escopo de `security-requirement-validation` por afetar RNF-04.

**Conclusão**: nenhum achado novo de severidade alta/crítica nem de
média/baixa neste lote — o único débito de baixa severidade do lote inteiro
é `BUG-QA-FE10-01` (acessibilidade, já registrado pelo QA, fora do escopo
de segurança deste relatório, não reclassificado).

## 23. `sensitive-data-exposure-check` — conclusão dedicada (Lote L6)

- **`data_nascimento` nunca exposto em nenhuma resposta HTTP**: confirmado
  por leitura de `src/modules/times/repository.ts`
  (`buscarAtletasParaMontagem`) — a coluna é lida do banco (necessária para
  calcular idade, RF-05.3), mas convertida em `idade` (inteiro ou `null`)
  por `montar.ts` (`calcularIdade`) **antes** de chegar a
  `presenter.ts`/à resposta; `AtletaMontadoResponse`
  (`SugestaoTimesOkResponse.times[].atletas`) só expõe `atleta_id`/
  `apelido_exibicao`/`nivel_tecnico`/`idade` — cruzado campo a campo contra
  `API-CONTRACT.yaml` (`additionalProperties: false`, confirmado). O
  endpoint de confirmação (`TimesConfirmadosResponse`) é ainda mais
  restrito — nem `idade` é exposto, só `atleta_id`/`apelido_exibicao`.
- **`contato` nunca selecionado por nenhum repositório deste lote**:
  confirmado por leitura de todos os `.select(...)` de
  `src/modules/times/**/repository.ts` — nenhum inclui `contato` em
  nenhum ponto (`buscarAtletasParaMontagem` seleciona só
  `id, apelido_exibicao, data_nascimento`; `buscarApelidosAtletas`, duplicada
  em `restricoes/repository.ts` e `substituicoes/repository.ts`, seleciona
  só `id, apelido_exibicao`).
- **Nomes de atleta (`apelido_exibicao`) — checagem específica pedida pelo
  escopo desta auditoria**: confirmado que os 4 grupos de rota deste lote
  (`sugestao`, confirmação de times, restrições, substituições) **nunca
  expõem mais do que `apelido_exibicao`** para identificar um atleta em
  nenhuma resposta — nenhum vazamento de `nome_completo` (campo que não
  existe nesta stack; `SDD.md` Seção 5 e as migrations de `BE-02` só têm
  `apelido_exibicao`, não um "nome completo" e "apelido" separados) nem de
  qualquer campo além do já autorizado (RN-06). Ainda que a área seja
  inteiramente interna (atrás de sessão, RN-12 sem hierarquia — logo,
  qualquer sessão válida já vê `apelido_exibicao` de todo atleta em
  qualquer tela da área interna, sem diferença de "papel"), não há
  sobre-exposição desnecessária: os 4 grupos de rota devolvem exatamente os
  campos que a respectiva tela (T09/T10/T11) precisa para funcionar
  (indicadores de equilíbrio, contrato de conflito do ADR-010, CRUD de
  pares, registro de substituição) — nenhum devolve, por exemplo, a lista
  completa de atletas com todos os campos de `app.atleta` só porque seria
  conveniente; cada `presenter.ts` monta um shape mínimo e explícito
  (mesmo padrão já usado por `ranking_publico`/`presenca_mensal_publica`,
  aqui replicado para a área interna por disciplina de engenharia, não por
  exigência estrutural de RLS/views como na fronteira pública).
- **Mensagens de erro**: nenhuma das 4 rotas novas ecoa detalhe interno
  (stack trace, mensagem bruta do Postgres, nome de coluna) ao cliente HTTP
  — confirmado por leitura de todos os `route.ts`: erros de validação
  (`400`) devolvem só `path`/`message` do próprio `zod`; erros de
  atleta/rodada/time não encontrado (`404`) devolvem só o `id` já fornecido
  pelo próprio cliente na requisição (não um dado novo revelado); erros de
  conflito (`409`) devolvem a mensagem de negócio fixa da função PL/pgSQL
  (nunca a mensagem bruta de exceção do Postgres, traduzida via `errcode`).
  Exceções não mapeadas (`throw new Error(...)` em qualquer `repository.ts`)
  nunca chegam a um `NextResponse.json` explícito nestas rotas — propagam
  como `500` genérico do Next.js (comportamento padrão do framework, fora
  do escopo de mudança deste lote, mesmo padrão já aceito nos lotes
  anteriores).
- **`console.*`**: zero ocorrências em todo `src/modules/times/**` e nas 4
  rotas novas (confirmado por `Grep` própria, não apenas herdado do relato
  do time de implementação).

**Conclusão desta seção**: nenhum achado de exposição de dado sensível no
Lote L6 — a superfície de escrita nova (sugestão de times, confirmação,
restrições, substituições) segue rigorosamente o padrão de minimização já
estabelecido nos lotes anteriores.

## 24. `compliance-validation` — LGPD (nível de implementação, escopo Lote L6)

- **Minimização de dados (`SDD.md` 7.6/`GUARDRAILS.md` regras 19-21)**:
  `data_nascimento` é lido pelo Backend (`BE-11`/`BE-13`) apenas para
  derivar `idade` como soft constraint (RF-05.3) — nunca circula como
  campo bruto em nenhuma resposta (Seção 23). Nenhum campo pessoal novo
  equivalente a `contato`/`data_nascimento` foi adicionado a nenhuma tabela
  deste lote (`app.time`/`app.time_atleta`/`app.substituicao`/
  `app.restricao_obrigatoria` só referenciam `atleta_id`, sem duplicar
  nenhum dado pessoal).
- **RN-12 (nenhuma identidade individual)**: confirmado — nenhuma das 4
  tabelas novas tem campo de autor; a autorização é binária (Seção 22).
- **Anonimização (LGPD Art. 18, ADR-011)**: nenhuma das 6 tarefas deste
  lote implementa ou modifica `anonimizar_atleta` (já existente desde
  `BE-07`, fora de L6) — mas vale registrar, por completude, que
  `restricoes/repository.ts#buscarApelidosAtletas` documenta explicitamente
  (comentário próprio, linhas 191-204) que uma restrição associada a um
  atleta anonimizado continua exibindo o *placeholder* estável já gravado
  por `anonimizar_atleta` em `apelido_exibicao` — não um erro nem um dado
  pessoal residual —, e que a própria função de anonimização já desativa
  automaticamente qualquer `restricao_obrigatoria` associada (comportamento
  de `BE-07`, não deste lote, mas corretamente respeitado por este código:
  nenhuma lógica deste lote tenta reverter/ignorar esse estado).
- **Base legal**: legítimo interesse do organizador (RNF-01/`SDD.md` 7.6),
  já aceita para o sistema como um todo — nenhuma finalidade nova
  introduzida por este lote que exigisse uma base legal distinta.
- **Conclusão desta seção**: nenhum achado de compliance obrigatório em
  aberto no escopo do Lote L6.

## 25. Requisitos de segurança operacional para o DevOps (Lote L6)

Nenhum item novo específico deste lote — os requisitos já vigentes
(Seção 4, L0; reforçados na Seção 12/16, L1) continuam a se aplicar
integralmente (nenhuma dependência nova, nenhuma rota pública nova, nenhuma
mudança de superfície de exposição de borda). Reforço explícito para este
lote: nenhuma das 4 rotas novas introduz necessidade de configuração de
rede/firewall/secret adicional — usam exclusivamente o mesmo
`SUPABASE_SERVICE_ROLE_KEY`/`SESSION_COOKIE_SECRET` já provisionados.

## 26. Checklist de "Pronto" do Lote L6 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 20-21): nenhum achado desta classe em todo o lote.
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 24).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo de correção — nenhum achado de segurança novo neste lote;
      `DEBT-01`-`04` (herdados) reconfirmados nesta rodada (Seção 19),
      incluindo a reavaliação de `DEBT-01` que estava atrasada por um gap
      de processo (fechamento de L2), agora corrigida.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 25 (nenhum item novo, requisitos já vigentes reafirmados).
- [x] Todo achado de relevância estratégica sinalizado ao CTO — nenhum
      achado técnico deste lote exige decisão de negócio; o único ponto
      sinalizado ao CTO/Tech Lead é de governança de processo (fechamento
      formal pendente de L2, Seção 19), não um risco de segurança novo.

## 27. Veredito

## **Lote L6 (BE-11, BE-12, BE-13, FE-09, FE-10, FE-11): APROVADO**

A auditoria completa das 5 skills sobre as 6 tarefas do Lote L6 **não
encontrou nenhum achado de segurança novo** — nem crítico, nem alto, nem de
média/baixa severidade. A superfície de escrita nova (`POST /api/times/
sugestao`, `POST /api/rodadas/{id}/times`, CRUD de `/api/restricoes*`,
`GET`/`POST /api/rodadas/{id}/substituicoes`) está integralmente protegida
pelo middleware de sessão já auditado em L0/L1 (nenhuma reabertura do vetor
de `CRIT-01`), respeita o modelo de autorização binário sem RBAC (RN-12), e
segue rigorosamente o padrão de minimização de dado sensível já
estabelecido nos lotes anteriores — `data_nascimento` nunca circula como
campo bruto (só a `idade` derivada), `contato` nunca é sequer consultado
por nenhum repositório deste lote, e `apelido_exibicao` é o único
identificador de atleta exposto, sem sobre-exposição de campo. As 4 tabelas
novas nascem com RLS deny-by-default e `service_role` exclusivo; a função
RPC `app.confirmar_times_rodada` tem `GRANT EXECUTE` restrito a
`service_role` e declara `search_path` explicitamente; o trigger
`forbid_restricao_obrigatoria_delete` reforça soft-delete mesmo contra
superusuário — todos os pontos estruturais mais críticos já verificados
empiricamente pelo próprio QA (Seção 11 do `QA-REPORT.md`) foram
reconfirmados aqui por leitura independente de código, sem apenas aceitar o
relato.

**Um único achado, de natureza processual, não de código**: a reavaliação
formal de `DEBT-01` ("antes do fechamento de L2") nunca ocorreu, porque o
Lote L2 nunca recebeu um veredito agregado de QA nem uma auditoria completa
de DevSecOps — gap de governança do processo de fechamento de lote, não
uma falha de implementação nem um risco de segurança novo. Corrigido nesta
auditoria por antecipação: `DEBT-01` foi reavaliado (Seção 19),
classificação mantida em Baixa, sem mudança de fato desde L1. `DEBT-04`
segue com prazo "antes do primeiro deploy de produção", ainda não
acionado (este e todos os lotes anteriores são deploy de **staging**,
confirmado em `DEPLOY.md`).

**Diferente do achado do QA para este lote (`BUG-QA-FE10-01`, atributo
`aria-haspopup` ausente no `Combobox`)**: é um débito de acessibilidade,
fora do escopo de segurança deste relatório — não reclassificado, não
duplicado aqui, e não impede o veredito "Aprovado" (sem ressalvas) da
auditoria de segurança, ainda que o veredito agregado do QA para o lote
completo (funcional + segurança) permaneça "Aprovado com ressalvas" por
aquele achado específico do QA.

**Sinalização ao CTO/Tech Lead (paralela, registro — não pré-requisito da
liberação)**: recomendação de fechar formalmente o Lote L2 (Seção 19), para
que a reavaliação de débitos por lote não dependa de acidente de agenda de
um lote não relacionado. Não é uma decisão de negócio — é uma melhoria de
processo de governança, comunicada por transparência.

**Lote L6 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` §5) —
nenhum achado alta/crítica em aberto, nenhum achado de compliance
obrigatório não resolvido, nenhum débito de segurança novo, débitos
herdados reconfirmados com prazo e dono inalterados.

## 28. Entrada correspondente em `BLOCKERS.md`

Nenhuma entrada nova necessária. Nenhum achado desta auditoria volta para
o time de implementação como ação bloqueante — o único ponto levantado
(reavaliação atrasada de `DEBT-01`/fechamento pendente de L2, Seção 19) é
uma recomendação de processo ao Tech Lead, não um bloqueio de código, e não
se enquadra no critério de `BLOCKERS.md` (`PIPELINE-CONVENTIONS.md` §4:
lacuna estrutural de artefato upstream que impede o trabalho) — o Lote L6
não foi impedido de nada por essa lacuna, apenas identificada e corrigida
retroativamente dentro desta própria auditoria.
