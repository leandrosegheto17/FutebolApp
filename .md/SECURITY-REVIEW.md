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

**Atualização (2026-09-04, fechamento retroativo de L2, L3, L4 e L5)**: o
QA fechou retroativamente o veredito agregado destes 4 lotes
(`QA-REPORT.md` Seções 12-17) — `BE-03`/`FE-02`/`FE-03` (L2), `BE-06`/
`BE-07`/`FE-04` (L3), `BE-08`/`FE-05` (L4), `BE-09`/`BE-10`/`BE-16`/
`FE-06`/`FE-07`/`FE-08` (L5), nenhum bug alta/crítica em nenhuma das 13
tarefas. As 5 skills de auditoria completa rodam agora, pela primeira
vez, sobre estes 4 lotes — ver Seções 29-38 (L2, veredito **Aprovado**,
`DEBT-03`/CSP confirmado resolvido), Seções 39-48 (L3, veredito
**Aprovado com débito registrado** — achado novo `DEBT-10`, Média,
`contato`/`data_nascimento` sem redação em `sessionStorage` de
`AtletaForm`, cenário que o próprio `DEBT-08`/L1 já previa e deixava como
item de checklist para esta auditoria), Seções 49-58 (L4, veredito
**Aprovado**, nenhum achado), Seções 59-68 (L5, veredito **Aprovado**,
nenhum achado novo — `BUG-QA-BE09-01` do QA reconfirmado, não
reclassificado) e Seção 69 (resumo consolidado). Achado transversal mais
relevante desta rodada: `DEPLOY.md` revelou que um deploy real de
produção já aconteceu fora do fluxo governado — `DEBT-03` foi resolvido
nesta mesma janela, mas o prazo de reavaliação de `DEBT-04` ("antes do
primeiro deploy de produção") foi ultrapassado sem reverificação
dedicada, sinalizado formalmente ao CTO/DevOps na Seção 69.

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

- **Nota de resolução (2026-09-04, Backend)**: **Resolvido.** Implementada
  exatamente a remediação recomendada acima (primeira opção, reaproveitando
  `verifyPasswordOrDummy`) — `app/api/auth/login/route.ts`, ramo
  `if (rateLimit.bloqueado)`: antes de responder, o código agora chama
  `getHashSenhaVigente(client)` seguido de
  `verifyPasswordOrDummy(hashVigenteBloqueado, senha)`, descartando o
  resultado (bloqueado nunca autentica, independentemente do retorno). O
  conteúdo da resposta (`genericAuthFailureResponse`) permanece
  byte-a-byte idêntico ao de antes — só o custo de CPU/tempo do caminho
  passou a ser equivalente ao do caminho normal de senha incorreta. Não foi
  introduzida nenhuma constante de atraso artificial. Comentário inline em
  `genericAuthFailureResponse` (linhas 33-45) atualizado para não afirmar
  mais que a lacuna de timing é conhecida/não resolvida. Cobertura de teste:
  `app/api/auth/__tests__/login.timing.test.ts` (novo, unitário, mocka
  Supabase/repository/rate-limit/password/session-cookie) — assevera que
  `verifyPasswordOrDummy` é chamado exatamente 1 vez tanto no caminho
  bloqueado quanto no não bloqueado, com o mesmo hash vigente e a mesma
  senha submetida, e que o caminho bloqueado nunca autentica mesmo que o
  mock de `verifyPasswordOrDummy` force `true`. Medição real de tempo (`~50ms`
  citado acima) não foi reproduzida em CI por ser frágil (ruído de
  agendamento do processo) — a asserção é de comportamento (mesma chamada,
  mesmo custo de CPU), não de tempo de parede, conforme orientação desta
  tarefa. Suíte completa (`npm test`), `npm run typecheck` e `npm run lint`
  executados após a mudança, todos verdes (793 testes, 102 arquivos).

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

- **Nota de resolução (2026-09-04, Backend — itens 1-2; item 3 permanece
  com DevOps, fora do escopo desta correção)**: **Resolvido (itens 1-2).**
  `src/modules/autenticacao/client-ip.ts`, `getClientIp`: ordem de
  preferência alterada exatamente para `x-vercel-forwarded-for` →
  `x-forwarded-for` → `x-real-ip` → `"unknown"`, conforme recomendado.
  Comentário de topo do arquivo reescrito para nomear explicitamente a
  dependência de infraestrutura (a proteção assume que a plataforma de
  deploy sobrescreve/nunca repassa o valor do cliente nesses cabeçalhos;
  válido hoje na Vercel; se o projeto for hospedado atrás de outro proxy/
  CDN ou self-hosted sem proxy confiável equivalente, o rate limiting de
  login fica vulnerável a bypass por spoofing) — mesmo texto de fundo já
  usado nesta entrada do relatório. Cobertura de teste:
  `src/modules/autenticacao/__tests__/client-ip.test.ts` — dois casos
  novos, um confirmando que `x-vercel-forwarded-for` tem prioridade sobre
  `x-forwarded-for`/`x-real-ip` quando presente, outro confirmando o
  fallback para `x-forwarded-for` quando `x-vercel-forwarded-for` está
  ausente; os 5 casos pré-existentes (incluindo o de `x-real-ip` como
  último recurso e `"unknown"` sem nenhum cabeçalho) continuam passando
  sem alteração. Item 3 (checklist de deploy do DevOps) não foi endereçado
  por este agente — fora do escopo de mudança de código atribuído ao
  Backend nesta tarefa; permanece como ação pendente de DevOps. Suíte
  completa (`npm test`), `npm run typecheck` e `npm run lint` executados
  após a mudança, todos verdes (793 testes, 102 arquivos).

### DEBT-07 — `app.tentativa_login.ip` sem política de retenção/expurgo definida — minimização de dados (LGPD Art. 6, III) — **RESOLVIDO (implementação), pendente de primeira execução real contra produção — 2026-09-04**

- **Status atualizado (2026-09-04)**: DevOps implementou a remediação
  recomendada abaixo — `.github/workflows/tentativa-login-purge.yml`, cron
  diário (`10:00 UTC`, depois de `supabase-health-check.yml`), `DELETE FROM
  app.tentativa_login WHERE tentado_em < now() - interval '72 hours'` via
  `psql` contra `SUPABASE_PROD_DB_URL` (mesmo padrão de acesso direto ao
  Postgres já usado por `supabase-backup-export.yml`, sem depender de
  `service_role`/`anon` via PostgREST). Falha do job abre/comenta Issue com
  label `tentativa-login-purge-alerta` (mesmo padrão de
  `supabase-backup-export.yml`/`supabase-health-check.yml`) — nunca falha em
  silêncio. **Coluna confirmada por leitura direta da migration antes de
  escrever a query**: `tentado_em` (não `criado_em`, nome hipotético
  descartado). **Query validada empiricamente contra Postgres local**
  (`supabase_db_turma-do-rola-comary`, mesma imagem/schema do projeto,
  não apenas sintaxe): linhas de teste inseridas com `tentado_em` em 100h,
  80h, 5h e 1h atrás — o `DELETE` exato do workflow removeu somente as duas
  linhas com mais de 72h, preservando as duas mais recentes; dados de teste
  removidos após a validação, sem deixar resíduo. **Não executado contra
  produção real nesta sessão** — nem manualmente (`workflow_dispatch`), nem
  pelo cron ainda (o secret `SUPABASE_PROD_DB_URL` já existe no repositório,
  `DEPLOY.md` Seção 7.5, então o workflow está tecnicamente apto a rodar a
  partir do próximo disparo, mas isso é diferente de ter sido *comprovado em
  execução real* contra o banco de produção — mesma distinção já aplicada a
  outros workflows deste projeto). Ver `DEPLOY.md` Seção 1/2 para o registro
  de IaC/pipeline correspondente.
- **Severidade (mantida)**: **Baixa** — não é achado de compliance obrigatório
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

---

# Fechamento retroativo de L2, L3, L4 e L5 (auditoria completa, 2026-09-04)

**Gatilho**: `QA-REPORT.md` Seção 12 ("Fechamento retroativo dos Lotes
L2–L5") — o CTO priorizou fechar o gap de governança já sinalizado pela
própria Seção 19 acima (reavaliação atrasada de `DEBT-01`) e pelo
`EXECUTION-LOG.md` (Lote L6, "Achado de processo sinalizado"): `BE-03`/
`FE-02`/`FE-03` (L2), `BE-06`/`BE-07`/`FE-04` (L3), `BE-08`/`FE-05` (L4) e
`BE-09`/`BE-10`/`BE-16`/`FE-06`/`FE-07`/`FE-08` (L5) nunca receberam
veredito agregado de QA nem auditoria completa de DevSecOps como unidade
fechada, apesar de todas as 13 tarefas estarem `Concluída` há mais tempo
que L6. O QA fechou o lado funcional (`QA-REPORT.md` Seções 12-17,
2026-09-04): **L2 Aprovado com ressalvas** (achado de processo/
documentação, não bug), **L3 Aprovado**, **L4 Aprovado**, **L5 Aprovado
com ressalvas** (`BUG-QA-BE09-01`, cobertura de teste, baixa severidade) —
nenhum bug de severidade alta/crítica em nenhuma das 13 tarefas. Isso
libera, pela primeira vez, a auditoria completa das 5 skills sobre estes 4
lotes, na mesma ordem em que o próprio código foi implementado (L2 antes
de L3, antes de L4, antes de L5) — apesar de L6 já ter sido auditado antes
por ter sido fechado funcionalmente primeiro pelo QA.

**Nota transversal sobre o estado real do sistema nesta data** (contexto
que se aplica aos 4 lotes abaixo, não repetida em cada um): `DEPLOY.md`
(Seção "Status", reconciliação de 2026-09-04) registra que **um deploy real
de produção já aconteceu** (`futebol-app-lsm.vercel.app`, 8 deploys de
Produção confirmados via `npx vercel ls`), descoberto fora do fluxo
governado deste pipeline. Isso supera a suposição usada pela auditoria de
L6 (Seção 19 acima, "os prazos de `DEBT-04`... não são acionados por este
lote... o deploy é de staging") — o prazo "antes do primeiro deploy de
produção" de `DEBT-04` **já foi tecnicamente ultrapassado sem
reverificação dedicada** (confirmado por leitura de `DEPLOY.md` item 5 da
Seção 10: "`DEBT-04`... não verificado nesta reconciliação se segue igual,
fora do escopo desta correção pontual"). Em paralelo, `DEBT-03` (CSP
ausente) **foi corrigida** nesta mesma janela (`vercel.json`, confirmado
por leitura direta — `Content-Security-Policy` presente, `default-src
'self'`, `connect-src` já restrito ao domínio real do Supabase do projeto)
e `DEBT-07` (retenção de `tentativa_login.ip`) teve o workflow de expurgo
implementado e validado localmente (`.github/workflows/
tentativa-login-purge.yml`), ambos ainda pendentes de confirmação de
execução real contra produção (responsabilidade de DevOps, já registrada
em `DEPLOY.md`). Nenhum destes três pontos é um achado de código de L2-L5
— são débitos herdados de L0/L1, cujo cronograma de prazo mudou porque a
premissa "ainda não houve deploy de produção" deixou de ser verdadeira.
Tratados como reconfirmação, não como achado novo, em cada seção de débito
herdado abaixo; a única ação nova deste agente é **sinalizar o descompasso
de cronograma ao CTO/DevOps** (Seção do resumo consolidado, ao final).

---

# Lote L2 — Ranking e Presença Pública (auditoria completa, 2026-09-04)

## 29. Método

- **Gatilho**: `QA-REPORT.md` Seção 13 — Lote L2 (`BE-03`, `FE-02`,
  `FE-03`) "Aprovado com ressalvas" — a ressalva é a documentação de
  produto (`PRD-TECNICO.md`/`UX-SPEC.md`/`BLOCKERS.md`) desatualizada
  depois que um commit direto do organizador (`d9b77e5`) removeu
  presenças/cartões da tabela pública, **não** um bug de código nem um
  achado de segurança — não reclassificado aqui, apenas referenciado
  (Seção 32).
- **Primeira auditoria completa de `BE-03` como lógica de negócio**: `BE-03`
  já havia sido tocada perifericamente pelo scan contínuo de L0 (Seção
  0, "as views públicas em si são BE-03, fora de L0") e citada como
  contexto em L1 (`DEBT-03`, origens de fetch), mas nunca recebeu as 5
  skills completas como unidade própria — esta é essa auditoria,
  reunida com a primeira auditoria de `FE-02`/`FE-03`.
- **Referências**: `SDD.md` Seção 7 (7.5 Superfície de Exposição — a
  linha "Páginas públicas de ranking/visão mensal" da tabela é
  literalmente este lote —, 7.6 LGPD), `GUARDRAILS.md` regras 5-7
  (RLS deny-by-default/`anon` sem escrita), 19 (dado pessoal nunca na
  área pública), `ADR-005` (fronteira de exposição pública via RLS/views),
  `API-CONTRACT.yaml` v0.12.0 (`RankingPublicoItem`/
  `PresencaMensalPublicaItem`), `QA-REPORT.md` Seção 13 e Seção 4/4.7
  (validação anterior de `BE-03`, referenciada, não repetida).
- **Código lido linha a linha**: `supabase/migrations/
  20260902101300_create_public_views.sql` e
  `20260903091500_add_ausencias_to_ranking_publico.sql` (definição exata
  das duas views + grants), `src/features/ranking-publico/*`
  (`rankingApi.ts`, `RankingList.tsx`, `PublicHomeShell.tsx`, `format.ts`),
  `src/features/presenca-mensal/*` (`presencaMensalApi.ts`,
  `PresencaMensal.tsx`, `format.ts`), `src/lib/supabase/anon-client.ts`.
- **Comandos executados diretamente**: `Grep` para `console\.(log|error
  |warn|debug)` e `dangerouslySetInnerHTML` em `src/features/
  ranking-publico`, `src/features/presenca-mensal` e `src/lib/supabase`
  — **zero ocorrências** em ambos; leitura de `vercel.json` (confirma
  `Content-Security-Policy` presente, ver nota transversal acima);
  leitura de `package.json` (nenhuma dependência nova associada a este
  lote — `next`/`vitest`/demais inalterados desde L6).
- **CTO-REVIEW.md**: presente e lido novamente. Nenhum achado
  estratégico novo deste lote pendente de decisão de negócio — o achado
  de documentação de produto da Seção 13.1 do QA é uma decisão de
  produto já tomada (commit `d9b77e5`, fora da cadeia de agentes), não
  uma questão de risco/compliance em aberto que caiba a este agente
  decidir ou escalar como pendência nova.
- **API-CONTRACT.yaml**: presente, v0.12.0. `RankingPublicoItem`/
  `PresencaMensalPublicaItem` conferidos campo a campo contra a saída
  real das duas views (mesma verificação já feita por QA via `psql`,
  Seção 4/4.7 — reconfirmada aqui por leitura cruzada do YAML contra a
  migration, não repetindo a reprodução empírica que já é papel do QA).
- **Não repetido nesta rodada**: as 5 skills completas sobre L0/L1/L6 —
  sem mudança de lógica de negócio nessas tarefas motivada por este lote.

## 30. Achados críticos do Lote L2 (bloqueiam deploy)

Nenhum.

## 31. Achados de alta severidade do Lote L2 (bloqueiam deploy)

Nenhum.

## 32. `security-requirement-validation` — achados de média/baixa severidade do Lote L2

Nenhum achado novo de segurança neste lote. Verificações relevantes,
documentadas por transparência (não são débitos, são confirmações
positivas):

- **Fronteira de exposição pública (`SDD.md` 7.5/`ADR-005`)**: confirmado
  por leitura direta de `20260902101300_create_public_views.sql` que
  `ranking_publico` e `presenca_mensal_publica` **nunca** referenciam
  `contato`/`data_nascimento` em nenhum ponto da definição SQL — a
  garantia é estrutural (a coluna não existe na view, não é apenas
  omitida de um `SELECT`), consistente com o que o QA já reproduziu
  empiricamente (Seção 4.1/4.2 do `QA-REPORT.md`, inclusive tentando
  extrair `contato` diretamente via `psql` como `anon`).
  `20260903091500_add_ausencias_to_ranking_publico.sql` (incremento de
  `ausencias`) reconfirmado como puramente aditivo — `CREATE OR REPLACE
  VIEW` reproduz as 5 colunas pré-existentes sem alteração, acrescenta
  só `ausencias`, sem introduzir nenhuma coluna sensível nova.
- **RLS deny-by-default + `anon` restrito a `SELECT` nas 2 views
  (`GUARDRAILS.md` regras 5-6)**: nenhum `GRANT` novo para `anon`/
  `public` em nenhuma tabela base, reconfirmado por leitura das
  migrations (nenhuma migration deste lote altera `revoke`/`grant` de
  nenhuma tabela — só cria/substitui as duas views) — consistente com a
  verificação empírica do QA via `information_schema.role_table_grants`
  (exatamente 2 linhas, ambas `SELECT` nas views).
- **Defesa em profundidade do lado do cliente (`rankingApi.ts`/
  `presencaMensalApi.ts`)**: ambos os módulos usam uma lista literal e
  exaustiva de colunas (`RANKING_PUBLICO_COLUMNS`/
  `PRESENCA_MENSAL_COLUMNS`) — **nunca `select("*")`** — confirmado por
  leitura direta. Esta é a segunda camada (a garantia real e não
  contornável já está no banco), mas reduz a chance de uma view futura
  ganhar uma coluna sensível por engano e o Frontend passar a
  arrastá-la sem querer via `select("*")`.
- **`getAnonClient()` (`src/lib/supabase/anon-client.ts`)**: usa
  exclusivamente `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave pública por
  desenho) — nunca a `service role` — confirmado por leitura; nenhuma
  rota destas duas telas passa por `middleware.ts`/Route Handler
  próprio (consistente com `SDD.md` 7.5: "toda leitura pública passa
  direto pelo PostgREST... nunca por este app").
- **`console.*`/`dangerouslySetInnerHTML`**: zero ocorrências em todo
  `src/features/ranking-publico`/`src/features/presenca-mensal`
  (confirmado por `Grep` própria).
- **Achado de processo de `FE-02` (`QA-REPORT.md` Seção 13.1, não
  reclassificado)**: a decisão de produto de remover presenças/cartões
  da tabela pública (commit `d9b77e5`) **reduz** a superfície de dado
  exposto publicamente, nunca aumenta — do ponto de vista de segurança,
  não há achado a fazer aqui; o gap é puramente de reconciliação de
  documentação (`PRD-TECNICO.md`/`UX-SPEC.md`/`BLOCKERS.md`), fora do
  escopo de auditoria de segurança deste agente. Concordo com o QA que
  isso não bloqueia o lote e não escalo como achado de compliance.

**Conclusão**: nenhum achado novo de severidade alta/crítica nem de
média/baixa neste lote.

## 33. `sensitive-data-exposure-check` — conclusão dedicada (Lote L2)

- **`contato`/`data_nascimento` nunca circulam nesta fronteira**:
  confirmado em três camadas independentes — (1) estrutural, a coluna
  não existe na definição SQL da view; (2) RLS/GRANT, `anon` só tem
  `SELECT` nas duas views, nunca nas tabelas base; (3) client-side,
  `rankingApi.ts`/`presencaMensalApi.ts` usam allowlist explícita de
  coluna, nunca `select("*")`. As três camadas reforçam-se mutuamente —
  a falha de qualquer uma isolada ainda não vazaria o dado.
  `RankingPublicoItem` expõe `atleta_id, nome_exibicao,
  pontuacao_acumulada, presencas, cartoes` (5 campos, hoje a UI só
  renderiza posição/nome/pontos por decisão de produto, ver Seção 32);
  `PresencaMensalPublicaItem` expõe `ano, mes, rodada_id, rodada_data,
  total_presentes, nomes_presentes` — `nomes_presentes` é
  `apelido_exibicao`, nunca `nome_completo`/dado de contato.
- **Mensagens de erro**: `rankingApi.ts`/`presencaMensalApi.ts`
  propagam `error.message` do PostgREST diretamente
  (`throw new Error(error.message)`) até `RankingList.tsx`/
  `PresencaMensal.tsx`, que **nunca renderizam essa mensagem
  diretamente** — ambos os componentes capturam a exceção e exibem um
  texto fixo de erro genérico (confirmado por leitura); a mensagem
  bruta do PostgREST (que nesta rota nunca inclui dado de linha, só
  metadado de erro de consulta) não chega à tela, mas também não é um
  vetor sensível mesmo que chegasse (não há como injetar dado de outra
  tabela numa mensagem de erro de `SELECT` restrito por `GRANT`).
- **`console.*`**: zero ocorrências (Seção 32).

**Conclusão**: nenhum achado de exposição de dado sensível no Lote L2.

## 34. `compliance-validation` — LGPD (nível de implementação, escopo Lote L2)

- **Minimização estrutural (`SDD.md` 7.5/7.6)**: reconfirmada em três
  camadas (Seção 33) — nenhuma mudança de postura desde a auditoria de
  L0 (Seção 5), que já havia atestado a ausência de `contato`/
  `data_nascimento` nas migrations originais; este lote é a primeira
  vez que o **consumo real** dessas views (via código Frontend) é
  auditado, e ele preserva a mesma garantia.
- **Base legal**: legítimo interesse do organizador (RNF-01/`SDD.md`
  7.6) já aceito para o sistema como um todo — nenhuma finalidade nova
  introduzida por este lote (leitura pública agregada, sem
  identificação de contato).
- **RN-12 implícito**: `nome_exibicao`/`nomes_presentes` são
  `apelido_exibicao`, não uma identidade formal/documento — consistente
  com o restante do sistema (nenhuma tela, pública ou interna, usa
  identidade civil como identificador de UI).
- **Conclusão desta seção**: nenhum achado de compliance obrigatório em
  aberto no escopo do Lote L2.

## 35. Requisitos de segurança operacional para o DevOps (Lote L2)

1. **Reconfirmação de `DEBT-03` (CSP) — status atualizado nesta
   auditoria**: `vercel.json` já contém `Content-Security-Policy`
   (`default-src 'self'`; `connect-src` restrito a `'self'` + ao
   domínio real do projeto Supabase) — a origem que este lote de fato
   usa (`getAnonClient()`, fetch client-side ao Supabase) está coberta.
   `DEBT-03` estava com prazo "após L2 estabilizar as origens de fetch
   necessárias" (Seção 3) — **esse prazo está satisfeito**: a política
   já reflete exatamente a origem que `FE-02`/`FE-03` usam, sem entrada
   solta/genérica demais. Pendente apenas a confirmação operacional
   (fora do escopo de código) de que a política está de fato ativa no
   deploy de produção real, não só commitada — ação já registrada como
   pendência do próprio DevOps em `DEPLOY.md`, reforçada aqui.
2. **Reconfirmação de `DEBT-04` (advisories `next`) — cronograma
   alterado, ver nota transversal no topo desta seção**: nenhuma
   dependência nova por este lote; a classificação (Média) e a análise
   de aplicabilidade original (Seção 3) permanecem tecnicamente válidas
   (nenhuma advisory nova de classe CWE-285/863 identificada por este
   agente nesta rodada), mas o prazo original ("antes do primeiro
   deploy de produção") já foi ultrapassado sem uma reverificação
   dedicada pós-deploy real — recomendação operacional: DevOps/Backend
   reexecutar `npm audit --json` contra o estado atual e confirmar
   explicitamente que nenhuma advisory nova atingiu a classe de
   autorização antes de tratar isso como debt de rotina.
3. Nenhum requisito operacional novo específico deste lote além dos já
   vigentes (Seção 4/16/25) — este lote não introduz secret novo,
   rota de rede nova, nem mudança de superfície de borda.

## 36. Checklist de "Pronto" do Lote L2 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 30-31).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 34).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo de correção — nenhum achado de segurança novo neste lote;
      `DEBT-01`/`02`/`04` (herdados) reconfirmados sem mudança de
      severidade (Seção 35); `DEBT-03` confirmado resolvido nesta
      auditoria.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 35.
- [x] Achado de relevância estratégica sinalizado ao CTO — o descompasso
      de cronograma de `DEBT-04` (Seção 35, item 2, nota transversal) é
      sinalizado no resumo consolidado ao final deste documento, não
      apenas aqui, por ser transversal aos 4 lotes.

## 37. Veredito

## **Lote L2 (BE-03, FE-02, FE-03): APROVADO**

A auditoria completa das 5 skills sobre as 3 tarefas do Lote L2 **não
encontrou nenhum achado de segurança novo** — nem crítico, nem alto, nem
de média/baixa severidade. A fronteira de exposição pública mais sensível
do sistema (`ADR-005`) segue protegida em três camadas independentes
(ausência estrutural de coluna na view, RLS/GRANT restrito, allowlist de
coluna no cliente), verificadas por leitura direta de todo o código deste
lote (migrations + `rankingApi.ts`/`presencaMensalApi.ts` +
componentes), não apenas por aceite da validação já feita pelo QA.
`console.*`/`dangerouslySetInnerHTML`: zero ocorrências. `DEBT-03` (CSP)
confirmado resolvido nesta auditoria — origem de fetch de `anon` já
coberta pela política publicada em `vercel.json`.

**Achado de processo do QA (`QA-REPORT.md` Seção 13.1, documentação de
produto desatualizada após decisão do organizador) não é um achado de
segurança** — reduz superfície de exposição, não aumenta; fora do escopo
de ação deste agente, referenciado apenas por transparência.

**Sinalização ao CTO (paralela, registro — não pré-requisito da
liberação)**: ver resumo consolidado ao final deste documento para o
descompasso de cronograma de `DEBT-04` (produção já está ativa, prazo já
ultrapassado sem reverificação dedicada) — transversal aos 4 lotes,
tratado uma única vez lá.

**Lote L2 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` §5) —
nenhum achado alta/crítica em aberto, nenhum achado de compliance
obrigatório não resolvido, um débito herdado (`DEBT-03`) fechado nesta
auditoria, os demais (`DEBT-01`/`02`/`04`) reconfirmados com prazo e dono
inalterados (exceto a nota de cronograma de `DEBT-04`, tratada no resumo
consolidado).

## 38. Entrada correspondente em `BLOCKERS.md`

Nenhuma entrada nova necessária. Nenhum achado desta auditoria volta para
o time de implementação como ação bloqueante.

---

# Lote L3 — Cadastro de Atletas (auditoria completa, 2026-09-04)

## 39. Método

- **Gatilho**: `QA-REPORT.md` Seção 14 — Lote L3 (`BE-06`, `BE-07`,
  `FE-04`) "Aprovado", sem ressalva — nenhum achado de nenhuma
  severidade em nenhuma das 3 tarefas, primeira validação de QA das
  três. Primeira vez que as 5 skills de auditoria completa rodam sobre
  este lote.
- **Por que este é o lote de maior sensibilidade de dado pessoal do
  sistema até aqui (enunciado da tarefa)**: `BE-06` introduz a primeira
  tabela/API que **lê e grava** `contato`/`data_nascimento` na área
  interna (`app.atleta`, já existente desde `BE-02`, mas nunca
  exercitada por nenhuma API antes deste lote); `BE-07` introduz o
  único mecanismo de exclusão/anonimização de dado pessoal do sistema
  inteiro (LGPD Art. 18, `ADR-011`); `FE-04` é a única tela que
  coleta/edita dado de possível menor de idade. Tratado como superfície
  de alta sensibilidade para `sensitive-data-exposure-check` e
  `compliance-validation`, com leitura linha a linha de 100% do código
  de produção deste lote (não apenas amostragem).
- **Referências**: `SDD.md` Seção 7.6 (bases legais duplas — legítimo
  interesse para adulto, consentimento do responsável para menor,
  redação corrigida em 2026-09-04) e 7.7 (direito à anonimização,
  `ADR-011`), `GUARDRAILS.md` regras 9 (nenhuma linha de `atleta`
  excluída fisicamente), 19-21 (LGPD/dado pessoal), `API-CONTRACT.yaml`
  v0.12.0 (`AtletaResponse`/`AtletaBody`/rotas `/api/atletas*`),
  `QA-REPORT.md` Seção 14.
- **Código lido linha a linha**: `src/modules/atletas/{repository,
  mutate,anonimizar,presenter,validation,constants}.ts`, as 3 rotas
  (`app/api/atletas/route.ts`, `app/api/atletas/[id]/route.ts`,
  `app/api/atletas/[id]/anonimizar/route.ts`),
  `supabase/migrations/20260903110000_create_anonimizar_atleta_function.sql`,
  `supabase/migrations/20260903100000_create_atleta_nivel_tecnico_view.sql`,
  `src/features/atletas/{AtletaForm,AtletasList,AnonimizacaoZona,
  atletasApi,idade,format}.ts(x)`, `src/features/sessao/
  writeActionSession.ts`/`useHandleSessionExpired.ts` (reconfirmação,
  ver achado novo abaixo), `src/components/ui/TypedConfirmationModal/*`.
- **Comandos executados diretamente**: `Grep` para `console\.(log|error
  |warn|debug)` em `src/modules/atletas`, `app/api/atletas`,
  `src/features/atletas` — **zero ocorrências**; `Grep` para
  `dangerouslySetInnerHTML` em todo `src/`/`app/` — **zero
  ocorrências**; `Grep` dedicado para `unsavedData`/`saveUnsavedData`/
  `useHandleSessionExpired` em todo `src/features` — usado para
  verificar o item de checklist deixado em aberto por `DEBT-08` (Seção
  12, L1: "reavaliar quando `FE-04`+ usar `saveUnsavedData` com dado de
  atleta") — **achado novo abaixo (`DEBT-10`)**; leitura cruzada de
  `API-CONTRACT.yaml` contra `presenter.ts` (`paraAtletaResponse`) para
  confirmar ausência de campo não documentado.
- **CTO-REVIEW.md**: presente e lido novamente. `SDD.md` 7.6 já foi
  objeto de correção de redação pelo próprio Software Architect
  (2026-09-04, Gate 2/3 do CTO) — nenhum achado estratégico novo deste
  lote pendente de decisão de negócio identificado por este agente além
  do que já foi resolvido na própria arquitetura.
- **API-CONTRACT.yaml**: presente, v0.12.0. `AtletaResponse` conferido
  campo a campo contra `paraAtletaResponse` — `contato`/
  `data_nascimento` documentados como campos legítimos da área interna
  (não um vazamento, é o próprio propósito de `BE-06`), consistente com
  `SDD.md` 7.5 ("Área interna... formulários protegidos por senha").
- **Não repetido nesta rodada**: as 5 skills completas sobre L0/L1/L2/
  L6 — sem mudança de lógica de negócio nessas tarefas motivada por
  este lote.

## 40. Achados críticos do Lote L3 (bloqueiam deploy)

Nenhum.

## 41. Achados de alta severidade do Lote L3 (bloqueiam deploy)

Nenhum.

## 42. `security-requirement-validation` — achados de média/baixa severidade do Lote L3

- **Middleware (`GUARDRAILS.md` regra 17/19, `SDD.md` 7.2/7.5)**: `GET
  /api/atletas`/`GET /api/atletas/{id}` — a primeira rota de leitura
  interna a devolver `contato`/`data_nascimento` — está corretamente
  coberta por `INTERNAL_READ_PROTECTED_PREFIXES` (`/api/atletas`),
  confirmado por leitura direta de `middleware.ts` (comentário do
  próprio arquivo nomeia este caso explicitamente) e pelos casos
  correspondentes de `middleware.test.ts`; `POST`/`PUT`/rota de
  anonimizar já cobertas por `WRITE_METHODS`, sem necessidade de
  entrar na lista de prefixos.
- **`GRANT EXECUTE` de `app.anonimizar_atleta` restrito a
  `service_role`**: confirmado por leitura da migration (`revoke all...
  from public`/`from anon`, `grant execute... to service_role`),
  reforça a verificação empírica do QA via `has_function_privilege`.
  Função declara `set search_path = app, pg_temp` explicitamente
  (defesa contra search-path hijacking, mesmo padrão de
  `lancar_rodada`/`excluir_rodada`).
- **Idempotência/irreversibilidade de `anonimizar_atleta`**: reprocessar
  um atleta já anonimizado é recusado pela própria função
  (`errcode='AN001'`) em vez de sobrescrever de novo silenciosamente —
  confirmado por leitura; `SELECT ... FOR UPDATE` serializa chamadas
  concorrentes para o mesmo `atleta_id`.
- **Nenhuma rota de `DELETE` físico para `atleta`
  (`GUARDRAILS.md` regra 9)**: confirmado por leitura de
  `app/api/atletas/**/route.ts` — o único verbo de "remoção" existente
  é `POST .../anonimizar`.
- **Validação de entrada (defesa em profundidade)**: `atletaBodySchema`
  (`zod`) valida `data_nascimento` como data ISO real (rejeita data
  futura), calcula idade em UTC (não depende do fuso do processo), e
  aplica `superRefine` para exigir `consentimento_responsavel_obtido`
  quando `idade < 18` — reaplicado tanto em `POST` quanto em `PUT`
  (RF-01.6). Nenhuma interpolação de string em query — todo acesso via
  `supabase-js` parametrizado.
- **`console.*`/`dangerouslySetInnerHTML`**: zero ocorrências (Seção
  39).

---

### DEBT-10 (novo, 2026-09-04) — `AtletaForm` (`FE-04`) preserva `contato`/`data_nascimento` sem redação em `sessionStorage` ao expirar a sessão durante o envio

- **Severidade**: **Média** (mesma classe de `DEBT-05`-`DEBT-07`, L1 —
  fraqueza real e confirmada por leitura de código, não hipotética, mas
  sem exploração direta por terceiro não autorizado no estado atual do
  sistema).
- **Onde**: `src/features/atletas/AtletaForm.tsx`, função `submit`
  (linha ~169) — ao capturar `SessionExpiredError` (a API respondeu
  `401` durante `createAtleta`/`updateAtleta`), o código chama
  `handleSessionExpired({ unsavedData: body })`, onde `body` é o
  `AtletaBody` completo montado por `buildBody()` (linha ~125) —
  inclui **`contato`** e **`data_nascimento`** em texto puro, além de
  `nome_completo`/`apelido_exibicao`/`pontuacao_inicial`/
  `consentimento_responsavel_obtido`. `useHandleSessionExpired`
  (`src/features/sessao/useHandleSessionExpired.ts`) repassa isso a
  `saveUnsavedData` (`writeActionSession.ts`), que grava
  `JSON.stringify(data)` **sem nenhuma redação/sanitização** em
  `window.sessionStorage`, sob a chave
  `sessao_interna:dados_nao_salvos:<pathname>`.
- **Confirmação de que este é exatamente o gatilho que `DEBT-08` (Seção
  12, L1) previu e deixou como item de checklist explícito**: a entrada
  original dizia, literalmente, "quando `FE-04` em diante... chamar
  `useHandleSessionExpired({ unsavedData: ... })` [com] risco real de
  que o formulário preservado contenha campo de dado pessoal do atleta
  (ex.: `contato`/`data_nascimento`)... exigir que a tela redija/omita
  esses campos antes de preservar". Verificado agora, por leitura direta
  do código de `FE-04`: **o risco previsto se materializou** — nenhuma
  redação foi aplicada.
- **Achado agravante, não apenas confirmação do previsto**: `Grep` em
  todo `src/`/`app/` por `takeUnsavedData` mostra que esta função **só é
  chamada dentro dos próprios testes do módulo `sessao`** — nenhuma tela
  de produção (nem `AtletaForm.tsx`, nem `LancamentoRodadaForm.tsx`, os
  dois únicos chamadores de `saveUnsavedData` hoje) jamais lê/restaura o
  rascunho preservado. Ou seja, o mecanismo de "retomar o formulário"
  descrito no `UX-SPEC.md` Seção 1.3 **não está de fato implementado**
  do lado de restauração — o dado sensível é gravado em
  `sessionStorage`, nunca lido de volta, nunca removido pelo próprio
  fluxo (só seria sobrescrito por uma futura chamada com a mesma chave,
  ou apagado quando a aba/janela do navegador for fechada, comportamento
  padrão de `sessionStorage`). Isso piora a análise de minimização (LGPD
  Art. 6º, III): o dado persiste no navegador do operador sem cumprir
  nenhuma finalidade funcional — pura retenção sem propósito, exatamente
  o tipo de gap que o princípio de minimização existe para prevenir
  (mesma classe de raciocínio já usada para `DEBT-07`, IP de tentativa
  de login).
- **Por que Média, não Alta/Crítica**: (a) `sessionStorage` só é legível
  por JavaScript executado na mesma origem — não há, em todo o
  repositório, nenhuma ocorrência de `dangerouslySetInnerHTML` ou outro
  vetor de XSS conhecido (confirmado por `Grep` global, Seção 39); a
  exploração exigiria XSS ou acesso físico/malware no navegador do
  próprio operador já autenticado; (b) o operador que vê esse dado em
  `sessionStorage` é a mesma pessoa que já tem acesso legítimo a ele
  (digitou no próprio formulário, ou o carregou via `GET
  /api/atletas/{id}`, rota já protegida por sessão) — não é uma
  exposição a um terceiro não autorizado; (c) `GUARDRAILS.md` regra 19
  fala especificamente de "área pública"/"página acessível sem sessão
  válida" — este é armazenamento client-side dentro da área já
  autenticada, não uma violação direta e literal daquela regra; (d) o
  vetor é limitado à janela de vida de uma aba do navegador
  (`sessionStorage`, não `localStorage`).
- **Por que não é ignorado como Baixa**: é dado pessoal sensível de
  LGPD (`contato`/`data_nascimento`, os mesmos dois campos que
  `GUARDRAILS.md` regra 19/`SDD.md` 7.5 tratam como a superfície mais
  protegida do sistema inteiro), persistido fora do banco de dados, sem
  criptografia, sem TTL, sem finalidade funcional cumprida (mecanismo
  de restauração nunca implementado) — e o próprio `DEBT-08` já havia
  atribuído a este agente, explicitamente, a responsabilidade de
  reavaliar exatamente este cenário quando ele ocorresse.
- **Decisão do DevSecOps (autoridade de classificação/bloqueio deste
  agente)**: **não bloqueia o fechamento do Lote L3** — severidade
  Média, registrado como débito com prazo, conforme o guardrail deste
  agente ("só severidade alta/crítica bloqueia por padrão").
- **Remediação recomendada**: (1) em `AtletaForm.tsx`, montar um
  payload reduzido para `unsavedData` (whitelist explícita:
  `nome_completo`, `apelido_exibicao`, `pontuacao_inicial`,
  `consentimento_responsavel_obtido` — nunca `contato`/
  `data_nascimento`), em vez de repassar `body` inteiro; (2)
  separadamente (decisão de produto/UX, não deste relatório): decidir
  se o mecanismo de restauração via `takeUnsavedData` será
  efetivamente implementado (a promessa do `UX-SPEC.md` Seção 1.3 seguir
  não cumprida) ou se `saveUnsavedData` deve parar de ser chamado por
  telas que não pretendem restaurar o rascunho — de qualquer forma,
  ambas as opções devem preservar a redação do item (1).
- **Prazo**: antes do primeiro uso real deste fluxo por um usuário final
  em produção (contexto agravado pela nota transversal no topo deste
  fechamento: produção já está ativa — recomenda-se tratar como
  prioridade mais próxima que os demais débitos de baixa severidade,
  mesmo não bloqueando o lote).
- **Dono**: Frontend (implementação da correção).

---

**Conclusão da Seção 42**: um achado novo (`DEBT-10`, Média,
não-bloqueante) — nenhum achado de severidade alta/crítica.

## 43. `sensitive-data-exposure-check` — conclusão dedicada (Lote L3)

- **`AtletaResponse` (`GET`/`POST`/`PUT /api/atletas*`)**: expõe
  `contato`/`data_nascimento` **deliberadamente** — é o próprio
  propósito desta API (área interna, protegida por sessão em toda
  leitura/escrita, `SDD.md` 7.5) — confirmado que nenhum campo a mais
  vaza (`presenter.ts` monta um shape explícito, nunca `select("*")`
  repassado direto).
- **`anonimizar_atleta` — dado pessoal nunca em variável de execução**:
  confirmado por leitura da migration — a função nunca lê o valor real
  de `nome_completo`/`apelido_exibicao`/`contato`/`data_nascimento`
  antes de sobrescrevê-los; `log_auditoria.valores_antes` grava
  exatamente o literal `"[REDACTED]"` nos 4 campos. Reforça, por
  leitura independente, a mesma conclusão já alcançada pelo QA via
  teste de integração com asserção negativa.
- **Achado novo, tratado como `DEBT-10` (Seção 42)**: `contato`/
  `data_nascimento` persistidos sem redação em `sessionStorage` quando
  a sessão expira durante o envio do formulário — única exposição fora
  do fluxo desenhado encontrada neste lote.
- **Mensagens de erro**: nenhuma das 3 rotas ecoa detalhe interno
  (stack trace, mensagem bruta do Postgres) ao cliente — confirmado por
  leitura de todos os `route.ts`: `400` devolve só `path`/`message` do
  `zod`; `404` (atleta não encontrado) devolve mensagem fixa; `409`
  (duplicidade) devolve a lista de duplicatas já conhecida pelo próprio
  chamador (`nome_completo`/`id`, não um dado novo revelado).
- **`console.*`**: zero ocorrências.

**Conclusão desta seção**: um achado de exposição/retenção de dado
sensível fora do banco (`DEBT-10`), Média severidade, não-bloqueante —
nenhum vazamento a terceiro não autorizado identificado.

## 44. `compliance-validation` — LGPD (nível de implementação, escopo Lote L3)

- **Duas bases legais distintas (`SDD.md` 7.6, redação corrigida
  2026-09-04)**: confirmado por leitura de `AtletaForm.tsx` — o aviso
  de privacidade fixo no topo do formulário é consistente com a Seção
  7.6 corrigida; o bloco de consentimento (`showConsentBlock`) é
  anunciado via `aria-live="polite"` **permanente** (nunca
  `display:none` puro) e reaparece também quando o servidor devolve
  erro de RF-01.3 mesmo com o bloco oculto no cliente (defesa contra
  divergência de relógio) — nunca deixa um erro "órfão".
  `consentimento_responsavel_obtido` é boolean declarativo (RN-02),
  nunca verificado pelo sistema além da declaração — consistente com o
  desenho já aprovado.
- **Anonimização (LGPD Art. 18, `ADR-011`)**: mecanismo completo e
  funcional — sobrescrita dos 4 campos + `ativo=false` +
  `anonimizado_em` + desativação de `restricao_obrigatoria` associada,
  tudo em uma única transação PL/pgSQL; irreversível por desenho
  (`TypedConfirmationModal`, exige digitar "ANONIMIZAR", foco inicial
  em "Cancelar", botão `aria-disabled` até o texto bater — confirmado
  por leitura de `AnonimizacaoZona.tsx`/`TypedConfirmationModal`).
  Estado pós-anonimização com os 4 campos `readOnly`/`aria-readonly`,
  nunca editáveis de novo.
- **Nenhuma linha de `atleta` excluída fisicamente
  (`GUARDRAILS.md` regra 9)**: confirmado — nenhuma rota `DELETE`
  existe para `atleta`.
- **Minimização de dados — achado novo**: `DEBT-10` (Seção 42) é uma
  lacuna de minimização (retenção de `contato`/`data_nascimento` fora
  do banco, sem finalidade cumprida) — **avaliado como débito, não como
  compliance obrigatório não resolvido**, pela mesma régua já aplicada
  a `DEBT-07`: (a) não é a ausência de um mecanismo de compliance
  exigido por lei que o sistema devesse ter implementado desde já
  (diferente de `anonimizar_atleta`, que é a própria materialização do
  Art. 18 e está completa e funcional); (b) é uma lacuna de higiene de
  retenção incidental a uma funcionalidade auxiliar (`FE-12`/`DEBT-08`)
  que não é ela mesma o mecanismo de tratamento de dado pessoal
  principal do lote. Não bloqueia a aprovação de L3.
- **Conclusão desta seção**: nenhum achado de compliance **obrigatório**
  em aberto no escopo do Lote L3 — `DEBT-10` é débito de minimização,
  registrado com prazo (Seção 42), não uma lacuna de mecanismo legal
  exigido.

## 45. Requisitos de segurança operacional para o DevOps (Lote L3)

Nenhum item novo específico deste lote além dos já vigentes (Seções 4/
16/25/35) — este lote não introduz secret novo, rota de rede nova, nem
dependência nova (`git diff -- package.json` entre L2 e L3 não mostra
alteração motivada por este lote). Reforço: `DEBT-10` (Seção 42) é uma
correção de código do Frontend, não requer nenhuma ação de
infraestrutura do DevOps.

## 46. Checklist de "Pronto" do Lote L3 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 40-41).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 44); `DEBT-10` é
      débito, não compliance obrigatório.
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo de correção — `DEBT-10` (Seção 42), Média, prazo definido,
      dono Frontend; `DEBT-01`/`02`/`04` (herdados) reconfirmados sem
      mudança.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 45 (nenhum item novo).
- [x] Achado de relevância estratégica sinalizado ao CTO — `DEBT-10` é
      técnico (correção de Frontend), não exige decisão de negócio;
      sinalizado ao CTO apenas por transparência, junto ao resumo
      consolidado.

## 47. Veredito

## **Lote L3 (BE-06, BE-07, FE-04): APROVADO COM DÉBITO REGISTRADO**

A auditoria completa das 5 skills sobre as 3 tarefas do Lote L3 —
tratado com rigor adicional por ser a superfície de maior sensibilidade
de dado pessoal do sistema até aqui (primeira API a ler/gravar
`contato`/`data_nascimento`, único mecanismo de anonimização do sistema
inteiro) — **não encontrou nenhum achado de severidade alta/crítica**. O
middleware protege corretamente a primeira rota de leitura interna
sensível (`GET /api/atletas*`); `app.anonimizar_atleta` está
estruturalmente completa e correta (`GRANT EXECUTE` restrito,
`search_path` explícito, idempotência via `errcode='AN001'`, dado
pessoal real nunca em variável de execução, log de auditoria só com
marcadores redigidos); nenhuma rota de exclusão física de `atleta`
existe; validação de idade/consentimento em UTC, reaplicada em
criação e edição.

**Um achado novo, `DEBT-10`, Média severidade, não-bloqueante**:
`AtletaForm.tsx` (`FE-04`) persiste `contato`/`data_nascimento` sem
redação em `sessionStorage` quando a sessão expira durante o envio do
formulário — confirmação, por leitura de código, do cenário que o
próprio `DEBT-08` (auditoria de L1) já havia previsto e deixado como
item de checklist explícito para esta auditoria. Agravante: o mecanismo
de restauração (`takeUnsavedData`) nunca é chamado por nenhuma tela real
— o dado é gravado, nunca lido de volta, retido sem cumprir finalidade
funcional. Registrado com remediação recomendada (whitelist de campos
não sensíveis antes de preservar), prazo antes do primeiro uso real
deste fluxo em produção (contexto agravado por produção já estar ativa,
ver nota transversal), dono Frontend.

**Sinalização ao CTO (paralela, registro — não pré-requisito da
liberação)**: `DEBT-10` é inteiramente técnico, comunicado por
transparência; ver resumo consolidado ao final para o descompasso de
cronograma transversal de `DEBT-04`.

**Lote L3 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` §5) —
nenhum achado alta/crítica em aberto, nenhum achado de compliance
obrigatório não resolvido, débito residual documentado com prazo e
dono.

## 48. Entrada correspondente em `BLOCKERS.md`

Nenhuma entrada nova necessária. `DEBT-10` não volta como bloqueio para o
time de implementação — fica registrado como débito com prazo e dono
neste relatório (Seção 42), mesmo tratamento já aplicado aos débitos de
L1 (`DEBT-05`-`09`).

---

# Lote L4 — Lançamento de Rodada (auditoria completa, 2026-09-04)

## 49. Método

- **Gatilho**: `QA-REPORT.md` Seção 15 — Lote L4 (`BE-08`, `FE-05`)
  "Aprovado", sem ressalva — nenhum achado de nenhuma severidade,
  primeira validação de QA de ambas. Primeira vez que as 5 skills de
  auditoria completa rodam sobre este lote.
- **Referências**: `SDD.md` Seção 7.2 (autorização binária sem RBAC),
  `GUARDRAILS.md` regras 8 (ledger append-only), 10 (operação que
  altera saldo roda em função/trigger PL/pgSQL única), 17,
  `TASK.md` Seção 1.2, `API-CONTRACT.yaml` v0.12.0
  (`LancarRodadaBody`/`RodadaResponse`), `QA-REPORT.md` Seção 15.
- **Código lido linha a linha**: `src/modules/rodadas/{lancar,
  repository,presenter,validation,constants}.ts`, `app/api/rodadas/
  route.ts` (`POST`), `supabase/migrations/
  20260903120000_seed_configuracao_pontuacao.sql` e
  `20260903120100_create_lancar_rodada_function.sql`,
  `src/features/rodadas/{LancamentoRodadaForm,EventosStep,
  rodadasApi,participacaoState,format}.ts(x)`.
- **Comandos executados diretamente**: `Grep` para `console\.(log|error
  |warn|debug)` em `src/modules/rodadas`, `app/api/rodadas`,
  `src/features/rodadas` — **zero ocorrências**; `Grep` para
  `unsavedData` em `LancamentoRodadaForm.tsx` — confirma que o `body`
  preservado (`data`, `participacoes: [{atleta_id, status, eventos}]`)
  **nunca inclui `contato`/`data_nascimento`** (o schema de
  `LancarRodadaBody`, `src/modules/rodadas/validation.ts`, não tem
  esses campos) — o mesmo mecanismo genérico de `DEBT-08`/`DEBT-10` não
  se aplica aqui, verificado explicitamente, não presumido; leitura
  cruzada de `API-CONTRACT.yaml` contra `presenter.ts`.
- **CTO-REVIEW.md**: presente e lido novamente. Nenhum achado
  estratégico novo deste lote.
- **Não repetido nesta rodada**: as 5 skills completas sobre L0/L1/L2/
  L3/L6.

## 50. Achados críticos do Lote L4 (bloqueiam deploy)

Nenhum.

## 51. Achados de alta severidade do Lote L4 (bloqueiam deploy)

Nenhum.

## 52. `security-requirement-validation` — achados de média/baixa severidade do Lote L4

Nenhum achado novo de segurança neste lote. Verificações relevantes:

- **Atomicidade real (`GUARDRAILS.md` regra 10)**: confirmado por
  leitura linha a linha de `app.lancar_rodada` — `INSERT` em
  `app.rodada` + um `app.participacao_rodada` por atleta + um
  `app.evento_jogo` por evento + exatamente um `app.lancamento_pontos`
  por atleta, todos dentro do corpo de uma única função PL/pgSQL
  (transação implícita única); qualquer `raise exception` no meio do
  `loop` reverte 100% do que já foi inserido nesta chamada — nenhum
  `savepoint`/captura de exceção intermediária que permitisse commit
  parcial.
- **RF-02.6 (bloqueio de evento para atleta ausente) em defesa em
  profundidade**: verificado tanto na validação `zod` de borda
  (`validation.ts`) quanto estruturalmente dentro da função PL/pgSQL
  (`errcode = 'RF026'`) — a segunda é a garantia real, a primeira é só
  otimização de UX; nenhuma chamada direta à RPC (contornando a API)
  consegue escapar da checagem estrutural.
- **`GRANT EXECUTE` de `app.lancar_rodada` restrito a `service_role`**:
  confirmado por leitura (`revoke all... from public/anon`, `grant
  execute... to service_role`). `set search_path = app, pg_temp`
  declarado explicitamente.
- **Valor de pontos sempre lido de `app.configuracao_pontuacao` vigente
  na data da rodada, nunca hardcoded**: confirmado por leitura — se
  nenhum valor vigente for encontrado, a função levanta exceção
  (`errcode='RN005'`) em vez de gravar um lançamento com valor
  ausente/zerado silenciosamente.
- **Controles desabilitados, não escondidos (`FE-05`)**: confirmado por
  leitura de `EventosStep.tsx` — `disabled={bloqueado}` real em
  `StepperCounter`, nunca `display:none`, para atleta ausente.
- **`console.*`/`dangerouslySetInnerHTML`**: zero ocorrências.

**Conclusão**: nenhum achado novo de severidade alta/crítica nem de
média/baixa neste lote.

## 53. `sensitive-data-exposure-check` — conclusão dedicada (Lote L4)

- **Nenhum dado de `contato`/`data_nascimento` circula neste lote**:
  `lancar_rodada` e toda a cadeia de código deste lote (`repository.ts`,
  `presenter.ts`, `rodadasApi.ts`) trabalham exclusivamente com
  `atleta_id` (uuid), `status`, `eventos` — nunca leem/gravam campo
  pessoal do atleta. Confirmado por leitura de todos os `.select(...)`
  e do corpo de `RodadaResponse`/`API-CONTRACT.yaml`.
- **`unsavedData` de `LancamentoRodadaForm.tsx`**: confirmado (Seção
  49) que o payload preservado em `sessionStorage` em caso de sessão
  expirada não contém nenhum campo sensível de atleta — apenas
  `atleta_id`, que sozinho não é dado pessoal sensível sob a régua já
  usada por este relatório (mesma classe de identificador já presente
  em toda a área interna, não equivalente a `contato`/
  `data_nascimento`). Nenhum achado aqui, ao contrário de `FE-04`
  (`DEBT-10`).
- **Mensagens de erro**: nenhuma mensagem bruta do Postgres chega ao
  cliente — `400`/`409`/`500` usam mensagens de negócio fixas ou
  derivadas do `errcode` mapeado (`ERRCODE_EVENTO_PARA_AUSENTE`/
  `ERRCODE_CONFIGURACAO_PONTUACAO_AUSENTE`), confirmado por leitura de
  `lancar.ts`/`route.ts`.
- **`console.*`**: zero ocorrências.

**Conclusão desta seção**: nenhum achado de exposição de dado sensível
no Lote L4.

## 54. `compliance-validation` — LGPD (nível de implementação, escopo Lote L4)

- **Minimização de dados**: nenhum campo pessoal novo equivalente a
  `contato`/`data_nascimento` foi adicionado a nenhuma tabela deste
  lote; `app.lancamento_pontos`/`app.participacao_rodada`/
  `app.evento_jogo` só referenciam `atleta_id`.
- **Ledger append-only (`GUARDRAILS.md` regra 8)**: reforçado — cada
  atleta recebe exatamente um `app.lancamento_pontos` por rodada
  (nunca um `UPDATE` sobre lançamento já existente), consistente com
  correção/estorno (`BE-09`, L5) que só insere novos ajustes.
- **Conclusão desta seção**: nenhum achado de compliance obrigatório em
  aberto no escopo do Lote L4.

## 55. Requisitos de segurança operacional para o DevOps (Lote L4)

Nenhum item novo específico deste lote além dos já vigentes — nenhuma
dependência nova, nenhuma rota pública nova, nenhuma mudança de
superfície de exposição de borda.

## 56. Checklist de "Pronto" do Lote L4 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 50-51).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 54).
- [x] Todo achado de baixa/média severidade registrado como débito —
      nenhum achado de segurança novo neste lote; `DEBT-01`/`02`/`04`
      (herdados) reconfirmados sem mudança.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 55 (nenhum item novo).
- [x] Achado de relevância estratégica sinalizado ao CTO — nenhum
      achado técnico deste lote exige decisão de negócio.

## 57. Veredito

## **Lote L4 (BE-08, FE-05): APROVADO**

A auditoria completa das 5 skills sobre as 2 tarefas do Lote L4 **não
encontrou nenhum achado de segurança novo** — nem crítico, nem alto,
nem de média/baixa severidade. A atomicidade real da transação de
lançamento (reversão de 100% do que já foi inserido no `loop` quando um
atleta posterior falha a validação) foi confirmada por leitura linha a
linha da função PL/pgSQL, reforçando a verificação empírica já feita
pelo QA via chamada direta à RPC; `GRANT EXECUTE` restrito a
`service_role`; controles de evento desabilitados (nunca escondidos)
para atleta ausente, com defesa em profundidade estrutural (`errcode
RF026`) contra bypass via chamada direta à RPC. Verificado
explicitamente (não presumido) que o mecanismo de preservação de
rascunho de `FE-05` nunca inclui dado pessoal sensível de atleta,
diferente do achado equivalente em `FE-04` (`DEBT-10`, L3).

**Sinalização ao CTO**: nenhum achado técnico deste lote exige decisão
de negócio.

**Lote L4 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` §5) —
nenhum achado alta/crítica em aberto, nenhum achado de compliance
obrigatório não resolvido, nenhum débito de segurança novo.

## 58. Entrada correspondente em `BLOCKERS.md`

Nenhuma entrada nova necessária.

---

# Lote L5 — Correção, Histórico e Auditoria de Rodadas (auditoria completa, 2026-09-04)

## 59. Método

- **Gatilho**: `QA-REPORT.md` Seção 16 — Lote L5 (`BE-09`, `BE-10`,
  `BE-16`, `FE-06`, `FE-07`, `FE-08`) "Aprovado com ressalvas" — a
  ressalva é `BUG-QA-BE09-01` (baixa severidade, lacuna de **cobertura
  de teste** de middleware para `/api/log-auditoria`; o comportamento
  real já foi confirmado correto empiricamente pelo próprio QA via
  `curl` direto) — não é um achado de segurança de comportamento, não
  reclassificado aqui além da confirmação independente da Seção 62.
  `BE-16` tratada como parte de L5 pelo mesmo critério já usado por QA
  (Seção 12 do `QA-REPORT.md`: sua própria linha em `TASK.md` marca
  `Lote: L5`, e `FE-06`/`FE-07` dependem dela).
- **Referências**: `SDD.md` Seção 7.2 (RN-12, autorização binária),
  `GUARDRAILS.md` regras 8 (ledger append-only), 10, 18 (log de
  auditoria nunca com campo de autor), 20 (log de anonimização só com
  marcadores redigidos), `API-CONTRACT.yaml` v0.12.0
  (`CorrigirParticipacaoBody`/`LogAuditoriaItemResponse`/
  `RodadaDetalheResponse`), `QA-REPORT.md` Seção 16.
- **Código lido linha a linha**: `src/modules/rodadas/{corrigir,
  excluir,detalhar,listar,simular-correcao,presenter}.ts`,
  `src/modules/auditoria/{repository,presenter,validation}.ts`,
  `app/api/rodadas/[id]/route.ts` (`GET`/`DELETE`), `app/api/rodadas/
  [id]/participacoes/[atletaId]/route.ts` (`PATCH`), `app/api/rodadas/
  [id]/participacoes/[atletaId]/simular-correcao/route.ts` (`POST`),
  `app/api/log-auditoria/route.ts`, `supabase/migrations/
  20260903130000_create_excluir_rodada_function.sql`,
  `20260903130100_create_corrigir_participacao_rodada_function.sql`,
  `20260903140000_create_calcular_correcao_participacao_rodada_function.sql`,
  `src/features/historico/*`, `src/features/correcao-rodada/*`,
  `src/features/log-auditoria/*` (com atenção dedicada a
  `entryPresenter.ts#montarDiffAnonimizacao`, ver Seção 63).
- **Comandos executados diretamente**: `Grep` para `console\.(log|error
  |warn|debug)` em `src/modules/rodadas`, `src/modules/auditoria`,
  `app/api/rodadas`, `app/api/log-auditoria`, `src/features/historico`,
  `src/features/correcao-rodada`, `src/features/log-auditoria` — **zero
  ocorrências**; `Grep` para `dangerouslySetInnerHTML` — zero
  ocorrências (global, Seção 39); leitura de `middleware.ts` (confirma
  `/api/rodadas`/`/api/log-auditoria` em
  `INTERNAL_READ_PROTECTED_PREFIXES`, reforça a verificação empírica já
  feita pelo QA via `curl`) para avaliar de forma independente
  `BUG-QA-BE09-01`, já que trata de proteção de sessão.
- **CTO-REVIEW.md**: presente e lido novamente. Nenhum achado
  estratégico novo deste lote.
- **API-CONTRACT.yaml**: presente, v0.12.0. Conferido campo a campo
  contra `paraLogAuditoriaResponse`/`paraRodadaDetalheResponse` —
  nenhum campo de autor, nenhum campo não documentado.
- **Não repetido nesta rodada**: as 5 skills completas sobre L0/L1/L2/
  L3/L4/L6.

## 60. Achados críticos do Lote L5 (bloqueiam deploy)

Nenhum.

## 61. Achados de alta severidade do Lote L5 (bloqueiam deploy)

Nenhum.

## 62. `security-requirement-validation` — achados de média/baixa severidade do Lote L5

Nenhum achado novo de segurança neste lote. Verificações relevantes:

- **Reversão de 100% dos pontos, ledger append-only
  (`GUARDRAILS.md` regra 8, `app.excluir_rodada`)**: confirmado por
  leitura — para cada atleta afetado, um novo `lancamento_pontos`
  (`origem='estorno'`) com `pontos_delta` = negativo da soma líquida já
  gravada (soma de **todos** os lançamentos daquele atleta+rodada, não
  só o original — cobre também o caso de uma rodada já corrigida antes
  de ser excluída); o lançamento original nunca é alterado/removido.
  Reentrada numa rodada já `excluida` é recusada (`errcode='RD001'`),
  não gera segundo conjunto de estornos.
- **"Aplica só a diferença" (`app.corrigir_participacao_rodada`)**:
  confirmado — o total "antes" é a soma líquida de todos os
  lançamentos já gravados (cobre correções sobre correções anteriores);
  o `pontos_delta` do novo lançamento é exatamente `novo_total -
  total_ja_liquido`, inclusive quando a diferença é zero (RN-07:
  "toda correção gera log, inclusive correções triviais"). Cálculo
  sempre lido de `configuracao_pontuacao` vigente **na data da
  rodada**, nunca "agora" — neutraliza exatamente o método de cálculo
  original.
- **Preview e escrita real compartilham o mesmo cálculo por
  construção**: confirmado que `app.corrigir_participacao_rodada` foi
  redefinida (`CREATE OR REPLACE FUNCTION`) para delegar a
  `app.calcular_correcao_participacao_rodada`, o mesmo helper que
  `app.simular_correcao_rodada` (`BE-10`) usa — divergência entre
  preview e gravação real estruturalmente impossível, não apenas
  testada por coincidência.
- **`GRANT EXECUTE` das 4 funções (`excluir_rodada`,
  `corrigir_participacao_rodada`,
  `calcular_correcao_participacao_rodada`, `simular_correcao_rodada`)
  restrito a `service_role`**: confirmado por leitura de todas as
  migrations; todas declaram `set search_path = app, pg_temp`.
- **RN-12 (log sem campo de autor)**: confirmado estruturalmente — nem
  `excluir_rodada` nem `corrigir_participacao_rodada` gravam nenhuma
  coluna de autoria (a própria tabela `log_auditoria`, `BE-02`, não tem
  essa coluna); `src/modules/auditoria/repository.ts`/`presenter.ts`
  nunca selecionam/expõem um campo de autor porque ele não existe.
- **`BUG-QA-BE09-01` (verificação independente do DevSecOps, além do
  que o QA já reproduziu)**: confirmado por leitura direta de
  `middleware.ts` que `/api/log-auditoria` está em
  `INTERNAL_READ_PROTECTED_PREFIXES` — o comportamento é estruturalmente
  correto; concordo com a classificação do QA (lacuna de **cobertura de
  teste automatizado**, não de comportamento real, severidade Baixa,
  sem prazo formal) — não reclassificado, não é um achado de segurança
  ativo, apenas uma lacuna de regressão futura. Recomendo ao Backend
  fechar essa lacuna de teste na mesma janela do próximo ajuste de
  `middleware.test.ts`, mas não elevo a severidade.
- **`console.*`/`dangerouslySetInnerHTML`**: zero ocorrências.

**Conclusão**: nenhum achado novo de severidade alta/crítica nem de
média/baixa neste lote (além da reconfirmação, não reclassificação, de
`BUG-QA-BE09-01`, que já pertence ao domínio do QA).

## 63. `sensitive-data-exposure-check` — conclusão dedicada (Lote L5)

- **`log_auditoria` — reforço de defesa em profundidade contra
  vazamento de dado pessoal redigido, verificado de forma independente**:
  releitura própria (não apenas aceite do relato do QA) de
  `src/features/log-auditoria/entryPresenter.ts#montarDiffAnonimizacao`
  confirma que uma linha "antes" só é montada para uma chave quando
  `valores_antes[chave]` é **exatamente** o literal `"[REDACTED]"` — o
  valor efetivamente renderizado é sempre o texto fixo `"Dado
  redigido"`, nunca `valores_antes[chave]` em si. Modo de falha
  fechado: mesmo que o Backend um dia gravasse acidentalmente um dado
  pessoal real em `valores_antes`, esta tela nunca o renderizaria —
  confirma, por leitura de código (não apenas o teste automatizado que
  o QA já reexecutou), que a garantia é estrutural do lado do Frontend
  também, não só do Backend.
- **`GET /api/log-auditoria`/`GET /api/rodadas*`**: nenhum campo de
  `contato`/`data_nascimento` circula em nenhuma resposta deste lote —
  confirmado por leitura de todos os `.select(...)` de
  `src/modules/auditoria/repository.ts` e
  `src/modules/rodadas/repository.ts` (`buscarApelidosAtletas` seleciona
  só `id, apelido_exibicao`).
- **Mensagens de erro**: `404`/`409` usam mensagens de negócio fixas
  derivadas de `errcode` (`P0002`→404, `RD001`→409, `RD002`→404),
  nunca a mensagem bruta de exceção do Postgres — confirmado por
  leitura de todos os `route.ts` deste lote.
- **`console.*`**: zero ocorrências.

**Conclusão desta seção**: nenhum achado de exposição de dado sensível
no Lote L5 — reforça, por verificação independente, a mesma conclusão
já alcançada pelo QA para o ponto mais sensível deste lote
(`DiffViewer` de anonimização).

## 64. `compliance-validation` — LGPD (nível de implementação, escopo Lote L5)

- **RN-12 (nenhuma identidade individual)**: confirmado estruturalmente
  — ausência de coluna de autor no schema, não apenas convenção de
  aplicação (Seção 62).
- **Minimização de dados**: nenhum campo pessoal novo equivalente a
  `contato`/`data_nascimento` foi adicionado a nenhuma tabela deste
  lote.
- **Compatibilidade com o direito à anonimização (`SDD.md` 7.7)**: o
  log de correção/estorno (`BE-09`) grava `status`/`eventos`/pontos —
  nunca um campo que seria afetado pela anonimização de um atleta (o
  `entryPresenter.ts` só aplica o modo de redação especial quando
  `tipo_evento = 'anonimizacao'`, confirmado por leitura); um atleta já
  anonimizado que aparece num log de correção antigo continua sendo
  referenciado só por `atleta_id`, resolvido para exibição via
  `apelido_exibicao` (já sobrescrito para o placeholder estável pela
  própria anonimização, `BE-07`) — nenhum dado pessoal residual
  vazando por essa via.
- **Conclusão desta seção**: nenhum achado de compliance obrigatório em
  aberto no escopo do Lote L5.

## 65. Requisitos de segurança operacional para o DevOps (Lote L5)

Nenhum item novo específico deste lote além dos já vigentes — nenhuma
dependência nova, nenhuma rota pública nova. Reforço não-bloqueante:
`BUG-QA-BE09-01` (Seção 62) é uma lacuna de cobertura de teste do
Backend, não uma ação de infraestrutura do DevOps.

## 66. Checklist de "Pronto" do Lote L5 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 60-61).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 64).
- [x] Todo achado de baixa/média severidade registrado como débito —
      nenhum achado de segurança novo neste lote; `BUG-QA-BE09-01`
      (QA, cobertura de teste) reconfirmado sem reclassificação;
      `DEBT-01`/`02`/`04` (herdados) reconfirmados sem mudança.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 65 (nenhum item novo).
- [x] Achado de relevância estratégica sinalizado ao CTO — nenhum
      achado técnico deste lote exige decisão de negócio.

## 67. Veredito

## **Lote L5 (BE-09, BE-10, BE-16, FE-06, FE-07, FE-08): APROVADO**

A auditoria completa das 5 skills sobre as 6 tarefas do Lote L5 **não
encontrou nenhum achado de segurança novo** — nem crítico, nem alto,
nem de média/baixa severidade. A reversão de 100% dos pontos via
`app.excluir_rodada` (soma líquida de todos os lançamentos, não só o
original) e a aplicação de "só a diferença" via
`app.corrigir_participacao_rodada` (mesma régua de vigência de
`configuracao_pontuacao` na data da rodada) foram confirmadas por
leitura linha a linha das 3 funções PL/pgSQL novas deste lote, todas
com `GRANT EXECUTE` restrito a `service_role` e `search_path`
explícito. O preview de correção (`BE-10`) compartilha o mesmo cálculo
da escrita real por construção (`CREATE OR REPLACE FUNCTION`
delegando ao mesmo helper), tornando divergência estruturalmente
impossível. O modo de falha fechado do `DiffViewer` de anonimização
(`FE-08`) foi reverificado de forma independente por este agente, não
apenas aceito do relato do QA.

**`BUG-QA-BE09-01`** (achado do QA, lacuna de cobertura de teste
automatizado para `/api/log-auditoria` em `middleware.test.ts`) foi
reconfirmado por este agente como comportamento real correto (leitura
direta de `middleware.ts`) — concordo com a classificação do QA
(Baixa, não é achado de segurança ativo), não reclassificado.

**Sinalização ao CTO**: nenhum achado técnico deste lote exige decisão
de negócio.

**Lote L5 está liberado para o Tech Lead** (`EXECUTION-FLOW.md` §5) —
nenhum achado alta/crítica em aberto, nenhum achado de compliance
obrigatório não resolvido, nenhum débito de segurança novo.

## 68. Entrada correspondente em `BLOCKERS.md`

Nenhuma entrada nova necessária.

---

## 69. Resumo consolidado — Fechamento retroativo de L2, L3, L4 e L5 (2026-09-04)

| Lote | Tarefas | Veredito de DevSecOps | Achado de segurança novo |
|---|---|---|---|
| **L2** — Ranking e Presença Pública | `BE-03`, `FE-02`, `FE-03` | **Aprovado** | Nenhum. `DEBT-03` (CSP) confirmado resolvido nesta auditoria. |
| **L3** — Cadastro de Atletas | `BE-06`, `BE-07`, `FE-04` | **Aprovado com débito registrado** | `DEBT-10` (novo, Média, não-bloqueante) — `contato`/`data_nascimento` sem redação em `sessionStorage` ao expirar sessão em `AtletaForm`. |
| **L4** — Lançamento de Rodada | `BE-08`, `FE-05` | **Aprovado** | Nenhum. |
| **L5** — Correção, Histórico e Auditoria de Rodadas | `BE-09`, `BE-10`, `BE-16`, `FE-06`, `FE-07`, `FE-08` | **Aprovado** | Nenhum (`BUG-QA-BE09-01` é achado de QA, cobertura de teste, reconfirmado não-reclassificado). |

**Nenhum dos 4 lotes foi bloqueado.** Nenhum achado de severidade
alta/crítica em nenhuma das 13 tarefas auditadas nesta sessão. Nenhum
achado de compliance obrigatório em aberto em nenhum dos 4 lotes.

**Achado transversal mais relevante desta sessão — sinalização formal ao
CTO e ao DevOps (paralela, registro; não pré-requisito de nenhum dos 4
vereditos acima, todos já liberados pela via técnica que este agente tem
autoridade de decidir sozinho)**:

`DEPLOY.md` (reconciliação de 2026-09-04) revelou que **um deploy real de
produção já aconteceu**, fora do fluxo governado deste pipeline, antes de
qualquer um destes 4 lotes ter recebido veredito agregado de QA ou
auditoria completa de DevSecOps. Isso muda a leitura de dois débitos
herdados registrados com prazo "antes do primeiro deploy de produção"
(Seção 3 deste documento):

1. **`DEBT-03` (CSP ausente)** — **resolvido** nesta mesma janela (2026-09-04,
   DevOps): `vercel.json` já publica uma política real, coerente com as
   origens de fetch que `L2` de fato usa. Confirmado por leitura direta
   nesta auditoria (Seção 35). Pendente apenas confirmação operacional
   (fora do escopo de código) de que a política está ativa no deploy real,
   não só commitada.
2. **`DEBT-04` (advisories residuais de `next@14.2.35`)** — **prazo já
   ultrapassado sem reverificação dedicada**: o próprio `DEPLOY.md`
   (Seção 10, item 5) registra que isso "não foi verificado nesta
   reconciliação... fora do escopo desta correção pontual". A análise de
   aplicabilidade original (Seção 3 deste documento) permanece
   tecnicamente válida — nenhuma advisory da classe CWE-285/863 foi
   identificada por este agente em nenhuma das 4 reconfirmações feitas
   nesta sessão (Seções 35/45/55/65) — mas o **processo** de reavaliação
   automática que o prazo deveria ter disparado não ocorreu antes do
   deploy real acontecer. **Recomendação formal**: DevOps/Backend
   reexecutar `npm audit --json` contra o estado atual do `package.json`
   como item de checklist explícito antes do próximo deploy de produção
   (mesmo requisito já registrado na Seção 4, item 7, agora com urgência
   maior por a produção já estar ativa), e o CTO considerar isso no
   planejamento de roadmap de migração `next@15`/`16` já sinalizado
   desde `DEBT-04` original.

Este achado é de **natureza processual/de cronograma**, não um novo
achado de segurança de código — nenhum dos 4 lotes auditados nesta sessão
introduziu a condição (ela já existia desde L0/L1); a auditoria destes 4
lotes apenas expôs, pela primeira vez desde a descoberta do deploy real em
`DEPLOY.md`, que o cronograma de reavaliação de débitos "antes de
produção" precisa de um dono explícito e um gatilho automático (mesma
lição já registrada na Seção 19 deste documento, sobre a reavaliação
atrasada de `DEBT-01` — este é o mesmo tipo de gap de governança,
recorrendo pela segunda vez). Recomendo ao Tech Lead/CTO considerar
formalizar um gatilho automático (ex.: `deploy-report-drafting` sempre
reexecuta `npm audit --json` e compara contra `SECURITY-REVIEW.md` antes
de qualquer deploy real, não apenas simulado) para que isso não dependa
de descoberta manual novamente.

**Débitos herdados (`DEBT-01`, `DEBT-02`, `DEBT-04`) reconfirmados em
todos os 4 lotes** (Seções 35/45/55/65) — nenhuma dependência nova
introduzida por nenhuma das 13 tarefas, nenhuma mudança de
classificação de severidade além do exposto acima para `DEBT-04`
(cronograma, não severidade) e da resolução de `DEBT-03`.

---

## 70. Contexto e Método — Lote RD0 (Fundação do Redesenho, Iniciativa "Redesenho Visual", Parte II do `TASK.md`)

**Gatilho**: `QA-REPORT.md` Seção 18 — Lote RD0 (`FE-R00` + `FE-R12`) aprovado
com ressalvas em 2026-09-05 (dois débitos de baixa severidade, ambos de
comentário/documentação, nenhum de código de produto). Por `TASK.md` Seção
3.0/4.1, este é o **primeiro lote da Parte II a fechar** e é pré-condição de
**merge** (não de desenvolvimento) para todos os lotes `RD1`-`RD4` seguintes
— esta auditoria libera, portanto, também esse gate de merge do lado da
segurança, não apenas o veredito das duas tarefas em si.

**Referências de arquitetura/governança usadas como contra-o-quê-auditar**:
`SDD.md` Seção 7 (a Seção 7 em si não tem requisito específico de design
system/tokens — este lote não toca autenticação, autorização, criptografia
de dado ou superfície de exposição pública descritas ali; usado como
confirmação negativa, não como checklist positivo), `GUARDRAILS.md` Seção 10
(regras 37-40, extraídas do Gate 2/3 do CTO desta iniciativa — as regras
efetivamente aplicáveis a uma mudança de fundação de design system),
`TASK.md` Parte II Seções 1.1-R (fontes/CSP), 1.2-R (substituição atômica),
1.5-R (contraste), 1.6-R (asset de marca) e 6.2-R item 4 (estrutura exata dos
2 commits). `CTO-REVIEW.md` consultado (Gate 2/Gate 3 da iniciativa,
2026-09-04) — nenhuma condição de execução do CTO pendente relacionada a
segurança além das já incorporadas literalmente nas regras 37-40 do
`GUARDRAILS.md`; seguido como contexto, sem achado divergente.
`API-CONTRACT.yaml` não se aplica a este lote (nenhuma tarefa de `RD0` toca
API/payload — confirmado, ver Seção 72) — sinalizado, não uma ausência que
limite a auditoria.

**Método**: mesmo rigor dos fechamentos anteriores — nenhuma alegação do
Frontend ou do QA aceita sem verificação direta. Reexecutados/conferidos
nesta auditoria, de forma independente: `git show --stat`/`git diff` nos 2
commits do lote (isolamento estrutural), `git diff` de `vercel.json` e de
`package.json`/`package-lock.json` contra o estado anterior ao lote, leitura
linha a linha de `tokens.css`, `Icon.tsx`, `BrandCrest.tsx`, `AppNav.tsx`/
`.module.css`, `app/layout.tsx`, `grep` recursivo por referências ao asset
real de marca e por `fonts.googleapis.com`/`fonts.gstatic.com` em todo
`app`/`src`, e inspeção direta do **build de produção já gerado localmente**
(`.next/static/css/*.css`, `.next/static/media/*.woff2`) para confirmar
tecnicamente — não apenas aceitar a alegação do ADR-012 — que o self-host de
fonte é real e não depende de requisição de rede em runtime.

## 71. `static-security-analysis` — Lote RD0

| Verificação | Comando/método | Resultado |
|---|---|---|
| Nenhuma dependência nova via `Icon`/`BrandCrest` | `git diff 5c7bad0^ efaf297 -- package.json package-lock.json` | ✅ diff vazio — confirmado de forma independente, não apenas a alegação do Frontend de "SVG inline, sem lib nova" |
| `vercel.json`/CSP intocado | `git diff 40a6400 HEAD -- vercel.json` + leitura direta do arquivo | ✅ diff vazio; `Content-Security-Policy` atual confirma `font-src 'self'`, sem `fonts.googleapis.com`/`fonts.gstatic.com` em nenhuma diretiva (`font-src`, `style-src`, `connect-src`) — ADR-012/Seção 1.1-R satisfeitos |
| Nenhum `<link>`/`@import` para domínio de fonte do Google no código-fonte | `grep -rn "fonts.googleapis.com\|fonts.gstatic.com" app src vercel.json` | ✅ únicas 2 ocorrências são comentários explicativos em `app/layout.tsx` documentando a ausência — nenhum uso real |
| Self-host de fonte é real em runtime, não só alegação do ADR-012 | Inspeção direta de `.next/static/css/*.css` (build de produção já gerado localmente) — todas as declarações `@font-face` das 3 fontes (`__Public_Sans_*`, `__Bebas_Neue_*`, `__JetBrains_Mono_*`) | ✅ **11 arquivos `.woff2` self-hospedados** em `.next/static/media/`, todo `src: url(...)` de `@font-face` aponta para `/_next/static/media/<hash>.woff2` (origem própria) — **zero** referência a domínio externo em qualquer `@font-face` gerado. Confirma tecnicamente, por evidência de artefato de build, que a integração `next/font/google` é 100% build-time; nenhuma requisição de rede a domínio de terceiro ocorre no navegador em produção |
| Bebas Neue realmente só tem peso 400 no pacote instalado | Confirmação independente das 2 declarações `@font-face` de `__Bebas_Neue_*` no CSS gerado (ambas `font-weight:400`) | ✅ bate com a checagem do Frontend/QA no manifesto do `next/font/google` (Seção 1.1-R) |
| Isolamento estrutural dos 2 commits (Guardrail 38) | `git show --stat 5c7bad0` / `git show --stat efaf297` (reexecutado, não aceito do relato) | ✅ commit 1: só `app/layout.tsx` (fontes) + `src/design-system/tokens.css` — nenhum arquivo de tela/composição; commit 2: só `Icon`/`BrandCrest`/integração pontual em `AppNav` (2 linhas de JSX + CSS) + vitrine interna `app/dev/design-system/page.tsx` — nenhum consumidor de tela de produto |
| Nenhum mecanismo de theming/feature-flag de paleta (Guardrail 31/37) | Leitura completa de `tokens.css` | ✅ um único bloco `:root`; nenhum `[data-theme]`/`prefers-color-scheme` aplicado à paleta de marca; nenhum arquivo de token paralelo |
| `npm audit` — dependências de terceiros | `npm audit --omit=dev` reexecutado nesta data | Reconfirma **`DEBT-04`** (herdado, inalterado): 2 advisories de severidade alta em `next@14.2.35`/`postcss` transitivo (SSRF/cache poisoning/DoS em Next.js, XSS/path traversal em PostCSS), correção exige upgrade major (`next@16`) já sinalizado como roadmap ao CTO em auditorias anteriores (Seção 69). **Não é um achado novo de `RD0`** — `package.json`/`package-lock.json` não foram tocados por nenhum dos 2 commits deste lote (verificado acima), então a superfície de dependências é idêntica à já avaliada e aceita nas auditorias de L2-L5 |
| Varredura de segredo/credencial hardcoded nos arquivos novos | Leitura de `Icon.tsx`, `BrandCrest.tsx`, `tokens.css`, `app/layout.tsx` (nenhum destes arquivos tem qualquer motivo estrutural para conter segredo — são tokens visuais/SVG/config de fonte) | ✅ nenhuma ocorrência |

**Conclusão desta seção**: nenhum achado de segurança novo introduzido pelo
código deste lote. `DEBT-04` (dependências) reconfirmado sem mudança de
severidade/escopo — não atribuível a `RD0`.

## 72. `security-requirement-validation` — Lote RD0

`SDD.md` Seção 7 não define requisito específico para design
system/tokens/fontes (autenticação, autorização, criptografia e superfície
de exposição pública — 7.1 a 7.5 — não são tocados por este lote: nenhuma
rota de API, nenhuma tabela, nenhum fluxo de sessão foi alterado). Auditoria
desta seção, portanto, confirma **ausência de violação**, contra
`GUARDRAILS.md` Seção 10 (as regras efetivamente aplicáveis a este tipo de
mudança):

- **Guardrail 37/1.2-R (evento atômico, sem coexistência de tema)**:
  satisfeito — verificado por leitura direta de `tokens.css` (Seção 71), um
  único `:root`, sem tema paralelo. O tema escuro presente no CSS do mockup
  real (`UX-SPEC.md` Seção 2.0) não foi portado — confirmado por ausência de
  qualquer seletor `[data-theme]`/`prefers-color-scheme` no arquivo.
- **Guardrail 38/1.2-R (commit isolado, sem mistura de composição de tela)**:
  satisfeito — verificado por `git show --stat` reexecutado de forma
  independente (Seção 71), não apenas aceito da mensagem de commit.
- **Guardrail 39/1.2-R (`accessibility-review` completo pré-merge, gate
  duro)**: satisfeito — o QA já recalculou de forma independente os 13
  pares de contraste WCAG citados em `tokens.css` (`QA-REPORT.md` 18.1.3),
  incluindo as duas proibições de contraste da Seção 1.5-R (dourado como
  texto sobre claro: 1,96:1, reprova; verde padrão sobre navy: 2,45:1,
  reprova). Este agente reconfirma que essas duas proibições são
  **estruturalmente reforçadas no próprio componente**, não apenas
  documentadas: `Icon` usa `stroke="currentColor"` (nunca fixa cor própria,
  Seção 71/leitura de `Icon.tsx`) e nenhum componente usa hex hardcoded fora
  de `tokens.css` (achado do QA, não recalculado por este agente por não ser
  achado de segurança primário, mas consistente com a leitura própria de
  `Icon.tsx`/`BrandCrest.tsx`, ambos 100% `var(--color-...)`). Nenhuma
  violação bloqueante de acessibilidade tem, neste caso, um componente de
  segurança real além do já coberto pelo QA — WCAG 1.4.11/1.4.3 são
  requisitos de usabilidade/inclusão, não de confidencialidade/integridade;
  citados aqui apenas para confirmar que o gate duro da Guardrail 39 foi de
  fato executado antes do merge, condição de execução do próprio Gate 2 do
  CTO desta iniciativa.
- **Guardrail 40 (reestimativa formal quando fundação já consumida por
  tarefa fechada)**: não aplicável neste sentido de auditoria de segurança —
  é um guardrail de processo do Tech Lead (`TASK.md` Seção 3.2 já registra a
  reestimativa linha a linha de `FE-00`-`FE-12`, confirmada presente por
  leitura da própria tabela). Nenhuma implicação de segurança.
- **1.1-R (fontes/CSP)**: satisfeito, verificado tecnicamente (Seção 71), não
  apenas por alegação.
- **1.6-R (asset de marca, bloqueio de merge do asset real)**: satisfeito —
  ver Seção 73 (tratado com o mesmo rigor de uma checagem de superfície de
  dado, já que a preocupação de fundo é direito de uso de terceiro, adjacente
  a compliance).
- **API-CONTRACT.yaml**: não aplicável — nenhuma tarefa de `RD0` cria/altera
  endpoint ou payload de API (confirmado por ausência total de arquivo em
  `app/api/**` no diff dos 2 commits, Seção 71).

**Conclusão desta seção**: nenhum requisito de arquitetura de segurança
violado; nenhum requisito da Seção 7 do `SDD.md` é sequer tocado por este
lote (confirmação negativa, esperada para uma mudança de fundação puramente
visual).

## 73. `sensitive-data-exposure-check` — conclusão dedicada (Lote RD0)

Este lote é, por natureza (tokens de design/tipografia/2 componentes
puramente visuais), o de menor superfície possível para este checklist —
confirmado, não apenas presumido:

- **Nenhum campo de dado de usuário/atleta é lido, exibido ou logado** por
  `tokens.css`, `Icon.tsx`, `BrandCrest.tsx`, `app/layout.tsx` ou pela
  integração em `AppNav.tsx` — todos os 5 arquivos/pontos de mudança operam
  exclusivamente sobre valores estáticos (hex, SVG path, string de marca fixa
  `"Grupo Rola Futebol"`, que já não é dado sensível, é o próprio nome
  público do grupo).
- **Asset de marca real (`logo.jpg`)**: confirmado por `grep -rn "logo\.jpg"`
  em `app`/`src` que as únicas 4 ocorrências são comentários explicativos
  (`BrandCrest.tsx` ×3, `app/dev/design-system/page.tsx` ×1) — **nenhum
  `import`/`<Image src=...>`/referência de código executável** ao arquivo
  real. `BrandCrest.tsx` renderiza exclusivamente um `<svg>` geométrico
  autoral (`fill="var(--color-brand-navy)"`), reconfirmado por leitura direta
  do componente inteiro (não apenas grep). `public/brand/` não existe ainda
  no repositório (`ls public/brand` vazio) — nenhum asset foi migrado,
  consistente com a pendência de confirmação de direito de uso ainda em
  aberto (Seção 1.6-R/Seção 4.3 do `TASK.md`). **O bloqueio de merge da
  Seção 1.6-R não foi violado**: nada que dependa dessa confirmação foi
  mesclado em `main`.
- **`console.*`/logs**: zero ocorrências nos 5 arquivos/pontos de mudança
  deste lote (nenhum motivo estrutural para logging em componentes puramente
  de apresentação).
- **`app/dev/design-system/page.tsx`**: observação de escopo, não achado
  deste lote — esta rota é **pré-existente de `FE-00`** (não criada por
  `RD0`; `RD0` apenas acrescentou 2 seções de vitrine para `Icon`/`BrandCrest`
  ao arquivo já existente) e não expõe dado de usuário real (é uma vitrine de
  componentes com dados de exemplo hardcoded — `presenca`, `gols` como
  `useState` local, nunca uma chamada de API real). Não fazia parte do
  escopo de nenhuma auditoria de DevSecOps anterior (busca em todo o
  histórico deste documento não encontra menção prévia a esta rota). Sem
  autenticação/gate de ambiente aparente, ela seria acessível publicamente
  se o deploy de produção servir literalmente a árvore `app/` sem exclusão
  desta rota — **registrado como requisito operacional ao DevOps na Seção
  75** (não bloqueante: nenhum dado sensível trafega por ela, é exposição de
  informação de baixo valor — estrutura interna do design system — não de
  dado pessoal ou segredo).

**Conclusão desta seção**: nenhum achado de exposição de dado sensível de
severidade alta/crítica ou média neste lote. Um item operacional de baixo
risco registrado ao DevOps (rota de vitrine interna sem gate de ambiente
confirmado).

## 74. `compliance-validation` — LGPD (nível de implementação, escopo Lote RD0)

Não aplicável de forma substantiva — este lote não trata dado pessoal em
nenhum grau (nenhuma tabela, nenhum campo de atleta, nenhuma base legal
envolvida). Confirmação negativa, pelo mesmo motivo já registrado na Seção
72 para `SDD.md` Seção 7: `tokens.css`/`Icon`/`BrandCrest`/fontes não
processam, armazenam nem exibem dado de titular algum.

O único ponto adjacente a compliance neste lote é a **governança de direito
de uso de imagem/marca** (`logo.jpg`, Seção 1.6-R) — não é LGPD (não é dado
pessoal de titular, é ativo de marca do grupo), mas tratado com o mesmo
rigor por analogia de "compliance obrigatório não vira débito": confirmado
na Seção 73 que nenhuma referência de código ao asset real foi mesclada,
logo **não há violação a resolver nem débito a registrar** — a pendência em
si (confirmação de PM+stakeholder) já está corretamente registrada como
bloqueio de **merge futuro** em `TASK.md` Seção 1.6-R/4.3, não uma questão
de código deste lote.

**Conclusão desta seção**: nenhum achado de compliance obrigatório em aberto
no escopo do Lote RD0.

## 75. Requisitos de segurança operacional para o DevOps (Lote RD0)

- Nenhuma dependência nova, nenhuma rota de API nova, nenhuma variável de
  ambiente nova introduzida por este lote — nenhuma ação de secrets/rede
  específica de `RD0`.
- **Novo item, baixo risco, não bloqueante**: confirmar se a rota
  `/dev/design-system` (vitrine interna do design system, pré-existente de
  `FE-00`, estendida por `RD0`) está de fato acessível no domínio de
  produção real hoje e, se estiver, avaliar se deve ser removida do build de
  produção (ex.: guardada atrás de `NODE_ENV !== "production"` ou excluída
  via `next.config`) antes do lançamento público mais amplo do redesenho
  (`RD1`-`RD4`). Não é uma exposição de dado sensível (Seção 73) — é uma
  boa prática de minimização de superfície (não publicar ferramentas
  internas de QA/dev em produção), sem prazo formal por não ser achado de
  severidade média/alta.
- Reforço, herdado e inalterado por este lote: `DEBT-04` (advisories de
  `next@14.2.35`/`postcss`, Seção 71) continua com o mesmo prazo/dono já
  registrado (roadmap de migração `next@15`/`16`, CTO) — nenhuma mudança de
  urgência atribuível a `RD0`.

## 76. Checklist de "Pronto" do Lote RD0 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seção 71-73).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido — nenhum
      achado desta classe identificado (Seção 74); governança de asset de
      marca (não-LGPD, mas tratada com o mesmo rigor) sem violação (Seção 73).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo de correção — nenhum achado de **segurança** novo neste lote;
      `BUG-QA-RD0-01`/`BUG-QA-RD0-02` (QA, ambos de comentário/documentação)
      reconfirmados **sem componente de segurança real** (Seção 73/74,
      confirmação direta: nenhum dos dois altera controle de acesso,
      exposição de dado ou criptografia); item operacional de baixo risco
      novo registrado ao DevOps, sem prazo formal (Seção 75); `DEBT-01`/`02`/
      `04` (herdados) reconfirmados sem mudança.
- [x] Requisitos de segurança operacional definidos para o DevOps — Seção 75.
- [x] Achado de relevância estratégica sinalizado ao CTO — **nenhum achado
      técnico deste lote exige decisão de negócio nova**. A única pendência
      adjacente a estratégia (confirmação de direito de uso de `logo.jpg`,
      Seção 1.6-R) já é de conhecimento do CTO/PM desde o Gate 2/3 desta
      iniciativa (`CTO-REVIEW.md`) — esta auditoria apenas **reconfirma**,
      como registro paralelo, que o código mesclado respeita esse bloqueio
      de merge; não é uma escalação nova.

## 77. Veredito

## **Lote RD0 (FE-R00, FE-R12): APROVADO**

Nenhum achado de severidade alta/crítica. Nenhum achado de compliance
obrigatório em aberto. Nenhuma dependência nova (`package.json`/
`package-lock.json` intocados). `vercel.json`/CSP intocado, verificado por
diff direto, não por alegação — Seção 1.1-R/ADR-012 satisfeitos. Self-host
de fonte confirmado tecnicamente real via inspeção do build de produção já
gerado (todo `@font-face` aponta para origem própria, `.next/static/media/`)
— não apenas a alegação do ADR-012. Isolamento estrutural dos 2 commits
(Guardrail 38) e ausência de mecanismo de theming (Guardrail 37)
reconfirmados por `git show`/`git diff` diretos. Nenhuma referência de
código ao asset real de marca (`logo.jpg`) foi mesclada — bloqueio de merge
da Seção 1.6-R respeitado; `BrandCrest` usa exclusivamente placeholder SVG
autoral. Os dois débitos de baixa severidade do QA
(`BUG-QA-RD0-01`/`BUG-QA-RD0-02`) foram reavaliados de forma independente
por este agente e **confirmados sem nenhum componente de segurança real**
— são, respectivamente, uma imprecisão de comentário matemático em token não
alterado por este lote e uma citação de seção incorreta em nota de
conclusão de processo; nenhum dos dois afeta controle de acesso, exposição
de dado ou criptografia.

**Único item novo registrado por este agente** (baixo risco, não
bloqueante, sem prazo formal): confirmar/restringir o acesso em produção da
rota de vitrine interna `/dev/design-system` (Seção 75) — pré-existente de
`FE-00`, não introduzida por `RD0`, mas primeira vez auditada por
DevSecOps por este agente ter tocado seus arquivos nesta sessão.

**Débito de dependências herdado (`DEBT-04`) reconfirmado sem mudança** —
não atribuível a este lote (nenhum arquivo de dependência tocado pelos 2
commits de `RD0`).

**Nenhum achado de relevância estratégica novo para o CTO.** A pendência de
governança do asset real de marca (Seção 1.6-R) já é de conhecimento do
CTO/PM desde o Gate 2/3 da iniciativa — reconfirmada respeitada nesta
auditoria, não escalada de novo.

**Encaminhamento**: por `TASK.md` Seção 3.0/4.1, esta aprovação libera, do
lado da segurança, o **gate de merge** dos lotes `RD1`-`RD4` (condicionado
também ao veredito de Tech Lead sobre este mesmo lote, ainda pendente
abaixo). Nenhuma entrada nova em `BLOCKERS.md` — nenhum achado deste lote
exige retorno ao time de implementação.

---

## 78. Resolução de `BLOCKER-008` — gate mecânico do CI vs. débito de segurança já aceito (2026-09-05)

**Gatilho**: `BLOCKERS.md`, `BLOCKER-008` (origem DevOps) — o job
`security-scan` do `CI` real (`npm audit --audit-level=high`) falha em
qualquer push a `main` com 14 vulnerabilidades (1 crítica, 9 altas, 4
moderadas), a mesma classe já rastreada como `DEBT-01`/`DEBT-02`/`DEBT-04`
neste relatório — mas o comando bruto não reconhece débito aceito, trata
tudo como falha dura.

### 78.1 Investigação independente (não aceito o rótulo herdado sem reconferir)

- **Comandos executados diretamente nesta data**: `npm audit --json`
  (íntegro), `npm audit --audit-level=high` (reproduz exatamente os 14
  achados descritos no bloqueio), `npm audit fix --dry-run` (para confirmar
  se havia correção sem breaking change disponível e não aplicada), `npm
  view next versions --json` (para confirmar se existe patch 14.2.x mais
  recente que `14.2.35`, ou stable 15.x, antes de descartar upgrade como
  "breaking change" por suposição).
- **Os 14 achados foram lidos individualmente** (não só a contagem
  agregada), com o GHSA id de cada advisory extraído do JSON bruto — ver
  tabela abaixo.
- **A 1 vulnerabilidade crítica**: `GHSA-5xrq-8626-4rwp` (`vitest`, "When
  Vitest UI server is listening, arbitrary file can be read and
  executed"). **Confirmado: não é achado novo.** É exatamente o mesmo GHSA
  id já registrado como `DEBT-01` desde 2026-09-03 (`BLOCKER-006`,
  confirmação DevSecOps) e reconfirmado em toda auditoria de lote desde
  então (Seções 9.1, 19, 35/45/55/65, 69) — nenhuma mudança de fato desde a
  última análise. Confirmado novamente nesta data que a exploração exige
  `vitest --ui` escutando localmente (`package.json`: `test` roda `vitest
  run`, `test:watch` roda `vitest` sem `--ui`; `.github/workflows/ci.yml`
  não referencia `--ui` em nenhum job) — **sem exposição em produção**, dado
  que `next build`/`next start` (o que é de fato deployado) nunca inicia o
  Vitest. Não há elevação de severidade a fazer.
- **`npm audit fix --dry-run`**: reexecutado para não aceitar de forma
  preguiçosa a alegação de "só resolve com `--force`" sem testar. O
  dry-run confirma que, apesar de `minimatch`/`@typescript-eslint/*`
  reportarem `fixAvailable: true` (sem marcação de major), a resolução real
  do `npm` não muda nenhuma versão efetiva desse subgrafo (aninhado sob
  `node_modules/@typescript-eslint/typescript-estree/node_modules/`) — os
  14 achados permanecem idênticos antes e depois do dry-run. Não há
  correção parcial "de graça" disponível hoje.
- **`npm view next versions`**: confirmado que `14.2.35` já é o último
  patch estável da série 14.2.x (não existe `14.2.36`+; a série `14.3.x`
  só tem pré-lançamentos `canary`) e que **não existe nenhuma versão
  estável `15.x` publicada** — a próxima versão estável depois de `14.2.35`
  é `16.3.4` (a mesma reportada por `fixAvailable` do `npm audit`, salto de
  dois majors). Não descartei a Opção (a) por suposição: não há upgrade
  seguro de `next` disponível hoje que elimine os achados sem ser um major
  bump de duas versões inteiras — consistente com o que `DEBT-04` já
  registrava, agora reverificado, não apenas herdado.

**Tabela dos 14 nós de dependência / 16 advisories individuais (GHSA id) de
severidade alta/crítica**, todas já cobertas por débito existente, nenhuma
nova desde a última reconfirmação (2026-09-03/09-05, Seções 9.1/19/35-65/71):

| GHSA id | Pacote | Severidade | Débito |
|---|---|---|---|
| `GHSA-5xrq-8626-4rwp` | vitest | Crítica | `DEBT-01` |
| `GHSA-fx2h-pf6j-xcff` | vite | Alta | `DEBT-01` |
| `GHSA-5j98-mcp5-4vw2` | glob | Alta | `DEBT-02` |
| `GHSA-3ppc-4f35-3m26` | minimatch | Alta | `DEBT-02` |
| `GHSA-7r86-cg39-jmmj` | minimatch | Alta | `DEBT-02` |
| `GHSA-23c5-xmqv-rm74` | minimatch | Alta | `DEBT-02` |
| `GHSA-h25m-26qc-wcjf` | next | Alta | `DEBT-04` |
| `GHSA-q4gf-8mx6-v5v3` | next | Alta | `DEBT-04` |
| `GHSA-8h8q-6873-q5fj` | next | Alta | `DEBT-04` |
| `GHSA-c4j6-fc7j-m34r` | next | Alta | `DEBT-04` |
| `GHSA-36qx-fr4f-26g5` | next | Alta | `DEBT-04` |
| `GHSA-m99w-x7hq-7vfj` | next | Alta | `DEBT-04` |
| `GHSA-89xv-2m56-2m9x` | next | Alta | `DEBT-04` |
| `GHSA-p9j2-gv94-2wf4` | next | Alta | `DEBT-04` |
| `GHSA-6g55-p6wh-862q` | postcss | Alta | `DEBT-04` |
| `GHSA-r28c-9q8g-f849` | postcss | Alta | `DEBT-04` |

Os demais 4 achados moderados (`esbuild`, `@vitejs/plugin-react`,
`@vitest/mocker`, `vite-node`) ficam abaixo do limiar `--audit-level=high`
e continuam fora do escopo do gate, como já era antes deste bloqueio.

**Reconfirmação de aplicabilidade de `DEBT-04` (produção, não dev-only)**:
reverificado por `Grep`/leitura direta nesta data, não apenas herdado:
sem diretório `pages/` nem `i18n` em `next.config.mjs` (→
`GHSA-36qx-fr4f-26g5` inaplicável), sem `"use server"` em `src`/`app` (→
`GHSA-m99w-x7hq-7vfj`/`GHSA-89xv-2m56-2m9x` inaplicáveis), sem `rewrites`
em `next.config.mjs` (→ `GHSA-p9j2-gv94-2wf4` inaplicável), sem servidor
HTTP customizado/`server.js` (→ `GHSA-c4j6-fc7j-m34r` inaplicável). Nenhuma
das 16 advisories é da classe CWE-285/863 (bypass de autorização, a mesma
de `CRIT-01`/já fechado) — todas são DoS/cache/leitura de arquivo em
cenário de build-time (PostCSS `sourceMappingURL` só processa CSS do
próprio codebase, nunca input de usuário em runtime). **Classificação
mantida**: Média para `DEBT-04`, Baixa para `DEBT-01`/`DEBT-02` — sem
mudança desde a última auditoria.

**Fecha, de passagem, a pendência processual registrada na Seção 69
("prazo de `DEBT-04` — antes do primeiro deploy de produção — ultrapassado
sem reverificação dedicada")**: esta é a reverificação dedicada que estava
pendente. Reconfirmada nesta data (2026-09-05), com produção já ativa
(`DEPLOY.md`) — nenhuma advisory nova, nenhuma elevação de severidade.

### 78.2 Decisão

**Opção (a) descartada, não por preferência, mas por inviabilidade
confirmada nesta data**: não existe patch da série 14.2.x além de
`14.2.35`, nem stable `15.x`; a única correção completa via upgrade
(`next@16.3.4`) é um salto de dois majors do App Router (mesmo raciocínio
já vale para `vitest@5`/`eslint-config-next@16`, majors de toolchain) —
migração real de arquitetura/roadmap, não algo a executar dentro da
resolução de um gate de CI. Forçá-la aqui replicaria o erro já identificado
em `BLOCKER-006`/`DEBT-01` (não impor major bump fora de uma janela de
manutenção planejada, decisão de Tech Lead, não deste agente sozinho).

**Opção (b) adotada**: o gate mecânico do CI passa a reconhecer débito de
segurança formalmente aceito, por advisory específica (GHSA id), com prazo
de revisão — sem enfraquecer a postura fail-closed para achado não
avaliado/novo:

- **`security/npm-audit-allowlist.json`** (novo): lista as 16 advisories
  acima, cada uma com `debt` (referência a esta Seção 3), `motivo`
  (resumo da análise de aplicabilidade/dev-only já documentada), `revisado_em`
  (2026-09-05) e `revisar_ate` (2026-12-05 — ~90 dias, alinhado ao próximo
  ciclo natural de reavaliação de débito de dependência deste projeto).
  **A allowlist é por GHSA id específico, nunca por nome de pacote** — uma
  advisory nova em `next`/`vitest`/`glob`/etc. que ainda não conste aqui
  continua falhando o gate, mesmo que outras advisories do mesmo pacote já
  estejam aceitas.
- **`scripts/security-audit-gate.mjs`** (novo): roda `npm audit --json`,
  extrai cada advisory alta/crítica individual e falha o processo (`exit
  1`) se: (a) o GHSA id não constar da allowlist (achado novo/não avaliado
  — fail-closed), ou (b) constar, mas `revisar_ate` já tiver vencido
  (débito expirado — força reavaliação periódica, em vez de aceitação
  permanente e silenciosa). Testado manualmente nesta data com 3 cenários:
  allowlist real (0 achados bloqueantes, `exit 0`), allowlist vazia (16
  achados bloqueantes, `exit 1`, mensagem de ação para o DevSecOps) e
  entrada expirada (`exit 1`, mensagem específica "débito expirado").
- **`.github/workflows/ci.yml`**, job `security-scan`, passo "Auditoria de
  dependências": `npm audit --audit-level=high` substituído por `node
  scripts/security-audit-gate.mjs` (mantém `npm ci` antes, inalterado).
- **Por que não usar uma ferramenta de terceiros (`audit-ci` etc.)**: evita
  introduzir uma nova dependência externa (superfície de supply-chain
  adicional, ironicamente, para um script que audita supply-chain) só para
  uma lógica de ~100 linhas sem estado; mesma filosofia de custo zero/baixa
  superfície já aplicada ao `gitleaks` (ferramenta madura, sim, mas
  `security-scan` já paga esse custo só onde uma ferramenta pronta agrega
  valor real de detecção, não onde uma allowlist simples resolve).

**Por que a decisão não precisa de aprovação prévia do CTO**: mudar o
mecanismo do gate para operacionalizar débito já aceito (não para relaxar
critério de severidade, nem para aceitar um achado novo sem triagem) é
correção técnica de processo dentro da autoridade de classificação/decisão
deste agente — o próprio `CTO-REVIEW.md`/histórico deste relatório já trata
`DEBT-01`/`DEBT-02`/`DEBT-04` como puramente técnicos, sem componente de
decisão de negócio. Não há relaxamento de postura: achado novo ou de
classe CWE-285/863 continua bloqueando por padrão, com o mesmo rigor de
antes.

**Sinalização ao CTO (paralela, registro — não pré-requisito desta
resolução)**: dois pontos levados ao radar do CTO nesta mesma data, sem
bloquear a liberação do gate: (1) confirmado que a rota de upgrade completo
de `next` pula de `14.2.x` direto para `16.x` (não existe `15.x` estável)
— o roadmap de migração major já sinalizado desde `DEBT-04` original é
uma mudança maior do que uma migração incremental 14→15→16 teria sido,
vale reforçar prioridade de planejamento; (2) reforço do padrão recorrente
de gap de governança já registrado na Seção 69 (reavaliação de débito
"antes de produção" não disparando automaticamente) — a allowlist com
`revisar_ate` agora fornece o gatilho automático que faltava (o próprio CI
falha sozinho quando o prazo vence, em vez de depender de descoberta
manual), mas o CTO/Tech Lead devem tratar o dia 2026-12-05 como um item de
calendário real, não apenas um campo em um JSON.

### 78.3 Verificação de que o gate volta a passar

`node scripts/security-audit-gate.mjs` executado nesta data contra o
estado real do repositório: `exit 0`, as 16 advisories listadas como
"aceitas como débito de segurança já triado". `npm run lint` e `npm run
format:check` confirmam que os 2 arquivos novos (`scripts/
security-audit-gate.mjs`, `security/npm-audit-allowlist.json`) não
introduzem nenhum problema de lint/formatação. Nenhum arquivo `.ts`/`.tsx`
foi tocado — `npm run typecheck`/`npm test` não são afetados por esta
mudança (confirmado por `tsconfig.json`, que só inclui `**/*.ts`/`**/*.tsx`;
o novo script é `.mjs`, fora do escopo do compilador).

### 78.4 Checklist de "Pronto" desta resolução pontual

- [x] Nenhum achado de severidade alta/crítica **novo** — confirmado, os 16
      GHSA ids já eram conhecidos e aceitos antes deste bloqueio.
- [x] Nenhum achado de compliance obrigatório envolvido — todos os 16
      achados são de disponibilidade (DoS)/leitura de arquivo em cenário
      de build, nenhum toca dado pessoal, autenticação ou autorização.
- [x] Achados de baixa/média severidade permanecem registrados como débito
      com prazo — `revisar_ate: 2026-12-05` em cada entrada da allowlist,
      espelhando os prazos já vigentes em `DEBT-01`/`DEBT-02`/`DEBT-04`.
- [x] Requisito de segurança operacional para o DevOps atualizado — Seção 4
      item 2 (recomendação original) agora implementada; nenhuma ação nova
      pendente do DevOps além de manter `npm ci` no job (inalterado).
- [x] Sinalização ao CTO registrada (Seção 78.2 acima).

### 78.5 Veredito

**`BLOCKER-008`: Resolvido.** O gate `security-scan` volta a passar sem
mascarar achado novo — `npm audit`/CI local confirmados verdes para este
job especificamente (o job `build-and-test` segue com a falha independente
de `BLOCKER-007`, formatação de `login.timing.test.ts`, não relacionada a
este bloqueio e já registrada com dono próprio). Nenhum dos 16 achados
exigiu reclassificação para bloqueante — a investigação desta data
confirma, de forma independente e não apenas herdada, que a vulnerabilidade
crítica relatada é `GHSA-5xrq-8626-4rwp`, a mesma de `DEBT-01`, dev-only,
sem exposição em produção.

---

## 79. Contexto e Método — Lote RD1 (Telas Públicas Redesenhadas: Ranking e Presença, Iniciativa "Redesenho Visual", Parte II do `TASK.md`)

**Gatilho**: `QA-REPORT.md` Seção 19 — Lote RD1 (`BE-R01` + `FE-R02` +
`FE-R03`) aprovado com ressalvas em 2026-09-05 (débito de baixa severidade,
formatação pura, `BUG-QA-RD1-01`/`BLOCKER-011`, reclassificado pelo próprio
QA como achado **Simples** na reconfirmação de 19.10), com o encaminhamento
explícito de que o lote está "elegível para seguir à auditoria do
DevSecOps". Esta é a **primeira auditoria de DevSecOps sobre este lote** —
nenhuma seção anterior deste relatório o cobre.

**Referências de arquitetura/governança usadas como contra-o-quê-auditar**:
`SDD.md` Seção 7.5 (camada de exposição pública — views/RLS, mesmo mecanismo
de `ADR-005` já usado por `BE-03`/`ranking_publico`/`presenca_mensal_publica`,
Lote L2, Seção 30-38 deste relatório); `TASK.md` Parte II Seção 6.2-R item 1
("mecanismo de exposição... usando o mecanismo de RLS+views já aprovado
(`ADR-005`) — nenhum novo ADR necessário, é a mesma classe de decisão que
`BE-03` já usou"); `GUARDRAILS.md` regras 5/6/9 (RLS `deny-by-default`,
`anon` nunca escreve, nenhuma linha de `atleta` excluída fisicamente) e
31/32/37 (reuso de componente único do design system, lacuna de detalhe vs.
estrutural, substituição atômica de tokens); `API-CONTRACT.yaml`
(`RankingPublicoRecentesItem`/`RodadaRecenteStatus`, `GET
/ranking_publico_recentes`, changelog `0.13.0`). `CTO-REVIEW.md` consultado
(Gate 2/Gate 3 da iniciativa) — nenhuma condição de execução pendente
relacionada a segurança além das já incorporadas nas regras citadas.

**Método**: mesmo rigor de `RD0` (Seção 70) e do precedente direto mais
próximo em natureza — `BE-03`/L2 (Seção 30-38), primeira vez que este
projeto expôs uma view pública curada. Nenhuma alegação do Backend/
Frontend/QA aceita sem verificação direta. Reexecutados/conferidos nesta
auditoria: leitura linha a linha da migration `20260904090000_create_
ranking_publico_recentes_view.sql` (mecanismo `ROW_NUMBER()`, `GRANT`/
`REVOKE`, ausência de `security_invoker`, comparado byte a byte contra o
padrão já aprovado de `20260902101300_create_public_views.sql`); leitura de
`rankingRecentesApi.ts`/`presencaMensalApi.ts` (allowlist de colunas
explícita, nunca `select("*")`); leitura de `RankingList.tsx`,
`PublicHomeShell.tsx`, `PresencaMensal.tsx`, `matrix.ts`, `MedalBadge.tsx`,
`PresenceDot.tsx` (varredura de `console.*`/`dangerouslySetInnerHTML` —
nenhuma ocorrência); `git diff` de `package.json`/`package-lock.json`/
`vercel.json` desde antes do commit `d81fc99` (que introduziu as 3 tarefas)
— confirmado diff vazio nos três, não apenas aceito o relato de "nenhuma
dependência nova"; reprodução independente do diff Prettier dos 7 arquivos
citados em `BUG-QA-RD1-01`/`BLOCKER-011` (não apenas aceita a classificação
"formatação pura" do QA — reexecutado `prettier` sobre o conteúdo real de
cada um dos 7 arquivos e comparado linha a linha); `npm audit --json`
reexecutado para reconfirmar `DEBT-01`/`DEBT-02`/`DEBT-04` sem mudança.

## 80. `static-security-analysis` — Lote RD1

| Verificação | Comando/método | Resultado |
|---|---|---|
| Nenhuma dependência nova introduzida por `BE-R01`/`FE-R02`/`FE-R03` | `git diff 8925bfb d81fc99 -- package.json package-lock.json` (`vercel.json` incluído) | ✅ diff vazio nos três arquivos — confirmado de forma independente, não apenas a nota de conclusão das 3 tarefas |
| `GRANT`/`REVOKE` da nova view idênticos ao padrão já aprovado | Leitura da migration `20260904090000_...sql` comparada linha a linha contra `20260902101300_create_public_views.sql` | ✅ `revoke all ... from public` explícito antes do `grant`; `grant select` apenas para `anon`/`service_role`; nenhuma tabela base recebe `GRANT` novo; nenhuma das duas views usa `security_invoker = true` — mesma decisão de design já auditada e aceita em `BE-03`/L2 (a checagem de permissão roda como o dono da view, comportamento intencional documentado no precedente, reaproveitado aqui sem alteração) |
| Mecanismo `ROW_NUMBER() OVER (PARTITION BY atleta_id ...)` corresponde exatamente ao especificado, sem lógica adicional oculta | Leitura completa da migration (74-164) | ✅ CTE `participacoes_numeradas` → `recentes_por_atleta` (corte em `posicao <= 7`) → `grupo_stats` (3 subqueries agregadas) → `select` final com `cross join`/`left join`; nenhum `select *`, nenhuma coluna fora do especificado |
| `console.*`/`dangerouslySetInnerHTML` nos 8 arquivos de produto do lote | `grep -rn "console\.\|dangerouslySetInnerHTML"` em `src/features/ranking-publico`, `src/features/presenca-mensal`, `src/components/ui/MedalBadge`, `src/components/ui/PresenceDot`, e na migration | ✅ zero ocorrências |
| Alocação de tipo/`enum` de `RodadaRecenteStatus.status` sem injeção de valor fora do domínio | Leitura de `API-CONTRACT.yaml` (linha 224-227) + `PresenceDot.tsx` (`Record<PresenceStatus, ...>` exaustivo, TypeScript recusa valor fora de `"presente" \| "ausente" \| "lesionado"` em tempo de compilação) | ✅ nenhuma superfície de valor arbitrário renderizado sem mapeamento |
| Achado de `BUG-QA-RD1-01`/`BLOCKER-011` (`npm run format:check`, 7 arquivos) não esconde mudança de comportamento/segurança | Reexecução independente: `diff` de cada um dos 7 arquivos reais contra a saída de `npx prettier <arquivo>` (não aceita a leitura do QA sem reconferir) | ✅ confirmado, arquivo a arquivo — toda diferença é quebra de linha/indentação (`RankingList.tsx`: só JSX reflow de atributos longos; `format.test.ts`/`matrix.test.ts`/`PublicHomeShell.test.tsx`/`rankingRecentesApi.test.ts`/`PresencaMensal.test.tsx`: só reflow de `expect(...)`/objeto literal; `ranking-publico-recentes.integration.test.ts`: só reflow de array/objeto de payload de teste). **Nenhuma string, token, valor de asserção, nome de coluna ou lógica muda entre o conteúdo real e a versão formatada** — confirma, do ponto de vista de segurança, que o achado é puramente cosmético, sem relevância para esta auditoria além do já registrado pelo QA |
| `npm audit` — dependências de terceiros | `npm audit --json` reexecutado nesta data | Reconfirma `DEBT-01` (crítico, dev-only, `vitest`), `DEBT-02` (baixa, toolchain de lint) e `DEBT-04` (média, `next@14.2.35`) **sem mudança de severidade/escopo** — total 1 crítica/9 altas/4 moderadas, idêntico ao já registrado; não atribuível a `RD1` (nenhum arquivo de dependência tocado pelo commit `d81fc99`, confirmado acima) |
| Varredura de segredo/credencial hardcoded nos arquivos novos | Leitura completa de `rankingRecentesApi.ts`, `presencaMensalApi.ts`, `matrix.ts`, `MedalBadge.tsx`, `PresenceDot.tsx` | ✅ nenhuma ocorrência — nenhum destes arquivos tem motivo estrutural para conter segredo (fetch usa `getAnonClient()`, já auditado em L2) |

**Conclusão desta seção**: nenhum achado de segurança novo introduzido pelo
código deste lote. `DEBT-01`/`DEBT-02`/`DEBT-04` reconfirmados sem mudança —
não atribuíveis a `RD1`. O único achado do QA sobre este lote
(`BUG-QA-RD1-01`/`BLOCKER-011`) é reconfirmado, de forma independente, como
puramente cosmético — sem componente de segurança.

## 81. `security-requirement-validation` — Lote RD1

Requisito aplicável: `SDD.md` Seção 7.5 (camada de exposição pública) +
`TASK.md` Parte II Seção 6.2-R item 1 (mecanismo de `ADR-005` reaproveitado
sem novo ADR) + `GUARDRAILS.md` regras 5/6/9.

- **Guardrail 5 (RLS `deny-by-default` em toda tabela nova)**: não aplicável
  no sentido literal — `BE-R01` não cria tabela nova, só uma view sobre
  tabelas já existentes (`app.atleta`, `app.participacao_rodada`,
  `app.rodada`), cujo RLS já foi auditado e aprovado em L2 (Seção 30-38
  deste relatório) e permanece inalterado (nenhuma migration deste lote
  toca `alter table ... enable row level security` em nenhuma tabela base).
  Confirmado por leitura completa da migration: **nenhum `alter table`
  aparece nela**, só `create view`/`revoke`/`grant`.
- **Guardrail 6 (`anon` nunca escreve)**: satisfeito — a migration só
  concede `grant select` (nunca `insert`/`update`/`delete`) à role `anon`
  na view nova, mesmo padrão de `ranking_publico`/`presenca_mensal_publica`.
- **Guardrail 9 (nenhuma linha de `atleta` excluída fisicamente)**: não
  tocado por este lote (nenhuma migration de `DELETE`/`DROP` sobre
  `app.atleta`) — a view filtra por `a.ativo = true`, que é o mecanismo já
  aprovado de exclusão lógica (`ADR-011`), não uma exclusão física nova.
- **RN-01/ADR-005 (nunca expor `contato`/`data_nascimento`)**: satisfeito —
  confirmado em 3 camadas independentes: (1) a `select` final da view
  (linhas 120-137 da migration) não referencia `contato` nem
  `data_nascimento` em nenhum ponto; (2) `RANKING_PUBLICO_RECENTES_COLUMNS`
  em `rankingRecentesApi.ts` é uma allowlist explícita de 5 colunas, nunca
  `select("*")`; (3) o teste de integração de `BE-R01`
  (`ranking-publico-recentes.integration.test.ts`) reexecutado por este
  agente exercita `select("*")` contra a chave `anon` real e afirma a
  ausência das duas colunas — a garantia real está no banco (RLS de
  `app.atleta`/GRANT restrito à view), a allowlist do Frontend é defesa em
  profundidade, não a única barreira.
- **Exclusão de atleta anonimizado/inativo (`ADR-011`) e rodada `excluida`**:
  satisfeito — a view filtra `where a.ativo = true` na `select` final e
  `where r.status = 'lancada'` na CTE de origem (exclui `excluida`
  implicitamente, por omissão do valor do enum); reconfirmado pelo teste de
  integração real (`atletaAnonimizadoId` ativo=false ausente da view,
  rodada com `status='excluida'` fora de `rodadas_recentes`), não apenas
  pela leitura estática do SQL.
- **`API-CONTRACT.yaml` incrementado, changelog registrado**: satisfeito —
  `RankingPublicoRecentesItem`/`RodadaRecenteStatus` presentes (linhas
  211-243), `GET /ranking_publico_recentes` documentado (linha 1828),
  entrada de changelog em `0.13.0` (linha 3370-3375) confirma o escopo
  exato ("Não altera nem [`ranking_publico`]" — reconfirmado por leitura,
  não truncado).
- **Reuso de componente único do design system (Guardrail 31)**:
  `PresenceDot` implementado uma única vez (`src/components/ui/PresenceDot/`)
  e reutilizado por `FE-R02`/`FE-R03` sem duplicação de markup/CSS —
  relevante à superfície de auditoria porque duplicação de componente que
  renderiza dado de usuário (ainda que aqui seja só status agregado) é o
  tipo de padrão que historicamente introduz divergência de tratamento de
  a11y/dado entre cópias; não é o caso aqui.

**Conclusão desta seção**: nenhum requisito de arquitetura de segurança
violado. `RN-01`/`ADR-005` (a garantia central deste lote do ponto de vista
de segurança) satisfeito em 3 camadas, verificado contra Supabase local
real, não apenas leitura estática.

## 82. `compliance-validation` — LGPD (nível de implementação, escopo Lote RD1)

- **Minimização de dado (LGPD Art. 6, III)**: satisfeito — a view nova
  seleciona exatamente as colunas necessárias à finalidade (matriz de
  presença + 2 estatísticas de grupo), nenhuma coluna adicional de
  `app.atleta`/`app.participacao_rodada`/`app.rodada` além do estritamente
  necessário (`id`, `apelido_exibicao`, `ativo` como filtro — não exposto
  como coluna de saída —, `data`, `status`). Nenhuma coluna de identificação
  civil (`contato`, `data_nascimento`) trafega em nenhum ponto da cadeia
  banco→API→Frontend, confirmado na Seção 81.
- **Direito ao esquecimento/anonimização (LGPD Art. 18, `ADR-011`)**:
  satisfeito — a view respeita o mecanismo já aprovado (`a.ativo = true`),
  nenhum novo caminho de exposição de atleta anonimizado foi criado;
  reconfirmado pelo teste de integração real (Seção 81).
- **Nenhuma nova base legal/finalidade de tratamento introduzida**: este
  lote não coleta dado novo de titular — é uma reorganização de
  apresentação (matriz em vez de contagem agregada) sobre dado já coletado
  e já autorizado para exibição pública (Parte I, `BE-03`/`ranking_publico`
  já aprovado). `rodadas_jogadas`/`media_presenca` são estatísticas
  agregadas de grupo, sem vínculo com titular individual identificável.

**Conclusão desta seção**: nenhum achado de compliance obrigatório em
aberto no escopo do Lote RD1.

## 83. `sensitive-data-exposure-check` — conclusão dedicada (Lote RD1)

- **Camada de banco**: `select` final da view (migration, linhas 120-137)
  não referencia `contato`/`data_nascimento` — confirmado por leitura
  completa, não apenas checagem por nome de coluna isolada (também
  confirmado que nenhuma das 3 CTEs intermediárias as seleciona, o que
  eliminaria a possibilidade de vazamento indireto via `jsonb_build_object`
  com campo adicional).
- **Camada de fetch (Frontend)**: `rankingRecentesApi.ts`/
  `presencaMensalApi.ts` usam allowlist explícita de colunas
  (`RANKING_PUBLICO_RECENTES_COLUMNS`/`PRESENCA_MENSAL_COLUMNS`), nunca
  `select("*")` — mesmo padrão defensivo de `rankingApi.ts` (L2).
- **Camada de mensagem de erro**: `RankingList.tsx`/`PresencaMensal.tsx`
  capturam qualquer erro de `Promise.all`/`fetch` e emitem sempre a mesma
  mensagem genérica (`ERROR_MESSAGE`), nunca `error.message` bruto
  renderizado ao usuário — confirmado por leitura direta do bloco
  `.catch()` em ambos os arquivos; nenhum `console.error`/log de erro com
  possível conteúdo de infraestrutura (string de conexão, stack trace)
  presente em nenhum dos dois componentes.
- **Camada de armazenamento local**: nenhum dos componentes deste lote grava
  em `localStorage`/`sessionStorage`/cookie — estado é 100% `useState` em
  memória, descartado ao navegar/recarregar (mesmo padrão já usado pela
  Parte I para estas duas telas públicas, sem sessão a preservar).
- **Payload de API público (`API-CONTRACT.yaml`)**: schema
  `RankingPublicoRecentesItem`/`RodadaRecenteStatus` expõe apenas
  `atleta_id` (UUID, não é PII por si só sem outro dado de titular
  associado), `nome_exibicao` (apelido público, já exposto por
  `ranking_publico`/BE-03 desde a Parte I, mesma decisão de threat model já
  aceita), `rodadas_recentes`/`rodadas_jogadas`/`media_presenca` (dado
  agregado/derivado, não identificação civil).

**Conclusão desta seção**: nenhum achado de exposição de dado sensível de
severidade alta/crítica ou média neste lote. Nenhum item novo de baixo
risco identificado (diferente de `RD0`, que registrou a rota
`/dev/design-system` — este lote não toca essa rota).

## 84. Requisitos de segurança operacional para o DevOps (Lote RD1)

- Nenhuma dependência nova, nenhuma variável de ambiente nova introduzida
  por este lote (`package.json`/`package-lock.json`/`vercel.json`
  intocados, confirmado por `git diff` direto na Seção 80) — nenhuma ação
  de secrets/rede específica de `RD1`.
- **Novo endpoint público** (`GET /ranking_publico_recentes`, via
  PostgREST/Supabase, mesmo mecanismo de exposição já usado por
  `ranking_publico`/`presenca_mensal_publica`): nenhuma configuração de
  rede/firewall adicional necessária — é a mesma superfície de rede já
  aprovada e já coberta pela CSP pendente (`DEBT-03`, herdado, ainda em
  aberto com prazo "antes do primeiro deploy de produção" — este lote não
  altera esse prazo nem essa lista de origens, já que usa o mesmo domínio
  Supabase já contemplado no escopo original de `DEBT-03`).
- Reforço, herdado e inalterado por este lote: `DEBT-01`/`DEBT-02`/`DEBT-04`
  continuam com os mesmos prazos/donos já registrados — nenhuma mudança de
  urgência atribuível a `RD1`.

## 85. Checklist de "Pronto" do Lote RD1 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seção 80-81).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 82).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo — nenhum achado de **segurança** novo neste lote;
      `BUG-QA-RD1-01`/`BLOCKER-011` (QA) reconfirmado **sem componente de
      segurança real** (Seção 80, diff Prettier reexecutado linha a linha);
      `DEBT-01`/`DEBT-02`/`DEBT-04` (herdados) reconfirmados sem mudança.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 84.
- [x] Achado de relevância estratégica sinalizado ao Gestor — **nenhum
      achado técnico deste lote exige decisão de negócio nova**. `DEBT-03`
      (CSP pendente) e `DEBT-04` (roadmap `next@15`/`16`) permanecem
      conhecidos do CTO desde auditorias anteriores; esta auditoria apenas
      reconfirma que `RD1` não altera esse quadro.

## **Lote RD1 (BE-R01, FE-R02, FE-R03): APROVADO**

Nenhum achado de severidade alta/crítica. Nenhum achado de compliance
obrigatório em aberto. Nenhuma dependência nova (`package.json`/
`package-lock.json`/`vercel.json` intocados, confirmado por `git diff`
direto, não por alegação). A nova view pública `app.ranking_publico_recentes`
segue exatamente o mesmo padrão de `GRANT`/`REVOKE`/ausência de
`security_invoker` já aprovado para `ranking_publico`/
`presenca_mensal_publica` (L2) — nenhuma tabela base recebe `GRANT` novo,
`anon` só recebe `SELECT`. `RN-01`/`ADR-005` (nunca expor `contato`/
`data_nascimento`) confirmado em 3 camadas independentes (banco, fetch do
Frontend, teste de integração real contra Supabase local) — não apenas a
alegação do Backend/QA. Exclusão de atleta anonimizado/inativo e de rodada
`excluida` reconfirmada contra dado real inserido pelo próprio teste, não
só leitura estática do SQL. Nenhuma ocorrência de `console.*`/
`dangerouslySetInnerHTML` em nenhum dos 8 arquivos de produto deste lote.

**Achado do QA (`BUG-QA-RD1-01`/`BLOCKER-011`) reavaliado de forma
independente por este agente, não copiada a conclusão do QA**: reexecutado
o diff Prettier dos 7 arquivos citados contra o conteúdo real — confirmado
que **toda** diferença é quebra de linha/indentação, sem qualquer mudança
de string, token, nome de coluna, valor de asserção ou lógica. **Não é um
achado de segurança** — não altera controle de acesso, exposição de dado,
criptografia ou superfície de ataque de nenhuma forma. Concordância integral
com a classificação do QA ("Simples"); nenhuma elevação de severidade por
parte deste agente.

**Débitos de dependência herdados (`DEBT-01`, `DEBT-02`, `DEBT-04`)
reconfirmados sem mudança** — `npm audit --json` reexecutado nesta data
retorna a mesma contagem (1 crítica/9 altas/4 moderadas) já registrada;
não atribuíveis a este lote (nenhum arquivo de dependência tocado pelo
commit `d81fc99`, confirmado por `git diff` direto).

**Nenhum achado de relevância estratégica novo para o Gestor.** `DEBT-03`
(CSP pendente, prazo "antes do primeiro deploy de produção") e `DEBT-04`
(roadmap `next@15`/`16`) permanecem no radar do CTO desde auditorias
anteriores — este lote não altera esse quadro nem introduz urgência nova.

**Encaminhamento**: **nenhum achado bloqueante** — lote liberado para a
dupla aprovação (QA + DevSecOps) exigida antes do deploy (`EXECUTION-FLOW.md`
§5), condicionado apenas à checagem estrutural do Coordenador sobre a
criação da tarefa `Refatoração Lote-RD1` (7 arquivos de formatação,
sinalizada pelo QA em `QA-REPORT.md` 19.10, reconfirmada aqui como
puramente cosmética). Nenhuma entrada nova em `BLOCKERS.md` originada por
este agente — nenhum achado deste lote exige retorno ao time de
implementação.

---

## 86. Contexto e Método — Lote RD3 (Histórico e Times Redesenhados, Iniciativa "Redesenho Visual", Parte II do `TASK.md`)

**Gatilho**: `QA-REPORT.md` Seção 20 — Lote RD3 (`BE-R02` + `SPK-02` +
`FE-R09` + `FE-R06` + `FE-R11`) aprovado com ressalvas em 2026-09-05 (débito
de baixa severidade, formatação pura, `BUG-QA-RD3-01`, já classificado pelo
próprio QA como achado **Simples** em 20.8), com o encaminhamento explícito
de que o lote está "elegível para seguir à auditoria do DevSecOps". Esta é a
**primeira auditoria de DevSecOps sobre este lote** — nenhuma seção anterior
deste relatório o cobre. `FE-R09`/`FE-R11`/`BE-R02`/`SPK-02` chegam mesclados
em `main` (commit `d81fc99`); `FE-R06` (a última a fechar o lote) ainda está
só na árvore de trabalho, não commitada — auditada como está (diff contra
`HEAD`), mesma ressalva operacional já registrada pelo QA (commit pendente
antes de `/deploy`).

**Referências de arquitetura/governança usadas como contra-o-quê-auditar**:
`TASK.md` Parte II Seção 3.1 (critério de aceite literal de `BE-R02` —
"cálculo por JOIN/subquery no próprio endpoint", "nenhuma tabela/coluna
nova", "nenhuma função PL/pgSQL nova") e Seção 6.2-R (decisões de detalhe já
avalizadas pelo Tech Lead: mapeamento posicional `colete`/`sem_colete`,
fallback `null` para rodada legado); `UX-SPEC.md` Parte II Seção 2.6
(renomeação real "Colete"/"Sem Colete", banner "✓ Restrição respeitada");
`ADR-014` (renderização do simulador tático sem biblioteca gráfica nova,
consequência de que cada `PlayerChip` continua sendo um elemento DOM real
focável); `GUARDRAILS.md` regra 6 (`anon` nunca escreve/lê tabelas de
`app.rodada`/`app.time`/`app.time_atleta` — toda leitura passa por `service
role` atrás do middleware), regra 19/21 (LGPD — `contato`/`data_nascimento`
nunca trafegam), regra 22 (heurística de montagem de times — verificado que
o fallback client-side `buildRoundRobinTimes` já existia antes de `RD3`,
inalterado por este lote, não uma introdução nova a avaliar aqui) e regra 31
(reuso de componente único do design system). `API-CONTRACT.yaml` 0.14.0
(`RodadaResumoItem.confronto`/`.status_correcao`, `RestricaoObrigatoriaResponse`,
`TimeMontadoResponse`/`SugestaoTimesResultado`).

**Método**: mesmo rigor de `RD0`/`RD1` (Seções 70/79). Nenhuma alegação do
Backend/Frontend/QA aceita sem verificação direta. Reexecutados/conferidos
nesta auditoria: leitura linha a linha de `confronto.ts`/`listar.ts`/
`repository.ts` (módulo `src/modules/rodadas`) para confirmar ausência de
consulta N+1 e isolamento correto por `rodada_id`; leitura de `presenter.ts`/
`route.ts` para confirmar que `GET /api/rodadas` permanece atrás de
`INTERNAL_READ_PROTECTED_PREFIXES` e que a resposta não introduz campo além
de `confronto`/`status_correcao`; leitura linha a linha de `PlayerChip.tsx`/
`PitchBackground.tsx`/`times.ts`/`TimesResultado.tsx`/`MontagemTimesShell.tsx`
para a reconciliação cliente de restrições e a superfície de HTML5 DnD;
varredura de `console.*`/`dangerouslySetInnerHTML` em todos os arquivos de
produto das 5 tarefas; `git diff d81fc99~1 d81fc99 -- package.json
package-lock.json vercel.json` (confirmado vazio nos três, não apenas aceita
a nota de conclusão de "nenhuma dependência nova"); reprodução independente
do diff Prettier dos 8 arquivos citados em `BUG-QA-RD3-01` (`npx prettier
<arquivo> | diff`, não apenas aceita a classificação "formatação pura" do
QA); leitura completa do `git diff` de `SubstituicoesModal.tsx` (`FE-R11`)
para confirmar "zero mudança funcional"; `npm audit --json` reexecutado para
reconfirmar `DEBT-01`/`DEBT-02`/`DEBT-04` sem mudança.

## 87. `static-security-analysis` — Lote RD3

| Verificação | Comando/método | Resultado |
|---|---|---|
| Nenhuma dependência nova introduzida por `BE-R02`/`SPK-02`/`FE-R09`/`FE-R06`/`FE-R11` | `git diff d81fc99~1 d81fc99 -- package.json package-lock.json vercel.json` | ✅ diff vazio nos três arquivos — confirmado de forma independente; `package.json`/`package-lock.json` também ausentes de `git status` na árvore de trabalho atual (onde `FE-R06` ainda não foi commitada) |
| `BE-R02` não cria tabela/coluna/função PL/pgSQL nova (critério de aceite literal) | Leitura de `supabase/migrations/` desde `8925bfb` + leitura completa de `confronto.ts`/`listar.ts`/`repository.ts` | ✅ nenhuma migration nova associada a `BE-R02`; `confronto`/`status_correcao` são 100% calculados em memória a partir de 4 consultas em lote (`Promise.all`) sobre tabelas já existentes (`app.time`, `app.time_atleta`, `app.participacao_rodada`, `app.evento_jogo`, `app.log_auditoria`, `app.configuracao_pontuacao`) |
| Ausência de consulta N+1 em `listarRodadas` | Leitura de `listar.ts` (linhas 43-72) + `repository.ts` (`listarTimesComAtletasPorRodadas`/`somarGolsPorAtletaERodada`/`listarConfiguracaoPontosPorEvento`/`listarRodadaIdsComLogAuditoria`) | ✅ exatamente 5 consultas totais por chamada de `GET /api/rodadas` (1 para a listagem + 4 auxiliares em `Promise.all`, cada uma usando `.in(rodadaIds)`/`.in(timeIds)`/`.in(participacaoIds)` sobre o lote inteiro), independente do número de rodadas retornadas — nenhum loop de query por rodada |
| Isolamento entre rodadas/atletas no cálculo de `confronto` | Leitura de `listarTimesComAtletasPorRodadas`/`somarGolsPorAtletaERodada` (`repository.ts`) | ✅ ambas retornam `Map` chaveado por `rodada_id` (e, dentro dele, por `atleta_id`/`time_id`), nunca uma lista achatada — `listar.ts` só lê `timesPorRodada.get(rodada.id)`/`golsPorRodada.get(rodada.id)` por rodada individual antes de calcular; impossível um gol/atleta de uma rodada vazar para o `confronto` de outra |
| `confronto`/`status_correcao` não expõem `contato`/`data_nascimento` nem qualquer outro campo de `app.atleta` | Leitura de `confronto.ts` (tipo `TimeComAtletas` só carrega `atletaIds: readonly string[]`, nunca nome/contato), `presenter.ts` (`RodadaResumoResponse` só inclui `confronto`/`status_correcao` além dos campos já existentes de `BE-16`) | ✅ nenhuma referência a `apelido_exibicao`, `contato` ou `data_nascimento` em todo o caminho `repository.ts → confronto.ts → listar.ts → presenter.ts → route.ts` deste cálculo — o único identificador que trafega é `atleta_id` (uuid), usado só como chave de agregação, nunca serializado como saída |
| `GET /api/rodadas` permanece atrás do middleware de sessão | Leitura de `route.ts` (comentário de cabeçalho) + `middleware.ts` (`INTERNAL_READ_PROTECTED_PREFIXES`) | ✅ `/api/rodadas` já estava na lista desde `BE-13` (`GET .../substituicoes`) — nenhuma mudança de `middleware.ts` necessária ou feita por `BE-R02` |
| `console.*`/`dangerouslySetInnerHTML` nos arquivos de produto das 5 tarefas | `grep -rn "console\.\|dangerouslySetInnerHTML"` em `src/modules/rodadas`, `app/api/rodadas`, `src/features/historico`, `src/features/times`, `src/components/ui/PitchBackground`, `src/components/ui/PlayerChip` | ✅ zero ocorrências |
| Superfície de HTML5 DnD nativo (`PlayerChip`) | Leitura completa de `PlayerChip.tsx` (`handleDragStart`/`handleDragOver`/`handleDrop`) | ✅ `dataTransfer` carrega só `atleta_id` (uuid já validado pelo backend, nunca texto arbitrário de usuário) via `"text/plain"`; nenhum uso de `dataTransfer.setData("text/html", ...)`; o valor lido em `handleDrop` só é comparado (`!==`) e repassado a `onSwap`/`swapAtletas` (`times.ts`), nunca renderizado como HTML — não há caminho de XSS via `dataTransfer` |
| Achado de `BUG-QA-RD3-01` (`npm run format:check`, 8 arquivos) não esconde mudança de comportamento/segurança | Reexecução independente: `npx prettier <arquivo> \| diff` nos 8 arquivos reais (`confronto.ts`, `listar.ts`, `repository.ts`, `listar.integration.test.ts`, `times.test.ts`, `TimesResultado.test.tsx`, `TimesResultado.tsx`, `page.tsx`) | ✅ confirmado, arquivo a arquivo — toda diferença é quebra de linha/indentação por `printWidth: 90` (reflow de `reduce`/`Promise.all`/template string/objeto literal/JSX). **Nenhuma string, token, valor de asserção, nome de coluna ou lógica muda** entre o conteúdo real e a versão formatada — confirma, do ponto de vista de segurança, que o achado é puramente cosmético |
| `npm audit` — dependências de terceiros | `npm audit --json` reexecutado nesta data | Reconfirma `DEBT-01` (crítico, dev-only, `vitest`), `DEBT-02` (baixa, toolchain de lint) e `DEBT-04` (média, `next@14.2.35`) **sem mudança de severidade/escopo** — total 1 crítica/9 altas/4 moderadas, idêntico ao já registrado; não atribuível a `RD3` (nenhum arquivo de dependência tocado pelo commit `d81fc99`, confirmado acima) |
| `FE-R11` (`SubstituicoesModal.tsx`) — "zero mudança funcional" | `git diff HEAD -- src/features/times/SubstituicoesModal.tsx` | ✅ confirmado por leitura completa do diff — a única mudança é um bloco de comentário de auditoria; nenhuma linha de código executável alterada, nenhuma superfície nova |

**Conclusão desta seção**: nenhum achado de segurança novo introduzido pelo
código deste lote. `DEBT-01`/`DEBT-02`/`DEBT-04` reconfirmados sem mudança —
não atribuíveis a `RD3`. O único achado do QA sobre este lote
(`BUG-QA-RD3-01`) é reconfirmado, de forma independente, como puramente
cosmético — sem componente de segurança.

## 88. `security-requirement-validation` — Lote RD3

Requisito aplicável: `TASK.md` Parte II Seção 3.1/6.2-R (critério de aceite
de `BE-R02`) + `GUARDRAILS.md` regras 6/19/21/22/31 + `ADR-014`.

- **Guardrail 6 (`anon` nunca escreve/lê tabelas protegidas)**: satisfeito —
  `repository.ts` usa exclusivamente `getServiceRoleClient()` (mesmo padrão
  já auditado em `BE-08`/`BE-16`); nenhuma das 4 consultas auxiliares novas
  de `BE-R02` passa pelo cliente `anon`. `GET /api/restricoes` (consumido por
  `FE-R09` no cliente) é o endpoint já aprovado de `BE-12` — sem mudança de
  autorização introduzida por este lote.
- **Reconciliação de restrições no cliente (`FE-R09`) não é lógica de
  autorização**: ponto de maior atenção desta auditoria. Confirmado por
  leitura direta de `restricoesRespeitadas` (`times.ts`) e do wiring em
  `TimesResultado.tsx`/`MontagemTimesShell.tsx`: a função só **decora** a UI
  com um banner informativo ("✓ Restrição respeitada") — não bloqueia, não
  habilita/desabilita o botão "Confirmar Times", não altera o corpo enviado
  a `POST /api/rodadas/{id}/times` (`buildConfirmarTimesInput`, inalterado
  pelo lote) e não influencia `buildRoundRobinTimes`/`swapAtletas`. A decisão
  de permitir ou recusar uma divisão de times continua sendo tomada
  inteiramente pelo Backend (`app.confirmar_times_rodada`/`BE-13`,
  inalterado por este lote) — a única fonte de autorização real. Falha ao
  buscar `GET /api/restricoes` degrada silenciosamente para `[]` (nenhum
  erro bloqueia o fluxo principal, nenhuma mensagem de erro de
  infraestrutura exposta ao usuário) — confirmado em `MontagemTimesShell.tsx`
  linha 138-147.
- **Superfície de `PlayerChip`/DnD nativo (Guardrail 31/`ADR-014`)**: nenhuma
  superfície nova de exposição de dado de atleta — `atletaId` (uuid) é o
  único valor carregado pelo `dataTransfer`, nunca `nome`/`nivel_tecnico`; o
  `aria-label` (`"Trocar {nome}, nível técnico {valor}"`) já existia como
  atributo de acessibilidade do próprio `<button>` renderizado (visível a
  qualquer inspeção de DOM, mesma exposição que já existia via texto visível
  do chip — `nome`/`nivelTecnico` já eram dado renderizado na tela antes
  desta tarefa, dentro do fluxo autenticado de T09, não uma exposição nova).
  Nenhum uso de `text/html` em `dataTransfer`, nenhuma renderização do
  conteúdo arrastado via `innerHTML`.
- **`RN-01`/`ADR-005` (nunca expor `contato`/`data_nascimento`)**: satisfeito
  para `BE-R02` — confirmado na Seção 87 que o caminho completo do cálculo de
  `confronto` nunca referencia essas colunas, nem sequer `apelido_exibicao`
  (o cálculo trabalha só com `atleta_id`).
- **Guardrail 22 (heurística determinística de duas fases)**: o fallback
  client-side `buildRoundRobinTimes` (usado só na opção "Gerar mesmo assim,
  ciente do conflito", quando o Backend já provou via `ADR-010` que nenhuma
  divisão automática satisfaz as restrições) **já existia antes de `RD3`**
  (confirmado por `git diff 8925bfb d81fc99 -- src/features/times/times.ts`
  — a função não aparece no diff) — não é uma introdução nova deste lote, e
  seu uso já foi aceito em auditoria anterior à Parte II; `RD3`/`FE-R09` não
  o modifica.
- **`API-CONTRACT.yaml` conferido contra o código real**: `confronto`/
  `status_correcao` (schema `ConfrontoRodada`, `RodadaResumoItem`) e
  `RestricaoObrigatoriaResponse`/`TimeMontadoResponse`/
  `SugestaoTimesResultado` (inalterados) — mesma conferência já feita pelo
  QA na Seção 20.6, reconfirmada aqui de forma independente por leitura
  direta do YAML campo a campo.

**Conclusão desta seção**: nenhum requisito de arquitetura de segurança
violado. O ponto de maior risco potencial identificado a priori (lógica de
autorização vazando para o cliente via a reconciliação de restrições) **não
se concretiza** — confirmado que a decisão de autorização real permanece
100% no Backend, o cliente só decora a UI com um dado já público
(`GET /api/restricoes`, endpoint já aprovado).

## 89. `compliance-validation` — LGPD (nível de implementação, escopo Lote RD3)

- **Minimização de dado (LGPD Art. 6, III)**: satisfeito — `BE-R02` calcula
  `confronto`/`status_correcao` usando exclusivamente `atleta_id` (uuid) e
  contadores agregados (gols, presença de log de auditoria); nenhuma coluna
  de identificação civil trafega em nenhum ponto da cadeia banco→API. `FE-R09`
  não introduz novo campo de coleta/exibição de dado pessoal — `nome`/
  `nivel_tecnico` exibidos em `PlayerChip` já eram dado exibido por T09 antes
  desta tarefa (RN-03, já aprovado), dentro do fluxo autenticado.
- **Nenhuma nova base legal/finalidade de tratamento introduzida**: este
  lote reorganiza apresentação de dado já coletado e já autorizado
  (histórico de rodadas e montagem de times, ambos fluxos internos
  pré-existentes) — não amplia o escopo de dado tratado.
- **Área pública inalterada**: `BE-R02`/`FE-R09`/`FE-R06`/`FE-R11` operam
  inteiramente na área autenticada (T06/T09/T11) — nenhuma mudança na
  fronteira de exposição pública (`ADR-005`) auditada em `RD1`/L2.

**Conclusão desta seção**: nenhum achado de compliance obrigatório em aberto
no escopo do Lote RD3.

## 90. `sensitive-data-exposure-check` — conclusão dedicada (Lote RD3)

- **Camada de banco/cálculo (`BE-R02`)**: confirmado na Seção 87 — o caminho
  `repository.ts → confronto.ts → listar.ts` nunca seleciona/agrega
  `contato`/`data_nascimento`/`apelido_exibicao`; o único identificador que
  circula é `atleta_id` (uuid), usado apenas como chave de `Map` para
  agregação em memória, nunca serializado na resposta.
- **Camada de payload de API (`presenter.ts`)**: `confronto: {colete,
  sem_colete} | null` e `status_correcao` são os únicos campos novos —
  ambos numéricos/enum, nenhum identificador de atleta neles.
- **Camada de DOM/DnD (`FE-R09`)**: `dataTransfer` carrega só `atleta_id`
  (uuid); `nome`/`nivelTecnico` já eram renderizados como texto visível do
  `PlayerChip` antes desta tarefa (dado já exposto na tela, dentro do fluxo
  autenticado de T09) — nenhuma exposição nova de dado sensível pela adição
  do atalho de DnD.
- **Camada de mensagem de erro**: `MontagemTimesShell.tsx` trata a falha de
  `GET /api/restricoes` com degradação silenciosa (`setRestricoes([])`),
  nunca expõe `error.message` bruto ao usuário; `RodadaListItem.tsx`
  (`FE-R06`) usa placeholder textual acessível (`role="img"` + `aria-label`)
  para `confronto: null`, nunca uma mensagem de erro de infraestrutura.
- **Camada de armazenamento local**: nenhum dos componentes deste lote grava
  em `localStorage`/`sessionStorage`/cookie — estado 100% `useState` em
  memória (times montados, restrições carregadas), descartado ao navegar.

**Conclusão desta seção**: nenhum achado de exposição de dado sensível de
severidade alta/crítica ou média neste lote. Nenhum item novo de baixo risco
identificado.

## 91. Requisitos de segurança operacional para o DevOps (Lote RD3)

- Nenhuma dependência nova, nenhuma variável de ambiente nova introduzida
  por este lote (`package.json`/`package-lock.json`/`vercel.json`
  intocados pelo commit `d81fc99`, confirmado por `git diff` direto na
  Seção 87) — nenhuma ação de secrets/rede específica de `RD3`.
- `GET /api/rodadas` (extensão de `BE-16`) não introduz superfície de rede
  nova — já coberto pela mesma configuração de `INTERNAL_READ_PROTECTED_PREFIXES`
  usada desde `BE-13`.
- Reforço, herdado e inalterado por este lote: `DEBT-01`/`DEBT-02`/`DEBT-04`
  continuam com os mesmos prazos/donos já registrados — nenhuma mudança de
  urgência atribuível a `RD3`.

## 92. Checklist de "Pronto" do Lote RD3 (Definition of Done do DevSecOps)

- [x] **Nenhum achado de severidade alta/crítica em aberto** — confirmado
      (Seções 87-88).
- [x] Todo achado de compliance obrigatório (LGPD e afins) resolvido —
      nenhum achado desta classe identificado (Seção 89).
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo — nenhum achado de **segurança** novo neste lote;
      `BUG-QA-RD3-01` (QA) reconfirmado **sem componente de segurança real**
      (Seção 87, diff Prettier reexecutado arquivo a arquivo);
      `DEBT-01`/`DEBT-02`/`DEBT-04` (herdados) reconfirmados sem mudança.
- [x] Requisitos de segurança operacional definidos para o DevOps —
      Seção 91.
- [x] Achado de relevância estratégica sinalizado ao Gestor — **nenhum
      achado técnico deste lote exige decisão de negócio nova**. `DEBT-03`
      (CSP pendente) e `DEBT-04` (roadmap `next@15`/`16`) permanecem
      conhecidos do CTO desde auditorias anteriores; esta auditoria apenas
      reconfirma que `RD3` não altera esse quadro.

## **Lote RD3 (BE-R02, SPK-02, FE-R09, FE-R06, FE-R11): APROVADO**

Nenhum achado de severidade alta/crítica. Nenhum achado de compliance
obrigatório em aberto. Nenhuma dependência nova (`package.json`/
`package-lock.json`/`vercel.json` intocados pelo commit `d81fc99`,
confirmado por `git diff` direto, não por alegação). `BE-R02` calcula
`confronto`/`status_correcao` inteiramente em memória via 4 consultas em
lote (`Promise.all`), sem consulta N+1 e sem vazamento de dado entre
rodadas/atletas (agregação sempre chaveada por `rodada_id`/`atleta_id`,
confirmado por leitura direta) — nenhum dos dois campos novos expõe
`contato`/`data_nascimento` ou qualquer outro dado além de `atleta_id` e
contadores agregados. A reconciliação de restrições no cliente (`FE-R09`,
ponto de maior atenção desta auditoria) é confirmada como puramente
decorativa (banner informativo) — a autorização real de confirmação de
times permanece 100% no Backend (`app.confirmar_times_rodada`, inalterado).
`PlayerChip`/HTML5 DnD nativo não abre superfície nova: `dataTransfer`
carrega só `atleta_id` (uuid) via `text/plain`, nunca `text/html`, sem
caminho de XSS; `nome`/`nivel_tecnico` já eram dado exibido antes desta
tarefa, dentro do fluxo autenticado. `FE-R11` confirmado como mudança
puramente de comentário (`git diff` completo revisado).

**Achado do QA (`BUG-QA-RD3-01`) reavaliado de forma independente por este
agente, não copiada a conclusão do QA**: reexecutado o diff Prettier dos 8
arquivos citados contra o conteúdo real — confirmado que **toda** diferença
é quebra de linha/indentação, sem qualquer mudança de string, token, nome de
coluna, valor de asserção ou lógica. **Não é um achado de segurança** — não
altera controle de acesso, exposição de dado, criptografia ou superfície de
ataque de nenhuma forma. Concordância integral com a classificação do QA
("Simples"); nenhuma elevação de severidade por parte deste agente.

**Débitos de dependência herdados (`DEBT-01`, `DEBT-02`, `DEBT-04`)
reconfirmados sem mudança** — `npm audit --json` reexecutado nesta data
retorna a mesma contagem (1 crítica/9 altas/4 moderadas) já registrada; não
atribuíveis a este lote (nenhum arquivo de dependência tocado pelo commit
`d81fc99`, confirmado por `git diff` direto).

**Nenhum achado de relevância estratégica novo para o Gestor.** `DEBT-03`
(CSP pendente) e `DEBT-04` (roadmap `next@15`/`16`) permanecem no radar do
CTO desde auditorias anteriores — este lote não altera esse quadro nem
introduz urgência nova.

**Encaminhamento**: **nenhum achado bloqueante** — lote liberado para a
dupla aprovação (QA + DevSecOps) exigida antes do deploy (`EXECUTION-FLOW.md`
§5), condicionado apenas à checagem estrutural do Coordenador sobre a
criação da tarefa `Refatoração Lote-RD3` (8 arquivos de formatação,
sinalizada pelo QA em `QA-REPORT.md` 20.8, reconfirmada aqui como
puramente cosmética) e ao commit pendente de `FE-R06` (ainda só na árvore de
trabalho) antes de qualquer `/deploy` deste lote. Nenhuma entrada nova em
`BLOCKERS.md` originada por este agente — nenhum achado deste lote exige
retorno ao time de implementação.

---

## 93. Lote Refatoração RD1 — `REF-RD1-01` (auditoria enxuta, correção de formatação)

**Gatilho**: `QA-REPORT.md` Seção 21 — Lote Refatoração RD1 (`REF-RD1-01`)
aprovado sem ressalva pelo QA em 2026-09-05.

**Contexto e escopo proporcional ao risco**: lote de refatoração pura sobre
7 arquivos já auditados a fundo no fechamento do Lote RD1 de origem (Seções
79-85) — `npx prettier --write` aplicado a arquivos de propriedade de
`BE-R01`/`FE-R02`/`FE-R03`, sem reabrir nenhuma das 3 tarefas. Dado o
escopo mínimo (reflow de linha/indentação, confirmado pelo QA em 21.1),
esta auditoria é deliberadamente mais enxuta que uma auditoria completa de
feature nova — foco em confirmar ausência de regressão de segurança, não
repetir a auditoria integral já feita em 79-85.

**Método**: leitura direta do `git diff` dos 7 arquivos (já suficiente,
dado o escopo) — nenhuma reexecução de SAST/`npm audit` nova, pois nenhum
arquivo de dependência (`package.json`/`package-lock.json`) foi tocado.

| Verificação | Resultado |
|---|---|
| Nenhuma string/token/log/mensagem de erro alterada nos 7 arquivos | ✅ confirmado — reflow de linha/indentação apenas (mesma leitura do QA em 21.1, reconferida de forma independente por este agente) |
| Nenhum dado sensível (`contato`/`data_nascimento`/segredo/chave) introduzido em teste ou produto | ✅ nenhuma linha nova de conteúdo — apenas quebra de linha de expressões já existentes |
| `package.json`/`package-lock.json`/`vercel.json`/qualquer arquivo de dependência ou infraestrutura tocado | ✅ nenhum — `git diff --stat` confirma apenas os 7 arquivos de `BE-R01`/`FE-R02`/`FE-R03` |
| Superfície de ataque, controle de acesso, RLS, criptografia | ✅ inalterados — nenhum dos 7 arquivos contém lógica de autorização/RLS/criptografia (2 arquivos de produto: `RankingList.tsx` [UI], 5 arquivos de teste) |

**Achados**: nenhum. Nenhuma elevação de severidade sobre o já registrado em
`BUG-QA-RD1-01`/`BLOCKER-011` (Seção 85, já classificado como "não é um
achado de segurança").

### 93.1 Checklist de "Pronto" do Lote Refatoração RD1 (Definition of Done do DevSecOps)

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado
      identificado.
- [x] Todo achado de compliance obrigatório resolvido — não aplicável,
      nenhum achado desta classe.
- [x] Todo achado de baixa/média severidade virou tarefa em
      `Refatoração Lote-X`, com prazo — não aplicável, nenhum achado novo;
      débitos herdados (`DEBT-01`/`DEBT-02`/`DEBT-04`) inalterados por este
      lote (nenhum arquivo de dependência tocado).
- [x] Requisitos de segurança operacional definidos para o próprio DevOps —
      nenhum requisito novo, mudança puramente cosmética não afeta
      infraestrutura/pipeline além do próprio gate "Format check" já
      corrigido.
- [x] Achado de relevância estratégica sinalizado ao Gestor — nenhum achado
      técnico deste lote exige decisão de negócio nova.

## **Lote Refatoração RD1 (`REF-RD1-01`): APROVADO (sem débito)**

Confirmado, por leitura direta do `git diff` dos 7 arquivos, que a correção
de `BUG-QA-RD1-01`/`BLOCKER-011` é 100% reformatação Prettier — nenhuma
mudança de string, token, controle de acesso, dado sensível ou superfície
de ataque. Nenhum arquivo de dependência/infraestrutura tocado. Concordância
integral com a avaliação do QA (Seção 21) de que o achado original nunca
teve componente de segurança real.

**Encaminhamento**: **nenhum achado bloqueante** — lote com dupla aprovação
(QA Seção 21 + DevSecOps aqui) sobre o mesmo build, liberado para a
checagem estrutural do Coordenador (`EXECUTION-FLOW.md` §5). Nenhuma
entrada nova em `BLOCKERS.md` originada por este agente.

---

## 94. Lote Refatoração RD3 — `REF-RD3-01` (auditoria enxuta, correção de formatação)

**Gatilho**: `QA-REPORT.md` Seção 22 — Lote Refatoração RD3 (`REF-RD3-01`)
aprovado sem ressalva pelo QA em 2026-09-05.

**Contexto e escopo proporcional ao risco**: lote de refatoração pura sobre
8 arquivos já auditados a fundo no fechamento do Lote RD3 de origem (Seções
86-92) — `npx prettier --write` aplicado a arquivos de propriedade de
`BE-R02`/`FE-R09`, sem reabrir nenhuma das 2 tarefas. Arquivos totalmente
disjuntos dos 7 já auditados em `REF-RD1-01`/Seção 93. Dado o escopo mínimo
(reflow de linha/indentação, confirmado pelo QA em 22.1), esta auditoria é
deliberadamente mais enxuta que uma auditoria completa de feature nova —
foco em confirmar ausência de regressão de segurança, não repetir a
auditoria integral já feita em 86-92.

**Método**: leitura direta do `git diff` dos 8 arquivos (já suficiente,
dado o escopo) — nenhuma reexecução de SAST/`npm audit` nova, pois nenhum
arquivo de dependência (`package.json`/`package-lock.json`) foi tocado.

| Verificação | Resultado |
|---|---|
| Nenhuma string/token/log/mensagem de erro alterada nos 8 arquivos | ✅ confirmado — reflow de linha/indentação apenas, incluindo a mensagem de `throw new Error` em `repository.ts` (byte-a-byte idêntica, só quebrada em mais linhas) — mesma leitura do QA em 22.1, reconferida de forma independente por este agente |
| Nenhum dado sensível (placar/`confronto`/nível técnico/segredo/chave) introduzido em teste ou produto | ✅ nenhuma linha nova de conteúdo — apenas quebra de linha de expressões já existentes; nenhum dos 8 arquivos manipula `contato`/`data_nascimento` |
| `package.json`/`package-lock.json`/`vercel.json`/qualquer arquivo de dependência ou infraestrutura tocado | ✅ nenhum — `git diff --stat` confirma apenas os 8 arquivos de `BE-R02`/`FE-R09` |
| Superfície de ataque, controle de acesso, RLS, criptografia | ✅ inalterados — nenhum dos 8 arquivos contém lógica de autorização/RLS/criptografia (3 arquivos de produto: `confronto.ts`/`listar.ts`/`repository.ts` [cálculo agregado em memória, sem query nova] e `TimesResultado.tsx` [UI]; 4 arquivos de teste; `page.tsx` é vitrine interna de dev, não rota de produção) |
| Reflow adicional em `app/dev/design-system/page.tsx` além do parágrafo de `FE-R09` (nota de precisão do QA, Seção 22.1) | ✅ sem componente de segurança — texto estático de vitrine interna (`app/dev/design-system`, não indexado/não exposto como rota de produto), mesmo conteúdo textual, sem dado sensível nem lógica |

**Achados**: nenhum. Nenhuma elevação de severidade sobre o já registrado em
`BUG-QA-RD3-01` (Seção 92, já classificado sem componente de segurança).

### 94.1 Checklist de "Pronto" do Lote Refatoração RD3 (Definition of Done do DevSecOps)

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado
      identificado.
- [x] Todo achado de compliance obrigatório resolvido — não aplicável,
      nenhum achado desta classe.
- [x] Todo achado de baixa/média severidade virou tarefa em
      `Refatoração Lote-X`, com prazo — não aplicável, nenhum achado novo;
      débitos herdados inalterados por este lote (nenhum arquivo de
      dependência tocado).
- [x] Requisitos de segurança operacional definidos para o próprio DevOps —
      nenhum requisito novo, mudança puramente cosmética não afeta
      infraestrutura/pipeline além do próprio gate "Format check" já
      corrigido.
- [x] Achado de relevância estratégica sinalizado ao Gestor — nenhum achado
      técnico deste lote exige decisão de negócio nova.

## **Lote Refatoração RD3 (`REF-RD3-01`): APROVADO (sem débito)**

Confirmado, por leitura direta do `git diff` dos 8 arquivos, que a correção
de `BUG-QA-RD3-01` é 100% reformatação Prettier — nenhuma mudança de
string, token, controle de acesso, dado sensível ou superfície de ataque.
Nenhum arquivo de dependência/infraestrutura tocado. Concordância integral
com a avaliação do QA (Seção 22) de que o achado original nunca teve
componente de segurança real, incluindo o reflow adicional (não planejado
no critério, mas inevitável por granularidade de arquivo do Prettier) nos
parágrafos de `MedalBadge`/`PresenceDot` em `page.tsx`.

**Encaminhamento**: **nenhum achado bloqueante** — lote com dupla aprovação
(QA Seção 22 + DevSecOps aqui) sobre o mesmo build, liberado para a
checagem estrutural do Coordenador (`EXECUTION-FLOW.md` §5). Nenhuma
entrada nova em `BLOCKERS.md` originada por este agente.

---
