# ADR-002: Adotar o Projeto Supabase Legado como Plataforma de Backend/Banco de Dados do Novo Sistema

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, database, vendor-lock-in, migration

> **Marcado para `build-vs-buy-analysis` e `risk-and-compliance-check` no Gate 2 do
> CTO** — decisão de alto risco/custo (vendor lock-in), conforme guardrail de
> limite de autoridade do Software Architect. Este ADR registra a decisão tomada
> dentro do que o PRD-TECNICO.md permite; só passa a fazer parte do SDD.md final
> após aprovação do CTO.

## Context and Problem Statement

O stakeholder confirmou, após a entrega inicial do PRD-TECNICO.md, uma restrição
técnica não negociável: o projeto deve **manter e reaproveitar** um banco de dados
Supabase de um projeto legado (`ipnbdrejlikrmqyxggsp`), que já contém cadastro de
jogadores, histórico de rodadas/eventos, ranking calculado, configuração de
pontuação e times — com **zero perda de dados** (RNF-12) e **schema livre para
modificação** (RF-08.3). Credenciais só estarão disponíveis na fase de execução;
o schema exato ainda não foi detalhado (Seção 6, item 8 do PRD-TECNICO.md — tratado
como spike formal, ver Seção 6 do SDD.md). A pergunta arquitetural central é: dado
que os dados já residem no Supabase legado, o novo sistema deve (a) continuar
usando Supabase como sua plataforma de backend/banco de dados, ou (b) migrar os
dados para outra tecnologia de banco/plataforma?

## Decision Drivers

- RF-08/RNF-11/RNF-12: zero perda de dados, integridade referencial, migração
  auditável e reversível.
- RNF-04: custo de hospedagem/operação próximo de zero — Supabase já está
  provisionado (mesmo que em tier gratuito/baixo custo) e evita custo de nova
  infraestrutura de banco gerenciado.
- RN-13/RF-08.4: histórico deve ser preservado como está, não recalculado — menor
  risco de erro de transformação quanto menos etapas de tradução entre plataformas
  distintas de banco de dados.
- Restrição real: já existe investimento (dados + provavelmente estrutura) no
  projeto Supabase; descartar a plataforma significaria migrar dados **duas
  vezes** conceitualmente (extrair do Supabase → outra tecnologia), aumentando o
  risco de perda/inconsistência que RNF-12 proíbe.

## Considered Options

- **(A) Adotar o próprio Supabase (mesmo projeto legado) como plataforma de
  backend/banco de dados do novo sistema**, com schema reformulado dentro do
  mesmo projeto (nova schema `app`, mantendo a schema legada intacta até
  validação — ver ADR-008).
- **(B) Migrar os dados do Supabase legado para um Postgres self-hosted/gerenciado
  por outro provedor** (ex.: Railway, Render, RDS), mantendo linguagem/protocolo
  SQL mas trocando a plataforma gerenciada.
- **(C) Migrar os dados para uma tecnologia de banco diferente** (ex.: Firebase/
  Firestore, PlanetScale/MySQL), reescrevendo modelo de dados e camada de acesso
  do zero.
- **(D) Extrair um dump dos dados do legado e tratá-lo como carga inicial "fria"
  em qualquer tecnologia nova**, sem qualquer dependência futura do Supabase.

## Decision Outcome

Chosen option: **"(A) Adotar o próprio Supabase como plataforma do novo sistema"**,
porque os dados já residem lá, a restrição do stakeholder é de **reaproveitamento**
(não de migração de plataforma), e Supabase já entrega, sem custo/esforço
operacional adicional, os elementos que o PRD-TECNICO.md exige de qualquer forma:
Postgres gerenciado com backups/PITR (RNF-05), Row Level Security para a fronteira
de exposição pública sem PII (RN-01, ver ADR-005/Seção 7), funções/triggers para
atomicidade (RNF-10, ver ADR-006), e um caminho de migração **dentro do mesmo
banco físico** (nova schema ao lado da legada) que reduz o número de saltos de
dados e, portanto, o risco de perda/inconsistência que RNF-12 trata como restrição
não negociável. Migrar para outra plataforma (opções B/C/D) adicionaria uma etapa
inteira de migração de infraestrutura sem nenhum requisito do PRD-TECNICO.md que a
exija — seria complexidade não solicitada, o oposto do que RNF-04 pede.

### Positive Consequences

