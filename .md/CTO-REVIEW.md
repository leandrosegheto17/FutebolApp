# CTO-REVIEW.md

Log de governança do CTO / Head de Tecnologia. Cada seção representa um gate do
pipeline (PIPELINE-CONVENTIONS.md §"Gates do CTO"), datado, com achados e veredito
final (Aprovado / Aprovado com ressalvas / Reprovado).

---

## Gate 1 — Pré-descoberta — 2026-09-02

**Skill aplicada**: `tech-strategy-review`
**Input avaliado**: Briefing de negócio recebido diretamente do stakeholder (grupo
"Turma do Rola - Comary"), em linguagem natural, sem `VISAO-PRODUTO.md`/`PRD.md`
prévios.

### Objetivo de negócio

Centralizar em uma aplicação web única o controle de presença, desempenho e
organização das peladas do grupo "Turma do Rola - Comary", substituindo planilha/
WhatsApp/papel por um ranking único e sempre atualizado dos jogadores, eliminando
retrabalho, perda de histórico e disputa sobre presença/pontuação/formação de times.

Objetivo verificável em uma frase: **"Ter um ranking de jogadores sempre correto e
disponível, eliminando a necessidade de reconciliar planilha/WhatsApp/papel a cada
rodada."** Isso é concreto e testável (dá para verificar se o ranking bate com o
histórico de rodadas registradas) — não é uma aspiração vaga do tipo "fazer um app
para o grupo".

### Alinhamento com roadmap

Este é o primeiro projeto do repositório (não há `VISAO-PRODUTO.md`, `PRD.md` nem
histórico de produto anterior) — portanto não existe roadmap de longo prazo prévio
com o qual medir conflito. Trato o alinhamento como **neutro/fundacional**: a proposta
não compete com nada existente porque não há nada existente; ela é, na prática, o
próprio roadmap inicial do produto.

Ponto de atenção que registro para o PM capturar no `PRD.md` (não bloqueia o Gate 1,
mas é lacuna real do briefing):
- Não há orçamento ou prazo declarado explicitamente pelo stakeholder — só escopo
  funcional. "Alinhamento com roadmap" fica difícil de reavaliar em gates futuros sem
  essa referência. Recomendo que o PM pergunte diretamente ao stakeholder: (a) há uma
  data-alvo (ex.: início da próxima temporada de peladas)? (b) há restrição de custo
  de hospedagem/operação (grupo amador, provavelmente orçamento próximo de zero)?

### Plausibilidade de orçamento/prazo

Em nível de sinalização (não é estimativa detalhada — isso fica para
`capacity-and-timeline-validation` no Gate 3, com `TASK.md` em mãos):

- O escopo descrito (cadastro simples, registro de rodada, ranking público,
  histórico com estorno, sugestão de times balanceados, substituições, senha única de
  acesso interno) é compatível com uma aplicação web CRUD de porte pequeno/médio, sem
  sinal óbvio de incompatibilidade orçamentária — não exige infraestrutura cara,
  processamento pesado ou equipe grande.
- Um ponto meio-caminho entre "escopo" e "orçamento" que merece nota: **"Fora do
  escopo" está bem declarado** (autenticação completa multiusuário, múltiplos
  grupos/campeonatos, app mobile nativo, notificações automáticas) — isso é um sinal
  positivo de maturidade do briefing, reduz risco de scope creep no PRD.
- Sem prazo/orçamento declarado, não há como confirmar ou refutar plausibilidade além
  do sinal acima. Não é motivo de reprovação no Gate 1 (o objetivo de negócio está
  claro, que é o critério de bloqueio desta skill), mas é ressalva a resolver antes do
  Gate 3.

### Gap de roster

Revisando o roster de 12 agentes (`.claude/agents/`) contra o escopo proposto:

- PM, Business Analyst, Software Architect, UX/UI, Tech Lead, Backend, Frontend, QA,
  DevSecOps, DevOps cobrem integralmente o tipo de projeto (aplicação web CRUD com
  regras de negócio, ranking público e área autenticada por senha simples).
- **Mobile** existe no roster mas não é necessário — o próprio briefing exclui "app
  mobile nativo" do escopo ("acessível pelo celular" é atendido por web responsivo,
  não por app nativo). Não é gap, é agente que simplesmente não será acionado neste
  projeto.
- Nenhum gap óbvio de agente/skill (ex.: não há necessidade de `ml-ai-engineer` ou
  perfil equivalente — a "montagem de times equilibrados" é um problema de
  heurística/regra de negócio com restrições, não de aprendizado de máquina; cabe a
  Software Architect/Backend, não exige papel novo no roster).

### Riscos estratégicos preliminares (registrados para acompanhamento nos Gates 2 e 3)

Estes pontos não bloqueiam o Gate 1 (o objetivo de negócio está claro e o roster
cobre o escopo), mas registro aqui para que PM e, mais adiante, Software Architect os
tratem explicitamente — e para que eu, CTO, os reavalie formalmente em
`risk-and-compliance-check` no Gate 2:

1. **LGPD / dados pessoais expostos publicamente.** O cadastro de atletas inclui
   nome, contato e data de nascimento; o ranking (com nome e pontuação) é público e
   sem login. Isso é tratamento de dado pessoal exposto na internet sem controle de
   acesso — precisa de base legal declarada (provavelmente legítimo interesse/
   consentimento do grupo) e atenção especial se houver participantes menores de
   idade (data de nascimento é coletada, o que sugere que a idade é usada na
   montagem de times — LGPD trata dado de criança/adolescente com regra mais
   restritiva, Art. 14). Isso é achado estratégico de compliance, não substituo a
   análise tática de segurança do DevSecOps (SAST/DAST/segredos) — só sinalizo que
   o PRD e o SDD precisam endereçar isso antes do DevSecOps entrar.
