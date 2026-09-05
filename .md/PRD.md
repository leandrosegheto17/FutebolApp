# PRD.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: PM
**Status**: Pronto para Business Analyst
**Gate de origem**: `CTO-REVIEW.md` — Gate 1 (Pré-descoberta), 2026-09-02, veredito **Aprovado com
ressalvas**.
**Skills aplicadas**: `problem-definition`, `scope-prioritization` (com apoio de
`product-roadmap-prioridade` — matriz valor x esforço, 7 itens concorrentes),
`prd-drafting`, `assumption-and-risk-logging`, `stakeholder-alignment-check`.

---

## 1. Problema e Contexto

Hoje o controle de presença, desempenho e organização das peladas da "Turma do Rola -
Comary" é feito de forma manual, fragmentado entre planilha, WhatsApp e anotações em
papel. Isso gera, de forma verificável:

- **Múltiplas fontes de verdade concorrentes** (planilha + WhatsApp + papel) sem
  reconciliação automática, o que produz divergências entre o que cada fonte registra
  para a mesma rodada.
- **Retrabalho manual** a cada rodada para consolidar presença, eventos (gols,
  cartões) e recalcular pontuação acumulada.
- **Perda de histórico** quando uma correção é necessária (ex.: um lançamento errado),
  sem mecanismo automático de estorno — a correção depende de reconstruir manualmente
  o efeito da mudança sobre o ranking acumulado.
- **Disputas recorrentes** entre membros do grupo sobre três pontos concretos: (a)
  quem esteve presente em determinada rodada, (b) qual a pontuação acumulada correta
  de cada jogador, (c) como formar times equilibrados no dia do jogo sem repetir
  arranjos que colocam rivalidades ou vínculos familiares em conflito.

Este é o problema a resolver — não "melhorar a experiência do grupo" (vago), mas
eliminar a necessidade de reconciliar múltiplas fontes manuais para responder, a
qualquer momento, três perguntas verificáveis: quem jogou, quanto pontuou, e qual o
histórico de cada rodada.

## 2. Público-Alvo

- **Usuário primário (operação)**: o(s) organizador(es) da "Turma do Rola - Comary" —
  papel único, operacional, sem distinção de perfis individuais dentro do grupo, que
  hoje mantêm a planilha/WhatsApp manualmente e passarão a registrar rodadas, cadastro
  e histórico no sistema. É um grupo pequeno (uma ou poucas pessoas de confiança do
  grupo), não uma equipe multiusuário.
- **Usuário secundário (consulta)**: os jogadores do grupo "Turma do Rola - Comary" e
  qualquer pessoa que o organizador compartilhe o link — consultam o ranking e a visão
  mensal de presença sem necessidade de login.

Não é "todos os usuários da internet" nem "qualquer grupo de futebol amador em geral"
— é especificamente este grupo já existente, com sua rotina de peladas periódicas já
estabelecida. Generalização para múltiplos grupos/campeonatos está explicitamente fora
de escopo (Seção 4).

## 3. Objetivo de Sucesso (métrica mensurável)

Objetivo de negócio validado no Gate 1: *"Ter um ranking de jogadores sempre correto e
disponível, eliminando a necessidade de reconciliar planilha/WhatsApp/papel a cada
rodada."*

Traduzido em métricas mensuráveis para esta release:

| Métrica | Baseline (hoje) | Meta |
|---|---|---|
| **Métrica primária** — % de rodadas cujo ranking é produzido e mantido exclusivamente pelo sistema, sem conferência ou correção paralela em planilha/WhatsApp/papel | 0% (100% do controle é manual, fora de qualquer sistema único) | ≥ 90% das rodadas nas primeiras 8 rodadas consecutivas após o lançamento (aprox. 2 meses, considerando cadência semanal do grupo) |
| **Métrica secundária** — tempo gasto pelo organizador para lançar uma rodada completa (presença + eventos) do início ao fim | Não medido formalmente hoje (processo manual disperso entre planilha/WhatsApp/papel) — **premissa a validar com o stakeholder**, ver Seção 6 | ≤ 10 minutos por rodada (meta provisória até validação do baseline real com o organizador) |
| **Métrica de confiabilidade** — nº de disputas/discordâncias sobre presença ou pontuação reportadas pelo grupo após uso do sistema | Recorrente (motivo declarado do projeto) | 0 disputas não resolvíveis por consulta direta ao histórico do sistema, a partir da 4ª rodada de uso |

A métrica primária é a que define "pronto" para este objetivo — é auditável
comparando o ranking do sistema com qualquer fonte paralela que ainda exista durante o
período de transição.

## 4. Escopo desta Release (dentro / fora)

### Dentro

| Funcionalidade | Descrição de alto nível | Justificativa de inclusão |
|---|---|---|
| Cadastro de atletas | Cadastro único (nome, contato, data de nascimento, pontuação inicial), sem categoria fixa de posição (não há "goleiro" como entidade separada) | Base de dados fundacional; sem isso nenhuma outra funcionalidade existe |
| Registro de rodada | Organizador registra presença/ausência/lesão + eventos (gols, cartões); pontuação calculada automaticamente por regras fixas | É o núcleo do objetivo de sucesso — elimina o cálculo manual |
| Ranking público | Consulta sem login da classificação atualizada e visão mensal de presença por rodada | É o entregável visível ao público-alvo secundário; motivo declarado do projeto |
| Histórico com correção e estorno automático | Organizador consulta/corrige rodadas já lançadas; exclusão/correção estorna pontos automaticamente | Garante que o ranking nunca fique inconsistente após uma correção — resolve a "perda de histórico" do problema declarado |
| Montagem de times equilibrados | Sugestão de divisão de times entre presentes, considerando nível técnico e idade, respeitando restrições informais (rivalidades/vínculos familiares) | Parte explícita da rotina de dia de jogo pedida pelo stakeholder; resolve uma das três disputas recorrentes do problema |
| Substituições | Registro de trocas no intervalo, para fidelidade do histórico | Mantém o histórico fiel ao que ocorreu em campo, suporte à métrica de confiabilidade |
| Acesso por senha única | Ranking público sem login; cadastro/lançamento/histórico protegidos por senha simples de uso interno do grupo | Nível de proteção proporcional ao contexto (grupo amador, um papel operacional), sem custo de autenticação multiusuário |

