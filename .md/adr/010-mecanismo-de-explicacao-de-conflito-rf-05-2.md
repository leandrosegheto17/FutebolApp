# ADR-010: Mecanismo de Extração e Contrato de Dado para Explicação de Conflito (RF-05.2)

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, algorithm, api-contract

> **Resolve BLOCKER-001** (`BLOCKERS.md`, origem UX/UI) e a ressalva item 6 do
> Gate 2 do CTO (`CTO-REVIEW.md`, "Mecanismo de explicação de conflito para
> RF-05.2 não tem mecanismo algorítmico definido"). Não supersede o ADR-007 —
> complementa-o: o ADR-007 decidiu a abordagem de duas fases (backtracking +
> busca local); este ADR decide especificamente **como** a fase de backtracking
> produz a explicação de conflito exigida por RF-05.2 quando nenhuma divisão
> 100% válida existe, e **qual o contrato de dado exato** devolvido à
> apresentação.

## Context and Problem Statement

RF-05.2 exige que, quando não existir nenhuma divisão de times que satisfaça
100% das restrições obrigatórias (RN-11) entre os presentes, o sistema informe
ao organizador **quais restrições especificamente** não puderam ser
satisfeitas — não apenas que "não há solução". O ADR-007 registrou essa
capacidade como resultado esperado da fase de backtracking, mas não detalhou o
algoritmo de extração da explicação nem o formato de dado devolvido pela API —
o próprio Gate 2 do CTO identificou essa lacuna formalmente (item 6) e o
`UX-SPEC.md` (Seção 7.2, item 1 / T09) desenhou a tela assumindo uma lista
estruturada de pares em conflito (`[{atleta_a, atleta_b, motivo}]`) como
suposição de trabalho a confirmar.

Extrair o **subconjunto mínimo estrito** de restrições que causam a
inviabilidade (um "núcleo insatisfável mínimo", no sentido de satisfação de
restrições) é, em geral, um subproblema combinatório à parte, potencialmente
tão custoso quanto o próprio problema de busca — o CTO explicitamente notou
isso no Risco 6 do Gate 2 ("subproblema à parte que o SDD.md não detalha").
Este ADR evita resolver esse subproblema mais difícil, optando por uma
granularidade de explicação mais simples, sempre correta e barata de computar.

## Decision Drivers

- RF-05.2: a explicação deve identificar restrições específicas, não um
  booleano genérico.
- RNF-04: custo mínimo — não introduzir um algoritmo de segunda ordem (busca de
  núcleo mínimo insatisfável) apenas para produzir a mensagem de erro.
- Volume real esperado (~30-40 presentes/rodada, poucas dezenas de restrições
  obrigatórias cadastradas no total, tipicamente vínculos informais e
  esparsos) — favorece uma solução simples sobre uma genérica.
- Compatibilidade com o `UX-SPEC.md` (T09/`ConflictList`): minimizar a
  necessidade de redesenho da tela já especificada.
- RF-05.1 não fixa explicitamente o número de times por rodada no
  PRD-TECNICO.md; o mecanismo abaixo é parametrizado por **N = número de times
  solicitado pelo organizador para aquela rodada** (não assume N=2 como fato de
  arquitetura). Nota: a origem exata de N (sempre 2, ou informado pelo
  organizador por rodada) é uma lacuna de requisito não coberta por este ADR —
  fica registrada como ponto de atenção para o Tech Lead confirmar ao
  decompor RF-05.1 em `TASK.md`; não bloqueia esta decisão porque o algoritmo
  abaixo funciona para qualquer N ≥ 2.

## Considered Options

- **Opção A — Núcleo insatisfável mínimo (minimal unsatisfiable core)**:
  algoritmo dedicado (ex.: QuickXplain ou busca por remoção incremental de
  restrições) que encontra o menor subconjunto de pares RN-11 cuja remoção
  tornaria o problema viável.
- **Opção B — Booleano simples ("sem solução")**: sem identificar nenhuma
  restrição específica — é a suposição "mais simples" que o `UX-SPEC.md`
  cogitou como alternativa caso este ADR não definisse algo melhor.
- **Opção C — Explicação por componente conexo do grafo de restrições**:
  decompor o grafo de restrições obrigatórias ativas entre os presentes em
  componentes conexos (union-find, O(V+E)); rodar a mesma busca de
  backtracking do ADR-007 isoladamente em cada componente, usando N como
  número de cores/times; reportar, para cada componente que falhar, **todos**
  os pares de restrição daquele componente (não necessariamente o subconjunto
  mínimo, mas sempre o subconjunto correto e completo — nenhuma restrição de
  fora do componente é incluída, nenhuma restrição relevante do componente é
  omitida).

## Decision Outcome

Chosen option: **"Opção C — Explicação por componente conexo"**, porque
satisfaz literalmente RF-05.2 (identifica exatamente quais restrições estão
envolvidas na inviabilidade) sem exigir um algoritmo de segunda ordem para
minimalidade estrita. Como componentes conexos são, por definição, isolados
entre si (nenhuma restrição cruza a fronteira de dois componentes diferentes),
o backtracking já decidido no ADR-007 pode ser executado **por componente**:
se um componente de tamanho pequeno (esperado: 2 a 5 atletas, dado o caráter
informal e esparso das restrições, RN-11) não admite coloração válida em N
times, todo o conjunto de arestas (pares) daquele componente é, por construção
de grafo, exatamente o conjunto de restrições que conflitam entre si — nenhuma
restrição fora dele poderia ter causado ou resolvido aquela inviabilidade
específica, e nenhuma aresta do componente pode ser omitida sem alterar o
resultado da checagem de viabilidade. Isso é uma garantia mais fraca que
"mínimo estrito" (Opção A), mas equivalente na prática dado o volume esperado
de restrições (poucas, esparsas) — e evita introduzir uma dependência
algorítmica nova só para a mensagem de erro. A Opção B foi descartada por
violar RF-05.2 diretamente (não identifica restrição nenhuma). A Opção A foi
descartada por introduzir complexidade e custo de implementação
desproporcional (RNF-04) ao ganho marginal de precisão, dado que os
componentes já são pequenos por natureza do domínio.

### Algoritmo (resumo determinístico)

1. Construir o grafo `G = (V, E)` onde `V` = atletas presentes na rodada e `E`
   = pares com registro ativo em `RESTRICAO_OBRIGATORIA` (`ativo = true`) entre
   dois presentes.
2. Calcular componentes conexos de `G` (union-find, O(V+E)).
3. Para cada componente `C`, executar o backtracking do ADR-007 restrito aos
   vértices de `C`, tentando uma coloração válida em `N` times (nenhuma aresta
   de `C` com as duas pontas na mesma cor).
4. Se **todo** componente admite coloração válida: resultado é `status: "ok"`
   — segue o fluxo normal já descrito no ADR-007 (fase 2, busca local de
   equilíbrio de soft constraints, respeitando as cores fixadas por
   componente).
5. Se **algum** componente falhar: resultado é `status: "conflito"` — a
   resposta lista, para cada componente que falhou, todos os pares (arestas)
   daquele componente. Componentes que tiveram coloração válida **não** são
   reportados (não fazem parte do problema).

### Contrato de dado (API — Serviço de Times)

Resposta da requisição de sugestão de times, quando `status = "conflito"`:

```json
{
  "status": "conflito",
  "restricoes_conflitantes": [
    {
      "restricao_id": "uuid",
      "atleta_a_id": "uuid",
      "atleta_a_nome": "string (apelido_exibicao)",
      "atleta_b_id": "uuid",
      "atleta_b_nome": "string (apelido_exibicao)",
      "motivo": "restricao_obrigatoria_ativa",
      "grupo_conflito": "integer, 1-based — agrupa pares do mesmo componente conexo"
    }
  ],
  "grupos_conflito": [
    {
      "grupo_conflito": 1,
      "atletas_ids": ["uuid", "uuid", "uuid"],
      "quantidade_times_solicitada": "integer (N)",
      "mensagem": "Com {N} time(s) disponível(is), não é possível separar os {K} atletas deste grupo sem que alguma restrição obrigatória fique violada."
    }
  ]
}
```

Quando `status = "ok"`, a resposta segue o formato já implícito no ADR-007
(times sugeridos + indicadores de equilíbrio), sem o campo
`restricoes_conflitantes`.

Este contrato **é uma superestrutura** da suposição do `UX-SPEC.md`
(`[{atleta_a, atleta_b, motivo}]`) — o array `restricoes_conflitantes` contém
exatamente essa forma, com os campos adicionais (`restricao_id`,
`atleta_a_nome`/`atleta_b_nome`, `grupo_conflito`) sendo aditivos, não
substitutivos. O componente `ConflictList` (T09) pode ser implementado
consumindo apenas `restricoes_conflitantes` (sem redesenho) e, opcionalmente,
usar `grupos_conflito` para agrupar visualmente pares do mesmo aglomerado com
uma frase explicativa agregada (o padrão já antecipado no wireframe de T09:
"Com apenas 2 times, não é possível separar os três simultaneamente").

### Positive Consequences

- Satisfaz RF-05.2 literalmente: toda restrição reportada é, comprovadamente,
  parte de uma inviabilidade real (não é ruído nem suposição).
- Não exige biblioteca ou algoritmo novo além do que o ADR-007 já decidiu
  (backtracking) — só a decomposição por componente conexo (união-find,
  trivial).
- Compatível com o `UX-SPEC.md` sem exigir redesenho de T09 — resolve o
  Blocker sem gerar reestimativa de tela pelo Tech Lead.
- Determinístico e testável por componente isoladamente.

### Negative Consequences

- **Dívida técnica aceita conscientemente** (ver Seção 6.3 do SDD.md,
  atualizada): a explicação reportada é o **componente conexo inteiro**, não o
  subconjunto mínimo estrito — em tese, um componente grande com muitas
  arestas poderia reportar mais pares do que o mínimo teórico necessário.
  Aceitável porque o volume real esperado de restrições obrigatórias é baixo e
  esparso (vínculos informais cadastrados manualmente, RF-05.5), tornando
  componentes tipicamente pequenos (2-5 atletas) — condição de revisão:
  revisitar (introduzir extração de núcleo mínimo, Opção A) se, na prática,
  aparecerem componentes de conflito grandes (>8 atletas) que tornem a
  explicação confusa para o organizador.
- A origem exata de `N` (número de times por rodada) permanece uma lacuna de
  requisito a ser confirmada pelo Tech Lead (ver Decision Drivers) — não
  decidida por este ADR.

## Pros and Cons of the Options

### Opção C — Explicação por componente conexo ✅ Chosen

- ✅ Satisfaz RF-05.2 com precisão real (nenhum falso positivo/negativo)
- ✅ Reaproveita o backtracking já decidido em ADR-007, sem nova dependência
- ✅ Compatível com o contrato assumido pelo `UX-SPEC.md`, sem redesenho de T09
- ❌ Não garante minimalidade estrita do conjunto reportado (aceito como dívida
  técnica, condição de revisão registrada)

### Opção A — Núcleo insatisfável mínimo

- ✅ Precisão máxima (menor conjunto possível reportado)
- ❌ Subproblema combinatório à parte, custo de implementação e execução
  desproporcional ao ganho prático dado o volume esperado (RNF-04)

### Opção B — Booleano simples

- ✅ Trivial de implementar
- ❌ Viola RF-05.2 diretamente — não identifica nenhuma restrição específica
- ❌ Forçaria redesenho de T09 (`UX-SPEC.md`), gerando reestimativa desnecessária

## Links

- Relacionado: ADR-007 (Heurística de duas fases para montagem de times) — não
  supersede, complementa.
- `BLOCKERS.md`, BLOCKER-001 (origem UX/UI).
- `CTO-REVIEW.md`, Gate 2, Risco 6 / Recomendação item 6.
- `UX-SPEC.md`, Seção 7.2, item 1 (T09, componente `ConflictList`).
- PRD-TECNICO.md, RF-05.1, RF-05.2, RN-11.
- Ver também: Seção 6.3 do SDD.md (Dívida Técnica Aceita, atualizada).
- Supersedes: Nenhum
- Superseded by: Nenhum
