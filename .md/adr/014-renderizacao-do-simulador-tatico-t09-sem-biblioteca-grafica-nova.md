# ADR-014: Renderização do Simulador Tático de Campo (T09) por Composição de Componentes CSS Existentes, sem Biblioteca de Renderização Gráfica Nova

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: frontend, design-system, dependency

## Context and Problem Statement

O `PRD-TECNICO.md` Parte II revive, como parte da nova pele visual de T09
(Montagem de Times), um "simulador tático de campo" do app legado — uma
representação gráfica dos jogadores posicionados dentro da área de cada time,
em vez da lista/cards empilhados atuais (`UX-SPEC.md` Seção 6.2). O mecanismo
de **interação** ("Trocar jogador": seletor modal por toque sempre disponível;
drag-and-drop como atalho opcional só em desktop) já está definido como regra
de negócio/UX preservada (RF-D01/RN-D03, Business Analyst) — **fora do escopo
deste ADR**. A pergunta arquitetural aqui é estritamente técnica: a nova
**representação visual** (grid posicional de dois times sobre uma imagem/forma
de campo) introduz algum requisito técnico novo — por exemplo, uma biblioteca
de renderização gráfica (canvas, SVG, motor de jogo) — ou é inteiramente
resolvível por composição dos componentes já existentes do design system?

RF-D01.2 já restringe o escopo: a nova representação é "camada de renderização
visual sobre a mesma atribuição de time (Time A/Time B) já definida por RF-05"
— **não** introduz capacidade de reposicionamento livre a coordenadas
arbitrárias do campo (isso ficaria fora do escopo de redesenho visual, RF-D01.3).
Ou seja: o simulador precisa exibir "jogador X está no Time A" de forma
visualmente ancorada a uma área gráfica de campo — não precisa calcular,
persistir ou validar coordenadas (x, y) livres de jogador.

## Decision Drivers

- RF-D01.2: escopo estritamente decorativo/posicional dentro da atribuição de
  time já existente — não é um editor de posição livre.
- RNF-04 (custo de operação/manutenção próximo de zero): qualquer biblioteca
  nova de renderização gráfica (ex.: motor de canvas, biblioteca de campo
  esportivo) adiciona peso de bundle, superfície de manutenção e uma nova
  dependência de terceiro a auditar (DevSecOps) — desproporcional a um
  requisito puramente decorativo.
- Guardrail 31: o simulador deve reutilizar os componentes já catalogados do
  design system (`Card`, `Badge`, `EmptyState`, etc. — `UX-SPEC.md` Seção 3.2)
  sempre que a composição visual permitir, em vez de criar uma tecnologia de
  renderização paralela e isolada só para T09.
- RNF-D02: nenhuma nova affordance visual pode reduzir a superfície de
  interação por teclado/seleção já validada — uma solução baseada em
  `<canvas>` (pixels, sem DOM navegável) seria estruturalmente pior para
  acessibilidade do que uma solução baseada em elementos DOM reais
  posicionados via CSS, que herdam naturalmente foco de teclado, leitura por
  screen reader e semântica ARIA.

## Considered Options

1. **Composição via CSS Grid/Flexbox** sobre um contêiner com plano de fundo
   representando o campo (imagem ou gradiente CSS), posicionando os
   componentes de jogador (`Card`/chip compacto, já existentes ou uma
   variante leve deles) em duas áreas/grades correspondentes a Time A/Time B
   — cada "posição" no grid é apenas um slot de layout, não uma coordenada
   livre persistida.
2. **Biblioteca de renderização gráfica dedicada** (ex.: motor baseado em
   `<canvas>`, ou uma biblioteca especializada de visualização de campo
   esportivo/formação tática).
3. **SVG posicionado manualmente** com jogadores como elementos `<foreignObject>`
   ou marcadores gráficos.

## Decision Outcome

Chosen option: **composição via CSS Grid/Flexbox sobre componentes DOM
existentes (opção 1)** — **nenhuma biblioteca de renderização gráfica nova é
necessária**. O simulador tático é tratado como um novo **arranjo visual** de
componentes já existentes (ou variantes leves deles, ex.: um `PlayerChip`
derivado do padrão de `Card` já catalogado), não como uma nova capacidade
técnica de renderização.

