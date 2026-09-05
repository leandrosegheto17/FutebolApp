# ADR-012: Self-Host das Fontes Externas do Redesenho Visual via `next/font`, em vez de CDN do Google Fonts

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: security, csp, performance, frontend, design-system

## Context and Problem Statement

O `PRD-TECNICO.md` Parte II (RNF-D03) exige a adoção de três fontes do catálogo
Google Fonts como parte da nova identidade visual: **Bebas Neue** (display/
título), **Public Sans** (corpo) e **JetBrains Mono** (dados tabulares/
monoespaçado). O próprio PRD-TECNICO roteia a decisão de hospedagem
explicitamente ao Software Architect, "em conjunto com o fechamento de
`DEBT-03`" (ausência de CSP em `vercel.json`) — não decide a tecnologia, apenas
confirma que nenhuma fonte externa deve entrar em produção antes dessa decisão.

`DEBT-03` já foi corrigido nesta mesma sessão (`SECURITY-REVIEW.md`): o
`vercel.json` publica hoje uma Content-Security-Policy real, incluindo
`font-src 'self'` — ou seja, a política vigente **já proíbe** carregar fonte de
qualquer origem externa (`fonts.gstatic.com`) e já exclui `fonts.googleapis.com`
de `style-src`. Qualquer adoção de CDN do Google Fonts exigiria reabrir essa
política recém-fechada, na mesma sessão em que ela foi endurecida — o tipo de
retrabalho de segurança que este ADR existe para evitar.

## Decision Drivers

- RNF-D03: nenhuma fonte externa entra em produção antes desta decisão; decisão
  é do Software Architect, em conjunto com `DEBT-03`.
- `DEBT-03` já resolvido com `font-src 'self'` e sem `fonts.googleapis.com` em
  `style-src`/`connect-src` — reabrir a CSP é regressão de uma correção já
  fechada e validada por DevSecOps nesta mesma janela.
- RNF-04 (custo de hospedagem/operação próximo de zero): arquivos estáticos de
  fonte servidos pela mesma origem/CDN que já serve o restante do app (Vercel)
  não têm custo marginal.
- RNF-01/postura de minimização de dados (LGPD): o CDN do Google Fonts, mesmo
  sem cookies, registra o IP de quem carrega a fonte a cada requisição — uma
  chamada de rede a um terceiro que este projeto não faz hoje para nenhum outro
  ativo estático. Self-host elimina essa superfície por completo, sem exigir
  banner de consentimento adicional para "fonte externa".
- RNF-07 (mobile-first): CDN externo introduz DNS lookup + handshake TLS para
  dois domínios adicionais (`fonts.googleapis.com` e `fonts.gstatic.com`) no
  caminho crítico de renderização; self-host serve tudo da mesma origem já
  aberta pela navegação.
- O stack já adotado (ADR-003, Next.js) inclui `next/font`, mecanismo nativo de
  self-host automático de fontes do Google — a decisão não exige nenhuma peça
  de infraestrutura nova, apenas usar um recurso já disponível no framework em
  uso.

## Considered Options

1. **`next/font/google`** — Next.js baixa os arquivos de fonte **em tempo de
   build** (não em tempo de execução do navegador do visitante) e os serve
   como assets estáticos da própria origem da aplicação; nenhuma requisição a
   domínio do Google acontece no navegador do usuário final em produção.
2. **CDN do Google Fonts** (`<link>` para `fonts.googleapis.com` +
   `fonts.gstatic.com`, ou `@import` em CSS) — exigiria reabrir `style-src`
   (para o link do stylesheet) e `font-src` (para os arquivos `.woff2`
   servidos por `fonts.gstatic.com`) na CSP.
3. **Self-host manual** — baixar os arquivos `.woff2` uma única vez, versioná-
   los em `public/fonts/`, e declarar `@font-face` manualmente em
   `tokens.css`, sem depender de nenhuma automação do Next.js.

## Decision Outcome

Chosen option: **`next/font/google`** (opção 1).