2. **Autenticação por senha única compartilhada.** O modelo "senha simples de uso
   interno" para cadastro/lançamento/histórico é proporcional ao contexto (grupo
   amador, sem sistema multiusuário) e está corretamente delimitado no "fora de
   escopo" (não é autenticação completa). Ainda assim, deve ser tratado no SDD.md
   com cuidado mínimo (hash de senha, não texto puro, proteção básica contra força
   bruta) — ponto de atenção para o Gate 2, não motivo de reprovação aqui.
3. **Montagem de times equilibrados com restrições informais (rivalidades/vínculos
   familiares).** É um problema de satisfação de restrições não trivial (nível
   técnico + idade + pares que não podem/devem ficar juntos ou separados). Não é gap
   de roster, mas é uma decisão de arquitetura de complexidade real que deve vir com
   justificativa explícita de abordagem (heurística/regra determinística vs.
   algoritmo de otimização) no SDD.md — vou cobrar isso formalmente via
   `architecture-decision-review` no Gate 2.
4. **Estorno automático de pontos em correção de histórico.** Requisito de
   integridade de dados que precisa de regra de negócio bem definida no PRD (o que
   PM deve capturar) para não virar ambiguidade que chegue indefinida ao SDD.md.

Nenhum destes quatro pontos é bloqueante agora — são sinalizações para as próximas
etapas, registradas para rastreabilidade.

### Veredito: **Aprovado com ressalvas**

O PM está liberado para iniciar o levantamento detalhado (`PRD.md`). Ressalvas a
carregar para o levantamento:

- [ ] PM deve perguntar ao stakeholder por prazo-alvo e restrição de orçamento
      (hospedagem/operação), mesmo que a resposta seja "não há restrição relevante" —
      isso precisa ficar registrado no PRD.md para permitir reavaliação no Gate 3.
- [ ] PM/Business Analyst devem tratar explicitamente no PRD/PRD-TECNICO: base legal
      de tratamento de dados pessoais (LGPD), tratamento de dado de possíveis
      participantes menores de idade, e a regra de negócio de estorno de pontos em
      correção de histórico.
- [ ] Software Architect deve endereçar no SDD.md, com justificativa escrita: a
      abordagem para montagem de times equilibrados com restrições informais, e o
      desenho mínimo de segurança da senha única de acesso interno — ambos serão
      cobrados formalmente no Gate 2 (`architecture-decision-review` /
      `risk-and-compliance-check`).

Nenhum gap de roster identificado. Nenhuma incompatibilidade óbvia de escopo x
plausibilidade de orçamento/prazo identificada, na ausência de restrição declarada.

---

## Gate 2 — Pós-SDD — 2026-09-02

