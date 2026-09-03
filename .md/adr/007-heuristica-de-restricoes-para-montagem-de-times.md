# ADR-007: Usar Heurística Determinística de Satisfação de Restrições para Montagem de Times Equilibrados

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, algorithm

> **Marcado para `architecture-decision-review` no Gate 2 do CTO** — cobrança
> explícita do Gate 1 (`CTO-REVIEW.md`, risco estratégico #3: montagem de times
> com restrições informais exige justificativa de abordagem algorítmica).

## Context and Problem Statement

RF-05 exige montar times que satisfaçam 100% das restrições obrigatórias
(hard constraints, RN-11 — pares de atletas que não podem ficar no mesmo time)
entre os presentes de uma rodada, e que minimizem a diferença agregada de nível
técnico (RN-03) e idade (soft constraints) entre os times. Se nenhuma divisão
satisfizer 100% das restrições obrigatórias, o sistema deve informar exatamente
quais restrições conflitam (RF-05.2), em vez de silenciosamente ignorá-las. O
CTO, no Gate 1, classificou isso como "problema de satisfação de restrições não
trivial" e cobrou justificativa explícita da abordagem no SDD.md.

## Decision Drivers

- RF-05.1/RF-05.2: 100% das restrições obrigatórias devem ser satisfeitas, ou o
  sistema deve reportar o conflito de forma explícita e específica.
- RF-05.3: nível técnico + idade como critério de equilíbrio (soft constraint),
  minimizando diferença agregada — não exige solução ótima matematicamente
  provada, só "boa o suficiente" para uso prático.
- Volume real esperado: rodada de grupo amador, tipicamente até ~30-40 atletas
  presentes por rodada — não é um problema de escala industrial.
- RNF-04: custo mínimo — não introduzir solver de otimização comercial/serviço
  externo pago.

## Considered Options

- **Heurística determinística de duas fases**: (1) backtracking com poda sobre
  os pares de restrição obrigatória, para encontrar uma partição viável em times
  que satisfaça 100% das hard constraints (ou provar que nenhuma partição
  viável existe, reportando o conjunto de restrições em conflito); (2) sobre as
  partições viáveis, busca local (ex.: swap iterativo entre times) minimizando a
  diferença agregada de nível técnico + idade (soft constraints).
- **Solver de otimização genérico** (ex.: programação por restrições via
  biblioteca de CSP/ILP) tratando hard e soft constraints como função objetivo
  única.
- **Heurística puramente gulosa** (ex.: draft alternado por nível técnico
  descendente, ignorando hard constraints até o fim e tentando corrigir
  depois).
- **Aprendizado de máquina** (modelo treinado para sugerir times) — descartado
  já no Gate 1 pelo CTO como não aplicável (não é problema de ML).

## Decision Outcome

Chosen option: **"Heurística determinística de duas fases (backtracking + busca
local)"**, porque separa claramente a garantia **binária** exigida por RF-05.1/
RF-05.2 (100% das hard constraints, ou relatar o conflito com precisão) da
otimização de **melhor esforço** exigida por RF-05.3 (soft constraints). Um
solver de otimização genérico tornaria as duas coisas uma única função objetivo
ponderada, dificultando garantir a semântica exata de RF-05.2 ("informar quais
restrições não puderam ser satisfeitas" — não "encontrar o menor número de
violações"). A heurística gulosa pura foi descartada porque corrigir hard
constraints depois de uma montagem inicial não garante encontrar uma partição
viável quando ela existe, violando RF-05.1. Dado o volume real esperado (dezenas
de atletas, não milhares), o backtracking com poda é computacionalmente trivial
— não há necessidade de um solver mais sofisticado.

### Positive Consequences

- Semântica exata de RF-05.1/RF-05.2 preservada: a fase de backtracking ou
  encontra uma partição 100% válida, ou identifica precisamente o conjunto de
  restrições conflitantes, sem ambiguidade.
- Sem dependência de biblioteca externa de otimização/solver comercial — reduz
  custo e superfície de manutenção (RNF-04).
- Determinístico: a mesma entrada sempre produz o mesmo resultado, o que ajuda
  organizador e QA a validar/reproduzir casos de teste.

### Negative Consequences

- **Dívida técnica aceita conscientemente** (ver Seção 6 do SDD.md): backtracking
  exato tem complexidade combinatória no pior caso — aceitável para o volume
  esperado (~30-40 presentes), mas precisa ser revisitado (ex.: trocar a fase 1
  por uma heurística aproximada com relaxação de restrições) se o grupo crescer
  muito além do volume amador típico.
- A qualidade do equilíbrio de soft constraints (fase 2, busca local) não é
  garantidamente ótima globalmente — é "boa o suficiente", não a melhor divisão
  matematicamente possível. Aceitável porque RF-05.3 não exige otimalidade
  provada, e RF-05.4 permite ajuste manual do organizador de qualquer forma.

## Pros and Cons of the Options

### Heurística de duas fases (backtracking + busca local) ✅ Chosen

- ✅ Garante semântica exata de RF-05.1/RF-05.2
- ✅ Sem dependência externa, custo mínimo
- ✅ Determinístico e testável
- ❌ Complexidade combinatória no pior caso (aceita como dívida técnica,
  condição de revisão registrada na Seção 6 do SDD.md)

### Solver de otimização genérico (CSP/ILP)

- ✅ Pode encontrar soluções mais sofisticadas simultaneamente para hard e soft
  constraints
- ❌ Dificulta preservar a semântica binária exata de RF-05.2 (relatar conflito
  específico, não só "sem solução ótima")
- ❌ Introduz dependência/complexidade desproporcional ao volume real (RNF-04)

### Heurística gulosa pura

- ❌ Não garante encontrar partição viável quando ela existe — viola RF-05.1
- ✅ Mais simples e rápida de implementar

### Aprendizado de máquina

- ❌ Já descartado no Gate 1 do CTO como não aplicável a este problema
- ❌ Exigiria dados de treinamento inexistentes neste contexto

## Links

- Relacionado: ADR-001 (Monólito Modular)
- PRD-TECNICO.md, RF-05.1, RF-05.2, RF-05.3, RF-05.4, RN-03, RN-11
- `CTO-REVIEW.md`, Gate 1, risco estratégico #3
- Ver também: Seção 6 do SDD.md (Riscos Técnicos e Dívida Técnica Aceita)
- Supersedes: Nenhum
- Superseded by: Nenhum