O download acontece uma única vez, no ambiente de build (CI/build da Vercel,
já confiável e já usado para todo o resto do deploy), não no navegador do
visitante — o resultado em produção é operacionalmente idêntico à opção 3
(self-host), mas sem exigir gestão manual de arquivo binário versionado no
repositório, seleção manual de subconjunto de glifos/pesos, nem escrita manual
de `@font-face`/`font-display`. O framework já em uso (ADR-003) resolve isso
por padrão, com `font-display: swap` e pré-carregamento automático dos pesos
efetivamente usados.

**A CSP vigente (`font-src 'self'`, já corrigida em `DEBT-03`) não precisa de
nenhuma alteração** — nenhuma requisição de fonte, em produção, sai da própria
origem da aplicação. Isso resolve RNF-D03 sem reabrir nenhum item de segurança
já fechado nesta sessão.

### Positive Consequences

- Zero requisição de rede externa em produção para fontes — nenhuma mudança de
  CSP, nenhuma superfície nova de dependência de terceiro em tempo de execução.
- Custo de manutenção mínimo: `next/font/google` já resolve subsetting,
  `font-display`, self-host e cache de build — não exige processo manual de
  atualização de arquivo de fonte no repositório.
- Performance: sem DNS/TLS adicional para dois domínios externos; fontes
  servidas da mesma origem/edge já usada pelo restante do app.
- Nenhuma implicação de privacidade/LGPD adicional — não há registro de IP do
  visitante final em servidor de terceiro para carregar uma fonte.

### Negative Consequences

- Dependência de rede **em tempo de build** (não de produção): se o ambiente
  de build da Vercel perder acesso à origem do Google Fonts no momento exato
  do build, o build falha. Risco considerado baixo (infraestrutura de build da
  própria Vercel, mesma que já hospeda o app) — mitigação: cache de build da
  Vercel já reduz a frequência real dessa dependência a builds que alteram a
  declaração de fonte.
- Menor "frescor automático" de atualização de fonte (ex.: correção de bug de
  hinting pelo Google) — irrelevante aqui: são três fontes estáveis e maduras,
  com pesos fixos definidos pelo mockup já aprovado; não há expectativa de
  atualização automática desejável.

## Pros and Cons of the Options

### `next/font/google` ✅ Chosen

- ✅ Zero requisição externa em produção — CSP `font-src 'self'` permanece
  intacta, sem reabrir `DEBT-03`
- ✅ Resolvido nativamente pelo framework já adotado (ADR-003), sem código
  extra de `@font-face`/gestão manual de arquivo binário
- ✅ Performance: mesma origem, sem DNS/TLS extra
- ❌ Dependência de rede restrita à janela de build (mitigação: infraestrutura
  de build já confiável)

### CDN do Google Fonts

- ✅ Nenhuma gestão de arquivo de fonte no repositório
- ❌ Exige reabrir CSP (`font-src`, `style-src`) recém-fechada em `DEBT-03`,
  na mesma sessão em que foi corrigida
- ❌ Requisição de rede externa em tempo real de produção, a cada visita —
  disponibilidade e privacidade dependem de terceiro fora do controle do
  projeto
- ❌ Custo de performance: DNS/TLS extra para dois domínios adicionais

### Self-host manual (arquivos versionados em `public/fonts/`)

- ✅ Mesmo resultado de produção que a opção escolhida (zero rede externa em
  runtime)
- ❌ Exige gestão manual de binário versionado, seleção de subconjunto de
  glifos, `@font-face`/`font-display` escritos à mão — reinventa o que
  `next/font/google` já resolve automaticamente no mesmo framework já em uso
- ❌ Nenhum ganho real sobre a opção escolhida que justifique o esforço extra

## Links

- Relacionado: ADR-003 (Adotar Next.js), ADR-013 (substituição de tokens de
  paleta/tipografia), `SECURITY-REVIEW.md` (`DEBT-03`)
- Resolve: `PRD-TECNICO.md` Parte II, RNF-D03 e Seção 6, item 5
- Supersedes: Nenhum
- Superseded by: Nenhum