**Skills aplicadas**: `architecture-decision-review` (SDD.md completo), com
`build-vs-buy-analysis` aplicada dentro dele ao ADR-002, e `risk-and-compliance-check`
aplicada aos ADR-002, ADR-004, ADR-005, ADR-008 e ao risco de tier gratuito registrado
na Seção 6.2 do SDD.md.
**Input avaliado**: `SDD.md` (Software Architect, rascunho marcado "pronto para o Gate
2", 2026-09-02) + os 9 ADRs (`adr/001` a `adr/009`) + `PRD.md`/`PRD-TECNICO.md` como
contexto + este próprio `CTO-REVIEW.md`, Gate 1 (ressalvas: LGPD/dados pessoais, senha
única compartilhada, algoritmo de montagem de times, estorno automático).

O Software Architect marcou explicitamente 6 pontos para decisão deste gate (SDD.md,
Seção "Pontos explicitamente marcados para o Gate 2"): ADR-002, ADR-004, ADR-005,
ADR-007, ADR-008, e o risco de pausa do tier gratuito do Supabase por inatividade
(Seção 6.2). Reviso cada um abaixo, aplicando também o framework completo de
`architecture-decision-review` (trade-off, escalabilidade, custo, dívida técnica,
vendor lock-in) ao restante do documento que não foi explicitamente marcado, mas ainda
assim está sujeito à mesma régua.

### Riscos

1. **[Lock-in do ADR-002 sem plano de saída documentado — severidade real Média, não
   Alta.]** O ADR-002 registra vendor lock-in como consequência negativa aceita, mas o
   SDD.md não documenta um plano de saída — e o critério de pronto deste Gate 2 exige
   isso explicitamente ("nenhum vendor lock-in crítico sem plano de saída
   documentado"). Além disso, o próprio ADR-002 superestima a superfície real de
   lock-in: **RLS e PL/pgSQL não são específicos do Supabase** — são funcionalidades
   nativas do PostgreSQL, portáveis para qualquer Postgres gerenciado (RDS, Railway,
   Neon, self-hosted) sem reescrita de lógica. O que de fato prende à Supabase
   especificamente é: PostgREST como API pública consumida diretamente pelo cliente
   (`anon` key), o backup/PITR nativo do tier comercial, e o dashboard/Studio de
   administração — não o modelo relacional nem as funções de domínio. Reclassifico a
   severidade do lock-in real de "alta" (implícita na redação do ADR) para **média**,
   o que muda o que um plano de saída precisa cobrir, mas não dispensa a exigência de
   documentá-lo.
2. **[Média] Tensão RNF-04 (custo zero) vs. RNF-05 (durabilidade) — pausa de tier
   gratuito por inatividade.** Já identificada pelo próprio SDD.md (Seção 6.2),
   explicitamente encaminhada para decisão do CTO. Não há: (a) confirmação de
   orçamento do stakeholder (Premissa 6 do `PRD.md`, ainda pendente antes do Gate 3);
   (b) gatilho quantitativo definido para "quando" migrar para tier pago; (c)
   responsável nomeado para monitorar consumo desde o primeiro mês — o SDD.md diz
   "monitorar" sem dizer quem.
3. **[Média] Direitos do titular de dado (LGPD, Art. 18) não endereçados no SDD.md.**
   RF-01.6 permite editar qualquer campo do atleta, mas não existe fluxo de
   exclusão/anonimização de dado pessoal a pedido do titular (ex.: jogador que sai do
   grupo e pede remoção de nome/contato/data de nascimento). O ledger append-only
   (Seção 5 do SDD.md) preserva a integridade do saldo de pontos, mas o SDD.md não
   avalia se é compatível com anonimizar `nome_completo`/`contato`/`data_nascimento` de
   um `atleta_id` mantendo o ledger de pontos intacto — a lacuna é a ausência de
   avaliação, não necessariamente um problema de desenho insolúvel.
4. **[Média] Base legal de LGPD aplicada de forma genérica ao cadastro inteiro, sem
   diferenciar adulto de menor.** RNF-01/Seção 7.6 aplicam "legítimo interesse" (Art.
   7º, IX) como base legal única para todo o cadastro. Isso é apropriado para dado de
   atleta adulto, mas o tratamento de dado de possível menor de idade não se apoia em
   legítimo interesse — apoia-se em consentimento específico do responsável legal
   (Art. 14, §1º), uma base legal distinta, não uma variação da mesma. RN-02/RNF-02 já
   capturam corretamente a exigência funcional (checkbox declarativo de consentimento),
   mas a Seção 7.6 do SDD.md não deixa essa distinção de base legal explícita — é
   imprecisão de redação com implicação regulatória, não erro de desenho funcional.
5. **[Média] RF-08.6 ("não permitir descontinuação do legado antes da validação")
   depende de disciplina operacional, não de controle técnico.** O ADR-008 é
   estruturalmente sólido (schema nova ao lado da legada, rollback trivial), mas nada
   no SDD.md impede tecnicamente que alguém com acesso ao projeto Supabase execute um
   `DROP SCHEMA` na schema legada antes da validação explícita do organizador — é regra
   de processo, não trava de sistema. Isso é inconsistente com o próprio princípio que
   o Software Architect aplicou em ADR-005 ("a proteção não deveria depender de
   disciplina de código/processo, deveria ser estrutural, no banco") — ADR-008 não
   recebeu o mesmo padrão de rigor.
6. **[Média] RF-05.2 ("informar quais restrições não puderam ser satisfeitas") não tem
   mecanismo algorítmico definido.** O ADR-007 promete essa capacidade como resultado
   da heurística de duas fases, mas backtracking simples produz "sem solução", não
   automaticamente "estas restrições específicas conflitam entre si" — extrair um
   subconjunto mínimo explicativo de conflito é um subproblema à parte (ex.: análise do
   grafo de restrições) que o SDD.md não detalha. É requisito Must (EARS, RF-05.2) sem
   desenho de como será cumprido, não um detalhe trivial de implementação a decidir
   livremente depois.
7. **[Baixa] ADR-004 não define processo de redefinição/rotação da senha única
   compartilhada.** Sem conta individual e sem e-mail de recuperação, se o organizador
   esquecer a senha não há fluxo de reset descrito — provavelmente resolvido por acesso
   direto ao banco/painel do Supabase por quem detém credenciais de infraestrutura, mas
   isso não está registrado em nenhum lugar do SDD.md.
8. **[Baixa, já mitigada] Job de exportação externa (ADR-009) pode falhar
   silenciosamente** — já identificado pelo próprio SDD.md (Seção 6.2) com mitigação
   (alerta visível) repassada ao DevOps. Nenhuma ação adicional exigida neste gate.
9. **[Baixa, observação técnica, não bloqueio] Complexidade combinatória do
   backtracking do ADR-007.** Já é dívida técnica aceita conscientemente, com gatilho
   de revisão explícito (>60 presentes/rodada). Se a "montagem de times" desta release
   sempre dividir em exatamente 2 times (não confirmado no SDD.md/PRD-TECNICO.md),
   existe um algoritmo exato polinomial (union-find para pares "devem ficar juntos" +
   checagem de bipartição para pares "não podem ficar juntos") que dispensaria
   backtracking e garantiria otimalidade sem custo exponencial no pior caso — repasso
   como sugestão de otimização ao Tech Lead/Backend, não como reprovação da escolha
   atual, já que o próprio SDD.md já trata isso como aceitável no volume esperado.

### Alternativas Consideradas

O SDD.md já cita e compara alternativas explícitas para toda decisão marcada "Gate 2?
Sim" (Seção 3, tabela de stack) e em cada ADR revisado (seções "Considered Options"/
"Pros and Cons"). Duas observações sobre completude:

- **ADR-002** não considerou explicitamente "manter o Supabase legado sem reformular o
  schema, operando o novo sistema sobre a estrutura já existente" — mas essa omissão
  não é um gap real: o próprio `PRD-TECNICO.md` já autoriza reformular o schema
  livremente (RF-08.3), e a opção "in-place" foi de fato avaliada e descartada
  explicitamente dentro do ADR-008 (migração), só que em outro documento.
- **ADR-007** não considerou "resolver via union-find + bipartição" como alternativa de
  algoritmo exato de baixo custo para o caso de exatamente 2 times (Risco 9 acima) —
  esta é a única lacuna real de alternativa não avaliada nos ADRs revisados, mas não
  muda a recomendação porque o SDD.md já trata a escolha atual (backtracking) como
  aceitável dentro do volume esperado, com gatilho de revisão já registrado.

### Build vs. Buy — Plataforma de Banco/Backend (ADR-002)

| | Opção A — Manter Supabase legado (Postgres gerenciado + PostgREST + backup nativo) | Opção B — Migrar para outro Postgres gerenciado (Railway/Render/RDS) | Opção C — Migrar para outra tecnologia (Firebase/Firestore, PlanetScale/MySQL) |
|---|---|---|---|
| Controle | Limitado ao roadmap/tier comercial do Supabase | Limitado ao roadmap do novo vendor, mas SQL/RLS/PL-pgSQL portam sem reescrita | Total sobre o app, mas modelo relacional precisa ser todo reescrito |
| Tempo até funcionar | Mais rápido — dados já lá, zero salto de plataforma | Rápido — dump/restore de Postgres para Postgres preserva schema, RLS e funções quase sem alteração | Lento — reescreve schema, funções (PL/pgSQL não existe em Firestore; MySQL não tem RLS nativo) e camada de acesso |
| Custo | Mínimo (RNF-04); tier gratuito com risco de pausa (Risco 2) | Similar (concorrentes também têm tier gratuito/baixo custo) + esforço de migração de infraestrutura, baixo dado Postgres→Postgres | Custo de reescrever lógica de domínio (funções PL/pgSQL, RLS) do zero — alto, desproporcional a RNF-04 |
| Lock-in real (corrigido, Risco 1) | Restrito a PostgREST (API pública direta), Studio/dashboard e ao tier comercial de backup/PITR — **não** a RLS/PL-pgSQL, que são Postgres puro | Nenhum lock-in adicional relevante — troca um fornecedor de Postgres gerenciado por outro | Lock-in total de modelo de dados e lógica de domínio na nova tecnologia escolhida |

**Reversibilidade**: média/alta para (A)→(B) — um `pg_dump`/restore para outro Postgres
gerenciado preserva schema, RLS e funções PL/pgSQL quase inalterados; o que precisaria
ser reconstruído é só a camada que depende de PostgREST direto (leitura pública via
`anon` key) e a configuração de backup/PITR nativo. Reversibilidade baixa para
(A)→(C) — reescrita completa de RLS/PL-pgSQL em outra tecnologia, alto risco de erro de
tradução, exatamente o que RNF-12 (zero perda de dado) proíbe.

**Vendor lock-in**: real, mas **menor do que o ADR-002 descreve** — concentrado em
PostgREST/dashboard/tier comercial, não no modelo relacional em si. Ainda assim, é
lock-in "confirmado" no sentido de que não há plano de saída **escrito** no ADR, lacuna
formal frente ao critério de pronto deste Gate 2.

**Custo total**: não quantificável em número real nesta fase (sem tabela de
preço/uso real confirmada pelo stakeholder) — declarado como estimativa qualitativa,
não fabricado como número.

**Fator decisivo**: não é o lock-in (secundário e parcialmente reversível) — é a
**restrição confirmada pelo stakeholder** ("manter e reaproveitar" o banco legado)
combinada com o risco de perda de dado inerente a qualquer segundo salto de plataforma
(RNF-12, não negociável). Migrar para B ou C introduziria uma etapa de transporte de
dado entre plataformas distintas sem nenhum requisito do `PRD-TECNICO.md` que a exija —
complexidade e risco não solicitados.

**Recomendação**: manter a Opção A (ADR-002 como está), condicionada a duas correções
formais antes do Gate 3: (1) adicionar ao ADR-002 um parágrafo de "plano de saída"
nomeando explicitamente a Opção B (Postgres→Postgres) como rota de saída de baixo custo
se o tier comercial do Supabase se tornar inviável (preço, pausa recorrente,
descontinuação), já que schema/RLS/funções portam quase sem reescrita; (2) resolver o
Risco 2 (tier gratuito) com decisão explícita de orçamento do stakeholder antes do
Gate 3. **Esta recomendação mudaria** se o Supabase acumular histórico real de
indisponibilidade/pausa não previsto — nesse caso a Opção B passa a ser efetivamente
executada, não só documentada como saída — condição objetiva de revisão, não
subjetiva.

### Risco e Compliance

| Item do checklist | Evidência (SDD.md/PRD.md) | Severidade | Observação |
|---|---|---|---|
| **Dado pessoal/sensível** | SDD.md Seção 7.6: nome, contato, data de nascimento coletados; base legal declarada (legítimo interesse, Art. 7º IX) | Média | Ver Risco 4 — base legal correta para adulto, mas não diferenciada para menor (Art. 14) na redação da Seção 7.6 |
| **Minimização** | Views públicas curadas (RN-01/ADR-005) excluem contato/data de nascimento estruturalmente, não por convenção de código | Baixa | Bem endereçado — nenhuma coleta "por via das dúvidas" identificada além do necessário para cadastro/pontuação/times |
| **Retenção e descarte** | RNF-06: log de auditoria retido indefinidamente (justificado). Nenhuma regra de retenção/descarte para o dado pessoal do atleta em si (nome/contato/data de nascimento) | Média | Ver Risco 3 — ausência de mecanismo de exclusão/anonimização a pedido do titular (LGPD Art. 18) |
| **Localização/jurisdição** | SDD.md não especifica a região de hospedagem do projeto Supabase legado (dependente do spike de descoberta, Seção 6.1) | Baixa | Não bloqueia o Gate 2 — verificar região do projeto como parte do próprio spike já previsto; se incompatível com tratamento adequado de dado de titular brasileiro, reavaliar |
| **Terceiros com acesso a dado** | Supabase atua como operador (LGPD) do dado armazenado; relação com o Termo de Serviço do Supabase não documentada explicitamente no SDD.md | Baixa | Nota operacional, não bloqueia — registrar formalmente a relação operador/controlador é item de governança, sinalizado para acompanhamento |
| **Risco técnico estratégico** | Ponto único de persistência (Supabase) mitigado por HA gerenciado + PITR + exportação externa (ADR-009); RF-08.6 depende de disciplina operacional, não de trava técnica (Risco 5) | Média | Ver Risco 5 — recomendo trava técnica adicional (ex.: revogar permissão de `DROP` na schema legada até flag de validação) |

Nenhum item classificado como severidade **Alta** — nenhum item bloqueia o veredito por
si só, mas quatro itens de severidade **Média** (Riscos 1, 2, 3 e 5 da lista de Riscos)
precisam de mitigação/decisão documentada antes ou durante a implementação, conforme as
ressalvas abaixo. Nenhum item foi omitido silenciosamente — os de baixa severidade estão
listados com a observação correspondente.

### Recomendação

Aprovar o SDD.md e os 9 ADRs como base válida para o Tech Lead iniciar a decomposição em
`TASK.md`, com ajustes pontuais documentais/técnicos (não redesenho arquitetural)
exigidos antes do Gate 3 ou antes da implementação correspondente:

1. ADR-002: adicionar parágrafo de plano de saída (Opção B como rota de baixo custo) —
   dono: Software Architect.
2. Risco do tier gratuito do Supabase (Seção 6.2 do SDD.md): confirmar orçamento com o
   stakeholder e definir gatilho quantitativo + responsável pelo monitoramento — dono:
   PM/stakeholder (orçamento, converge com a Premissa 6 já pendente do `PRD.md`) + CTO
   (validação final antes do Gate 3).
3. Direito de exclusão/anonimização de dado pessoal (LGPD Art. 18): desenhar um fluxo
   mínimo (mesmo que manual/operacional) de anonimização de `atleta` a pedido,
   compatível com o ledger append-only — dono: Software Architect, antes do Tech Lead
   fechar o modelo de dados definitivo em `TASK.md`.
4. Base legal diferenciada para dado de menor (Art. 14) na Seção 7.6 do SDD.md — ajuste
   de redação, não de desenho — dono: Software Architect.
5. Trava técnica (não só processual) para RF-08.6 — dono: Software Architect/Tech Lead,
   antes da execução da migração.
6. Mecanismo de explicação de conflito para RF-05.2 — dono: Software Architect/Backend,
   detalhar antes da implementação do Serviço de Times.
7. Procedimento de redefinição da senha única compartilhada — dono: Tech Lead/Backend,
   pode ser resolvido diretamente no `TASK.md`, sem necessidade de novo ADR.

Nenhum destes 7 pontos exige redesenho da arquitetura escolhida (ADR-001 a 009
permanecem `Accepted`) — são adendos de documentação e, nos itens 5 e 6, detalhamento
técnico antes da implementação, não mudança de decisão estrutural. Por isso o veredito é
**Aprovado com ressalvas**, não Reprovado.

### Veredito por ADR marcado para o Gate 2

| ADR | Skill aplicada | Veredito |
|---|---|---|
| ADR-002 (Supabase legado como plataforma) | `build-vs-buy-analysis` + `risk-and-compliance-check` | **Aprovado com ressalvas** — decisão correta (Opção A), lock-in real menor do que descrito no próprio ADR, mas exige adendo de plano de saída (item 1) e resolução do risco de tier gratuito (item 2) |
| ADR-004 (autenticação custom senha única) | `risk-and-compliance-check` | **Aprovado com ressalvas** — desenho de segurança adequado ao risco estratégico #2 do Gate 1 (argon2id, rate limiting, TTL curto, mensagem genérica); falta procedimento de redefinição de senha (item 7) |
| ADR-005 (RLS/views públicas) | `risk-and-compliance-check` | **Aprovado** — resposta estrutural correta ao risco estratégico #1 do Gate 1 (LGPD), proteção no nível de banco, não de convenção de código; nenhuma ressalva bloqueante |
| ADR-007 (heurística de montagem de times) | `architecture-decision-review` | **Aprovado com ressalvas** — resposta adequada ao risco estratégico #3 do Gate 1, mas falta detalhar o mecanismo de explicação de conflito exigido por RF-05.2 (item 6) |
| ADR-008 (migração não-destrutiva) | `risk-and-compliance-check` | **Aprovado com ressalvas** — desenho estruturalmente sólido (rollback real, schema legada intocada), mas RF-08.6 depende de disciplina, não de trava técnica (item 5) |
| Risco de tier gratuito pausar por inatividade (Seção 6.2) | `risk-and-compliance-check` | **Aprovado com ressalvas** — risco corretamente identificado pelo próprio Software Architect, mas sem orçamento confirmado nem gatilho/responsável de monitoramento definidos (item 2) |

### As quatro ressalvas do Gate 1, revisitadas

1. **LGPD/dados pessoais expostos publicamente** — endereçada estruturalmente por
   ADR-005 (RLS + views curadas, proteção no nível de banco). Validado formalmente
   neste Gate 2 como base legal apropriada para dado de atleta adulto; ressalva nova
   (não do Gate 1) sobre diferenciação de base legal para menor e sobre direito de
   exclusão (itens 3 e 4 acima).
2. **Autenticação por senha única compartilhada** — endereçada por ADR-004 (hash
   argon2id, rate limiting, TTL curto, mensagem genérica). Aprovado, com a ressalva
   nova de procedimento de redefinição de senha (item 7).
3. **Montagem de times com restrições informais** — endereçada por ADR-007 (heurística
   determinística de duas fases). Aprovado, com a ressalva nova de mecanismo de
   explicação de conflito (item 6).
4. **Estorno automático de pontos** — endereçada por ADR-006 (funções/triggers
   PL/pgSQL, atomicidade nativa) e pelo desenho de ledger append-only (Seção 5 do
   SDD.md). **Totalmente resolvida, sem ressalva nova** — nenhuma lacuna identificada
   neste Gate 2.

### Veredito do Gate 2: **Aprovado com ressalvas**

O Software Architect não precisa reabrir o `SDD.md` nem os ADRs para reprovação —
nenhuma decisão estrutural foi reprovada. O Tech Lead está liberado para iniciar a
decomposição em `TASK.md` sobre a arquitetura como está. As ressalvas ficam registradas
como pendências rastreáveis:

- [ ] ADR-002: adendo de plano de saída (Software Architect).
- [ ] Confirmação de orçamento/tier do Supabase junto ao stakeholder, com gatilho
      quantitativo de migração para tier pago (PM, antes do Gate 3 — converge com a
      Premissa 6 do `PRD.md`, já pendente).
- [ ] Fluxo mínimo de anonimização/exclusão de dado pessoal do atleta, compatível com o
      ledger append-only (Software Architect).
- [ ] Ajuste de redação da Seção 7.6 do SDD.md, diferenciando base legal de adulto
      (Art. 7º IX) e de menor (Art. 14) (Software Architect).
- [ ] Trava técnica complementar à disciplina de processo em RF-08.6 (Software
      Architect/Tech Lead).
- [ ] Mecanismo de explicação de conflito para RF-05.2, detalhado antes da
      implementação do Serviço de Times (Software Architect/Backend).
- [ ] Procedimento de redefinição da senha única compartilhada, registrado no
      `TASK.md` (Tech Lead/Backend).

Nenhuma destas pendências bloqueia o início do Gate 3 (capacidade/prazo) nem a
decomposição em `TASK.md` — são acompanhadas ao longo da implementação, não vetos ao
`SDD.md`. Se qualquer uma delas revelar, na prática, necessidade de mudança de
arquitetura (por exemplo, se o Supabase de fato pausar recorrentemente e a Opção B
precisar ser executada, não só documentada), o ponto volta a este Gate 2 como
reavaliação pontual — registrada em `BLOCKERS.md` se envolver outro agente além do
Software Architect.

---

## Gate 3 — Pré-TASK.md — 2026-09-02

**Skills aplicadas**: `capacity-and-timeline-validation` (`TASK.md`), `guardrails-governance`
(`GUARDRAILS.md`).
**Input avaliado**: `TASK.md` (Tech Lead, rascunho submetido para o Gate 3,
2026-09-02) + `GUARDRAILS.md` (Tech Lead, rascunho submetido junto, aguardando
aprovação) + `SDD.md` (Aprovado com ressalvas no Gate 2, incluindo Anexo A) +
`UX-SPEC.md` (completo, revisão pós-BLOCKER-001/002) + `PRD.md`/`PRD-TECNICO.md`
como contexto + `BLOCKERS.md` (BLOCKER-001/002, `Resolvido`) + este próprio
`CTO-REVIEW.md` (Gate 1 e Gate 2, pendências em aberto com dono e prazo) + roster
de agentes (`.claude/agents/`), como referência de capacidade real disponível.

### Capacidade e prazo (`capacity-and-timeline-validation`)

**Capacidade real da squad**: o roster deste pipeline tem exatamente um agente
`backend` e um agente `frontend` (`.claude/agents/backend.md`,
`.claude/agents/frontend.md`) — não existem múltiplas instâncias do mesmo papel.
A premissa do Tech Lead ("um Backend developer e um Frontend developer full-time
dedicados", Seção 0 do `TASK.md`) não é uma suposição a mais para eu validar
contra um dado externo — **é exatamente a capacidade estrutural real disponível
neste projeto**, não uma redução artificial de escopo. Não há questão de alocação
nominal de pessoas aqui (fora da minha alçada, conforme meu próprio guardrail) —
é constatação de que a squad é, por desenho, 1 Backend + 1 Frontend.

**Volume total vs. capacidade**: `TASK.md` Seção 3 fecha em Backend ≈ 41 PD +
Frontend ≈ 35.5 PD (≈ 76.5 PD combinados), explicitamente excluindo `SPK-01` (2-3
PD de timebox) e `BE-15` (3-5 PD de timebox de rascunho, não comprometido). Com
PD = ~6h efetivas e cadência de 5 PD/semana por pessoa:

- Trilha Backend (a mais longa, e a que domina o calendário): 41 PD ≈ 8.2
  semanas + `SPK-01`/`BE-15` (5-8 PD adicionais, gatilhados pela liberação das
  credenciais do legado na fase de execução, não necessariamente no mesmo
  intervalo) ≈ **9-10 semanas de trilha Backend "núcleo" + uma cauda de migração
  de duração incerta, mas não bloqueante do restante do release** (o próprio
  `SDD.md`/`TASK.md` já isolam isso corretamente — `SPK-01` não afeta o modelo de
  dados já fechado, só o script de transformação).
- Trilha Frontend: 35.5 PD ≈ 7.1 semanas, com folga real frente à trilha Backend
  (FE-00 começa no dia 1 em paralelo a BE-01; FE-02/FE-03 — área pública — não
  dependem de autenticação e podem avançar cedo).
- Dado que `TASK.md` Seção 4.2 já desenha corretamente o paralelismo
  "contrato-primeiro" (Backend e Frontend da mesma tela avançam juntos assim que
  o endpoint publica contrato em `API-CONTRACT.yaml`, sem esperar a tarefa
  Backend "terminar"), o calendário total do núcleo do MVP é **limitado pela
  trilha Backend (~9-10 semanas)**, não pela soma das duas trilhas — está
  corretamente modelado, não há dupla contagem otimista nem pessimista.

**Plausibilidade do total frente ao sinal qualitativo do Gate 1**: 76.5 PD
combinados, para um CRUD de porte pequeno/médio com heurística de restrições e
migração de um legado, é proporcional ao que eu já sinalizei no Gate 1
("compatível com uma aplicação web CRUD de porte pequeno/médio, sem sinal óbvio
de incompatibilidade orçamentária") — nenhuma contradição. O próprio `TASK.md`
(Seção 5, item 5) já registra corretamente que o acréscimo de `BE-07`/incremento
de `FE-04` (anonimização, ADR-011) está absorvido nesta estimativa, não é uma
surpresa não contabilizada — calibro aqui, como pedido, que essa é a expectativa
atualizada e correta para o Gate 3, substituindo a expectativa qualitativa (e
necessariamente menos precisa) do Gate 1.

**Contradição com restrição de prazo/orçamento conhecida**: nenhuma identificada,
pela razão inversa de "está tudo bem" — o stakeholder **ainda não respondeu** à
Premissa 6 do `PRD.md` (prazo-alvo/orçamento), pendente desde o Gate 1, reiterada
no Gate 2, e não confirmada até este Gate 3. Não existe, portanto, nenhuma
restrição de prazo declarada para o total estimado poder contradizer — o que é
diferente de "confirmado como compatível". Trato isso separadamente na seção de
pendências abaixo (item 3), porque é o mesmo fio que conecta a ausência de
resposta do stakeholder ao risco do tier gratuito do Supabase.

**Plausibilidade de `SPK-01`**: o timebox de 2-3 PD para introspecção de schema
(`information_schema`/`pg_constraint`) + mapeamento campo a campo é metodologicamente
correto — introspecção automatizada é rápida; a incerteza real está em quantos
campos exigirão confirmação do organizador, não na mecânica técnica do
levantamento. O próprio `TASK.md` já trata isso corretamente como teto de
investigação, não como estimativa de esforço de implementação, e explicitamente
não força uma estimativa de confiança para `BE-15` antes de `SPK-01` rodar —
exatamente o que `capacity-and-timeline-validation`/o guardrail de "não estimar
no escuro" exigem. Nenhuma reprovação aqui: é a forma correta de tratar
incerteza técnica alta, não uma lacuna.

**Dependências e tarefas sem dono**: Seção 4 do `TASK.md` mapeia a cadeia crítica,
o que roda em paralelo e os bloqueios não-óbvios de forma consistente com a
Seção 3 (nenhuma tarefa referenciada no diagrama Mermaid está ausente da lista de
tarefas, e vice-versa). Toda tarefa tem dono de papel (prefixo `BE-`/`FE-`) e
critério de aceite testável; `SPK-01` tem dono explícito (Backend, com
acompanhamento do Software Architect). Nenhuma tarefa crítica sem dono
identificada.

**Conclusão da validação de capacidade/prazo**: a decomposição é plausível,
proporcional à capacidade real da squad (1 Backend + 1 Frontend), corretamente
sequenciada, e não contradiz nenhuma restrição de negócio conhecida (porque
nenhuma foi declarada) — nenhum ponto aqui, isoladamente, reprova o `TASK.md`.

### As três pendências reiteradas pelo Tech Lead (Seção 6.1 do `TASK.md`) para decisão deste Gate

O Tech Lead sinalizou corretamente que não pode decidir estes três pontos
sozinho — reviso cada um, decidindo se é para resolver agora ou seguir como
débito documentado com prazo:

**1. Plano de saída do Supabase (ADR-002) — ainda não documentado.**

Este item **já tinha prazo comprometido explicitamente por mim no Gate 2**:
"antes do Gate 3" (Recomendação, item 1). Ao reler o `SDD.md`/ADR-002 nesta
revisão, confirmo que o parágrafo de plano de saída **não foi adicionado** — o
ADR-002 permanece exatamente como estava no Gate 2. Isto é a segunda vez que
este item atravessa um gate sem entrega, apesar de ter dono e prazo nomeados
desde o Gate 2. **Decisão**: não é motivo para reprovar o `TASK.md` (nenhuma
tarefa de Backend/Frontend depende do texto do plano de saída — a decisão
estrutural do ADR-002, Opção A, já está `Accepted` e não muda), mas **não pode
mais seguir como débito sem consequência**. Registro um bloqueio formal contra o
Software Architect em `BLOCKERS.md` (`BLOCKER-003`), com prazo final e
inegociável: **antes da execução real de `BE-15` contra a schema legada** (o
mesmo ponto em que `RF-08` já exige a migração como pré-requisito de ir a
produção com dado real). Reforço isso como guardrail vinculante (`GUARDRAILS.md`,
regra 35, ver abaixo) — não fica mais só registrado em prosa neste log.

**2. Redação da base legal LGPD diferenciada entre adulto e menor (Seção 7.6 do
`SDD.md`) — ainda pendente.**

Diferente do item 1, este **não tinha prazo explícito de "antes do Gate 3"** no
Gate 2 (só "ajuste de redação", dono Software Architect, sem data). O próprio
`UX-SPEC.md` (Seção 7.2, item 3) já trata isso corretamente como dependência de
sincronização de texto, não como bloqueio de implementação — o aviso de
privacidade de T04 já antecipa a diferenciação em linguagem simples, e o
`TASK.md` (Risco 4, Seção 5) já registra que isso não bloqueia o início de
`FE-04`, só o "freeze" final do texto de produção. **Decisão**: segue como
débito documentado, mas agora com prazo explícito e final fixado por mim (não
mais em aberto indefinidamente): **antes de o texto do aviso de privacidade de
`FE-04` ser congelado para produção** (equivalente, na prática, a antes do
sinal-verde do QA para essa tela). Se este prazo também for perdido, o item
escala automaticamente para `BLOCKERS.md` contra `software-architect` — não
preciso reabrir este Gate para isso, a regra já fica registrada aqui.

**3. Orçamento/monitoramento do tier gratuito do Supabase (risco de prazo, Seção
5 do `TASK.md`) — sem responsável definido.**

Este é o item mais antigo em aberto — sinalizado como ponto de atenção já no
Gate 1 (ressalva de roadmap), formalizado como Premissa 6 no `PRD.md` ("PM deve
confirmar prazo-alvo/orçamento"), cobrado de novo no Gate 2 ("PM/stakeholder,
antes do Gate 3"), e **o stakeholder ainda não respondeu** até este Gate 3 —
terceira vez que atravessa um gate sem resposta. Diferente do item 1, aqui **eu
decido agora**, em vez de continuar empurrando a decisão para uma resposta que
não veio em três gates consecutivos: adoto formalmente a postura já registrada
pelo PM como premissa até prova em contrário (`PRD.md`, Premissa 6 — "orçamento
de hospedagem/operação é mínimo/próximo de zero") como a decisão de orçamento
válida para este projeto. Isso não elimina o risco técnico já identificado pelo
Software Architect (`SDD.md`, Seção 6.2 — pausa do tier gratuito por
inatividade, severidade Média) — apenas fecha a pergunta de "que orçamento
assumir" que estava em aberto. Como consequência prática, exijo que a **primeira
fase de observabilidade do DevOps** (quando essa etapa do pipeline for
acionada) inclua, sem exceção: monitoramento de consumo do tier do Supabase
desde o primeiro mês em produção, com gatilho quantitativo objetivo (ex.: 70-80%
de qualquer cota do tier gratuito, ou detecção de pausa por inatividade) que
force reavaliação imediata para tier pago — este requisito passa a ser guardrail
vinculante (`GUARDRAILS.md`, regra 36, ver abaixo), não apenas uma nota de risco
em prosa que pode se perder na transição de contexto entre QA→DevSecOps→DevOps.
Não é responsabilidade de Backend/Frontend deste `TASK.md` (confirmo a leitura
do próprio Tech Lead, Seção 5, item 2) — é herdada diretamente por DevOps via
`GUARDRAILS.md`.

### Riscos de Prazo (Seção 5 do `TASK.md`) — avaliação dos demais itens

Os itens 1 (`SPK-01`/`BE-15`), 6 (complexidade combinatória, já mitigada), 7
(DevSecOps precisará de tempo de hardening tático) e 8 (retrabalho condicional
de `N≠2`) estão corretamente sinalizados, com dono e ação claros, e não exigem
nenhuma decisão adicional minha neste gate — são acompanhados ao longo da
execução. O item 5 (recalibração da expectativa do Gate 1 frente ao escopo
fechado) já foi endereçado na seção de capacidade acima.

### Veredito do `TASK.md`: **Aprovado com ressalvas**

A decomposição é sólida: toda tarefa tem dono, critério de aceite testável e
estimativa (exceto as duas exceções corretamente justificadas por spike); as
dependências e o paralelismo estão mapeados de forma consistente; a capacidade
assumida (1 Backend + 1 Frontend) corresponde à capacidade real do roster deste
projeto; o volume total não contradiz nenhum sinal de porte ou restrição de
prazo conhecida. Nenhuma tarefa ou risco individual é reprovado — Backend e
Frontend estão liberados para iniciar a implementação de produção sobre este
`TASK.md`, incluindo ordem de execução e paralelismo definidos na Seção 4.

As ressalvas ficam registradas como pendências rastreáveis, com prazo agora
final (não mais em aberto indefinidamente) e consequência explícita se
perdido novamente:

- [ ] Plano de saída do ADR-002 — dono: Software Architect. Prazo final: antes
      da execução real de `BE-15` contra a schema legada. Já registrado como
      `BLOCKER-003` em `BLOCKERS.md` (segunda vez que o prazo é perdido) e como
      guardrail vinculante (regra 35).
- [ ] Redação diferenciada da base legal LGPD (Seção 7.6 do `SDD.md`) — dono:
      Software Architect. Prazo final: antes do freeze do texto de privacidade
      de `FE-04` para produção. Se perdido, escala automaticamente para
      `BLOCKERS.md`.
- [x] Orçamento/monitoramento do tier gratuito do Supabase — **resolvido neste
      Gate 3** pelo próprio CTO (postura de orçamento mínimo adotada como
      decisão final, dado o silêncio do stakeholder em três gates
      consecutivos); requisito de monitoramento herdado por DevOps via
      guardrail vinculante (regra 36).

### `GUARDRAILS.md` (`guardrails-governance`)

Revisei as 34 regras propostas pelo Tech Lead contra `SDD.md`, os 11 ADRs e
`TASK.md`: toda regra tem rastreabilidade explícita a uma decisão já aceita
(ADR ou requisito), nenhuma regra contradiz outra, nenhuma regra tenta decidir
alocação nominal de pessoas ou substituir a análise tática do DevSecOps, e a
tabela de Log de Alterações está no formato exigido por
`PIPELINE-CONVENTIONS.md` §5. Nenhum ajuste solicitado às regras 1-34 — aprovadas
como submetidas.

Adiciono, no exercício da minha própria autoridade de aprovação de exceção/mudança
estrutural (não peço ao Tech Lead para reformular e resubmeter, porque as duas
regras abaixo nascem diretamente de uma decisão de governança minha neste
próprio gate, não de uma lacuna do trabalho do Tech Lead): as regras **35** e
**36**, formalizando as decisões dos itens 1 e 3 acima como guardrails
vinculantes, não apenas notas de prosa neste log. Ver `GUARDRAILS.md`, nova
Seção 9, e Log de Alterações atualizado (linha 1: regras 1-34 aprovadas; linha
2: regras 35-36 propostas e aprovadas pelo CTO).

**Veredito do `GUARDRAILS.md`: Aprovado.** Passa a valer como documento vinculante
a partir desta data (2026-09-02) — todo agente downstream (Backend, Frontend, e,
mais adiante, QA/DevSecOps/DevOps) está sujeito às 36 regras a partir de agora.

### Encerramento do fluxo de planejamento

Com este Gate 3, o fluxo de planejamento (Gates 1-3) está formalmente encerrado:

- `SDD.md`: Aprovado com ressalvas (Gate 2), permanece nesse status — as
  ressalvas remanescentes (itens 1, 2, 4, 5, 7 da Recomendação do Gate 2) seguem
  rastreadas, duas delas (1 e 4, renumeradas aqui como itens 1 e 2) agora com
  prazo final e consequência explícitos.
- `TASK.md`: **Aprovado com ressalvas** — Backend e Frontend liberados para
  iniciar a implementação de produção.
- `GUARDRAILS.md`: **Aprovado** — em vigor, 36 regras, vinculante para todos os
  agentes a partir de agora.

O próximo ponto de atuação formal do CTO é ad hoc (arbitragem de conflito
escalado, ou nova mudança estrutural em `GUARDRAILS.md`) ou o Gate 4
(fechamento, registro após o deploy do DevOps — sem poder de veto).
