# ADR-003: Adotar Next.js (React/TypeScript) como Framework Web Único (Frontend + Camada de API)

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, frontend, web

## Context and Problem Statement

O PRD-TECNICO.md exige aplicação web responsiva (mobile-first), acessível por
navegador em celular sem app nativo (RNF-07), suporte às duas versões mais
recentes de Chrome/Firefox/Safari (RNF-09), área pública sem login com dados
sempre atualizados (RF-03) e área interna protegida por senha única (RF-07). O
ADR-001 já definiu monólito modular sobre BaaS — falta escolher o framework que
implementa tanto a interface quanto a camada fina de API/lógica de negócio.

## Decision Drivers

- RNF-04: custo de hospedagem/operação próximo de zero.
- RNF-07/RNF-09: responsivo mobile-first, compatível com navegadores recentes.
- RF-03.4: ranking público deve refletir estado mais recente do histórico — favorece
  renderização no servidor (SSR) para consistência e velocidade de carregamento em
  conexão móvel.
- Necessidade de uma camada de API própria (serverless) para lógica que não pode
  viver só no cliente (RF-07 validação de senha, chamadas autenticadas ao Supabase
  com service role — nunca exposta ao navegador).

## Considered Options

- **Next.js (React, App Router, TypeScript)**, com Route Handlers como camada de
  API serverless, deploy no Vercel.
- **SPA pura (Vite + React) consumindo Supabase diretamente do cliente**, sem
  camada de API própria.
- **SvelteKit** como alternativa de framework full-stack.

## Decision Outcome

Chosen option: **"Next.js (React, App Router, TypeScript)"**, porque unifica
frontend e a camada fina de API num único deploy (alinhado ao ADR-001), tem
renderização no servidor nativa para o ranking público (RF-03.4), ecossistema
maduro compatível com os navegadores exigidos (RNF-09), e hospedagem gratuita
madura no Vercel (RNF-04). SPA pura foi descartada porque exigiria expor
diretamente ao navegador chamadas que precisam de segredo de servidor (ex.:
validação de senha interna, RF-07) — sem uma camada de API própria, não há onde
colocar essa lógica com segurança.

### Positive Consequences

- Um único repositório/deploy cobre UI e API — alinhado ao custo mínimo (RNF-04).
- SSR nativo permite que o ranking público carregue já com dados atualizados
  (RF-03.4) sem round-trip extra no cliente.
- TypeScript de ponta a ponta (frontend e API) reduz erro de tipo entre camadas.

### Negative Consequences

- Acopla a aplicação ao modelo de execução serverless do Vercel/Next.js (funções
  com tempo de execução limitado) — aceitável dado o volume baixo esperado, mas
  registrado como possível ponto de atenção se a lógica de times (RF-05) crescer
  em complexidade computacional.
- Curva de aprendizado do App Router/React Server Components para quem só
  conhece SPA tradicional.

## Pros and Cons of the Options

### Next.js ✅ Chosen

- ✅ Frontend + API no mesmo deploy, custo mínimo
- ✅ SSR nativo para o ranking público
- ✅ Ecossistema maduro, hospedagem gratuita no Vercel
- ❌ Acoplado ao modelo serverless (tempo de execução limitado por função)

### SPA pura (Vite + React + Supabase client-side)

- ✅ Mais simples de iniciar, sem servidor próprio
- ❌ Sem lugar seguro para lógica de servidor (validação de senha, uso de
  service role key) — quebraria RF-07/RNF-03 se a senha fosse validada no
  cliente
- ❌ Sem SSR — ranking público depende de carregamento client-side completo
  antes de exibir dado (pior em conexão móvel, RNF-07)

### SvelteKit

- ✅ Também full-stack, SSR nativo, hospedagem gratuita comparável
- ❌ Ecossistema menor de bibliotecas prontas (ex.: componentes de calendário
  para visão mensal RF-03.3) comparado a React
- ❌ Sem ganho concreto sobre Next.js para os requisitos deste projeto,
  justificando não trocar do framework mais maduro/testado

## Links

- Relacionado: ADR-001 (Monólito Modular sobre BaaS), ADR-004 (Autenticação
  Custom)
- PRD-TECNICO.md, RNF-04, RNF-07, RNF-09, RF-03, RF-07
- Supersedes: Nenhum
- Superseded by: Nenhum