### Fora (desta release)

| Item cortado | Justificativa do corte |
|---|---|
| Autenticação completa com perfis de usuário individuais | Não há necessidade operacional de distinguir "quem" fez cada ação dentro do grupo interno — é um único papel operacional (organizador); custo de implementação de login/perfis não se justifica pelo valor entregue nesta release |
| Múltiplos grupos/campeonatos | O problema e o público-alvo são especificamente esta turma; generalizar para múltiplos grupos é escopo de um produto diferente, não desta necessidade |
| Aplicativo mobile nativo | O requisito "acessível pelo celular" é satisfeito por uma aplicação web responsiva; app nativo adicionaria custo/complexidade de build e distribuição sem ganho adicional mensurável para o objetivo de sucesso desta release |
| Notificações automáticas | Não é pré-requisito para "ranking sempre correto e disponível" (a métrica de sucesso não depende de notificação push/e-mail/WhatsApp); fica como evolução futura possível |

## 5. Requisitos de Alto Nível Priorizados

**Framework aplicado**: MoSCoW, com matriz valor x esforço como critério de
justificativa de ordenação dentro do bucket "Must have" (7 funcionalidades
concorrentes nesta release, acima do limiar de ~5 que justifica um critério explícito
em vez de lista arbitrária).

| # | Funcionalidade | MoSCoW | Valor | Esforço | Justificativa |
|---|---|---|---|---|---|
| 1 | Cadastro de atletas | Must | Alto | Baixo | Pré-requisito estrutural de tudo mais; sem valor autônomo, mas bloqueante |
| 2 | Registro de rodada + cálculo automático de pontos | Must | Altíssimo | Médio | É o núcleo da métrica primária de sucesso (ranking correto sem reconciliação manual) |
| 3 | Ranking público | Must | Altíssimo | Baixo/Médio | É o entregável visível que motiva o projeto; sem ele não há "produto" percebido pelo grupo |
| 4 | Histórico com correção e estorno automático | Must | Alto | Médio | Sem isso, uma correção quebra a confiabilidade do ranking — item crítico para a métrica de confiabilidade |
| 5 | Acesso por senha única às áreas internas | Must | Alto | Baixo | Viabiliza uso do sistema sem expor cadastro/lançamento publicamente; custo de implementação baixo |
| 6 | Montagem de times equilibrados | Should | Médio/Alto | Alto | Valor real na rotina de dia de jogo e resolve uma disputa recorrente, mas não é pré-requisito da métrica primária de ranking; é o item de maior complexidade (restrições informais), por isso sequenciado após o núcleo estar estável |
| 7 | Substituições no intervalo | Should | Médio | Baixo/Médio | Contribui para fidelidade histórica e para a métrica de confiabilidade, mas o sistema entrega seu objetivo central mesmo sem esse registro no primeiro uso |

Os itens 1-5 (Must have) são o corte mínimo que satisfaz o objetivo de sucesso da
Seção 3 — nenhum deles pode ser removido sem invalidar a própria definição de "pronto"
do projeto. Os itens 6-7 (Should have) agregam valor real ao pedido original do
stakeholder e permanecem dentro do escopo desta release, mas podem ser sequenciados
depois da estabilização do núcleo Must have caso o Software Architect/Tech Lead
identifique necessidade de faseamento em `TASK.md` — essa decisão de sequenciamento de
entrega é deles, não do PM; aqui só registro a prioridade de produto.

## 6. Premissas e Riscos de Produto

Toda premissa/risco abaixo tem dono e prazo de validação, conforme
`assumption-and-risk-logging`. Os quatro primeiros itens respondem diretamente às
ressalvas registradas pelo CTO no Gate 1 (`CTO-REVIEW.md`).

