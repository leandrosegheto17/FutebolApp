# ADR-013: Substituição Atômica Direta dos Valores de Paleta/Tipografia em `tokens.css`/`tokens.ts`, sem Versionamento Paralelo de Design System

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: design-system, frontend, refactor, architecture-decision-review

## Context and Problem Statement

`src/design-system/tokens.css`/`tokens.ts` são a fonte única de verdade de cor,
tipografia, espaçamento etc. para todo o produto (`UX-SPEC.md` Seção 3.1),
fechados e aprovados como baseline em L0/`FE-00`. O `PRD-TECNICO.md` Parte II
exige trocar a paleta atual ("identidade campo de futebol", verde único) pela
paleta navy/dourado do Grupo Rola com verde de campo como acento, e a
tipografia atual (`system-ui`) por Bebas Neue/Public Sans/JetBrains Mono
(RNF-D05, Premissa 7 do `PRD.md` Parte II). O próprio PRD-TECNICO é explícito:
isso **não é aditivo** — é revisão estrutural da baseline já fechada — e roteia
ao Software Architect apenas o **mecanismo técnico** da migração (não os
valores exatos de cor/fonte, que são decisão de UX/UI em `UX-SPEC.md`).

A pergunta técnica central: os tokens devem ser substituídos **no lugar**
(mesmas variáveis CSS, novos valores, uma única troca) ou é necessário um
**mecanismo de coexistência** (dois conjuntos de tokens vivendo em paralelo,
permitindo que algumas telas usem a paleta antiga enquanto outras já usam a
nova)? Esta segunda hipótese é sugerida por uma leitura possível — mas
incorreta, como demonstrado abaixo — de RF-D04 (cobertura das 11 telas pode
ser "aplicação integral" ou "migração faseada com prazo").

## Decision Drivers

- **Guardrail 31**: "todo componente do design system é implementado uma única
  vez e reutilizado — nenhuma tela cria uma variação paralela." Como os
  componentes compartilhados (`Button`, `Card`, `Modal`, etc. — `UX-SPEC.md`
  Seção 3.2) leem os tokens via `var(--color-primary)`/equivalentes, e são os
  **mesmos componentes reutilizados nas 11 telas**, qualquer tentativa de
  manter duas paletas simultâneas exigiria ou (a) duplicar componentes por
  variante de tema — proibido pela Guardrail 31 — ou (b) um mecanismo de
  escopo/tema (ex.: classe `data-theme` no `<html>`/wrapper por tela) mantido
  em paralelo por tempo indefinido — custo de manutenção e de nova
  verificação WCAG duplicada, desproporcional a RNF-04 e não pedido por
  nenhum requisito do `PRD-TECNICO.md`.
- RNF-D05: a troca "deve usar o mecanismo de 'alteração visível' já previsto
  em `UX-SPEC.md` Seção 3.3" — esse mecanismo já trata alteração de
  componente/token como **um evento único registrado**, com reestimativa
  formal, não como uma migração incremental tela a tela.
- RF-D05/RNF-D01 (Guardrail 28): toda tela redesenhada exige nova
  `accessibility-review` de contraste sobre a nova paleta — isto já é
  obrigatório mesmo com substituição atômica (ver Riscos, abaixo, sobre o
  "raio de alcance" real dessa obrigação).
- Custo de operação próximo de zero (RNF-04): nenhum mecanismo de
  theming/feature-flag é necessário se a substituição for atômica — é a opção
  de menor custo de implementação e de manutenção.

## Considered Options

1. **Substituição direta (in-place)**: alterar os valores das variáveis já
   existentes em `tokens.css`/`tokens.ts` (mesmos nomes, novos valores de
   cor/família de fonte) num único commit/PR atômico. Nenhum arquivo de token
   paralelo, nenhuma flag de tema em runtime.
2. **Versionamento paralelo de tokens** (ex.: `tokens.v2.css` coexistindo com
   `tokens.css`, selecionado por classe/atributo de tema por tela ou por
   feature flag), permitindo que telas migrem em momentos diferentes mantendo
   a paleta antiga temporariamente.
3. **Reescrita completa do design system** (novos nomes de variável
   refletindo a nova semântica de marca, ex.: `--color-brand-navy` em vez de
   reaproveitar `--color-primary`), tratando a mudança como uma nova geração
   de design system, não uma revisão de valores.

## Decision Outcome

Chosen option: **substituição direta (in-place), opção 1** — troca atômica dos
valores de `tokens.css`/`tokens.ts` num único commit/PR, mantendo os nomes de
variável existentes sempre que a semântica de papel (primary/success/danger/
etc.) permanecer válida sob a nova paleta; UX/UI decide em `UX-SPEC.md` a
paleta e a semântica exatas (ex.: se navy assume o papel de `--color-primary`
e verde de campo se torna um token de acento próprio) — isso é fora da
autoridade deste ADR.

