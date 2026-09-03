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