| # | Premissa/Risco | Decisão/postura adotada até validação | Dono | Prazo de validação |
|---|---|---|---|---|
| 1 | **LGPD — dados pessoais em ranking público sem login.** Cadastro coleta nome, contato e data de nascimento; ressalva do Gate 1 exige base legal declarada. | Postura adotada nesta release: o **ranking público exibe apenas nome (ou apelido) e estatísticas de jogo** (pontuação, presença) — **contato e data de nascimento nunca aparecem na área pública**, ficam restritos à área interna protegida por senha. Base legal a formalizar (provavelmente legítimo interesse/consentimento informado dos membros do grupo). | PM (registro) + CTO (validação formal) | Antes do Gate 2 (Pós-SDD) — Software Architect precisa desenhar o modelo de dados já com esse recorte de visibilidade |
| 2 | **Dados de possíveis menores de idade** (data de nascimento coletada, usada como insumo de "idade" na montagem de times, sugere que pode haver menores no grupo). | Não há confirmação do stakeholder sobre a existência de atletas menores de 18 anos. Postura conservadora adotada: tratar como possível até resposta contrária, o que implica exigir avaliação de consentimento do responsável legal (tratamento operacional, fora do sistema, não é requisito funcional deste MVP) antes de cadastrar um menor. | PM/stakeholder (pergunta direta) + CTO (Art. 14 LGPD, Gate 2) | Imediato — antes do BA detalhar o modelo de cadastro no `PRD-TECNICO.md` |
| 3 | **Senha única compartilhada para áreas internas** (cadastro, lançamento de rodada, histórico). | Aceito conscientemente como risco de produto proporcional ao contexto (grupo amador, papel operacional único, sem necessidade de rastrear autoria individual de alteração) — já delimitado como "fora de escopo" autenticação completa. Risco assumido: vazamento da senha permite alteração por qualquer pessoa, sem trilha de auditoria por indivíduo. Desenho mínimo de segurança (hash, proteção a força bruta) é responsabilidade técnica do Software Architect/DevSecOps. | PM (aceite do risco de produto) + Software Architect/DevSecOps (execução técnica) | Já aceito nesta release; revisão formal no Gate 2 (`architecture-decision-review`) |
| 4 | **Regra de estorno automático de pontos** na correção/exclusão de rodada. | Regra de negócio de alto nível definida: ao excluir ou corrigir uma rodada já lançada, o sistema deve recalcular e reverter automaticamente os pontos dela para todos os atletas afetados, sem exigir lançamento manual de estorno pelo organizador, garantindo consistência contínua do ranking. Detalhamento (efeito sobre substituições/eventos vinculados, necessidade de log de auditoria da correção sem login individual) cabe ao BA. | BA (detalhamento funcional) | `PRD-TECNICO.md` (próxima etapa) |
| 5 | **Algoritmo de montagem de times com restrições informais** (rivalidades/vínculos familiares). | Expectativa de produto de alto nível: o sistema deve permitir declarar pares de atletas com restrição obrigatória (hard constraint, "não podem/devem jogar juntos") e respeitá-la sempre na sugestão, usando nível técnico e idade como critério de equilíbrio (soft constraint) entre os times resultantes. Abordagem algorítmica (heurística determinística vs. otimização) é decisão técnica do Software Architect, já sinalizada pelo CTO no Gate 1. | BA (detalhamento funcional) + Software Architect (abordagem técnica) | BA no `PRD-TECNICO.md`; Software Architect responde formalmente no Gate 2 |
| 6 | **Ausência de prazo-alvo e restrição de orçamento declarados** pelo stakeholder (ressalva de roadmap do Gate 1). | Premissa adotada até resposta do stakeholder: (a) não há data-alvo rígida além de "o quanto antes"; (b) orçamento de hospedagem/operação é mínimo/próximo de zero (grupo amador sem monetização). Precisa de confirmação explícita para permitir reavaliação no Gate 3. | PM/stakeholder | Antes do Gate 3 (Pré-TASK.md); idealmente confirmado ainda durante o levantamento do BA |
| 7 | **Definição de "nível técnico"** usado na montagem de times — o cadastro original só prevê nome, contato, data de nascimento e pontuação inicial; não há campo explícito de nível técnico. | Sem decisão tomada; ver pergunta em aberto na Seção 7 — pode ser a própria pontuação/ranking acumulado usada como proxy, ou um campo separado a definir com o stakeholder. | BA/stakeholder | `PRD-TECNICO.md` |

## 7. Perguntas em Aberto para o Business Analyst

Estas perguntas precisam de resposta do stakeholder durante o levantamento detalhado
antes de o BA fechar o `PRD-TECNICO.md`:

1. Confirmar prazo-alvo (ex.: início da próxima temporada de peladas) e eventual
   restrição de orçamento de hospedagem/operação (Premissa 6).
2. Há atletas menores de 18 anos hoje no grupo, ou previstos? Se sim, como o grupo
   trata consentimento/autorização (Premissa 2)?
3. O que define "nível técnico" de um atleta para a montagem de times: a própria
   pontuação acumulada no ranking, uma nota separada atribuída pelo organizador, ou
   outro critério (Premissa 7)?
4. Como as restrições informais (rivalidades/vínculos familiares) são cadastradas e
   por quem — são permanentes ou variam por rodada? Podem ser editadas por qualquer
   pessoa com a senha interna, ou só pelo organizador principal?
5. Quais são exatamente as regras fixas de pontuação por evento (presença, ausência,
   lesão, gol, cartão amarelo, cartão vermelho, etc.)? O briefing menciona "regras
   fixas" mas não define os valores.
6. O ranking público deve exibir nome completo, apelido, ou identificador anonimizado,
   como mitigação adicional de exposição de dado pessoal (complementar à Premissa 1)?
7. Ao excluir/corrigir uma rodada, o que acontece com substituições e eventos já
   vinculados a ela — são removidos silenciosamente, ou deve existir um log de
   auditoria da correção (quem corrigiu e quando), considerando que não há login
   individual?
8. Existe critério de desempate no ranking quando dois ou mais atletas têm a mesma
   pontuação?
9. A "visão mensal de presença por rodada" — o período "mês" é calendário civil ou
   segue algum ciclo/temporada próprio do grupo?
10. A "pontuação inicial" do cadastro é efetivamente somada ao ranking (um tipo de
    handicap herdado da planilha atual), ou é só um campo de migração histórica sem
    efeito sobre o cálculo corrente?

---

## Checklist de Prontidão (`stakeholder-alignment-check`)

- [x] Problema declarado em termos verificáveis (três disputas concretas: presença,
      pontuação, formação de times), não vago
