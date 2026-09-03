# ADR-006: Usar Funções/Triggers PL/pgSQL para Cálculo Atômico e Estorno Automático de Pontuação

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, database, consistency

## Context and Problem Statement

RNF-10 exige que toda operação que altera saldo acumulado (lançamento, correção,
exclusão) seja atômica — o ranking nunca pode ficar parcialmente atualizado e
visível ao público entre o início e o fim de um recálculo. RF-04.1/RF-04.2/RF-04.3
exigem que exclusão/correção de rodada reverta ou ajuste automaticamente todos os
pontos (presença, ausência, gols, cartões, eventos vinculados de substituição) sem
lançamento manual de estorno. Isso é uma cadeia de efeitos em cascata sobre
múltiplas tabelas (participação, eventos, substituições) que precisa ser
tudo-ou-nada.

## Decision Drivers

- RNF-10: atomicidade obrigatória, sem estado parcial visível publicamente.
- RF-04.1/RF-04.2/RF-04.3: estorno/ajuste automático, incluindo efeitos em
  cascata de eventos vinculados.
- RF-04.4: toda correção/exclusão gera log de auditoria (antes/depois) como parte
  da **mesma** operação.

## Considered Options

- **Funções PL/pgSQL (RPC) no Postgres**, chamadas via API server-side, que
  executam o lançamento/correção/estorno e a escrita do log de auditoria dentro
  de uma única transação de banco.
- **Lógica de aplicação (TypeScript, na camada de API) orquestrando múltiplas
  chamadas SQL dentro de uma transação aberta manualmente pelo cliente**.
- **Fila assíncrona de eventos (event sourcing) com processamento eventual** do
  saldo agregado.

## Decision Outcome

Chosen option: **"Funções PL/pgSQL (RPC) no Postgres"**, porque coloca a
garantia de atomicidade no mesmo lugar onde a transação de banco já existe
nativamente, eliminando a necessidade de gerenciar transações distribuídas entre
camada de aplicação e banco através de uma conexão serverless (que pode ser
efêmera). Uma função de banco que insere/reverte linhas em `lancamento_pontos`,
atualiza o saldo agregado e grava o log de auditoria roda inteiramente dentro de
uma transação Postgres padrão — se qualquer etapa falhar, tudo reverte
automaticamente (ROLLBACK nativo), satisfazendo RNF-10 sem código de coordenação
extra. Fila assíncrona foi descartada porque RF-02.7 exige consistência
**imediata** do ranking público após confirmação do lançamento — processamento
eventual introduziria uma janela de inconsistência que o requisito
explicitamente proíbe.

### Positive Consequences

- Atomicidade garantida pelo próprio motor de banco (ACID nativo), sem lógica de
  coordenação de transação distribuída na camada de aplicação.
- Estorno em cascata (RF-04.3) e log de auditoria (RF-04.4) fazem parte da mesma
  transação — não existe estado onde o estorno aconteceu mas o log não foi
  gravado, ou vice-versa.
- Testável isoladamente via `psql`/testes de banco, independente da camada de
  API.

### Negative Consequences

- Lógica de negócio (cálculo de pontos, regras de estorno) passa a viver em
  PL/pgSQL, uma linguagem menos familiar e com ferramental de teste unitário
  mais limitado que TypeScript — exige disciplina extra de documentação e testes
  de integração (a cargo do QA mais adiante).
- Acopla ainda mais a lógica de domínio ao Postgres/Supabase especificamente
  (reforça a consequência negativa já registrada no ADR-002).

## Pros and Cons of the Options

### Funções PL/pgSQL (RPC) ✅ Chosen

- ✅ Atomicidade nativa via transação de banco
- ✅ Estorno em cascata + log de auditoria na mesma transação
- ❌ Lógica de negócio em linguagem menos familiar ao time (PL/pgSQL)

### Lógica de aplicação com transação manual

- ✅ Lógica de negócio em TypeScript, mais familiar
- ❌ Gerenciar transação distribuída via conexão serverless efêmera é frágil —
  risco real de conexão cair no meio da transação em ambiente serverless
- ❌ Mais código de coordenação para replicar o que o banco já faz nativamente

### Fila assíncrona / event sourcing

- ✅ Desacopla escrita de leitura, escalável a longo prazo
- ❌ Introduz janela de inconsistência incompatível com RF-02.7 (ranking
  imediatamente consistente)
- ❌ Complexidade operacional desproporcional ao volume real (RNF-04)

## Links

- Relacionado: ADR-002 (Supabase), ADR-001 (Monólito Modular)
- PRD-TECNICO.md, RNF-10, RF-04.1, RF-04.2, RF-04.3, RF-04.4, RF-02.7
- Supersedes: Nenhum
- Superseded by: Nenhum
