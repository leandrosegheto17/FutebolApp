# ADR-001: Adotar Monólito Modular sobre Plataforma BaaS como Estilo Arquitetural

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, monolith, baas

## Context and Problem Statement

O PRD-TECNICO.md descreve uma aplicação web CRUD de porte pequeno (cadastro de
atletas, lançamento de rodada, ranking público, correção com estorno, montagem de
times, senha única interna), operada por um único grupo amador ("Turma do Rola -
Comary"), com RNF-04 exigindo custo de hospedagem/operação próximo de zero e sem
SLA formal, e sem equipe de operação dedicada. Não há indício de múltiplos
domínios de negócio independentes que justifiquem serviços separados, nem volume
que justifique arquitetura distribuída.

## Decision Drivers

- RNF-04: custo de hospedagem/operação próximo de zero.
- Ausência de equipe de operação dedicada (grupo amador, papel operacional único).
- Volume esperado: dezenas de atletas, uma rodada semanal — não exige escala
  horizontal nem particionamento de domínio.
- RF-08/RNF-11/RNF-12: dados já residem num projeto Supabase legado que deve ser
  reaproveitado (ver ADR-002).

## Considered Options

- Monólito modular sobre plataforma BaaS (Backend-as-a-Service), com lógica de
  domínio crítica em funções/triggers de banco e uma camada fina de API serverless.
- Microsserviços (um serviço por domínio: atletas, rodadas, ranking, times).
- Monólito tradicional com backend dedicado (ex.: NestJS) e banco próprio, sem BaaS.

## Decision Outcome

Chosen option: **"Monólito modular sobre plataforma BaaS"**, porque nenhum dos
drivers acima justifica a complexidade operacional de microsserviços (múltiplos
deploys, orquestração, observabilidade distribuída — tudo custo e complexidade
desproporcionais a RNF-04 e ao porte real do problema), e a plataforma BaaS
(Supabase, ADR-002) já resolve banco de dados gerenciado, backups, RLS e API
autogerada, reduzindo a superfície de código próprio ao mínimo necessário para as
regras de negócio que exigem atomicidade/lógica específica (RF-02, RF-04, RF-05).

### Positive Consequences

- Um único deploy (frontend + camada de API fina), custo operacional mínimo.
- Fronteiras de módulo (Atletas, Rodadas/Eventos, Ranking, Times, Auditoria,
  Migração) continuam claras dentro do monólito, preservando testabilidade e
  possibilidade futura de extração, sem pagar o custo agora.
- Reduz pontos de falha distribuída (sem rede entre serviços internos).

### Negative Consequences

- Escala verticalmente primeiro; se o grupo crescer para múltiplos grupos/
  campeonatos simultâneos (fora de escopo declarado no PRD.md), a arquitetura
  precisaria ser revisitada.
- Lógica de negócio crítica parcialmente no banco (Postgres functions) acopla o
  domínio à plataforma, mitigado por ADR-002/ADR-006.

## Pros and Cons of the Options

### Monólito modular sobre BaaS ✅ Chosen

- ✅ Custo mínimo, um único deploy
- ✅ Aproveita gerenciamento de banco/backup/RLS já incluso na plataforma
- ✅ Fronteiras de módulo preservadas para evolução futura
- ❌ Acoplamento a funcionalidades específicas do Postgres/Supabase (RLS, RPC)

### Microsserviços

- ✅ Escalabilidade independente por domínio
- ❌ Complexidade operacional (deploy, observabilidade, rede interna)
  desproporcional ao volume e à equipe (RNF-04)
- ❌ Custo de infraestrutura multiplicado sem ganho real neste porte

### Monólito tradicional sem BaaS (backend dedicado + banco próprio)

- ✅ Menor acoplamento a um vendor específico
- ❌ Ignora a restrição de reaproveitar o banco legado Supabase (RF-08), exigindo
  migração de plataforma além de migração de dados — custo desproporcional
- ❌ Backend dedicado exige mais código próprio para o que o BaaS já resolve
  (auth de infraestrutura, backup, API autogerada)

## Links

- Relacionado: ADR-002 (Adotar Supabase), ADR-003 (Next.js)
- Supersedes: Nenhum
- Superseded by: Nenhum