- [x] Público-alvo nomeado especificamente (organizador(es) da "Turma do Rola -
      Comary" + jogadores do grupo), não "todos os usuários"
- [x] Objetivo de sucesso é métrica mensurável, com baseline e meta (Seção 3) — uma
      métrica secundária tem baseline marcado explicitamente como "a validar", não
      omitido
- [x] Escopo tem "dentro" e "fora" explícitos, com justificativa em cada corte
      (Seção 4)
- [x] Toda funcionalidade de alto nível tem prioridade justificada via MoSCoW +
      matriz valor/esforço (Seção 5), não lista arbitrária
- [x] Toda premissa/risco de produto tem dono e prazo de validação (Seção 6)
- [x] Nenhuma das 7 seções está vazia ou com placeholder
- [x] `stakeholder-alignment-check` rodado: as quatro ressalvas do Gate 1 (LGPD/dados
      pessoais, senha única, algoritmo de times, estorno automático) foram tratadas
      como premissa/risco registrado com dono e prazo (Seção 6), **nenhuma delas
      configura conflito com o alinhamento estratégico validado no Gate 1** — todas
      são refinamentos dentro do escopo já aprovado, não mudanças de escopo. Não há
      necessidade de escalar para o CTO fora dos gates já previstos (Gate 2).

**Veredito**: PRD pronto. Liberado para o Business Analyst.

---
---

# PARTE II — PRD Delta: Iniciativa de Redesenho Visual

**Dono**: PM
**Status**: Pronto para Business Analyst
**Relação com a Parte I**: este é um **delta sobre o mesmo produto**, não um novo
`PRD.md`/produto do zero. O problema, o público-alvo geral, o objetivo de negócio
original (Seção 3 da Parte I) e todo o escopo funcional Must/Should já aprovado
(Seção 4-5 da Parte I) **permanecem válidos e não são reabertos aqui**. Esta Parte II
resolve exclusivamente uma pergunta de **adequação visual/identidade de marca** sobre
um produto já funcionalmente definido — o "o quê" funcional não muda; muda apenas
"como se parece". Onde este delta é silencioso, a Parte I continua sendo a referência.
**Nomenclatura**: o organizador e o briefing original se referem a esta iniciativa
informalmente como "v2.0". Este PRD **não adota esse rótulo formalmente** (ver Seção
6, item 6) — nenhuma versão deste sistema tem uso real até o momento (`CTO-REVIEW.md`,
Nota de Governança Ad Hoc, 2026-09-04), então tratar isto como "versão 2" criaria uma
expectativa de numeração de release que a realidade do produto ainda não sustenta.
Passa a ser referida neste documento como **"Iniciativa de Redesenho Visual"** (nome
de trabalho: "Refactor Visual").
**Gate de origem**: `CTO-REVIEW.md`, quatro registros sob o mesmo Gate 1 desta
iniciativa, todos em 2026-09-04, nesta ordem: (1) "Gate 1 — Pré-descoberta —
Iniciativa 'Refactor Visual v2.0'" (veredito inicial: Aprovado com ressalvas,
recomendação de não consumir capacidade dedicada antes do primeiro deploy real); (2)
"Revisão da recomendação de sequenciamento" (relato de terceiro, depois anulado); (3)
"Atualização por Fatos Novos do Organizador" (correção: motivação é Hipótese B, não
A; Risco 1 revertido para Alto); (4) **"Atualização por Instrução Direta de Inversão
Total de Prioridade (Pausar a v1)"** — veredito final vigente: **Aprovado com
ressalvas**, capacidade de Backend/Frontend liberada para esta iniciativa **desde já**,
sem precisar esperar abertura de acesso ao grupo real, condicionado ao registro formal
desta decisão (que esta Parte II cumpre) e a duas pendências de outros donos (UX/UI:
cobertura das 5 telas remanescentes antes de reestimativa de Frontend; DevOps:
reconciliar e finalizar `DEBT-05`/`DEBT-06`/confirmação de `DEBT-03` antes da migração
integral de capacidade de Backend para o redesenho).
**Skills aplicadas**: `problem-definition`, `scope-prioritization` (com apoio de
`product-roadmap-prioritization` — MoSCoW + matriz valor x esforço, 11 telas
concorrentes, acima do limiar de ~5), `prd-drafting`, `assumption-and-risk-logging`,
`stakeholder-alignment-check`.

## Registro formal da decisão de inversão de prioridade (condição explícita do CTO)