- Menor risco de perda de dados: migração ocorre dentro do mesmo banco físico
  (nova schema), sem etapa de transporte de dados entre provedores distintos.
- Reaproveita backup/PITR, RLS, API autogerada e funções (RPC) já nativos da
  plataforma, sem custo adicional de operação.
- Caminho de rollback mais simples: schema legada permanece intocada até
  validação (RF-08.5/RF-08.6), podendo servir de fonte de verdade para
  reconciliação caso algo dê errado na nova schema.

### Negative Consequences

- **Vendor lock-in confirmado**: regras de negócio críticas passam a depender de
  funcionalidades específicas do Postgres/Supabase (RLS, PL/pgSQL, PostgREST),
  dificultando uma eventual troca de plataforma no futuro sem reescrever essa
  lógica.
- Dependência de disponibilidade/roadmap comercial do Supabase (tier gratuito tem
  limitações reais — ver risco correspondente na Seção 6 do SDD.md sobre
  pausa de projeto por inatividade em tier free).
- Superfície de exposição herdada: Supabase expõe automaticamente API REST/
  GraphQL sobre toda tabela por padrão — exige disciplina explícita de RLS
  (ADR-005) para não vazar dado sensível por omissão.

### Plano de Saída

> Adendo (2026-09-02, software-architect) — resolução de `BLOCKER-003`
> (Gate 3, CTO). Não reabre a decisão: Opção A permanece `Accepted`.

Caso o tier comercial do Supabase se torne inviável (custo ou limitação de
capacidade), a **Opção B** (migração para Postgres self-hosted/outro provedor
gerenciado, ex.: Railway, Render, RDS) é a rota de saída de baixo custo: schema,
políticas de RLS e funções PL/pgSQL foram construídas em Postgres padrão (sem uso
de extensão proprietária não portável) e portam quase sem reescrita para qualquer
Postgres gerenciado, conforme já detalhado na análise `build-vs-buy-analysis` do
Gate 2 (`CTO-REVIEW.md`). O que **não** porta automaticamente é a API REST/GraphQL
autogerada (PostgREST) e o backup/PITR nativo do Supabase — ambos exigiriam
substituto equivalente (camada de API própria ou PostgREST self-hosted; rotina de
backup gerenciada pelo novo provedor) como parte de qualquer execução real dessa
rota.

## Pros and Cons of the Options

### (A) Adotar o próprio Supabase ✅ Chosen

- ✅ Zero salto de plataforma — menor risco de perda de dado (RNF-12)
- ✅ Backup, RLS, funções e API já inclusos, sem custo adicional
- ✅ Alinhado à restrição literal do stakeholder ("manter e reaproveitar")
- ❌ Vendor lock-in em funcionalidades específicas do Postgres/Supabase
- ❌ Dependente do tier comercial do Supabase (limitações de tier gratuito)

### (B) Migrar para Postgres self-hosted/outro provedor gerenciado

- ✅ Mantém compatibilidade SQL, reduzindo (não eliminando) lock-in de linguagem
- ❌ Exige etapa adicional de migração de infraestrutura sem requisito que a
  exija — custo/prazo desproporcional (contradiz limite de autoridade do
  Architect de não impor custo desproporcional sem sinalizar)
- ❌ Perde RLS/API autogerada/backups nativos do Supabase, exigindo construí-los

### (C) Migrar para tecnologia de banco diferente

- ✅ Elimina lock-in específico de Postgres/Supabase
- ❌ Maior risco de erro de transformação de schema/tipos, o que colide
  diretamente com RNF-12 (zero perda de dados) e RN-13 (preservação exata do
  histórico)
- ❌ Reescreve toda a camada de acesso a dados sem ganho declarado no
  PRD-TECNICO.md

### (D) Dump como carga fria em nova tecnologia

- ✅ Corta qualquer dependência futura do Supabase
- ❌ Mesmo risco de (C), mas sem sequer manter o banco físico original como
  fonte de reconciliação durante a validação (RF-08.5) — maior risco
  operacional durante a janela de validação

## Links

- Relacionado: ADR-001 (Monólito Modular sobre BaaS), ADR-005 (RLS/Views
  Públicas), ADR-006 (Atomicidade via Postgres Functions), ADR-008 (Migração
  Não-Destrutiva)
- PRD-TECNICO.md, RF-08, RNF-11, RNF-12, RN-13, Seção 5.2, Seção 6 item 8
- Supersedes: Nenhum
- Superseded by: Nenhum