**Constatação arquitetural central, a comunicar explicitamente ao Tech Lead**:
como os tokens são globais e os componentes são compartilhados (Guardrail 31),
a substituição atômica **atinge as 11 telas simultaneamente no momento do
merge** — não apenas as 6 telas cobertas pelo mockup original. A decisão de
"cobertura" de RF-D04 (aplicação integral vs. migração faseada com prazo, por
tela) **não pode, tecnicamente, significar adiar a aplicação dos novos valores
de cor/tipografia para uma tela específica** — isso exigiria a opção 2
(rejeitada). O que RF-D04 pode legitimamente cobrir, dentro deste mecanismo
técnico, é a **profundidade do redesenho de layout/composição** de cada tela
(ex.: T09 ganhar o novo simulador tático de campo; T04/T07/T08/T10/T11 talvez
mantendo o arranjo de layout atual por mais tempo) — não os valores brutos de
cor/fonte, que trocam para todas as telas no mesmo instante, tenham ou não
recebido redesenho de layout dedicado.

**Consequência direta para a reestimativa do Tech Lead**: toda tarefa de
Frontend já fechada que consome `tokens.css` (`FE-00` a `FE-11`, não apenas as
tarefas das 6 telas do mockup) precisa ser reaberta para reestimativa — não
apenas as tarefas das telas explicitamente redesenhadas — porque o `git
diff` de `tokens.css` afeta visualmente todas elas no mesmo commit,
independentemente de terem recebido atenção de layout dedicada.

**Consequência direta para `accessibility-review` (RF-D05/Guardrail 28)**: a
checagem de contraste da nova paleta deve ser executada sobre a combinação
completa cor-de-fundo × cor-de-texto de **todos** os componentes
compartilhados usados nas 11 telas no dia da troca — não apenas sobre as 6
telas do mockup — pelo mesmo motivo de blast radius acima. Isto é mais amplo
do que uma leitura literal de RF-D05.1 ("quando uma tela é redesenhada")
sugeriria isoladamente; o UX/UI deve tratar o dia da troca de tokens como o
gatilho de verificação para as 11 telas, não para 6.

"Versionamento" desta mudança é resolvido pelo próprio controle de versão do
Git (histórico de commit) mais o registro no mecanismo de histórico de
componente já existente (`UX-SPEC.md` Seção 3.3) — não é necessário nenhum
arquivo de token paralelo nem mecanismo de rollback em runtime; reverter é
`git revert` do commit/PR de troca.

### Positive Consequences

- Nenhum mecanismo de tema/feature-flag novo a manter — custo mínimo,
  alinhado a RNF-04.
- Nenhuma variação paralela de design system (Guardrail 31 respeitada
  literalmente).
- Rollback trivial via Git, sem infraestrutura adicional.
- Consistência visual imediata em todo o produto — elimina o risco de duas
  linguagens visuais coexistindo de fato (ainda que só uma tenha "sign-off"),
  que seria o resultado inevitável da opção 2.

### Negative Consequences

- Blast radius total e imediato: nenhuma tela pode "esperar" para receber a
  nova cor/fonte — se houver qualquer problema de contraste não identificado
  antes do merge, ele afeta produção nas 11 telas de uma vez, não apenas na
  tela testada. Mitigação: `accessibility-review` completo (RF-D05) deve ser
  executado **antes** do merge do commit de troca de tokens, cobrindo os
  componentes compartilhados usados por todas as 11 telas — não pode ser
  tratado como checagem incremental pós-merge tela a tela.
- Exige coordenação de um único PR "grande" de troca de token, em vez de PRs
  incrementais por tela — aceitável dado o tamanho pequeno da equipe (1
  Frontend) e o volume de variáveis envolvidas (dezenas, não centenas).

## Pros and Cons of the Options

### Substituição direta (in-place) ✅ Chosen

- ✅ Custo mínimo, sem mecanismo de tema adicional
- ✅ Respeita Guardrail 31 literalmente
- ✅ Rollback trivial via Git
- ❌ Blast radius imediato em todas as 11 telas (mitigado por
  `accessibility-review` pré-merge)

### Versionamento paralelo de tokens (dois temas coexistindo)

- ✅ Permitiria, em tese, migração tela a tela sem afetar as demais
- ❌ Viola Guardrail 31 diretamente ("nenhuma tela cria uma variação
  paralela") — exigiria duplicar componentes ou introduzir mecanismo de
  escopo/tema mantido por tempo indefinido
- ❌ Duplica o esforço de `accessibility-review` (duas paletas ativas
  simultaneamente em produção)
- ❌ Custo de manutenção desproporcional a RNF-04 para um requisito que o
  próprio `PRD-TECNICO.md` não pede explicitamente neste nível

### Reescrita completa do design system (novos nomes semânticos de marca)

- ✅ Nomenclatura mais alinhada à nova identidade de marca a longo prazo
- ❌ Maior superfície de diff (todo componente que referencia o nome antigo
  precisa ser tocado, não só o arquivo de tokens) — custo desproporcional
  quando a substituição de valor já resolve o requisito de negócio
- ❌ Sem benefício técnico adicional sobre a opção escolhida para o escopo
  desta iniciativa

## Links

- Relacionado: `UX-SPEC.md` Seção 3.1/3.2/3.3 (tokens, componentes, mecanismo
  de histórico de alteração), Guardrail 31 (`GUARDRAILS.md`)
- Resolve: `PRD-TECNICO.md` Parte II, RNF-D05 e Seção 6, item 7
- Supersedes: Nenhum (não altera nenhuma decisão dos ADRs 001-011 — é uma
  decisão nova sobre um artefato, `tokens.css`, que nunca teve ADR próprio)
- Superseded by: Nenhum