Conforme exigido pelo CTO na ressalva (a) do veredito vigente ("PM deve registrar
formalmente, com rastreabilidade (data, citação literal), a decisão de inversão de
prioridade do organizador"), registro aqui, textualmente, a declaração do organizador
recebida em **2026-09-04**, fonte primária (não relato de terceiro):

> "Eu quero mudar a priorização e quero que inicie o planejamento do redesign. Não
> vamos mais trabalhar na V1. Todas as validações vão ser feitas depois do Redesign.
> Não me debrucei o suficiente nessa etapa e o projeto foi entregue com um design que
> não atende. O redesign vai entregar um valor muito grande para não ser priorizado."

Leitura do PM sobre esta declaração, alinhada à análise já feita pelo CTO: é uma
avaliação de adequação de produto pelo próprio dono do sistema (Hipótese B —
preferência/julgamento estético do organizador, sem métrica de negócio externa
associada), não uma tese de gestão de mudança/adoção (Hipótese A, já refutada
diretamente pelo organizador em atualização anterior do mesmo Gate 1). É, ainda
assim, base legítima para uma decisão de priorização de produto — quem detém
autoridade de produto decidiu, de forma direta e inequívoca, que este redesenho tem
prioridade sobre o restante do backlog funcional da v1. O PM trata esta declaração
como **decisão de escopo/priorização vinculante desta release**, não como uma premissa
a validar.

**Validação da lista de pendências priorizada (Tiers 1-4, `CTO-REVIEW.md`,
"Consolidação de Pendências Reais da v1")**: o PM valida a lista como referência
correta de priorização, conforme instruído pelo CTO. Consequência direta para o
escopo desta Parte II (detalhado na Seção 4 — Fora): o restante do backlog funcional
da v1 (Tier 2 completo, Tier 3 completo, e os itens do Tier 1 sem código pronto) fica
**pausado**, com uma exceção explícita que o CTO não deixou pausar por tempo
indefinido — `DEBT-05`/`DEBT-06` e a confirmação real de `DEBT-03` em produção, que
têm código já escrito e são achados de segurança Média já confirmados ativos — cuja
finalização é responsabilidade de Backend/DevOps, roteada fora desta iniciativa de
design, sem depender do PM ou do BA para prosseguir.

## 1. Problema e Contexto

As 11 telas do sistema (T01-T11) já foram implementadas (Lotes L0-L6, aprovados por
QA e DevSecOps) sobre um único design system (`tokens.css`, baseline fechada em FE-00
durante os Gates 1-3 originais). O organizador — dono do produto e, hoje, único
usuário real do sistema (nem a v1 nem esta iniciativa têm uso pelo grupo real até o
momento, `CTO-REVIEW.md`, Nota de Governança Ad Hoc) — avaliou esse resultado visual
diretamente e declarou formalmente, em 2026-09-04 (citação completa acima): o design
entregue **"não atende"**.

Isto é o problema verificável a resolver nesta iniciativa: **o design system atual
(paleta, tipografia e tratamento visual dos componentes já implementados) não
satisfaz o padrão de qualidade/identidade de marca esperado pelo dono do produto**,
avaliação feita diretamente por quem tem autoridade para fazê-la, com peso de
prioridade explicitamente atribuído ("valor muito grande para não ser priorizado").
Não é "melhorar a experiência do usuário" de forma vaga — é uma substituição definida
e concreta: nova paleta (navy `#16234a` + dourado `#d9b64a` do brasão "Grupo Rola
Futebol" como identidade primária; verde de campo `#1c6e46` como cor de ação), nova
tipografia (Bebas Neue para títulos, Public Sans para corpo/UI, JetBrains Mono para
dados/estatísticas), sem emoji, com o simulador tático de campo do app legado
revivido como âncora visual da tela de Montagem de Times (T09) — já aprovada pelo
organizador em um mockup de 6 telas (desktop+mobile), referência de origem: Artifact
`https://claude.ai/code/artifact/75a686fe-5e8f-46fe-8c98-c3a2120e428b`.

**Delimitação explícita do problema, para o BA/UX-UI/Frontend não ultrapassarem**:
nenhuma regra de negócio, fluxo funcional ou modelo de dados muda em decorrência
desta iniciativa. O que muda é exclusivamente a camada de apresentação (tokens de
design, componentes visuais, tipografia, assets de marca) sobre o comportamento
funcional já definido e aprovado na Parte I. Exceção identificada nesta análise, que
precisa de confirmação antes de tratamento como "só visual" (ver Seção 6, item 8): a
revivência do "simulador tático de campo" em T09 pode introduzir um padrão de
interação (ex.: arrastar jogador no campo) diferente do já decidido e documentado em
`UX-SPEC.md` (T09, que hoje usa seletor por toque, explicitamente para *evitar*
drag-and-drop por confiabilidade/acessibilidade em touch) — se confirmado que muda a
interação de "Trocar jogador" (RF-05.4), isso deixa de ser puramente visual e precisa
passar pelo BA antes de UX/UI desenhar.

## 2. Público-Alvo

- **Usuário primário desta iniciativa (avaliação de adequação)**: o organizador da
  "Turma do Rola - Comary" — o mesmo usuário primário da Parte I, mas aqui atuando
  especificamente como **árbitro de "pronto"** desta iniciativa: é quem julga se cada
  tela redesenhada "atende" ou não (ver Seção 3, métrica de sign-off). Hoje é também,
  de fato, o único usuário real do sistema (`CTO-REVIEW.md`, Nota de Governança Ad
  Hoc) — não há grupo real ainda usando nenhuma versão para avaliar.
- **Usuário secundário (futuro, sem uso real ainda)**: os jogadores do grupo "Turma
  do Rola - Comary" e demais pessoas com quem o organizador compartilhar o link —
  mesmo público secundário da Parte I, Seção 2. Esta iniciativa se antecipa à
  abertura de acesso a este público (ainda sem previsão), não responde a uma demanda
  já manifestada por ele.

Não muda a segmentação de público da Parte I — apenas explicita que, para os fins de
"pronto" desta iniciativa específica, o único avaliador que importa hoje é o
organizador.

## 3. Objetivo de Sucesso (métrica mensurável)

Diferente da Parte I, o objetivo de negócio subjacente aqui não é uma métrica de
impacto operacional externa (não há tese de adoção/redução de disputa associada a
este redesenho — Hipótese A foi refutada diretamente pelo organizador). É uma decisão
de adequação de produto pelo próprio dono, o que muda a *natureza* da métrica
adequada, não a exigência de que ela exista e seja mensurável.

| Métrica | Baseline (hoje) | Meta |
|---|---|---|
| **Métrica primária — sign-off de adequação por tela.** % de telas do escopo desta release (Seção 4) aprovadas explicitamente pelo organizador como "atende" (não "melhor", nem "parece bom" informalmente — aprovação de sign-off registrada, tela a tela, contra os tokens de design aprovados) | 0% — o próprio organizador já declarou, para as 11 telas atuais, que o design "não atende" (2026-09-04) | 100% das telas dentro do escopo desta release (Seção 4) com sign-off explícito do organizador antes de a iniciativa ser considerada concluída |
| **Métrica de acessibilidade — zero regressão WCAG.** Nº de violações bloqueantes de WCAG 2.1 AA (contraste, foco, navegação por teclado) identificadas em `accessibility-review` sobre a nova paleta/tipografia, por tela redesenhada | Desconhecido para a nova paleta (nunca avaliada) — a paleta atual (`tokens.css`) já passou por `accessibility-review` e está aprovada, mas essa aprovação **não é herdada automaticamente** pela nova paleta (`CTO-REVIEW.md`, Gate 1 desta iniciativa) | 0 violações bloqueantes por tela, antes de cada sign-off do organizador |
| **Métrica de consistência de design system — cobertura das 11 telas resolvida.** Nº de telas com decisão de cobertura visual **não registrada** (nenhuma linguagem visual definida ou plano de migração explícito) | 5 telas hoje sem decisão (T04, T07, T08, T10, T11) — risco direto ao Guardrail 31 | 0 telas sem decisão registrada; as 11 telas devem ter, cada uma, ou nova linguagem aplicada, ou entrada explícita num plano de migração faseado com prazo (Seção 4) |

A métrica primária define "pronto" para esta iniciativa: é auditável por checklist de
sign-off, tela a tela, pelo próprio organizador — não é "melhorar a experiência do
usuário" de forma vaga, é aprovação binária e nomeada contra um padrão visual já
definido e aprovado (o mockup).

## 4. Escopo desta Release (dentro / fora)

### Decisão de cobertura (11 telas, não 6) — decisão de escopo do PM

O mockup aprovado cobre 6 das 11 telas (T01, T02, T03, T05, T06, T09). O CTO
sinalizou (Gate 1 desta iniciativa, Risco 2, e reforçado na atualização final como
"bloqueante prático imediato" agora que a capacidade está liberada) que uma cobertura
parcial sem decisão explícita viola o Guardrail 31 (duas linguagens visuais
coexistindo). **Decisão de escopo do PM**: esta release **não pode ser considerada
concluída** com qualquer uma das 11 telas sem uma decisão visual explícita registrada
— ou seja, o escopo *de resolução* cobre as 11 telas, não apenas as 6 do mockup. Isto
não significa que as 5 telas remanescentes (T04, T07, T08, T10, T11) recebam
necessariamente o mesmo nível de redesenho profundo das 6 — **a profundidade de
tratamento de cada uma das 5 (extensão integral da nova linguagem vs. aplicação mais
leve dos mesmos tokens/componentes) é decisão técnica de UX/UI**, não do PM (mesma
atribuição de dono que o CTO já registrou). O que o PM fixa aqui é o padrão de
"pronto": nenhuma tela pode ficar sem decisão registrada — nem mesmo "decidimos
manter T08 como está por enquanto" é aceitável sem estar explicitamente registrado
como tal, com prazo, em `UX-SPEC.md`.

### Dentro

| Item | Descrição de alto nível | Justificativa de inclusão |
|---|---|---|
| Redesenho visual das 6 telas do mockup aprovado | T01 Login, T02 Ranking, T03 Presença Mensal, T05 Lançamento de Rodada, T06 Histórico, T09 Montagem de Times (desktop+mobile) — nova paleta, tipografia, sem emoji | Já aprovado explicitamente pelo organizador; núcleo do objetivo de sucesso desta iniciativa |
| Simulador tático de campo em T09 | Revivência do recurso do app legado como âncora visual de T09 | Pedido explícito do organizador; único elemento desta iniciativa com histórico de uso real (no legado) — ver ressalva de interação na Seção 6, item 8 |
| Decisão registrada de cobertura das 5 telas remanescentes | T04, T07, T08, T10, T11 — decisão de UX/UI: extensão integral ou plano de migração faseado com prazo | Evita violação do Guardrail 31 (duas linguagens visuais coexistindo sem decisão); condição de "pronto" desta release (Seção 3) |
| Persistência do artefato de origem no repositório | Captura formal do mockup (telas, paleta, tipografia, componentes) em formato versionado (ex.: dentro do `UX-SPEC.md` revisado ou pasta de assets própria) — não mais só o link do Artifact do `claude.ai` | O link de chat não é um artefato de pipeline válido (rastreabilidade); ressalva do CTO, condição antes do início do `UX-SPEC.md` delta |
| Esclarecimento da paleta dupla | Definir junto ao stakeholder se "Grupo Rola" (marinho-dourado) e "Clube Comary" (verde) são: substituição única de paleta, tema contextual por "lado" (ex.: times em T09), ou branding duplo por contexto | Ambiguidade identificada pelo CTO; muda a estimativa em ordem de grandeza — precisa resolução antes de qualquer estimativa de esforço |
| Convenção de path + confirmação de direito de uso dos assets de marca | `logo.jpg`/`logo_comary.jpg` já presentes na árvore de trabalho, fora de processo governado | Ressalva do CTO; risco de direito autoral sobre brasões reais de clubes não confirmado |
| Decisão de hospedagem de fonte (self-host vs. CDN) | Bebas Neue/Public Sans/JetBrains Mono são fontes Google; decisão em conjunto com o fechamento de `DEBT-03` (CSP) | Ressalva do CTO; implicação direta de segurança (CSP), roteada ao Software Architect |

### Fora (desta release)

| Item cortado | Justificativa do corte |
|---|---|
| Qualquer mudança de regra de negócio, fluxo funcional ou modelo de dados | Delimitação central desta iniciativa (Seção 1) — é redesenho visual sobre produto já definido, não um novo levantamento funcional. Qualquer elemento do mockup que implique isso (ex.: interação de T09, Seção 6 item 8) deve ser roteado ao BA antes de implementação, não tratado como visual |
| Restante do backlog funcional/técnico da v1 (Tier 2 completo, Tier 3 completo, itens do Tier 1 sem código pronto — `CTO-REVIEW.md`, "Consolidação de Pendências Reais da v1") | Pausado por decisão direta do organizador ("não vamos mais trabalhar na V1"), aprovada pelo CTO. Lista completa validada nesta Parte II (ver "Registro formal" acima) |
| Finalização de `DEBT-05`/`DEBT-06`/confirmação de `DEBT-03` em produção | **Não pausado** — código já escrito, achado de segurança Média já confirmado ativo em produção; o CTO exigiu finalização de baixo custo antes da migração integral de capacidade de Backend para o redesenho. Responsabilidade de Backend/DevOps, fora desta iniciativa de design, não bloqueia PM/BA |
| Rótulo formal de "versão 2.0" do sistema | Nenhuma versão do sistema tem uso real hoje; adotar numeração de release agora criaria expectativa que a realidade do produto não sustenta (ver nota de nomenclatura, cabeçalho desta Parte II) |
| Abertura de acesso ao grupo real "Turma do Rola" | Não faz parte desta iniciativa; segue sem previsão, independente do redesenho (Nota de Governança Ad Hoc do CTO) |

## 5. Requisitos de Alto Nível Priorizados

**Framework aplicado**: MoSCoW, com matriz valor x esforço como critério de
justificativa (11 telas concorrentes nesta release, acima do limiar de ~5 que
justifica um critério explícito em vez de lista arbitrária, conforme
`product-roadmap-prioritization`).

| # | Tela/Item | MoSCoW | Valor | Esforço | Justificativa |
|---|---|---|---|---|---|
| 1 | T02 — Ranking Público | Must | Altíssimo | Médio | Tela pública mais visitada; é a "cara" do produto para qualquer visitante externo |
| 2 | T09 — Montagem de Times (simulador tático) | Must | Altíssimo | Alto | Âncora explícita do pedido do organizador; recurso "mais celebrado" do legado; maior complexidade (campo gráfico + resolução da ambiguidade de interação, item 8 da Seção 6) |
| 3 | T01 — Login | Must | Alto | Baixo | Primeira impressão de qualquer acesso à área interna; tela simples, baixo esforço |
| 4 | T05 — Lançamento de Rodada | Must | Alto | Médio | Uso operacional diário do organizador; tela mais usada internamente |
| 5 | T03 — Presença Mensal | Must | Alto | Baixo/Médio | Par direto do Ranking Público no consumo do público secundário |
| 6 | T06 — Histórico de Rodadas | Must | Médio/Alto | Baixo/Médio | Parte do fluxo de consulta já coberto pelo mockup aprovado |
| 7 | T04 — Cadastro/Edição de Atleta | Should | Médio | A definir (UX/UI) | Fora do mockup original; uso interno, frequência baixa — cobertura obrigatória (Seção 4), mas não prioritária no sequenciamento |
| 8 | T10 — Gestão de Restrições Obrigatórias | Should | Médio | A definir (UX/UI) | Fora do mockup original; uso interno pontual |
| 9 | T07 — Correção/Estorno | Should | Médio | A definir (UX/UI) | Fora do mockup original; uso interno, frequência baixa (só em correções) |
| 10 | T11 — Substituição no Intervalo | Should | Baixo/Médio | A definir (UX/UI) | Fora do mockup original; uso pontual |
| 11 | T08 — Log de Auditoria | Should | Baixo | A definir (UX/UI) | Fora do mockup original; tela de consulta rara, menor prioridade de retrabalho visual |

Os itens 1-6 (Must have, telas já cobertas pelo mockup aprovado) são o corte mínimo
que satisfaz o objetivo de sucesso desta iniciativa (Seção 3) — o organizador já
validou visualmente essas 6 telas. Os itens 7-11 (Should have) são obrigatórios para
fechar a condição de "pronto" da Seção 3 (cobertura das 11 telas resolvida), mas sua
*profundidade* de tratamento e sequenciamento relativo cabem a UX/UI, não ao PM.

## 6. Premissas e Riscos de Produto

Toda premissa/risco abaixo tem dono e prazo de validação, conforme
`assumption-and-risk-logging`. Os itens 1-7 respondem diretamente às ressalvas
remanescentes registradas pelo CTO no Gate 1 desta iniciativa (`CTO-REVIEW.md`).

| # | Premissa/Risco | Decisão/postura adotada até validação | Dono | Prazo de validação |
|---|---|---|---|---|
| 1 | **Artefato de origem não durável/não versionado.** O mockup existe hoje só como Artifact do `claude.ai`, sem controle de versão, potencialmente editável/expirável, acessível só à sessão do organizador. | Não deve ser tratado como especificação de trabalho enquanto não for capturado em formato versionado dentro do repositório (imagens/descrição formal em `UX-SPEC.md` ou pasta de assets própria). | PM + UX/UI | Antes do início do `UX-SPEC.md` delta desta iniciativa |
| 2 | **Cobertura de apenas 6 das 11 telas** — risco ao Guardrail 31. | Escopo desta release fixado como as 11 telas (Seção 4); profundidade de tratamento das 5 remanescentes é decisão de UX/UI, mas nenhuma pode ficar sem decisão registrada. | UX/UI (decisão) + PM (fixação do escopo, já feita nesta Parte II) | Antes de qualquer tarefa de Frontend ser reestimada em `TASK.md` delta |
| 3 | **Ambiguidade da paleta dupla** (Grupo Rola/marinho-dourado vs. Clube Comary/verde). | Não resolvida nesta Parte II — registrada como pergunta a esclarecer com o stakeholder (Seção 7) antes de qualquer estimativa de esforço, dado que muda a estimativa em ordem de grandeza. | PM + UX/UI | Antes do Gate 2 desta iniciativa |
| 4 | **Assets de marca fora de processo governado** (`logo.jpg`, `logo_comary.jpg` já na árvore de trabalho). | Convenção de path (ex.: `public/images/`) a definir por Tech Lead/Frontend; direito de uso dos escudos reais dos clubes a confirmar com o stakeholder antes de qualquer merge/publicação. | Tech Lead/Frontend (path) + PM (direito de uso) | Antes do merge de qualquer asset destes |
| 5 | **Fonte externa (Google Fonts) vs. CSP (`DEBT-03`).** Bebas Neue/Public Sans/JetBrains Mono são fontes Google; decisão de self-host vs. CDN tem implicação direta na CSP. | Decisão técnica não tomada aqui — roteada ao Software Architect, em conjunto com o fechamento de `DEBT-03`, não isoladamente depois. | Software Architect | Antes do primeiro uso real de fonte externa no código, e em conjunto com `DEBT-03` |
| 6 | **Rótulo "v2.0" prematuro.** Nenhuma versão do sistema tem uso real hoje. | Decisão já tomada nesta Parte II: tratar como "Iniciativa de Redesenho Visual" (adendo/revisão de design system), não como nova major version, até a v1 ter uso real validado pelo grupo. | PM (decisão registrada) | Já resolvido nesta Parte II — reavaliar só se/quando a v1 tiver uso real |
| 7 | **Retrabalho sobre trabalho já aprovado.** `tokens.css`/FE-00 é baseline formal já fechada em L0; a troca de paleta/tipografia é revisão estrutural do design system, não tarefa aditiva independente. | O Tech Lead deve reabrir estimativa sobre as tarefas já fechadas que tocam o design system, usando o mecanismo de "alteração visível" já previsto em `UX-SPEC.md`, não tratar como tarefas novas isoladas. | Tech Lead | No `TASK.md` delta desta iniciativa |
| 8 | **Simulador tático de T09 pode introduzir mudança funcional disfarçada de visual.** A revivência do campo gráfico pode trazer um padrão de interação (ex.: arrastar jogador) diferente do já decidido em `UX-SPEC.md` (seletor por toque, explicitamente para evitar drag-and-drop por confiabilidade/acessibilidade). | Não presumido como "só visual". Se a interação de "Trocar jogador" (RF-05.4) mudar de fato, este item deixa de poder ser tratado só por UX/UI e precisa passar pelo BA antes do desenho de UX/UI. | PM (sinalização) + BA (confirmação, se aplicável) + UX/UI | Antes de UX/UI desenhar a interação final de T09 |
| 9 | **Sequenciamento de capacidade — Risco 1 do CTO, hoje Médio (aceito conscientemente).** Comprometer a única capacidade de Backend/Frontend do projeto com o redesenho, antes da abertura de acesso ao grupo real, adia o início da mensuração da métrica de sucesso já aprovada na Parte I (Seção 3). | Risco aceito conscientemente pelo dono do produto, por decisão direta e registrada (ver "Registro formal" acima). O PM não reabre esta decisão; registra-a como aceita. | Organizador (aceite) + CTO (registro do aceite) | Já aceito nesta release; revisitado apenas se o organizador mudar de decisão novamente |
| 10 | **Dependência cruzada com DevOps (`DEBT-05`/`DEBT-06`/`DEBT-03`).** O CTO condicionou a migração *integral* de capacidade de Backend ao redesenho à finalização dessas correções já escritas. | Não é responsabilidade do PM/BA resolver — mas o Tech Lead precisa considerar essa finalização de baixo custo ao sequenciar o `TASK.md` delta, para não gerar disputa de capacidade de Backend não prevista. | Backend/DevOps (execução) + Tech Lead (sequenciamento) | Antes da migração integral de capacidade de Backend para o redesenho (já exigido pelo CTO) |

## 7. Perguntas em Aberto para o Business Analyst

O CTO já sinalizou que o Business Analyst **provavelmente não é necessário** nesta
iniciativa, na ausência de mudança de regra de negócio/dado/fluxo — a maior parte das
perguntas abaixo é, na prática, para UX/UI e para o stakeholder diretamente. O PM
mantém o BA no fluxo (`PLANNING-FLOW.md`) para uma confirmação leve, não para
levantamento funcional completo, exceto no item 1, que pode reabrir esse
enquadramento:

1. **[Único item que pode exigir levantamento funcional completo do BA, não confirmação leve]** A revivência do simulador tático em T09 muda a interação de "Trocar jogador" (RF-05.4, hoje seletor por toque) para arrastar-e-soltar, ou é só uma nova representação visual (campo gráfico) do mesmo comportamento já definido? Se mudar a interação, este item precisa de detalhamento funcional pleno do BA antes de UX/UI desenhar (Seção 6, item 8).
2. As duas paletas do mockup (Grupo Rola marinho-dourado vs. Clube Comary verde) são: substituição única, tema contextual por "lado" (ex.: Time A/Time B em T09), ou branding duplo por contexto de uso? (Seção 6, item 3)
3. O grupo/organizador confirma ter direito de uso dos escudos reais dos clubes citados nos assets já presentes (`logo.jpg`, `logo_comary.jpg`)? (Seção 6, item 4)
4. Para as 5 telas fora do mockup original (T04, T07, T08, T10, T11): o organizador tem alguma expectativa/preferência já formada sobre a profundidade de redesenho de cada uma, ou aceita que essa decisão fique inteiramente a critério técnico de UX/UI?
5. Confirmar se há algum caso de uso do simulador tático do app legado (ex.: capacidade de arrastar jogadores para posições específicas no campo, não só entre "Time A"/"Time B") que o organizador espera ver preservado — informação necessária para UX/UI avaliar se cabe dentro do RF-05 já aprovado (Parte I) ou se é funcionalidade nova.

---

## Checklist de Prontidão (`stakeholder-alignment-check`) — Parte II

- [x] Problema declarado em termos verificáveis — julgamento direto e citado
      literalmente do dono do produto sobre o design entregue, não "melhorar a
      experiência" vago (Seção 1)
- [x] Público-alvo nomeado especificamente — organizador como árbitro de sign-off
      desta iniciativa, jogadores do grupo como público secundário futuro (Seção 2)
- [x] Objetivo de sucesso é métrica mensurável, com baseline e meta — sign-off
      binário por tela, zero violação WCAG, zero tela sem decisão de cobertura
      (Seção 3); nenhuma métrica vaga do tipo "melhorar percepção"
- [x] Escopo tem "dentro" e "fora" explícitos, com justificativa em cada corte,
      incluindo a decisão de escopo de cobertura das 11 telas e a pausa do restante
      do backlog da v1 (Seção 4)
- [x] Toda funcionalidade/tela de alto nível tem prioridade justificada via MoSCoW +
      matriz valor/esforço (Seção 5), não lista arbitrária
- [x] Toda premissa/risco de produto tem dono e prazo de validação, incluindo as 7
      ressalvas remanescentes do CTO e o risco de mudança funcional disfarçada em T09
      (Seção 6)
- [x] Nenhuma das 7 seções está vazia ou com placeholder
- [x] `stakeholder-alignment-check` rodado: a decisão de inversão de prioridade do
      organizador já foi validada e registrada formalmente pelo CTO (`CTO-REVIEW.md`,
      Gate 1 desta iniciativa, veredito final "Aprovado com ressalvas") — **nenhum
      conflito novo identificado** entre o escopo registrado nesta Parte II e o
      alinhamento já validado. O único ponto que poderia gerar conflito de escopo
      (interação de T09, Seção 6 item 8) foi tratado como pergunta em aberto ao BA,
      não decidido unilateralmente pelo PM como "não deve ser problema" — não há,
      portanto, necessidade de escalar via `BLOCKERS.md` neste momento.

**Veredito**: PRD delta pronto. Liberado para o Business Analyst, com a ressalva de
que seu envolvimento pode ser leve (confirmação, não levantamento funcional completo)
exceto se o item 1 da Seção 7 confirmar mudança funcional em T09.
