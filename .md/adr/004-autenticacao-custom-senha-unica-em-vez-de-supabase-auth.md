# ADR-004: Implementar Autenticação Custom de Senha Única Compartilhada em Vez de Supabase Auth

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, security, authentication

> **Marcado para `risk-and-compliance-check` no Gate 2 do CTO**, por tratar do
> ponto explicitamente sinalizado no Gate 1 (`CTO-REVIEW.md`, risco estratégico
> #2: "autenticação por senha única compartilhada").

## Context and Problem Statement

RF-07 exige senha única compartilhada para toda ação de escrita da área interna,
sem autenticação individual (RN-12: papel operacional único, nenhuma ação
atribuída a pessoa física). RNF-03 exige hash seguro de senha e proteção básica
contra força bruta. O ADR-002 adotou Supabase como plataforma, que já oferece
Supabase Auth — mas Supabase Auth é desenhado para **identidade individual**
(usuário/e-mail/telefone, sessão por conta), o oposto do modelo de papel único
exigido pelo RN-12.

## Decision Drivers

- RF-07/RN-12: uma única senha compartilhada, sem conta individual, sem
  hierarquia de permissão.
- RNF-03: hash seguro (nunca texto puro) e proteção básica contra força bruta.
- RF-07.3: mensagem de erro genérica, sem detalhar motivo da falha.
- RNF-04: custo mínimo — não introduzir serviço externo pago só para isso.

## Considered Options

- **Camada de autenticação custom**: tabela própria com hash da senha
  compartilhada (argon2id), validação em Route Handler do Next.js, sessão via
  cookie assinado (JWT ou token opaco) httpOnly/secure/SameSite=strict, TTL curto,
  rate limiting registrado em tabela Postgres própria.
- **Supabase Auth com uma única conta compartilhada** (um e-mail/senha único
  usado por todo o grupo, tratado como "usuário organizador").
- **Autenticação via variável de ambiente/Basic Auth no nível de proxy/CDN**
  (ex.: middleware do Vercel com usuário/senha fixos).

## Decision Outcome

Chosen option: **"Camada de autenticação custom"**, porque é a única opção que
modela corretamente "senha única, sem identidade individual, sem hierarquia" sem
forçar um conceito de conta de usuário que o próprio RN-12 explicitamente
rejeita. Usar Supabase Auth com uma conta compartilhada funcionaria
tecnicamente, mas introduziria conceitos desnecessários (recuperação de senha
por e-mail individual, gestão de sessão por usuário) que não têm sentido de
produto aqui e aumentariam a superfície de configuração sem benefício real.
Basic Auth em nível de proxy foi descartada por não permitir a mensagem de erro
customizada exigida (RF-07.3) nem registro de tentativas para rate limiting
próprio do domínio.

### Positive Consequences

- Modelo de dados e UX refletem exatamente RN-12 (nenhuma noção de conta
  individual introduzida por acidente da ferramenta escolhida).
- Controle total sobre rate limiting e mensagem de erro (RF-07.3) sem depender
  de comportamento de uma biblioteca de terceiro pensada para outro caso de uso.
- Sem custo adicional de serviço externo.

### Negative Consequences

- Responsabilidade de implementar corretamente hash (argon2id), geração/validação
  de sessão e rate limiting fica inteiramente com o time do projeto — sem a
  robustez "pronta" de um provedor de identidade especializado.
- Precisa de disciplina extra de revisão (DevSecOps, mais adiante) para garantir
  que a implementação custom não introduza vulnerabilidade que uma biblioteca
  madura já teria coberto (ex.: timing attack na comparação de hash).

## Pros and Cons of the Options

### Camada de autenticação custom ✅ Chosen

- ✅ Modela exatamente RN-12 (papel único, sem conta individual)
- ✅ Controle total sobre rate limiting e mensagens de erro
- ✅ Sem custo de serviço externo
- ❌ Responsabilidade de segurança recai inteiramente sobre o código próprio

### Supabase Auth com conta única compartilhada

- ✅ Reaproveita infraestrutura de auth já gerenciada pela plataforma (ADR-002)
- ❌ Introduz conceito de "conta"/e-mail individual que RN-12 rejeita
  explicitamente
- ❌ Funcionalidades como recuperação de senha por e-mail não fazem sentido de
  produto aqui, mas viriam habilitadas por padrão

### Basic Auth em proxy/CDN

- ✅ Extremamente simples de configurar
- ❌ Sem controle sobre mensagem de erro customizada (RF-07.3)
- ❌ Sem lugar natural para registrar tentativas de força bruta por regra de
  negócio própria

## Links

- Relacionado: ADR-002 (Supabase como plataforma), ADR-003 (Next.js)
- PRD-TECNICO.md, RF-07, RNF-03, RN-12
- `CTO-REVIEW.md`, Gate 1, risco estratégico #2
- Supersedes: Nenhum
- Superseded by: Nenhum