Isso mantém: (a) navegação por teclado nativa (cada jogador continua sendo um
elemento DOM focável, não um pixel desenhado em canvas); (b) leitura por
screen reader sem trabalho adicional de re-implementar semântica ARIA do zero
(o que uma solução `<canvas>` exigiria manualmente); (c) zero dependência nova
a auditar por DevSecOps; (d) zero custo de bundle adicional (RNF-04).

O atalho opcional de drag-and-drop em desktop (`lg`, RF-D01.1) pode ser
implementado com a **API nativa de Drag and Drop do HTML5** (já suportada
pelos navegadores-alvo, RNF-09), sem exigir biblioteca de terceiro — decisão
de implementação exata (API nativa vs. uma biblioteca leve de DnD) é detalhe
de Frontend/Tech Lead, não uma decisão de arquitetura com trade-off relevante
o suficiente para este ADR, dado que ambas as opções são de baixo custo e não
mudam nenhuma decisão estrutural registrada aqui.

### Positive Consequences

- Nenhuma dependência nova de bundle/manutenção/segurança.
- Acessibilidade herdada dos componentes DOM já existentes, sem
  reimplementação de semântica.
- Reaproveita diretamente a atribuição de time já modelada (RF-05,
  `TIME_ATLETA` — `SDD.md` Seção 5), sem exigir novo campo de coordenada no
  modelo de dados.

### Negative Consequences

- Fidelidade visual ao "campo realista" do app legado é necessariamente mais
  limitada que uma renderização gráfica dedicada (ex.: sem perspectiva,
  gramado texturizado complexo, etc.) — aceitável porque RF-D01.2 já limita o
  escopo a uma camada decorativa sobre a atribuição de time, não a uma
  simulação visual de precisão tática.
- Se o organizador confirmar, no futuro, a expectativa de reposicionamento
  livre de jogador em coordenadas específicas do campo (RF-D01.3, fora do
  escopo desta iniciativa), esta decisão precisaria ser revisitada — nesse
  cenário, uma solução baseada em coordenadas livres (SVG/canvas com
  drag-and-drop de posição arbitrária) passaria a ser tecnicamente
  necessária. Não decidido agora, pois depende de confirmação de escopo de
  produto ainda pendente (BA/PM).

## Pros and Cons of the Options

### CSS Grid/Flexbox sobre componentes DOM existentes ✅ Chosen

- ✅ Zero dependência nova
- ✅ Acessibilidade nativa (foco, leitura de tela, ARIA herdados do DOM)
- ✅ Reaproveita modelo de dados e componentes já existentes
- ❌ Fidelidade visual mais limitada que uma renderização gráfica dedicada
  (aceitável dado o escopo de RF-D01.2)

### Biblioteca de renderização gráfica dedicada (canvas/motor de campo)

- ✅ Maior fidelidade visual/realismo de campo
- ❌ Nova dependência de terceiro a auditar (DevSecOps) e manter
- ❌ Acessibilidade exige reimplementação manual completa (canvas não expõe
  DOM navegável por padrão)
- ❌ Desproporcional a um requisito que, por definição de escopo (RF-D01.2),
  não precisa de posicionamento livre nem de física/interação gráfica real

### SVG com jogadores como elementos posicionados manualmente

- ✅ Melhor fidelidade visual que Grid/Flexbox puro, sem exigir biblioteca
- ❌ `foreignObject`/interatividade em SVG tem suporte mais inconsistente de
  acessibilidade entre leitores de tela do que elementos DOM HTML nativos
- ❌ Complexidade de implementação maior que a opção escolhida, sem ganho
  proporcional ao escopo definido em RF-D01.2

## Links

- Relacionado: `SDD.md` Seção 2.1 (Serviço de Times), Seção 5 (`TIME_ATLETA`),
  ADR-007 (heurística de montagem de times), ADR-010 (explicação de conflito)
- Não altera: RF-D01/RN-D03 (contrato de interação, decisão de negócio/UX do
  Business Analyst — fora do escopo deste ADR)
- Supersedes: Nenhum
- Superseded by: Nenhum
