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

---

## Gate 1 — Pré-descoberta — Iniciativa "Refactor Visual v2.0" — 2026-09-04

**Skill aplicada**: `tech-strategy-review`, com apoio de leitura de
`DEPLOY.md`, `EXECUTION-LOG.md`, `GUARDRAILS.md` e `src/design-system/tokens.css`
como contexto de execução real (este projeto já passou dos Gates 1-3
originais e está em fase de execução — não é mais um pipeline "do zero").
**Input avaliado**: briefing do stakeholder/organizador recebido diretamente
("vamos planejar a refatoração visual do módulo de acordo com o link
[...]"), tratando como v2.0 a adoção de um redesenho visual de 6 telas
(Ranking Público, Presença Mensal, Login, Lançamento de Rodada, Montagem de
Times, Histórico de Rodadas) já explorado informalmente pelo organizador com
um agente de UX ad hoc, **fora deste pipeline formal**. Contexto acumulado:
`PRD.md` (objetivo de negócio original, Seção 3), `SDD.md`/`GUARDRAILS.md`
(arquitetura e regras vigentes), `UX-SPEC.md` (design system atual,
`src/design-system/tokens.css`, 11 telas T01-T11 já especificadas e
implementadas), `TASK.md` (capacidade real: 1 Backend + 1 Frontend, já
integralmente alocada), `DEPLOY.md`/`EXECUTION-LOG.md` (estado real de
execução: 6 lotes — L0 a L6 — fechados com dupla aprovação QA/DevSecOps, mas
**nenhum deploy real ocorreu ainda**, nem mesmo commit em `main`).

### Tentativa de verificação direta do artefato de origem

Tentei acessar o link do artefato (`WebFetch`) para avaliar o conteúdo
diretamente, não apenas pelo resumo fornecido. O retorno confirma que a
página é uma casca vazia para mim ("Content is user-generated and
unverified", sem elementos de layout/cor/tipografia visíveis) — o artefato
é uma sessão de chat do `claude.ai` sem controle de versão, potencialmente
editável/expirável, acessível apenas à sessão autenticada do organizador.
**Isso não invalida a proposta**, mas é um achado real: **não existe hoje
nenhum artefato durável e versionado desta proposta dentro do repositório**
— só a descrição em prosa fornecida nesta tarefa. Antes de qualquer agente
downstream (UX/UI, Frontend) tratar isso como especificação de trabalho, o
conteúdo (telas, paletas, tipografia, componentes) precisa ser capturado em
um artefato persistido e versionado (ex.: anexado como imagens/descrição
formal dentro do próprio `UX-SPEC.md` revisado), não referenciado só por
link externo — mesmo racional de rastreabilidade que já rege todo o resto
deste pipeline.

### Objetivo de negócio

Diferente do Gate 1 original (que tinha um objetivo verificável e concreto —
"ranking sempre correto e disponível, eliminando reconciliação manual"),
**esta iniciativa não veio acompanhada de um objetivo de negócio explícito
próprio** — o briefing é uma instrução de adoção de uma solução ("vamos
adotar este design") e não a descrição de um problema ou resultado
mensurável que o redesenho resolveria. Isso é estruturalmente análogo ao
padrão que meu próprio critério de pronto trata como insuficiente ("não é
só 'fazer um app'") — aqui seria "não é só 'trocar o visual'".

Não trato isso como reprovação automática, porque existe uma hipótese
plausível e legítima de objetivo de negócio subjacente, que o PM precisa
**confirmar explicitamente com o stakeholder antes de comprometer escopo**,
não presumir por conta própria:
- **Hipótese A (adoção/gestão de mudança)**: o app legado
  (`FutebolRanking`) segue em uso ativo em paralelo (`GUARDRAILS.md`, nota
  da regra 11) e tem um recurso "mais celebrado" (simulador tático) que o
  grupo já ama. Se a v1 deste projeto (ainda não lançada) tiver uma
  identidade visual genérica, o risco real é resistência de adoção quando
  o organizador migrar o grupo do legado para o novo sistema — trazer de
  volta o visual/recurso amado reduziria esse atrito. **Isto seria um
  objetivo de negócio verificável** (ex.: taxa de adoção pelo grupo nas
  primeiras semanas pós-lançamento), mas não foi essa a formulação
  recebida — é uma inferência minha, a confirmar.
- **Hipótese B (preferência estética do organizador, sem métrica de
  negócio associada)**: se for isso, ainda é uma decisão de produto
  legítima do dono do sistema, mas deve ser tratada com prioridade
  proporcional — não como parte do MVP Must/Should já aprovado (PRD.md
  Seção 5), e sim como item de roadmap pós-lançamento.

**Ressalva**: o PM não deve iniciar levantamento detalhado (PRD/UX-SPEC
delta) sem primeiro obter do stakeholder qual das duas hipóteses (ou outra)
é o motivador real — isso muda diretamente a prioridade relativa desta
iniciativa frente ao que já está pendente (ver seção seguinte).

### Alinhamento com roadmap

Aqui está a diferença mais importante frente ao Gate 1 original: **desta
vez existe um roadmap ativo, e ele está incompleto na etapa mais crítica —
a entrega.** Reli `DEPLOY.md` (Seção 10, item 0) e `EXECUTION-LOG.md`:

- 6 lotes (L0-L6) de Backend/Frontend já foram implementados, aprovados por
  QA e DevSecOps, e fechados pelo Tech Lead — ou seja, as 11 telas (T01-T11)
  do escopo original **já existem em código**, com o design system atual
  (`tokens.css`, baseline única, FE-00) já aplicado e já validado.
- **Nenhum deploy real ocorreu ainda** — nem em staging, nem em produção.
  O próprio `DEPLOY.md` classifica isso como "alerta de acúmulo", o item
  mais urgente do documento: código de 6 lotes existe só na árvore de
  trabalho local, nunca chegou a `main`, por três pré-requisitos ainda não
  resolvidos (secrets de CI/CD, projeto Supabase de staging dedicado,
  decisão de commit) — **nenhum dos três é dívida de design visual**.
- A métrica primária do objetivo de sucesso (`PRD.md` Seção 3) só começa a
  ser medida **depois** do primeiro deploy real e exige 8 rodadas
  consecutivas (~2 meses) de uso real para ser avaliada. Cada semana sem
  deploy adia diretamente essa janela de mensuração — o gargalo real do
  projeto hoje é **infraestrutura de entrega**, não a qualidade visual do
  que já foi construído.

**Conclusão de alinhamento**: propor agora uma reformulação visual completa
de 6 (ou potencialmente das 11) telas — que exige nova rodada de UX/UI,
reestimativa de Frontend sobre tarefas já fechadas (`FE-00` a `FE-11`, todas
aprovadas), e nova passagem por QA/DevSecOps — **compete diretamente pela
mesma capacidade (1 Backend + 1 Frontend) que o Gate 3 já validou como
integralmente alocada**, no exato momento em que o valor de negócio
declarado do projeto ainda não começou a ser entregue por motivo alheio ao
código ou ao design. Isto não é dizer que a iniciativa é ruim — é dizer que
a **sequência importa**: redesenhar antes de entregar adia ainda mais o
único objetivo que este projeto tem formalmente aprovado.

Não identifico contradição de escopo (o redesenho não muda regra de
negócio, dado ou fluxo, conforme já declarado) — identifico um **risco de
sequenciamento/priorização**, que é exatamente o tipo de achado que este
gate existe para capturar antes que o PM comprometa a squad.

### Plausibilidade de orçamento/prazo

Em nível de sinalização (Gate 3 fará a validação formal de capacidade
quando houver `TASK.md` delta):

- Isoladamente, um refactor visual sobre 6 (ou 11) telas já implementadas,
  sem mudança de regra de negócio/dado/fluxo, é proporcionalmente **mais
  barato** que a construção original de qualquer uma dessas telas — não há
  sinal de incompatibilidade orçamentária por si só.
- Mas o custo real não é isolado: envolve (a) capturar/formalizar a
  proposta em `UX-SPEC.md` (nova revisão, com `accessibility-review`
  completo — WCAG 2.1 AA, Guardrail 28, é reaplicado à nova paleta,
  não herdado automaticamente); (b) decidir e implementar hospedagem de
  fonte (Bebas Neue/Public Sans/JetBrains Mono são fontes Google —
  self-host vs. CDN externo tem implicação direta na CSP ainda pendente,
  `DEBT-03`, `SECURITY-REVIEW.md`) — ponto técnico a rotear ao Software
  Architect/DevSecOps, não decidido aqui; (c) reestimativa de Tech Lead
  sobre tarefas de Frontend **já fechadas e aprovadas** (`FE-00`
  principalmente, que estabeleceu a baseline atual do design system); (d)
  nova passagem completa por QA (regressão visual em 6-11 telas) e
  DevSecOps (novos assets, nova fonte externa).
- **Achado concreto, fora do briefing recebido**: o `git status` deste
  repositório já mostra dois arquivos de imagem não versionados na raiz do
  projeto (`logo.jpg`, `logo_comary.jpg`) — ou seja, ativos de marca já
  começaram a ser adicionados à árvore de trabalho **fora de qualquer
  processo governado** (sem convenção de path definida por Frontend/Tech
  Lead, sem confirmação de direito de uso dos escudos oficiais dos clubes
  citados). Sinalizo isso para que Tech Lead/Frontend tratem via convenção
  própria (ex.: `public/images/`) quando esta iniciativa for formalmente
  aceita, e para que o PM confirme com o stakeholder que o grupo tem
  autorização de uso desses brasões — não presumo problema de direito
  autoral, apenas registro que não foi confirmado.
- **Ambiguidade a esclarecer antes de estimar**: a proposta descreve duas
  paletas distintas (marinho/dourado para "Grupo Rola", verde para "Clube
  Comary") — o atual `tokens.css` tem **uma única paleta verificada**
  ("identidade campo de futebol"). Não está claro se isso é (i) uma
  substituição 1-para-1 de paleta única, (ii) um sistema de "times" com
  duas cores contextuais (ex.: para diferenciar os dois lados na tela de
  Montagem de Times), ou (iii) branding duplo por contexto de uso. Cada
  opção tem custo de implementação e de nova verificação de contraste
  WCAG muito diferente — isso muda a estimativa em ordem de grandeza e
  precisa ser resolvido pelo PM/UX-UI com o stakeholder antes de qualquer
  estimativa de Tech Lead.

Nenhum sinal de incompatibilidade orçamentária absoluta, mas o escopo real
é maior do que "trocar cor e fonte" — precisa ser dimensionado corretamente
antes do Gate 3 desta iniciativa.

### Gap de roster

- **PM**: necessário para elicitar o objetivo de negócio real (Hipóteses A/B
  acima) e formalizar prioridade relativa frente ao roadmap Must/Should já
  aprovado.
- **Business Analyst**: provavelmente **não necessário** nesta fase — o
  próprio briefing declara que não há mudança de regra de negócio, dado ou
  fluxo. Se isso se confirmar ao longo da elicitação do PM, BA pode ser
  pulado; se surgir qualquer mudança de regra/dado disfarçada de "só
  visual" (ex.: novo campo de "nível técnico" exibido, mudança de
  informação exibida no card do top 3), BA entra normalmente.
- **UX/UI**: agente do roster correto para formalizar a proposta em
  `UX-SPEC.md` (nova revisão), rodar `accessibility-review` e
  `design-system-consistency-check` sobre a proposta externa — **o
  exercício ad hoc anterior não substitui isso**, foi feito fora deste
  pipeline, sem os mesmos critérios de pronto (WCAG, responsividade,
  consistência com os 11 componentes já catalogados).
- **Software Architect**: acionamento leve, só se a decisão de hospedagem
  de fonte externa ou de armazenamento de assets de imagem tiver
  implicação de arquitetura/CSP (plausível, não confirmado).
- **Tech Lead/Frontend**: reestimativa de esforço sobre tarefas já
  fechadas — não é gap de agente, é sinalização de retrabalho a
  quantificar no Gate 3 desta iniciativa.
- **QA/DevSecOps**: reentram normalmente para qualquer tela tocada.
- Nenhum gap de agente/skill no roster — todos os papéis necessários já
  existem e já foram usados neste mesmo projeto.

### Riscos estratégicos preliminares (para acompanhamento nos Gates 2/3 desta iniciativa, se avançar)

1. **[Alto] Risco de sequenciamento** — comprometer a única capacidade de
   Frontend/Backend do projeto com um redesenho antes do primeiro deploy
   real adia ainda mais a mensuração do objetivo de sucesso já aprovado
   (`PRD.md` Seção 3), num momento em que o gargalo real e já documentado
   é infraestrutura de entrega (`DEPLOY.md` Seção 10), não qualidade
   visual. Recomendo tratar esta iniciativa como **backlog priorizado
   após o primeiro deploy real de produção**, não como trabalho paralelo
   imediato — a menos que o PM traga do stakeholder uma justificativa de
   negócio (Hipótese A) forte o bastante para inverter essa prioridade
   conscientemente, decisão que caberia então a mim revalidar.
2. **[Médio] Cobertura parcial do redesenho (6 de 11 telas)** — a proposta
   cobre T01, T02, T03, T05, T06 e T09; **T04, T07, T08, T10 e T11 ficam
   sem direção visual nova**. Se a adoção for parcial, o produto passa a
   ter duas linguagens visuais coexistindo, o que viola diretamente o
   espírito do Guardrail 31 ("todo componente do design system é
   implementado uma única vez e reutilizado — nenhuma tela cria uma
   variação paralela"). Antes de qualquer implementação, UX/UI precisa
   decidir e registrar explicitamente: (a) estender a nova linguagem
   visual às 5 telas restantes antes do Frontend tocar qualquer tela, ou
   (b) definir um plano de migração faseado explícito e temporário, com
   prazo — nunca duas linguagens coexistindo indefinidamente sem essa
   decisão registrada.
3. **[Médio] Retrabalho sobre trabalho já aprovado** — `tokens.css`/FE-00
   já é a baseline formal do design system, fechada e aprovada em L0. Uma
   troca de paleta/tipografia não é aditiva, é uma revisão estrutural do
   próprio design system — o mecanismo de "alteração visível" que o
   `UX-SPEC.md` já prevê (Seção 3.3/nota metodológica) deve ser usado
   integralmente, e o Tech Lead precisa reabrir estimativa sobre tarefas
   já fechadas, não tratar isso como tarefas novas independentes.
4. **[Médio] Artefato de origem não durável/não verificável por mim** —
   ver seção acima; precisa virar artefato versionado no repositório antes
   de UX/UI iniciar trabalho formal sobre ele.
5. **[Baixo/Médio] Assets de marca fora de processo governado** — dois
   arquivos de imagem já na árvore de trabalho, sem convenção de path,
   sem confirmação de direito de uso dos escudos reais dos clubes.
6. **[Baixo] Ambiguidade de "v2.0"** — nenhuma versão deste sistema chegou
   a produção ainda (zero deploys reais, `DEPLOY.md` Seção 8/10). Rotular
   esta iniciativa como "v2.0" antes de existir uma "v1" em produção pode
   criar expectativa equivocada de planejamento (ex.: Tech Lead abrir uma
   trilha de release separada prematuramente). Sugiro tratar como "adendo/
   revisão de design system", não como nova major version, até que a v1
   esteja de fato em produção.
7. **[Baixo] Fonte externa (Google Fonts) e CSP** — `DEBT-03` (CSP ausente
   em `vercel.json`) já é débito de segurança pendente antes do primeiro
   deploy de produção (`SECURITY-REVIEW.md`); adicionar fontes externas
   sem decidir self-host vs. CDN antes de fechar a CSP cria retrabalho
   adicional para DevSecOps/Frontend — sinalizar ao Software Architect
   para decidir junto com o fechamento de `DEBT-03`, não depois.

### Veredito: **Aprovado com ressalvas**

O PM está liberado para iniciar a elicitação/discovery desta iniciativa —
**não** para comprometer a capacidade de Backend/Frontend em implementação
imediata. Ressalvas a carregar, com dono e prazo:

- [ ] PM deve confirmar com o stakeholder o objetivo de negócio real por
      trás do redesenho (Hipótese A — adoção/gestão de mudança frente ao
      legado — vs. Hipótese B — preferência estética sem métrica), antes
      de registrar qualquer PRD/escopo formal desta iniciativa. Dono: PM.
      Prazo: antes de qualquer estimativa de Tech Lead.
- [ ] PM/UX-UI devem capturar o conteúdo do artefato externo (telas,
      paletas, tipografia, componentes) em formato versionado dentro do
      repositório antes de tratá-lo como especificação de trabalho — o
      link de chat não é um artefato de pipeline válido. Dono: PM + UX/UI.
      Prazo: antes do início do `UX-SPEC.md` delta.
- [ ] UX/UI deve decidir e registrar explicitamente a cobertura das 5
      telas fora do escopo do artefato original (T04, T07, T08, T10, T11)
      — extensão imediata da nova linguagem visual ou plano de migração
      faseado com prazo — nunca duas linguagens coexistindo sem essa
      decisão explícita (Guardrail 31). Dono: UX/UI. Prazo: antes de
      qualquer tarefa de Frontend ser reestimada em `TASK.md`.
- [ ] UX/UI e PM devem esclarecer com o stakeholder a ambiguidade das duas
      paletas (Grupo Rola/marinho-dourado vs. Clube Comary/verde) —
      substituição única, tema contextual por "lado", ou branding duplo —
      antes de qualquer estimativa de esforço. Dono: PM/UX-UI. Prazo:
      antes do Gate 2 desta iniciativa.
- [ ] Software Architect deve decidir a hospedagem das fontes externas
      (self-host vs. CDN) em conjunto com o fechamento de `DEBT-03` (CSP),
      não isoladamente depois. Dono: Software Architect. Prazo: antes do
      primeiro deploy de produção (já é prazo do próprio `DEBT-03`) ou
      antes de esta iniciativa ser implementada, o que vier primeiro.
- [ ] Tech Lead/Frontend devem definir convenção de path para os assets de
      marca já presentes na árvore de trabalho (`logo.jpg`,
      `logo_comary.jpg`) e o PM deve confirmar com o stakeholder o direito
      de uso dos escudos reais dos clubes antes de publicá-los. Dono: Tech
      Lead/Frontend (path) + PM (direito de uso). Prazo: antes do merge de
      qualquer asset destes.
- [ ] **Recomendação de sequenciamento (não bloqueio formal, mas
      condição forte)**: esta iniciativa não deve consumir a capacidade
      dedicada de Backend/Frontend antes do primeiro deploy real de
      produção do escopo já aprovado (`DEPLOY.md` Seção 10, item 0 —
      resolução dos três pré-requisitos de infraestrutura). Se o PM, após
      confirmar a Hipótese A com o stakeholder, entender que há
      justificativa de negócio para inverter essa prioridade, deve trazer
      essa recomendação explicitamente de volta a mim antes de comprometer
      `TASK.md`. Dono: PM (trazer de volta, se for o caso). Prazo:
      contínuo, revisitado no Gate 2 desta iniciativa.

Nenhum gap de roster identificado. Nenhuma incompatibilidade absoluta de
escopo x orçamento identificada — o risco relevante deste gate é de
**sequenciamento/priorização**, não de viabilidade. Esta iniciativa não
reabre nenhuma decisão dos Gates 1-3 originais (arquitetura, capacidade,
`GUARDRAILS.md` permanecem válidos como estão) — é tratada como um novo
ciclo de discovery, paralelo e subordinado à prioridade já aprovada de
concluir a entrega da v1.

---

## Nota de Governança Ad Hoc — Recalibração de urgência temporal frente ao
público real atual (fase de teste pessoal do organizador) — 2026-09-04

**Natureza deste registro**: não é um gate formal (1-3), não reabre nenhum
veredito anterior, e não é uma reclassificação técnica de nenhum achado.
É o registro de uma **decisão de produto/negócio do próprio dono do
sistema** (o organizador, stakeholder original deste projeto desde o Gate
1), comunicada diretamente a mim, sobre o público real que a publicação de
produção descrita em `DEPLOY.md` Seção 7.3 atende **hoje**. Minha função
aqui é registrar essa decisão com rastreabilidade, não avaliá-la
tecnicamente nem substituí-la por julgamento próprio — não é matéria da
minha alçada (não é arquitetura, não é capacidade de squad, não é exceção
de `GUARDRAILS.md`), mas fica registrada em `CTO-REVIEW.md` por ser o
único ponto do pipeline com visão consolidada de `DEPLOY.md` e
`SECURITY-REVIEW.md` ao mesmo tempo, e por ser o log de governança que
todo agente downstream já consulta como referência de contexto vigente.

### 1. Contexto reconhecido

`DEPLOY.md` Seção 7.3/10 (reconciliada em 2026-09-04) e `SECURITY-REVIEW.md`
(`DEBT-03` a `DEBT-07`, `DEBT-09`) tratam a publicação real descoberta hoje
(`https://futebol-app-lsm.vercel.app`) como produção real com todas as
implicações de severidade que isso normalmente carrega — usuários reais,
dado pessoal real de terceiros sob LGPD, superfície de ataque real exposta
a uma população desconhecida. O organizador esclareceu diretamente: **hoje,
o único usuário real do sistema é ele mesmo.** Não há ainda o grupo real
"Turma do Rola" usando o sistema — é uso pessoal de teste, e os dados de
atleta atualmente na base (migrados do legado, confirmados servidos pela
view `app.ranking_publico` em `DEPLOY.md` Seção 7.3) devem ser tratados,
para efeito de **urgência**, como fixture/dado de teste do próprio
organizador neste momento, não como dado pessoal de terceiros já exposto a
risco real hoje.

Isto é uma constatação de fato sobre quem usa o sistema agora, feita pelo
dono do produto — não uma avaliação técnica minha, e não decido nem
questiono se essa é a categorização correta de "quem é o titular do dado"
sob a LGPD em sentido estrito (isso, se disputado, seria matéria de
compliance formal, fora do escopo desta nota). Registro a decisão de
priorização que decorre dela.

O organizador foi explícito, e reforço aqui como condição do próprio
registro: **isto não é autorização para tratar o sistema como não sendo
produção.** Nenhum agente downstream deve ler esta nota como "pular rigor"
ou "reclassificar para não é real" — o ambiente continua sendo tecnicamente
produção, com todas as práticas de engenharia que isso exige (débitos
continuam sendo débitos, não deixam de existir). O que muda é exclusivamente
**a urgência temporal** de resolvê-los, calibrada ao tamanho real do público
exposto hoje (uma pessoa, o próprio dono), não ao pior caso assumido por
padrão (um grupo real de usuários já exposto).

### 2. O que **não** muda

Nenhum achado técnico já registrado é apagado, riscado ou reclassificado
para baixo. Os seguintes itens permanecem **tecnicamente válidos, com a
mesma severidade já atribuída pelo DevSecOps/DevOps**, exatamente como
estão em `SECURITY-REVIEW.md`/`DEPLOY.md`:

- `DEBT-03` — CSP ausente em `vercel.json` (Baixa, confirmada ativa em
  produção real, `DEPLOY.md` Seção 7.3/10 item 0).
- `DEBT-04` — advisories residuais de `next@14.2.35` (Média).
- `DEBT-05` — timing side-channel entre "senha incorreta" e "bloqueado por
  rate limit" (Média).
- `DEBT-06` — rate limiting dependente de `x-forwarded-for` não documentado
  no código (Média).
- `DEBT-07` — `app.tentativa_login.ip` sem política de retenção/expurgo
  (Baixa).
- `DEBT-09` — confirmação pendente de `Secure=true` no cookie de sessão em
  produção real (informativo/operacional).
- Rollback de produção **nunca testado** (`DEPLOY.md` Seção 5/10 item 0) —
  continua sendo o item que este agente trata como guardrail próprio
  ("nunca produção sem rollback testado").
- Monitoramento/observabilidade (Guardrail 36 e geral) **inativo**
  (`DEPLOY.md` Seção 4/8/10 item 0).

Eu, CTO, não tenho autoridade nem intenção de reescrever `SECURITY-REVIEW.md`
ou `DEPLOY.md` — são artefatos de DevSecOps e DevOps respectivamente
(guardrail próprio deste agente: nunca edito artefato de outro dono). Esta
nota não os altera; ela é lida **em conjunto** com eles a partir de agora.

### 3. O que muda — recalibração de prazo, não de severidade

Os prazos hoje redigidos nesses dois documentos como "antes do primeiro
deploy de produção" ou "agora, produção real ativa, risco ativo imediato"
(`DEPLOY.md` Seção 10, item 0, em particular) partiam da premissa padrão de
pior caso — grupo real já exposto. Essa premissa está confirmada pelo
próprio dono do sistema como não sendo o estado real de hoje. Recalibro,
portanto, a urgência temporal desses itens (não a severidade, não a
validade técnica do achado) de **"agora, imediatamente"** para:

> **Antes da abertura real de acesso ao grupo "Turma do Rola".**

Este é um **gate de evento**, não uma data — não há previsão hoje de quando
isso ocorrerá, e não crio uma data artificial só para ter uma. O gatilho é
a ação do organizador de abrir o acesso, não o calendário.

Isto vale igualmente para os dois itens de `DEPLOY.md` que hoje têm o rótulo
mais urgente de todos (Seção 10, item 0): CSP ausente (`DEBT-03`) e rollback
nunca testado. Ambos deixam de ser "corrigir imediatamente, produção real já
está exposta a terceiros" e passam a ser "corrigir antes da abertura real ao
grupo" — mesma régua aplicada aos demais itens desta nota. Observabilidade
(Guardrail 36) segue no mesmo racional: sua ausência hoje não expõe dado de
terceiro a risco sem monitoramento, porque não há terceiro usando o sistema
ainda.

### 4. Condição automática de reversão — não é um novo gate a esperar

Este relaxamento de urgência **vale exclusivamente até o momento em que o
organizador decidir abrir o acesso ao grupo real** — isto é, a partir do
primeiro dos seguintes eventos, o que ocorrer primeiro:

- Convidar qualquer jogador real do grupo "Turma do Rola" a usar o sistema;
- Compartilhar a URL pública (`https://futebol-app-lsm.vercel.app` ou
  qualquer outra que venha a substituí-la) com qualquer pessoa além do
  próprio organizador;
- Compartilhar a senha/link de acesso interno com qualquer outra pessoa.

A partir desse ponto, **todos os itens listados na Seção 2 acima voltam a
valer com a urgência e a severidade originais** — produção real, dados
pessoais reais de terceiros, LGPD em pleno vigor, exatamente como
`SECURITY-REVIEW.md`/`DEPLOY.md` já os descrevem. Esta reversão é
**automática e condicional ao evento**, não a um novo veredito meu: nenhum
agente (DevOps, DevSecOps, Backend, Frontend, ou o próprio organizador)
precisa reabrir esta nota, pedir uma nova aprovação do CTO, ou aguardar um
novo Gate para que a urgência original volte a valer — ela volta a valer no
instante em que o evento ocorre, por força desta própria nota. Se, na
prática, o organizador abrir o acesso sem que os itens da Seção 2 estejam
resolvidos, isso passa a ser, a partir daquele instante, produção real
insegura para terceiros, no sentido pleno que `SECURITY-REVIEW.md`/
`DEPLOY.md` já descrevem — não uma novidade a ser descoberta depois.

### 5. Novo item de checklist — pré-requisito antes da abertura real ao grupo

Registro como item de checklist obrigatório, a ser verificado antes de
qualquer um dos três eventos-gatilho da Seção 4 ocorrer (dono: DevOps
verifica infraestrutura/observabilidade/rollback; DevSecOps verifica
débitos de segurança; CTO confirma o fechamento antes de dar sinal-verde
ao organizador, se for consultado):

- [ ] `DEBT-03` a `DEBT-07` e `DEBT-09` (`SECURITY-REVIEW.md`), cada um
      **resolvido**, ou conscientemente **aceito como risco residual pelo
      CTO** com justificativa registrada (não fica "em aberto" por omissão
      — precisa de uma das duas resoluções explícitas antes da abertura).
- [ ] Rollback de produção **testado de fato** (não só documentado) —
      `DEPLOY.md` Seção 5.
- [ ] Observabilidade/monitoramento (Guardrail 36 e geral) **ativo**, não
      mais em modo pendente de ativação — `DEPLOY.md` Seção 4.
- [ ] Confirmação de que os secrets do GitHub Actions (`deploy-production.yml`)
      estão configurados e de que o gate mecânico de dupla aprovação
      (QA + DevSecOps) de fato governa qualquer deploy futuro — pendência já
      registrada em `DEPLOY.md` Seção 10, item 1, hoje não verificada.
- [ ] Confirmação, junto ao organizador, de que os dados de atleta hoje na
      base (migrados do legado) foram tratados como fixture de teste até
      este ponto e — se forem manter-se como dado real de produção a partir
      da abertura — de que a base legal de LGPD (`SDD.md` Seção 7.6,
      ressalvas dos Gates 2/3 sobre diferenciação adulto/menor, ainda
      pendente de redação final) está com o texto de privacidade
      efetivamente congelado para produção antes de qualquer terceiro real
      acessar o sistema.

Nenhum destes itens é novo em substância — todos já existiam como
pendência em `SECURITY-REVIEW.md`/`DEPLOY.md`/`CTO-REVIEW.md` (Gates 2/3).
O que esta nota adiciona é o **agrupamento explícito como pré-requisito de
um evento de negócio específico** (abertura ao grupo real), para que a
condição de reversão da Seção 4 tenha um checklist objetivo a consultar, em
vez de depender de memória de contexto espalhada por três documentos.

### Veredito desta nota: **Registrado** (não é um gate com veto — é
governança ad hoc, sem bloqueio de nenhum agente em curso)

Nenhum agente está bloqueado por esta nota. DevOps e DevSecOps continuam
livres para resolver os itens da Seção 2 no ritmo que julgarem adequado
dentro da nova janela de urgência (antes da abertura ao grupo, não
"imediatamente"), sem que isso seja lido como negligência frente ao que
`SECURITY-REVIEW.md`/`DEPLOY.md` registram. Se qualquer agente tiver razão
para acreditar que a abertura ao grupo real está prestes a ocorrer sem o
checklist da Seção 5 satisfeito, deve escalar diretamente para mim via
`BLOCKERS.md` (PIPELINE-CONVENTIONS.md §4) — não presumir silenciosamente
que ainda há tempo.

---

## Gate 1 — Iniciativa "Refactor Visual v2.0" — Revisão da recomendação de
sequenciamento — 2026-09-04

**Natureza deste registro**: continuação da mesma seção de Gate 1 desta
iniciativa (acima, "Gate 1 — Pré-descoberta — Iniciativa 'Refactor Visual
v2.0' — 2026-09-04"), não um novo Gate 1. Reavalio especificamente o **Risco
1 (Alto, sequenciamento)** e a ressalva final daquele veredito, à luz de três
fatos novos apresentados nesta retomada: (a) o deploy real de produção
registrado em `DEPLOY.md` Seção 7.3; (b) a Nota de Governança Ad Hoc acima
(uso pessoal de teste do organizador, recalibração de urgência de segurança);
(c) uma justificativa de negócio relatada como vinda diretamente do
stakeholder, equivalente à Hipótese A que eu mesmo havia levantado como
inferência a confirmar.

### O que de fato mudou, e o que foi apresentado como tendo mudado mas não mudou no sentido que importa

**1. O deploy aconteceu — mas não satisfaz, no sentido substantivo, a
condição que eu havia escrito.** Minha recomendação original usava "primeiro
deploy real de produção" como proxy para algo mais específico: o início da
entrega de valor mensurável ao grupo real (a métrica de sucesso do `PRD.md`
Seção 3 exige ~8 rodadas de uso real, ~2 meses, do grupo — não do
organizador sozinho). O que de fato ocorreu (`DEPLOY.md` Seção 7.3) é um
deploy real, porém fora do fluxo governado — não via skill
`deployment-execution`, sem confirmação do gate mecânico de dupla aprovação,
sem rollback testado, sem observabilidade ativa. O próprio DevOps registra,
na Seção 9 do mesmo documento, que o Gate 4 "ainda não pode ser formalmente
fechado" e que fechá-lo agora "seria reportar... um sucesso que este agente
não pode afiançar". Mais relevante ainda: por admissão da própria Nota Ad
Hoc (Seção 1), o único usuário real hoje é o organizador — o grupo real não
tem acesso. A mensuração da métrica de sucesso **não começou a correr**,
porque depende de uso real do grupo, não de uma URL visitada pelo próprio
organizador. Neste sentido específico — o que realmente importava na minha
recomendação original — o estado de "valor ainda não entregue ao público-
alvo" é **idêntico** ao que era antes deste deploy fora de banda. Tratar "o
deploy já aconteceu" como satisfazendo literalmente minha condição original
seria uma leitura formalista que perde o motivo real da condição — não
adoto essa leitura.

**2. Ainda assim, a proposta do stakeholder não depende dessa leitura
formalista para ser válida — sustenta-se por um argumento diferente e mais
sólido.** A própria Nota de Governança Ad Hoc que registrei hoje, por um
raciocínio correlato (débitos de segurança), já havia deslocado o marco
relevante de "primeiro deploy real" para "abertura real de acesso ao
grupo". É consistente, não oportunista, aplicar o mesmo deslocamento à
recomendação de sequenciamento deste Gate 1: o marco que sempre importou
para "quando o valor de negócio começa a ser entregue/mensurado" nunca foi
tecnicamente "existir uma URL em produção" — sempre foi "o grupo real ganhar
acesso". Um deploy de teste pessoal do organizador não move essa data.
Redesenhar agora, antes da abertura ao grupo, não adia a métrica de sucesso
em nenhum dia além do que já está parado esperando a resolução do checklist
de pré-abertura (Nota Ad Hoc, Seção 5) — **desde que o redesenho não desloque
ou atrase esse checklist**. Isso é, na prática, a Hipótese A que eu havia
levantado como inferência no Gate 1 original desta iniciativa, agora trazida
como justificativa relatada do stakeholder. Aceito revisar o marco de
sequenciamento com base nela — com a ressalva de rastreabilidade na trava
(b) abaixo, porque o que tenho em mãos é um relato de terceiro sobre o que o
stakeholder disse, não uma declaração capturada diretamente por mim.

### Revisão do marco de sequenciamento

Reviso a condição registrada no Gate 1 original desta iniciativa (Risco 1,
Alto; ressalva final da lista de 2026-09-04), de:

> "esta iniciativa não deve consumir a capacidade dedicada de Backend/
> Frontend antes do primeiro deploy real de produção do escopo já aprovado"

para:

> Esta iniciativa pode consumir capacidade de Frontend (e, se necessário, de
> Backend) **antes da abertura real de acesso ao grupo "Turma do Rola"** —
> o mesmo evento-gatilho já definido na Nota de Governança Ad Hoc (Seção 4)
> — condicionada a três travas novas que a recomendação original não tinha:

**(a) Precedência do checklist de pré-abertura.** O checklist da Nota Ad Hoc
(Seção 5: `DEBT-03` a `DEBT-07`/`DEBT-09`, rollback testado, observabilidade
ativa, confirmação dos secrets do GitHub Actions, congelamento do texto de
privacidade LGPD de `FE-04`) continua sendo o requisito de maior prioridade
antes da abertura ao grupo — não é subordinado ao redesenho, é anterior e
superior a ele. Dois destes itens têm interseção direta com o escopo do
redesenho e com a capacidade de Frontend (decisão self-host vs. CDN de fonte
externa em conjunto com o fechamento de `DEBT-03`/CSP; texto de privacidade
de `FE-04`) — Tech Lead deve sequenciar/paralelizar de forma que o redesenho
**nunca** atrase esses dois itens. Se surgir conflito real de capacidade
entre "avançar o redesenho" e "fechar CSP/privacidade LGPD antes da
abertura", o checklist de pré-abertura vence sempre — decido isso aqui, não
fica para o Tech Lead arbitrar caso a caso.

**(b) Registro formal da Hipótese A pelo PM.** Não sigo em frente só com a
justificativa relatada informalmente nesta retomada de tarefa — o que
recebi é um relato de terceiro sobre a posição do stakeholder, não uma
declaração capturada diretamente por mim, nem um artefato do pipeline. Antes
de o Tech Lead reestimar qualquer capacidade em um `TASK.md` delta, o PM
precisa capturar com rastreabilidade (data, formulação nas palavras do
próprio stakeholder) em artefato do pipeline (PRD delta ou nota equivalente)
a confirmação explícita da Hipótese A — mesmo racional de "nenhuma aprovação
sem registro" que já rege este pipeline inteiro, aplicado aqui à entrada que
justifica a mudança de prioridade, não só às minhas próprias aprovações.

**(c) Consciência explícita do trade-off, não ausência dele.** Aceitar este
novo marco significa aceitar conscientemente que a abertura ao grupo real —
e, com ela, o início da mensuração da métrica de sucesso já aprovada — fica
sujeita ao tempo que o redesenho consumir, além do tempo que o checklist de
pré-abertura já exige. Não elimino o Risco 1 (Alto) do Gate 1 original desta
iniciativa — aceito-o conscientemente, ancorado num motivo de negócio
explícito (Hipótese A), exatamente como eu mesmo previ como única saída
válida ("a menos que o PM traga... justificativa de negócio forte o bastante
para inverter essa prioridade conscientemente, decisão que caberia então a
mim revalidar"). Rebaixo a severidade deste risco de **Alto** para **Médio**
nesta reavaliação — não porque o risco em si diminuiu de tamanho, mas porque
passa a existir uma decisão consciente, justificada e condicionada assumindo-
o, o que é qualitativamente diferente de um risco não endereçado.

### O que não muda

- As outras 6 ressalvas do Gate 1 original desta iniciativa (artefato de
  origem não versionado; cobertura parcial das 5 telas restantes — Guardrail
  31; ambiguidade da paleta dupla; assets de marca fora de processo; fonte
  externa x CSP a decidir junto com `DEBT-03`; rótulo "v2.0" prematuro)
  permanecem integralmente em aberto e válidas. Nenhuma delas foi endereçada
  pelo que mudou aqui, e nenhuma é dispensada por esta revisão — confirmo a
  leitura do relato recebido nesta tarefa nesse ponto específico.
- Nenhuma decisão de arquitetura, a capacidade estrutural da squad (1
  Backend + 1 Frontend, Gate 3 original) ou `GUARDRAILS.md` é reaberta aqui.
- Esta revisão não fecha o Gate 4 nem reclassifica o estado do deploy fora
  de banda — ele continua sendo tratado por DevOps/DevSecOps conforme já
  registrado (`DEPLOY.md` Seção 9; Nota Ad Hoc, Seções 2-5).

### Correção de enquadramento — o que já estava liberado e o que esta revisão libera de fato

O PM **já estava liberado** para iniciar a elicitação/discovery desta
iniciativa desde o veredito original de 2026-09-04 ("Aprovado com
ressalvas") — esta revisão não é o que "libera a Etapa 2" do fluxo de
planejamento; essa liberação já existia. O que esta revisão efetivamente
muda é o próximo passo, mais adiante: a possibilidade de o Tech Lead
comprometer capacidade de Frontend/Backend em um `TASK.md` delta **antes da
abertura ao grupo**, em vez de esperar um "primeiro deploy real" que, no
sentido que importava, ainda não ocorreu. Essa possibilidade fica
condicionada, sem exceção, às três travas (a)-(c) acima — em particular, à
trava (b): PM deve registrar formalmente a Hipótese A antes de qualquer
estimativa de Tech Lead, não depois.

### Veredito desta revisão: **Aprovado com ressalvas**

- [x] Recomendação de sequenciamento revisada: de "antes do primeiro deploy
      real de produção" para "antes da abertura real de acesso ao grupo
      'Turma do Rola'" — mesmo evento-gatilho da Nota de Governança Ad Hoc.
      Severidade do Risco 1 rebaixada de Alto para Médio, dado como risco
      conscientemente aceito, não removido.
- [ ] PM deve registrar formalmente, com rastreabilidade, a confirmação da
      Hipótese A pelo stakeholder (trava b), antes de qualquer estimativa de
      Tech Lead sobre capacidade desta iniciativa. Dono: PM. Prazo: antes do
      `TASK.md` delta.
- [ ] Tech Lead deve sequenciar/paralelizar o redesenho de forma que ele
      nunca atrase os dois itens do checklist de pré-abertura que
      intersectam Frontend (CSP/fonte externa junto com `DEBT-03`; texto de
      privacidade de `FE-04`) — precedência do checklist é regra fixa, não
      decisão caso a caso (trava a). Dono: Tech Lead. Prazo: contínuo, a
      partir do `TASK.md` delta.
- [ ] As 6 ressalvas remanescentes do Gate 1 original desta iniciativa
      (artefato de origem, cobertura das 5 telas restantes, ambiguidade de
      paleta, assets de marca, fonte externa/CSP, rótulo "v2.0") seguem
      integralmente em aberto, sem alteração de dono ou prazo.

Com isto, o PM segue liberado (como já estava) para a elicitação/discovery
desta iniciativa, incluindo agora, explicitamente, a captura formal da
Hipótese A como primeiro ato — pré-requisito para que o Tech Lead, mais
adiante, possa comprometer capacidade em um `TASK.md` delta antes da
abertura ao grupo real.

---

## Gate 1 — Iniciativa "Refactor Visual v2.0" — Atualização por Fatos Novos
do Organizador (Correção Hipótese A/B; Ausência de Usuário Real em v1 e v2)
— 2026-09-04 (retomada)

**Natureza deste registro**: **não é um novo Gate 1**. É atualização, com
rastreabilidade, das duas seções anteriores desta mesma iniciativa ("Gate 1
— Pré-descoberta — Iniciativa 'Refactor Visual v2.0'" e "Gate 1 — Revisão da
recomendação de sequenciamento", ambas 2026-09-04, acima). O motivo desta
atualização é qualitativamente diferente do que motivou a revisão anterior:
lá, eu trabalhava sobre um **relato de terceiro** sobre a posição do
stakeholder (explicitamente registrado como tal, com ressalva de
rastreabilidade — trava (b)). Aqui, o organizador fala **diretamente comigo,
nesta retomada** — é fonte primária, não relato.

### 1. Correção da Hipótese A/B — o fundamento do rebaixamento de severidade não se sustenta

Na revisão anterior ("Gate 1 — Revisão da recomendação de sequenciamento"),
rebaixei o Risco 1 (sequenciamento) de **Alto** para **Médio** com base num
relato de terceiro que apontava a Hipótese A (adoção/gestão de mudança
frente ao app legado, recurso "mais celebrado", risco de resistência de
adoção na migração do grupo) como a motivação real do redesenho — tratando
isso como a "justificativa de negócio forte o bastante para inverter a
prioridade conscientemente" que eu mesmo havia colocado como única condição
válida para essa inversão, no Gate 1 original desta iniciativa.

**O organizador agora afirma diretamente, nesta retomada, que isso está
errado**: a motivação real do redesenho é a **Hipótese B** — preferência
estética pessoal, sem métrica de negócio associada — a mesma hipótese que a
minha própria análise original (Gate 1, "Objetivo de negócio") já havia
levantado e classificado explicitamente: *"se for isso, ainda é uma decisão
de produto legítima do dono do sistema, mas deve ser tratada com prioridade
proporcional — não como parte do MVP Must/Should já aprovado (`PRD.md`
Seção 5), e sim como item de roadmap pós-lançamento."*

**Correção formal, com rastreabilidade**:

- A trava (c) da "Revisão da recomendação de sequenciamento" ("Consciência
  explícita do trade-off... ancorado num motivo de negócio explícito
  (Hipótese A)... Rebaixo a severidade deste risco de Alto para Médio") **é
  anulada nesta atualização** — o motivo de negócio que justificava o
  rebaixamento não existe; era baseado em informação incorreta (relato de
  terceiro que não correspondia à posição real do stakeholder).
- **Reverto a severidade do Risco 1 (sequenciamento) de Médio para Alto** —
  volta ao valor original do Gate 1 desta iniciativa. Não é uma terceira
  reclassificação independente; é a constatação de que a única condição que
  eu havia aceito para o rebaixamento ("a menos que o PM traga... uma
  justificativa de negócio forte o bastante") nunca foi de fato satisfeita.
- A trava (b) da mesma revisão ("PM deve registrar formalmente a Hipótese A
  antes de qualquer estimativa de Tech Lead") **fica sem objeto** — não faz
  sentido exigir o registro formal de uma hipótese que o próprio stakeholder
  já refutou diretamente. Substituo por uma exigência equivalente, agora
  correta: **PM deve registrar formalmente, com rastreabilidade (data,
  formulação nas palavras do organizador), a confirmação da Hipótese B**,
  para que este ponto não fique só em prosa neste log — mesmo racional de
  "nenhuma correção sem registro" já aplicado ao resto deste pipeline.
- A trava (a) (precedência do checklist de pré-abertura sobre o redesenho)
  **permanece válida como boa prática**, mas deixa de ser a trava operante
  principal — com o Risco 1 revertido a Alto e sem justificativa de negócio
  para inversão de prioridade, a questão de "que ordem seguir se houver
  conflito de capacidade" deixa de ser o ponto central: o ponto central volta
  a ser "esta iniciativa não deveria consumir capacidade dedicada agora",
  como no Gate 1 original.

**Recomendação de sequenciamento, revertida**: volta a valer, sem a exceção
que a revisão anterior havia aberto, a formulação original do Gate 1 desta
iniciativa — esta iniciativa **não deve consumir a capacidade dedicada de
Backend/Frontend antes do início real da entrega/mensuração de valor ao
grupo "Turma do Rola"** (evento-gatilho equivalente ao já definido na Nota
de Governança Ad Hoc, Seção 4: convite de jogador real, compartilhamento da
URL pública ou da senha de acesso interno com alguém além do organizador).
Diferente da revisão anterior, **não há mais exceção condicionada a uma
justificativa de negócio (Hipótese A)** — essa exceção foi a que se revelou
infundada.

### 2. Nem a v1 nem a v2 têm usuário real hoje — extensão explícita da Nota de Governança Ad Hoc à priorização desta iniciativa

A Nota de Governança Ad Hoc registrada mais acima nesta mesma data
("Recalibração de urgência temporal frente ao público real atual") já
documentava, por relato do organizador, que o único usuário real do sistema
hoje é ele mesmo, e recalibrava **a urgência** (não a severidade) dos
débitos de segurança em função disso. O organizador esclarece agora, nesta
retomada, que essa mesma condição de fato — **uso exclusivamente pessoal de
teste** — vale igualmente para a v1 já publicada (`DEPLOY.md` Seção 7.3,
commit `4c57be7`) e para a v2 (este redesenho): nenhuma das duas tem
previsão de abertura ao grupo real no horizonte desta retomada.

Isto é **adicional**, não substitui, a Nota Ad Hoc já registrada — estendo
aqui explicitamente o mesmo racional à priorização desta iniciativa de
redesign, não só à urgência dos débitos de segurança:

- Reforça, por um caminho independente da correção do item 1 acima, a
  mesma conclusão: não existe hoje pressão real de adoção/gestão de mudança
  a mitigar (não há grupo migrando de lugar nenhum, porque não há grupo
  usando nenhuma das duas versões) — o que já era, por si só, o argumento
  central da Hipótese A que o organizador acabou de refutar diretamente.
  As duas informações novas se reforçam mutuamente, não apenas coincidem.
  Não é preciso escolher qual delas "resolve" o Risco 1 — as duas apontam
  para a mesma correção.
  Aplica-se aqui a mesma nota de valor: DEBT-03 a DEBT-09 e as ressalvas
  técnicas seguem tecnicamente válidas na íntegra; apenas a urgência
  temporal de priorização de capacidade entre "redesenho" e "resto do
  backlog" é recalibrada.
  Nenhuma severidade técnica muda em função disto.

### Veredito desta atualização: **Aprovado com ressalvas** (correção de registro, não novo veredito de mérito)

- [x] Hipótese A/B corrigida com rastreabilidade: motivação real é Hipótese
      B (preferência estética, sem métrica de negócio), confirmada
      diretamente pelo organizador nesta retomada — não mais um relato de
      terceiro.
- [x] Risco 1 (sequenciamento) revertido de Médio para **Alto** — a
      justificativa que sustentava o rebaixamento (Hipótese A) não se
      confirmou.
- [x] Recomendação de sequenciamento revertida: sem exceção de negócio
      ativa, esta iniciativa não deve consumir capacidade dedicada de
      Backend/Frontend antes do início real de entrega ao grupo real (mesmo
      evento-gatilho da Nota Ad Hoc, Seção 4).
- [x] Nota de Governança Ad Hoc (uso pessoal de teste) estendida
      explicitamente, nesta atualização, à priorização desta iniciativa —
      não só à urgência dos débitos de segurança.
- [ ] PM deve registrar formalmente, com rastreabilidade, a confirmação da
      Hipótese B pelo organizador (data e formulação), substituindo o
      registro da Hipótese A que a trava (b) da revisão anterior exigia.
      Dono: PM. Prazo: antes de qualquer estimativa de Tech Lead sobre esta
      iniciativa.
- [ ] Se, no futuro, surgir uma justificativa de negócio nova e diretamente
      confirmada pelo stakeholder (não um relato de terceiro) capaz de
      justificar inverter esta prioridade, ela deve ser trazida a mim para
      revalidação explícita — mesma régua já registrada no Gate 1 original,
      agora reafirmada.
- As 6 ressalvas remanescentes do Gate 1 original desta iniciativa
  (artefato de origem não versionado, cobertura parcial das 5 telas
  restantes/Guardrail 31, ambiguidade de paleta dupla, assets de marca fora
  de processo, fonte externa/CSP a decidir junto, rótulo "v2.0" prematuro)
  permanecem integralmente em aberto, sem alteração de dono ou prazo — nem
  agravadas nem dispensadas por esta atualização.

---

## Consolidação de Pendências Reais da v1 — Lista Única Priorizada — 2026-09-04

**Natureza deste registro**: consolidação, não nova análise. Todos os itens
abaixo já foram analisados e registrados por seus donos originais
(DevSecOps, QA, Tech Lead/DevOps, Software Architect, ou por mim mesmo em
gates anteriores) — aqui apenas reúno, com referência de fonte, numa lista
única ordenada por severidade/urgência real, à luz do fato registrado acima
(nem v1 nem v2 têm usuário real hoje) e da Nota de Governança Ad Hoc já em
vigor (severidade técnica não muda; urgência é calibrada pelo evento
"abertura de acesso ao grupo real"). Nenhum item aqui é reclassificado em
severidade — apenas ordenado.

### Tier 1 — Pré-requisito da abertura de acesso ao grupo real (gate de evento, não data; ver Nota de Governança Ad Hoc, Seções 4-5)

1. **Rollback de produção nunca testado de fato** — `DEPLOY.md` Seção 5/10
   item 0. Guardrail próprio do DevOps ("nunca produção sem rollback
   testado"). Mecanismo existe (`rollback-production.yml`), nunca
   exercitado.
2. **[RESOLVIDO PARCIALMENTE em 2026-09-04, quanto ao Guardrail 36 —
   `DEPLOY.md` Seção 4/7.5/10 item 0]** Observabilidade/monitoramento
   inativo, incluindo Guardrail 36 (monitoramento do tier gratuito do
   Supabase) — `DEPLOY.md` Seção 4/8/10 item 0. Os secrets necessários
   (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_PROJECT_REF`) foram
   configurados via `gh secret set`/`gh secret list` (executado pelo
   usuário/organizador, com orientação do DevOps) e o workflow
   `supabase-health-check.yml` foi disparado manualmente
   (`gh workflow run`, `workflow_dispatch`), concluindo com sucesso: run
   `https://github.com/leandrosegheto17/FutebolApp/actions/runs/33923744716`
   (run #2), job "Verifica status e pausa do projeto Supabase" em 7s,
   log confirmando status **`ACTIVE_HEALTHY`** via Management API,
   nenhuma Issue `supabase-alerta` criada (esperado — status saudável).
   Isso é confirmação de **execução real de ponta a ponta**, não apenas de
   presença de secret — o cron diário (09:00 UTC) passa a rodar de
   verdade a partir de hoje. **Ressalva explícita, não inflada como
   resolvida**: isso cobre apenas o sub-item de monitoramento de
   pausa/status do tier gratuito do Supabase (o gatilho de maior
   probabilidade prática, SDD.md Seção 6.2). Observabilidade **geral** da
   aplicação (logs estruturados, métricas de erro/latência, alertas de
   aplicação em produção) **segue não implementada/confirmada** — o item
   permanece parcialmente aberto quanto a esse escopo mais amplo. O job de
   backup lógico externo (ADR-009, `supabase-backup-export.yml`), que
   depende dos mesmos secrets agora presentes, também **não foi
   disparado/testado** nesta sessão.
3. **[RESOLVIDO quanto à configuração dos secrets em 2026-09-04 —
   `DEPLOY.md` Seção 7.5/10 item 1; confirmação de execução do gate de
   dupla aprovação segue pendente]** Secrets do GitHub Actions não
   confirmados + confirmação de que o gate mecânico de dupla aprovação
   (QA + DevSecOps) de fato governa deploy futuro — `DEPLOY.md` Seção 10,
   item 1. Confirmado que **antes desta sessão não havia nenhum secret
   configurado** (`gh secret list --repo leandrosegheto17/FutebolApp`
   retornava vazio, confirmado também pela UI de Settings > Secrets) — o
   que confirma retroativamente que a publicação de produção já registrada
   em `DEPLOY.md` Seção 7.3 (commit `4c57be7`, detectada fora do fluxo
   governado) **não pode ter passado pelo gate mecânico** de
   `deploy-production.yml` (que depende desses secrets para sequer
   iniciar) — foi publicada por um caminho não governado, como a Seção 7.3
   já suspeitava sem poder confirmar. **Agora**, 6 secrets de produção
   foram configurados e confirmados via `gh secret set`/`gh secret list`:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID` (`team_LGMpqv4TnLt60QJ52AKDqQI9`, não
   sensível), `VERCEL_PROJECT_ID` (`prj_Ql7a22UII1loTsNAfjOGsnWSNx7z`, não
   sensível), `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_PROJECT_REF`
   (`ipnbdrejlikrmqyxggsp`, já conhecido), `SUPABASE_PROD_DB_URL`. A
   pergunta original ("os secrets do GitHub Actions estão configurados?")
   está respondida, positivamente, tanto para o estado anterior (não)
   quanto para o atual (sim, para produção). **Ressalva explícita que
   permanece em aberto, não inflada como resolvida**: (a) os workflows
   `deploy-production.yml`, `deploy-staging.yml` e
   `rollback-production.yml` — que também dependem destes secrets,
   incluindo o gate mecânico de dupla aprovação que lê
   `QA-REPORT.md`/`SECURITY-REVIEW.md` — **não foram
   disparados/exercitados** nesta sessão; só `supabase-health-check.yml`
   foi executado e confirmado com sucesso. A confirmação de que o gate de
   dupla aprovação "de fato governa deploy futuro" continua **pendente de
   teste real** — só a presença dos secrets foi confirmada, não o
   comportamento do workflow em execução. (b) Os secrets de staging
   (`SUPABASE_STAGING_PROJECT_REF`/`SUPABASE_STAGING_DB_PASSWORD`) **não**
   foram configurados — a decisão de criar (ou não) um segundo projeto
   Supabase gratuito dedicado a staging (item Tier 1 relacionado à Seção
   5.1 de `DEPLOY.md`) segue em aberto; `deploy-staging.yml` continua sem
   poder rodar de verdade.
4. **Texto de privacidade LGPD de `FE-04` não congelado**, incluindo a
   redação diferenciada de base legal adulto (Art. 7º IX) vs. menor (Art.
   14) — `SDD.md` Seção 7.6, ressalva aberta desde o Gate 2/3
   (`CTO-REVIEW.md`, acima) — e o item correspondente da Nota Ad Hoc, Seção
   5. Uma única ação (congelar o texto com a redação diferenciada) fecha as
   duas pendências ao mesmo tempo — não são dois itens independentes.
5. **`DEBT-04`** (Média) — advisories residuais de `next@14.2.35` (DoS/
   cache), fora do escopo de CRIT-01 já fechado — `SECURITY-REVIEW.md`.
6. **`DEBT-05`** (Média) — timing side-channel entre "senha incorreta" e
   "bloqueado por rate limit" (`BE-04`) — `SECURITY-REVIEW.md`.
7. **`DEBT-06`** (Média) — rate limiting de login depende de
   `x-forwarded-for` não documentado como premissa de infraestrutura —
   `SECURITY-REVIEW.md`.
8. **`DEBT-03`** (Baixa, mas item de maior visibilidade histórica no
   checklist) — ausência de CSP em `vercel.json`. Interseção direta com a
   ressalva 5/7 do redesenho v2.0 (fonte externa Google Fonts, self-host
   vs. CDN) — decisão a tomar em conjunto, não isoladamente.
   **[Atualizado 2026-09-04 pelo DevOps, registro factual — não altero o
   veredito/priorização do CTO acima]**: CSP adicionada em `vercel.json`
   (`DEPLOY.md` Seção 10.1), autorizada nesta sessão pelo usuário/
   organizador. Nenhuma fonte externa (Google Fonts) está em uso hoje no
   código real — a ressalva 5/7 sobre self-host vs. CDN segue relevante
   apenas para quando/se o redesenho v2.0 (ainda não implementado) chegar a
   introduzir fonte externa; não bloqueou esta correção. **Ressalva que
   permanece, não inflada como resolvida**: a aplicação real do header em
   produção (via deploy real, não `next start` local) segue não confirmada
   por HTTP real nesta sessão — ver `DEPLOY.md` Seção 10.1 para a limitação
   de teste explícita.
9. **`DEBT-07`** (Baixa) — `app.tentativa_login.ip` sem política de
   retenção/expurgo (LGPD Art. 6º, III, minimização) — `SECURITY-REVIEW.md`.
   **[Atualizado 2026-09-04 pelo DevOps, registro factual]**: workflow
   `.github/workflows/tentativa-login-purge.yml` criado (cron diário, 72h de
   retenção), query validada empiricamente contra Postgres local
   (`DEPLOY.md` Seção 10.2) — **nunca executado contra produção real** nesta
   sessão (nem manual, nem pelo cron ainda); instrução explícita recebida
   foi não rodar o `DELETE` real contra produção nesta tarefa.
10. **`DEBT-09`** (informativo/operacional) — confirmar `Secure=true` no
    cookie de sessão em produção real — `SECURITY-REVIEW.md`.
11. **`DEBT-01`/`DEBT-02`** (Baixa, dev-only, sem exposição em produção
    confirmada) — vulnerabilidades residuais de toolchain (`vitest`,
    `glob`/`minimatch`/`eslint-config-next`) — `SECURITY-REVIEW.md`. Menor
    urgência real dentro deste Tier por não terem exposição de produção.

### Tier 2 — Débito de governança/processo (não bloqueante, mas deveria fechar antes de qualquer nova rodada de mudança nas mesmas telas)

12. **Lotes L1 a L5 nunca receberam veredito agregado formal de QA/DevSecOps
    como unidade fechada** — gap de processo já identificado pelo próprio
    Tech Lead/DevOps em `EXECUTION-LOG.md` (achado sinalizado no
    fechamento de L6). Recomendo fechar retroativamente antes de o
    redesenho v2.0 tocar qualquer uma dessas telas — evita empilhar
    mudança visual nova sobre lotes que nunca foram formalmente fechados
    como unidade.
13. **Trava técnica complementar para RF-08.6** — o Gate 2 (`CTO-REVIEW.md`,
    acima) pediu uma trava técnica (não só disciplina de processo) contra
    `DROP`/`DROP SCHEMA` destrutivo na schema legada. Ao revisar
    `GUARDRAILS.md` (regra 11, nota de 2026-09-04/BE-14) nesta consolidação,
    encontro evidência de que essa trava **já foi implementada**
    (`REVOKE` de `DROP`/`ALTER TABLE`/`DROP SCHEMA` destrutivo, migration
    `20260903170000_travar_schema_legada_ate_validacao.sql`), mas este
    `CTO-REVIEW.md` nunca registrou o fechamento formal desta ressalva.
    Não fecho isso agora por conta própria (não é matéria desta
    consolidação reabrir mérito técnico) — sinalizo para que Software
    Architect/Tech Lead confirmem que a migration de BE-14 satisfaz
    integralmente o pedido original do Gate 2, e o PM leve essa
    confirmação para eu fechar formalmente o item na próxima ocasião em
    que este log for atualizado.

### Tier 3 — Débitos técnicos de baixa severidade, sem prazo formal, não bloqueantes (`QA-REPORT.md`)

14. `BUG-QA-BE01-01` — débito, sem bloqueio.
15. `BUG-QA-BE01-02` — débito, prazo já vencido de "antes do próximo push"
    (verificar se segue pendente).
16. `BUG-QA-FE00-01` — débito, mesma natureza do item acima (formatação).
17. `BUG-QA-FE00-02` — débito, polimento, sem prazo formal.
18. `BUG-QA-BE02-01` — débito, ausência de FK/constraint entre
    `lancamento_pontos` e tabela relacionada, sem prazo formal.
19. `BUG-QA-BE03-01` — débito/informativo, limitação conhecida do ambiente
    local, sem prazo formal.
20. `BUG-QA-FE10-01` — débito, polimento de acessibilidade, sem prazo
    formal.

### Tier 4 — Ressalvas próprias da iniciativa de redesign v2.0, ainda em aberto (`CTO-REVIEW.md`, Gate 1 desta iniciativa, 2026-09-04)

21. Artefato de origem não versionado no repositório — o mockup existe hoje
    só como Artifact do `claude.ai`
    (`https://claude.ai/code/artifact/75a686fe-5e8f-46fe-8c98-c3a2120e428b`),
    aprovado pelo usuário, mas não persistido/versionado.
22. Cobertura de apenas 6 das 11 telas — risco ao Guardrail 31 (duas
    linguagens visuais coexistindo sem decisão explícita de extensão ou
    plano de migração faseado).
23. Ambiguidade da paleta dupla Grupo Rola/marinho-dourado vs. Clube
    Comary/verde — não esclarecida.
24. Assets de marca `logo.jpg`/`logo_comary.jpg` fora de processo governado
    (sem convenção de path, sem confirmação de direito de uso).
25. Fonte externa (Google Fonts) vs. CSP (`DEBT-03`) a decidir em conjunto
    — mesmo item 8 do Tier 1, citado aqui apenas para referência cruzada.
26. Rótulo "v2.0" prematuro — reforçado, não enfraquecido, pelo fato novo
    2 desta atualização: se nem a v1 nem a v2 têm usuário real hoje, rotular
    esta iniciativa como "versão 2.0" antes de qualquer versão ter validado
    uso real cria uma expectativa de numeração de release que a realidade
    do produto ainda não sustenta. Mantida a recomendação de tratar como
    "adendo/revisão de design system" até a v1 ter uso real validado.

### Direcionamento formal ao PM

Libero/instruo o PM a validar esta lista priorizada (Tiers 1-4 acima) junto
com as mudanças de Design já aprovadas como mockup (mesma referência de
Artifact do item 21), como próxima etapa do fluxo de planejamento já em
curso (PM → Business Analyst → Software Architect → UX/UI → Tech Lead). Isto
não é autorização para o Tech Lead comprometer capacidade de Backend/
Frontend na implementação do redesenho — essa autorização segue condicionada
à recomendação de sequenciamento revertida na seção anterior (não antes do
início real de entrega ao grupo, sem exceção de negócio ativa hoje). A
validação do PM é sobre **conteúdo e prioridade relativa** das pendências e
do mockup, não sobre início de implementação.

### Verificação de `BLOCKERS.md`

Revisei as 6 entradas de `BLOCKERS.md` (`BLOCKER-001` a `BLOCKER-006`) à luz
dos dois fatos novos desta retomada. **A leitura de que todas seguem
`Resolvido` permanece válida — nenhuma reabertura é necessária.** Nenhum dos
dois fatos novos (correção de Hipótese A/B; ausência de usuário real em v1 e
v2) contradiz ou reabre o mérito técnico de nenhuma das seis resoluções
registradas (mecanismo de explicação de conflito de T09; anonimização de
atleta; plano de saída do ADR-002; campo de ausências no ranking público —
duas entradas; e correção de CVE crítico do Next.js) — todas tratam de
decisões técnicas/de contrato de dado já fechadas por seus donos, sem
relação com motivação de negócio do redesenho ou com o tamanho do público
real atual. Os fatos novos afetam exclusivamente a priorização/sequenciamento
desta iniciativa de redesign (registrado acima) e a urgência temporal de
itens já cobertos pela Nota de Governança Ad Hoc — nenhum dos dois é, por
natureza, um bloqueio entre agentes no formato de `BLOCKERS.md`.

---

## Gate 1 — Iniciativa "Refactor Visual v2.0" — Atualização por Instrução
Direta de Inversão Total de Prioridade (Pausar a v1) — 2026-09-04 (nova
retomada)

**Natureza deste registro**: continuação da mesma seção de Gate 1 desta
iniciativa (as três subseções acima, todas 2026-09-04) — **não é um novo
Gate 1**. É a terceira atualização do dia sobre o mesmo Risco 1
(sequenciamento). Diferente das duas anteriores, desta vez o organizador
não relata nem corrige uma posição relatada por terceiro — ele fala
**diretamente comigo, nesta retomada**, em fonte primária, com uma decisão
explícita de reprioridade, nestas palavras exatas:

> "Eu quero mudar a priorização e quero que inicie o planejamento do
> redesign. Não vamos mais trabalhar na V1. Todas as validações vão ser
> feitas depois do Redesign. Não me debrucei o suficiente nessa etapa e o
> projeto foi entregue com um design que não atende. O redesign vai
> entregar um valor muito grande para não ser priorizado. Vamos iniciar
> agora"

### 1. "O design não atende" — isto muda a Hipótese A/B, ou é a mesma Hipótese B com outra intensidade?

Não confundo intensidade de convicção com mudança de categoria. Reaplico a
mesma régua que já apliquei duas vezes hoje:

- **Hipótese A** (a única que eu havia levantado como especificamente
  ancorada a uma métrica de negócio verificável — risco de resistência de
  adoção do grupo real frente ao app legado) **segue refutada** pelo próprio
  organizador, na atualização anterior desta mesma seção, e nada na
  declaração de agora a ressuscita: não há menção a adoção, migração de
  grupo, ou ao app legado. A frase central — "o projeto foi entregue com um
  design que não atende" — é um julgamento do dono do produto sobre
  adequação e qualidade percebida, não uma tese de gestão de mudança com
  métrica associada.
- Isto é, estruturalmente, **Hipótese B** — a mesma que minha própria
  análise original já havia levantado e pré-classificado: *"se for isso,
  ainda é uma decisão de produto legítima do dono do sistema, mas deve ser
  tratada com prioridade proporcional."* O que muda agora não é a categoria,
  é (i) a fonte (antes, inferência minha e depois relato de terceiro; agora,
  declaração direta e inequívoca do próprio organizador) e (ii) a
  articulação (antes, "preferência estética sem métrica"; agora, um
  julgamento explícito de inadequação de produto — "não atende" — mais um
  peso de prioridade explicitamente atribuído por quem tem autoridade de
  produto para atribuí-lo — "valor muito grande para não ser priorizado").
  Não reclassifico para Hipótese A só porque a linguagem ficou mais forte —
  isso seria eu forçar o fato a caber num rótulo que já expliquei
  publicamente (na correção anterior) exigir uma tese de negócio
  *mensurável*, o que esta declaração não traz nem precisa trazer.

**A pergunta que de fato importa, então, não é "isto é Hipótese A ou B" — é
"isto satisfaz a régua que eu mesmo fixei"** (última atualização: *"Se, no
futuro, surgir uma justificativa de negócio nova e diretamente confirmada
pelo stakeholder (não um relato de terceiro) capaz de justificar inverter
esta prioridade, ela deve ser trazida a mim para revalidação explícita"*).
Decomponho essa régua em dois testes independentes, e verifico cada um sem
aceitar a alegação por autoridade sozinha:

- **Teste de fonte/rastreabilidade** (direta, não relato de terceiro):
  **satisfeito** — é o organizador falando comigo, nesta retomada, em
  primeira pessoa, com citação literal capturada.
- **Teste de suficiência como justificativa de negócio**: aqui preciso ser
  preciso sobre o que estou e o que não estou validando. **Não tenho base
  própria para julgar se o design "realmente" não atende** — isso é
  julgamento de produto/experiência, fora da minha alçada técnica e fora do
  que meus guardrails me autorizam a arbitrar (não decido gosto, não decido
  adequação de UX). O que **está** dentro da minha alçada é decidir se
  "avaliação de adequação de produto pelo próprio dono, comunicada
  diretamente e sem ambiguidade, com prioridade relativa explicitamente
  atribuída por ele" é uma base legítima para uma decisão de priorização de
  negócio. **É.** Nunca condicionei a legitimidade de uma decisão de
  priorização de produto à existência de uma métrica externa — só exigi que
  ela viesse de fonte direta e não fosse um relato ambíguo de terceiro
  (exatamente o problema que motivou a correção anterior). Este segundo
  teste está, portanto, satisfeito — não porque a Hipótese B "virou" um caso
  de negócio mensurável, mas porque priorização de produto sob Hipótese B
  sempre foi, na minha própria régua original, uma decisão legítima do dono
  do sistema — o que mudou é que agora ela é inequívoca, direta, e
  explicitamente exercida como decisão de prioridade, não apenas como
  preferência registrada de passagem.

### 2. Severidade do Risco 1 — terceira reclassificação do mesmo dia, e por que esta é diferente das duas anteriores

Reconheço, com transparência, que este é o terceiro ajuste de severidade do
Risco 1 nesta mesma data (Alto → Médio na "Revisão da recomendação de
sequenciamento"; Médio → Alto na "Atualização por Fatos Novos do
Organizador"; agora uma terceira vez). Não trato isso como rotina — registro
explicitamente por que esta reclassificação não é apenas "mais uma
oscilação" e por que não espero revertê-la de novo pelo mesmo motivo das
duas anteriores:

- As duas reclassificações anteriores giravam em torno de uma **disputa de
  fato** — qual era, de verdade, a motivação do organizador (Hipótese A ou
  B). Fatos podem ser corrigidos por nova informação, e foram — daí a
  oscilação.
- Esta reclassificação **não depende de nenhuma disputa de fato** sobre
  motivação — depende só de constatar que o dono do produto exerceu,
  diretamente e sem intermediação, sua autoridade de priorização
  ("eu quero mudar a priorização... vamos iniciar agora"). Um ato de
  autoridade não é uma tese que uma nova informação possa "refutar" da
  mesma forma que refutou a Hipótese A — só pode ser alterado por um novo
  ato de autoridade equivalente (o próprio organizador mudando de ideia de
  novo, o que permanece possível, mas não é o mesmo tipo de evento que gerou
  as duas reversões anteriores).
- **Rebaixo o Risco 1 de Alto para Médio**, com o mesmo racional já usado na
  primeira reclassificação: não porque o impacto do risco diminuiu (o atraso
  real à mensuração da métrica de sucesso já aprovada em `PRD.md` Seção 3
  continua sendo o mesmo atraso, em dias, que seria de qualquer forma) — mas
  porque o risco deixa de ser "não endereçado" e passa a ser
  **conscientemente aceito pelo dono do sistema, com decisão direta,
  registrada e informada** (a informação relevante — que isto compete pela
  única capacidade de Backend/Frontend do projeto e adia a mensuração do
  objetivo já aprovado — já está registrada nas três subseções anteriores
  desta mesma seção de Gate 1, e o organizador decide seguir mesmo assim).
  Diferente da vez anterior, esta aceitação consciente não depende de uma
  hipótese de negócio que pudesse mais tarde se revelar equivocada — depende
  só do fato observável de que a decisão foi tomada por quem tem autoridade
  para tomá-la.

**Recomendação de sequenciamento, revisada pela terceira vez**: a condição
"esta iniciativa não deve consumir capacidade dedicada de Backend/Frontend
antes do início real de entrega/mensuração de valor ao grupo real" **deixa
de ser um bloqueio recomendado** a partir desta atualização — o Tech Lead
está liberado para comprometer capacidade de Frontend (e, se necessário, de
Backend) no planejamento e execução do redesenho, **sem precisar esperar**
o evento-gatilho de abertura ao grupo real. Isto não é reversão por
enfraquecimento da minha análise original — é reconhecimento de que a
condição que eu mesmo fixei como única saída válida ("justificativa de
negócio nova e diretamente confirmada pelo stakeholder") está, agora,
satisfeita.

### 3. O pedido de pausar toda a v1 — veredito dividido, não aprovação em bloco

Aqui não estou avaliando uma decisão de prioridade de produto (que é
integralmente do organizador) — estou avaliando um **risco técnico e de
segurança de nível estratégico**, que é exatamente a minha alçada
("Avaliar riscos técnicos, de segurança e de compliance... em nível
estratégico — complementar ao DevSecOps, nunca substituto"). Divido o
pedido em duas partes com tratamento diferente, em vez de aprová-lo ou
reprová-lo como bloco único:

**3.1. Aprovado sem ressalva — pausar o restante do backlog da v1 ainda não
iniciado ou já concluído sem pendência ativa.** Cobre integralmente os
itens abaixo da "Consolidação de Pendências Reais da v1" (seção acima,
2026-09-04):
- Tier 2 completo (fechamento retroativo agregado de L1-L5; confirmação
  formal da trava técnica de RF-08.6).
- Tier 3 completo (débitos de QA sem prazo formal).
- Do Tier 1: criação de projeto Supabase de staging dedicado; observabilidade
  geral de aplicação (logs/métricas/alertas, além do já ativo Guardrail 36);
  exercício real dos workflows governados (`deploy-production.yml`,
  `deploy-staging.yml`, `rollback-production.yml` via `gh workflow run`);
  execução real do job de expurgo (`tentativa-login-purge.yml`) contra
  produção; congelamento do texto de privacidade LGPD de `FE-04` (perde a
  urgência que tinha, porque essa urgência era condicionada à abertura ao
  grupo real, que segue sem previsão); `DEBT-01`/`DEBT-02` (baixa
  severidade, dev-only).
  Nenhum destes itens é código já escrito e ocioso, nenhum é vulnerabilidade
  ativa e diagnosticada em produção com correção pronta — são,
  legitimamente, trabalho futuro que pode esperar sem custo incremental de
  risco, dado que a Nota de Governança Ad Hoc já em vigor confirma que o
  único usuário real hoje é o próprio organizador.

**3.2. Não aprovado sem uma confirmação explícita adicional — pausar
indefinidamente a finalização de `DEBT-05`/`DEBT-06` (e a verificação real
de `DEBT-03`/CSP em produção).** Três fatos, juntos, tornam esta parte
qualitativamente diferente do resto do pedido:

- Estes não são itens de descoberta ou desenho — são **correções de código
  já escritas**. O `git status` desta sessão mostra `app/api/auth/login/
  route.ts`, `src/modules/autenticacao/client-ip.ts` e `vercel.json`
  modificados, não commitados. Terminar este trabalho é uma ação de minutos
  a poucas horas (commit, push, verificação), não uma nova frente de
  esforço que compita de forma relevante com a capacidade que o redesenho
  vai consumir.
- São achados de segurança de severidade **Média já confirmados como ativos
  em produção real** (`SECURITY-REVIEW.md`, `DEBT-05`: timing side-channel
  entre senha incorreta e bloqueio por rate limit; `DEBT-06`: rate limiting
  dependente de cabeçalho potencialmente forjável) — não são hipóteses, são
  fraquezas já diagnosticadas por leitura de código real. Deixá-las cientes
  e não corrigidas por tempo indefinido, com a correção já escrita ao lado,
  é um risco que não decorre de nenhuma decisão de priorização de produto —
  decorre só de deixar uma tarefa quase pronta parada.
- **Achado adicional desta revisão, que preciso registrar com
  transparência**: `DEPLOY.md` (Seção 7.6) narra que estas mesmas correções
  já foram commitadas (`56d9047`), publicadas em produção real e verificadas
  por `curl` real (incluindo o header CSP presente na resposta). Isso é
  **inconsistente** com o estado de `git` observado nesta sessão — a lista
  de commits recentes tem `4c57be7` como topo, sem `56d9047`, e os próprios
  arquivos que `DEPLOY.md` diz terem sido publicados (`route.ts`,
  `client-ip.ts`, `vercel.json`, e o próprio `DEPLOY.md`/`SECURITY-REVIEW.md`)
  aparecem como modificados/não commitados no `git status` desta sessão. Não
  resolvo essa divergência eu mesmo (não é meu artefato, é do DevOps) e não
  presumo qual das duas versões é a real — só registro que **não posso, com
  confiança, afirmar hoje se a correção já está ou não em produção real**, e
  isso é precisamente a informação que faltaria para eu aceitar "pausar
  indefinidamente" sem checagem. Antes de qualquer decisão adicional sobre
  esta parte do pedido, exijo que DevOps reconcilie com comando real
  (`git log`, `git status`, `curl` contra a URL de produção real) qual é o
  estado efetivo hoje, e registre isso em `DEPLOY.md` com a mesma
  transparência já praticada no resto do documento.

**Decisão**: não aprovo, como parte silenciosa do pedido geral de "pausar
tudo", deixar `DEBT-05`/`DEBT-06` (e a confirmação real de `DEBT-03`)
pendurados por tempo indefinido enquanto a produção real segue no ar. Exijo
uma ação limitada e de baixo custo antes de a capacidade de Backend passar
integralmente para o redesenho: reconciliar o estado real (git + produção)
e, confirmado que a correção não está de fato em produção, finalizar
(commit, push, deploy, verificação) — não é uma nova frente de trabalho, é
concluir uma tarefa que já está com o código pronto. Se, depois de ver este
achado, o organizador confirmar explicitamente que aceita conscientemente
deixar essa correção pendurada por tempo indefinido mesmo assim, essa é uma
decisão dele a registrar como tal (mesma régua de "fonte direta, não
presumida" já aplicada ao resto desta atualização) — não presumo essa
aceitação a partir de uma instrução genérica de "pausar tudo".

### 4. As seis ressalvas remanescentes do Gate 1 original desta iniciativa — confirmação

Revejo cada uma explicitamente: nenhuma foi resolvida, nenhuma é dispensada
por esta atualização, e uma delas passa a ter urgência prática imediata
(deixa de ser hipotética) porque a capacidade de Frontend está, a partir de
agora, de fato liberada para começar:

- **Artefato de origem não versionado** — segue aberta; PM/UX-UI devem
  capturar o mockup em formato versionado antes de UX-SPEC.md tratá-lo como
  especificação.
- **Cobertura parcial (6 de 11 telas) — Guardrail 31** — segue aberta, e
  **passa a ser bloqueante prático imediato**: com o Tech Lead livre para
  comprometer capacidade de Frontend agora, UX/UI precisa decidir e
  registrar, antes de qualquer tarefa de Frontend ser reestimada, se estende
  a nova linguagem visual às 5 telas restantes (T04, T07, T08, T10, T11) ou
  define um plano de migração faseado explícito com prazo — não pode ficar
  em aberto no momento em que a implementação de fato começa a ser
  planejada.
- **Ambiguidade da paleta dupla** (Grupo Rola/marinho-dourado vs. Clube
  Comary/verde) — segue aberta, mesmo tratamento.
- **Assets de marca fora de processo governado** (`logo.jpg`,
  `logo_comary.jpg`) — segue aberta.
- **Fonte externa (Google Fonts) vs. CSP** — segue aberta; a decisão de
  self-host vs. CDN continua a cargo do Software Architect, em conjunto com
  o fechamento real de `DEBT-03` (cuja confirmação em produção está, agora,
  também pendente de reconciliação, ver Seção 3.2 acima).
- **Rótulo "v2.0" prematuro** — segue aberta, sem alteração.

Nenhuma destas seis é dispensada, agravada além do já registrado, ou
resolvida por esta atualização.

### Veredito desta atualização: **Aprovado com ressalvas**

- [x] Hipótese A/B: confirmado que a nova declaração é Hipótese B (não A),
      mas agora satisfaz integralmente a régua de "justificativa de negócio
      direta, não relatada por terceiro" que eu mesmo havia fixado —
      suficiente para autorizar a inversão de prioridade.
- [x] Risco 1 (sequenciamento) rebaixado de Alto para **Médio** — terceira
      reclassificação do dia, mas a primeira ancorada num ato de autoridade
      do dono do produto (não numa tese de negócio revisável), portanto sem
      expectativa de nova reversão pelo mesmo motivo das duas anteriores.
- [x] Recomendação de sequenciamento revogada: o Tech Lead está liberado
      para comprometer capacidade de Frontend/Backend no planejamento e
      execução do redesenho **desde já**, sem esperar o evento-gatilho de
      abertura ao grupo real.
- [x] Pedido de pausar toda a v1: **aprovado** para todo o backlog restante
      (Tier 2, Tier 3, e os itens do Tier 1 ainda não iniciados/sem código
      pronto). **Não aprovado**, sem confirmação explícita adicional do
      organizador, para deixar `DEBT-05`/`DEBT-06` (código já escrito, achado
      de segurança Média já confirmado ativo em produção) pendurados por
      tempo indefinido — exijo finalização de baixo custo (commit/push/
      verificação) antes da migração integral de capacidade de Backend para
      o redesenho.
- [ ] DevOps deve reconciliar, com comando real (não memória de sessão), a
      divergência entre `DEPLOY.md` Seção 7.6 (que narra commit `56d9047` já
      publicado e verificado) e o `git status`/`git log` reais desta sessão
      (HEAD em `4c57be7`, arquivos de correção ainda modificados/não
      commitados) — dono: DevOps. Prazo: antes de qualquer nova decisão
      sobre a Seção 3.2 acima, e antes de este item poder ser tratado como
      encerrado.
- [ ] PM deve registrar formalmente, com rastreabilidade (data, citação
      literal), a decisão de inversão de prioridade do organizador
      (confirmação de Hipótese B + instrução direta de "iniciar agora" +
      pausa do restante da v1 conforme delimitado na Seção 3 acima) — mesma
      régua de "nenhuma aprovação sem registro" já aplicada ao resto deste
      pipeline. Dono: PM. Prazo: antes de qualquer estimativa de Tech Lead
      sobre o `TASK.md` delta do redesenho.
- [ ] UX/UI deve resolver a decisão de cobertura das 5 telas remanescentes
      (Guardrail 31) **antes** de qualquer tarefa de Frontend ser
      reestimada — deixou de ser um item hipotético, é bloqueio prático
      imediato agora que a capacidade está liberada. Dono: UX/UI. Prazo:
      antes do `TASK.md` delta.
- As demais cinco ressalvas remanescentes do Gate 1 original desta
  iniciativa (artefato de origem, ambiguidade de paleta, assets de marca,
  fonte externa/CSP, rótulo "v2.0") seguem integralmente em aberto, sem
  alteração de dono ou prazo.

Com isto, o fluxo de planejamento desta iniciativa (PM → Business Analyst →
Software Architect → UX/UI → Tech Lead, `PLANNING-FLOW.md`) está liberado
para avançar, incluindo agora a fase de comprometimento de capacidade de
Backend/Frontend — condicionado às pendências acima, em particular ao
registro formal do PM (rastreabilidade da decisão) e à reconciliação do
DevOps sobre o estado real de `DEBT-05`/`DEBT-06`/`DEBT-03` em produção.
Nenhuma decisão de arquitetura, a capacidade estrutural da squad (1 Backend
+ 1 Frontend, Gate 3 original) ou `GUARDRAILS.md` é reaberta por esta
atualização.

---

## Gate 2 — Pós-SDD — Iniciativa "Refactor Visual" (`SDD.md`, Anexo C) — 2026-09-04

**Skills aplicadas**: `architecture-decision-review` (ADR-013, marcado
explicitamente pelo Software Architect para este gate), `risk-and-compliance-check`
(ADR-012, idem), leitura de contexto de ADR-014 (não marcado — revisado por
completude, mesmo padrão aplicado no Gate 2 original a itens não marcados).
`build-vs-buy-analysis` **não aplicável** — nenhum vendor/serviço de
terceiro novo é introduzido por nenhum dos três ADRs.
**Input avaliado**: `SDD.md` Anexo C (rascunho submetido ao Gate 2,
2026-09-04, sem reabertura de mérito das Seções 1-7 originais) + ADR-012,
ADR-013, ADR-014 (`adr/012` a `adr/014`) + `PRD-TECNICO.md` Parte II (RNF-D03,
RNF-D05, RF-D01/RF-D04/RF-D05) como contexto de roteamento + `GUARDRAILS.md`
(regras 28, 30, 31) + `SECURITY-REVIEW.md` (histórico de `DEBT-03`) +
`vercel.json` (estado real do código, lido diretamente, não apenas por
citação do ADR) + `src/design-system/tokens.css` (estado real, confirmando
ausência de qualquer referência a fonte externa hoje) + este próprio
`CTO-REVIEW.md`, Gate 1 desta iniciativa em todas as suas atualizações
(ressalvas (a)/(b)/(c) apontadas na retomada desta tarefa).

### Verificação direta contra o código real (não apenas contra o texto do ADR)

Antes de aceitar as premissas técnicas de ADR-012, li `vercel.json`
diretamente: a `Content-Security-Policy` publicada hoje é `default-src
'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self'
https://ipnbdrejlikrmqyxggsp.supabase.co; frame-ancestors 'none'; base-uri
'self'; form-action 'self'; object-src 'none'` — **confirmo**: `font-src
'self'`, sem `fonts.gstatic.com`; `style-src` sem `fonts.googleapis.com`. A
premissa central do ADR-012 ("a CSP vigente já proíbe fonte externa e não
precisa de nenhuma alteração") é factualmente correta, não apenas afirmada.
Também li `src/design-system/tokens.css`: nenhuma declaração `@import`,
`font-family` com nome de fonte do Google, nem qualquer referência a
`googleapis`/`gstatic` hoje — confirma que a baseline atual (`system-ui`) não
tem nenhuma dependência de fonte externa a desfazer, o ponto de partida que
ADR-013 assume implicitamente ao falar em "substituição". Também confirmei em
`SECURITY-REVIEW.md` (Seções 29-38, 69, linha "L2... `DEBT-03`/CSP confirmado
resolvido") que `DEBT-03` não é apenas um item fechado pelo Software
Architect por conta própria nesta sessão — foi auditado e confirmado
resolvido pelo próprio DevSecOps antes desta iniciativa começar. Não aceito a
alegação do ADR "por autoridade do ADR" — verifico contra o artefato e o
histórico de auditoria correspondentes, e ambos batem.

### (a) ADR-012 — Self-host de fonte via `next/font` — resolve de fato a tensão CSP × `DEBT-03`?

**Sim, integralmente, no nível de código/arquitetura.** A escolha por
`next/font/google` (opção 1) elimina o problema na raiz em vez de mitigá-lo:
não há requisição de rede em runtime para nenhum domínio do Google, logo não
há necessidade de tocar `font-src`/`style-src`/`connect-src` — a CSP validada
por DevSecOps permanece bit-a-bit como está. As alternativas descartadas
(CDN do Google Fonts, self-host manual) estão corretamente avaliadas: CDN
exigiria reabrir uma política de segurança recém-fechada e auditada (regressão
real, não hipotética); self-host manual chega ao mesmo resultado técnico da
opção escolhida, mas reinventa subsetting/`font-display`/gestão de binário
que o framework já em uso (ADR-003) resolve nativamente — não há vantagem
real que justifique o esforço extra. Nenhum vendor novo, nenhum lock-in,
nenhuma implicação de compliance negativa (o self-host, ao contrário do CDN,
*reduz* superfície de exposição de IP a terceiro — ponto de LGPD
corretamente identificado no próprio ADR, e que eu mesmo já havia sinalizado
como preocupação hipotética no Gate 1 desta iniciativa, item 7 da lista de
riscos).

Dois pontos não bloqueantes, registrados para Frontend/Tech Lead, não para
reabertura do ADR:

1. **Validação de catálogo, não de decisão**: o ADR não confirma
   explicitamente que Bebas Neue, Public Sans e JetBrains Mono — e os pesos
   específicos que o mockup usa — estão de fato disponíveis com os subsets
   necessários no catálogo que `next/font/google` espelha. É improvável que
   não estejam (são fontes populares e estáveis), mas é uma checagem de
   implementação de minutos, não uma decisão de arquitetura a reabrir. Dono:
   Frontend, no início da implementação, não antes.
2. **Estado real de produção é matéria separada, já rastreada.** O código
   (`vercel.json`) já tem `font-src 'self'` correto — isso é o que este ADR
   precisa para ser tecnicamente válido, e é o que confirmei acima. Se essa
   CSP está de fato servida pela URL de produção real neste exato momento é
   uma pergunta diferente, já em aberto na atualização mais recente do Gate 1
   desta iniciativa (reconciliação pendente do DevOps, `git status` desta
   sessão mostrando `vercel.json` modificado/não commitado). Não reabro essa
   pendência aqui — ela já tem dono (DevOps) e prazo (antes de qualquer nova
   decisão sobre a Seção 3.2 daquela atualização) — apenas registro que ela
   não invalida a solidez arquitetural de ADR-012 em si, que é o que este
   Gate 2 avalia.

**Fecho formalmente, neste Gate 2, a ressalva que eu mesmo havia aberto no
Gate 1 desta iniciativa** ("fonte externa vs. CSP a decidir junto com
`DEBT-03`", item 7 da lista de riscos, e a entrada correspondente no Tier 4
da Consolidação de Pendências) — está resolvida, sem debito remanescente de
arquitetura.

### (b) ADR-013 — Substituição atômica de `tokens.css`/`tokens.ts` — a implicação de reabrir FE-00 a FE-11 muda a viabilidade?

**A decisão técnica em si está correta e bem justificada** — reviso pelo
framework completo de `architecture-decision-review`:

- **Trade-off e alternativas**: as três opções (substituição direta,
  versionamento paralelo, reescrita completa) estão genuinamente comparadas,
  não é uma lista de palha para justificar a escolha já feita. A rejeição da
  opção 2 (coexistência de temas) é o ponto mais importante e está bem
  fundamentada: com componentes compartilhados (Guardrail 31) e squad de 1
  Frontend, manter duas paletas ativas simultaneamente exigiria ou duplicar
  componentes (proibido) ou um mecanismo de tema mantido por tempo
  indefinido, com o dobro de esforço de `accessibility-review` — custo
  estrutural desproporcional a um requisito que o próprio `PRD-TECNICO.md`
  não pede. Concordo com a rejeição.
- **Escalabilidade/custo**: substituição atômica é a opção de menor custo de
  implementação e manutenção (RNF-04), sem mecanismo novo a operar depois. Sem
  objeção.
- **Dívida técnica**: nenhuma dívida nova introduzida pela escolha em si — a
  única "dívida" real é a que já existia (ausência de mecanismo de
  theming), e ADR-013 justifica corretamente por que não vale a pena criá-la
  agora.
- **Vendor lock-in**: nenhum.

**A constatação central do ADR — blast radius simultâneo nas 11 telas, não
só as 6 do mockup — está tecnicamente correta e eu a confirmo de forma
independente**: os tokens são globais por design (Seção 5/UX-SPEC.md Seção
3.1, decisão já fechada em L0, não reaberta aqui) e os componentes são
compartilhados por regra vinculante (Guardrail 31). Não existe, dentro dessas
duas restrições já aceitas pelo projeto, nenhuma forma de a troca de valores
de token afetar só 6 telas — a alternativa que permitiria isso (opção 2) foi
corretamente descartada por violar a própria Guardrail 31. Ou seja: **isto
não é uma escolha de arquitetura que ampliou o escopo por conveniência do
Software Architect — é uma consequência inevitável de duas decisões já
aprovadas anteriormente** (tokens globais, componentes únicos). Reconheço
isso explicitamente porque muda a natureza da minha revisão: não estou
validando se o Software Architect *escolheu* ampliar o escopo — estou
validando se ele identificou corretamente uma implicação técnica que já
estava latente nas Seções 1-7 originais e a comunicou com transparência ao
Tech Lead. Fez isso corretamente, inclusive com o cuidado de distinguir o que
*pode* variar por tela (profundidade de redesenho de layout, RF-D04) do que
*não pode* variar por tela (valores de cor/fonte) — distinção que o próprio
`PRD-TECNICO.md`/`UX-SPEC.md` (ainda sem o delta desta decisão) precisarão
herdar sem ambiguidade quando o UX/UI registrar a decisão de cobertura das 5
telas remanescentes.

**Isto muda minha avaliação de viabilidade? Não — pelo motivo correto, não
por acaso.** No Gate 1 desta iniciativa eu havia registrado este retrabalho
como risco de severidade Média, condicionado a sequenciamento (a iniciativa
não deveria consumir capacidade dedicada antes de determinado marco). Essa
condição de sequenciamento **já foi decidida e substituída** pela instrução
direta do organizador, registrada na atualização mais recente do Gate 1
desta iniciativa ("Atualização por Instrução Direta de Inversão Total de
Prioridade"): a v1 está pausada, toda a capacidade de Frontend (e, se
necessário, Backend) está dedicada a este redesenho, sem nenhum prazo de
negócio externo confirmado competindo por ela (Premissa 6 do `PRD.md`
original nunca foi respondida pelo stakeholder em três gates consecutivos, e
o próprio organizador é hoje o único usuário real de ambas as versões). Nessas
condições — squad de 1 Frontend, sem competição de prioridade, sem prazo
externo confirmado — reabrir a estimativa de `FE-00` a `FE-11` inteiras (em
vez de só as 6 telas do mockup) é um **aumento real de esforço, não um
problema de viabilidade**: não há outro projeto disputando essa mesma
capacidade agora, e o próprio dono do produto já decidiu explicitamente que
esse é o único trabalho a fazer no momento. **Aceito a implicação de escopo**
como consequência técnica correta e inevitável, não como motivo de reprovar
ADR-013 nem de reabrir a recomendação de sequenciamento (já resolvida em
outra instância do Gate 1).

Três pontos não bloqueantes, registrados como ressalvas de coordenação para o
Tech Lead, não como reprovação de ADR-013:

1. **A reabertura de `FE-00` a `FE-11` deve ser tratada como reestimativa
   formal completa, não como ajuste cosmético de escopo.** O próprio ADR já
   avisa isso explicitamente ("Consequência direta para a reestimativa do
   Tech Lead"); reforço aqui, como CTO, que isso significa: o `TASK.md`
   delta desta iniciativa precisa listar cada uma das 12 tarefas de Frontend
   já fechadas (`FE-00` a `FE-11`) com uma linha própria de reestimativa
   (mesmo que a conclusão para várias delas seja "esforço adicional
   pequeno/zero, só a troca de token é suficiente") — não pode ficar como
   uma frase genérica de "revisar Frontend". Dono: Tech Lead. Prazo: antes
   de qualquer estimativa ser considerada final para o Gate 3 desta
   iniciativa.
2. **`accessibility-review` pré-merge sobre os componentes compartilhados das
   11 telas (não das 6) é um gate duro, não uma recomendação.** O próprio
   Anexo C (Seção C.5) já registra isso como mitigação obrigatória. Explicito
   aqui, como condição de aprovação deste Gate 2, que nenhum PR de troca de
   `tokens.css`/`tokens.ts` deve ser mesclado sem essa checagem completa —
   equivalente, na prática, a tratar o dia da troca de tokens como um
   sign-off de acessibilidade de produto inteiro, não de tela isolada. Dono:
   UX/UI (execução), Tech Lead (sequenciamento do PR).
3. **A alegação de "rollback trivial via `git revert`" (Consequências
   Negativas do ADR) só se sustenta se o commit/PR de troca de tokens for
   isolado** — sem misturar, no mesmo commit, mudança de layout/composição de
   tela (ex.: o novo simulador tático de T09, ADR-014). Se Tech Lead/Frontend
   combinarem a troca de token com mudanças de layout no mesmo PR por
   conveniência de sequenciamento, um `git revert` deixa de ser trivial (pode
   reverter também layout que não se queria desfazer, ou conflitar com
   commits subsequentes que já assumem os novos tokens). Não é uma objeção a
   ADR-013 — é uma condição de execução que precisa ser respeitada para que a
   consequência positiva declarada no próprio ADR continue válida na prática.
   Dono: Tech Lead, ao sequenciar os PRs em `TASK.md`.

Nenhum destes três pontos exige novo ADR nem reabre a decisão de ADR-013 —
são condições de execução que tornam a decisão já aceita sólida na prática,
não objeções à decisão em si.

### (c) Cobertura de 11 telas vs. 6 do mockup — reforça ou contradiz a decisão do PM?

**Reforça, não contradiz — confirmo a leitura já apresentada nesta tarefa.**
A decisão de cobertura (RF-D04, já responsabilidade de UX/UI/PM, não do
Software Architect) sempre foi sobre *o quê* fazer com as 5 telas fora do
mockup original (extensão integral de linguagem visual vs. plano de migração
faseado com prazo) — nunca sobre *se* o valor bruto de cor/tipografia
chegaria a elas. ADR-013 apenas torna explícito, no nível técnico, que a
segunda leitura nunca foi uma opção real dentro da arquitetura já aceita
(tokens globais + componentes únicos, Guardrail 31) — não é uma mudança de
arquitetura que "força a mão" do PM, é a mesma decisão de produto de sempre,
agora com a implicação técnica correta anexada a ela. Não há conflito a
arbitrar aqui.

### ADR-014 (não marcado) — revisão por completude

Não marcado pelo Software Architect para este gate, e concordo com essa
classificação: nenhum vendor novo, nenhuma dependência de pacote a auditar,
decisão de composição de DOM/CSS sobre um modelo de dados já existente
(`TIME_ATLETA`), sem mudança de contrato de API. A justificativa de rejeitar
`<canvas>`/SVG por motivo de acessibilidade (RNF-D02, Guardrail 30) é
tecnicamente correta e vai no mesmo sentido que já validei no Gate 2 original
para decisões de acessibilidade estrutural (ex.: ADR-005). **Aprovado**, sem
ressalva, revisão de completude apenas.

### Risco e Compliance (consolidado)

| Item do checklist | Evidência | Severidade | Observação |
|---|---|---|---|
| Fonte externa / CSP (`DEBT-03`) | ADR-012, confirmado contra `vercel.json` real e `SECURITY-REVIEW.md` (auditado por DevSecOps) | Nenhuma (resolvido) | Ressalva do Gate 1 desta iniciativa fechada formalmente aqui |
| LGPD / minimização de dado | ADR-012 (self-host elimina exposição de IP a terceiro); nenhum dado pessoal de atleta envolvido em nenhum dos três ADRs | Nenhuma | Sem novo achado |
| Retrabalho sobre baseline aprovada (Guardrail 31/FE-00) | ADR-013, confirmado como consequência técnica inevitável, não escolha de conveniência | Baixa (era Média no Gate 1; rebaixada porque a condição de sequenciamento que a tornava arriscada já foi resolvida por decisão direta do organizador) | Ver ressalvas 1-3 da análise de ADR-013 acima |
| Vendor lock-in | N/A — nenhum vendor novo em nenhum dos três ADRs | N/A | — |
| Acessibilidade (Guardrail 28/RNF-D01) | ADR-013 (gate pré-merge de 11 telas), ADR-014 (DOM nativo preserva foco/leitura de tela) | Nenhuma, condicionada à execução do gate pré-merge (ressalva 2 acima) | — |

Nenhum item de severidade Alta. Nenhum vendor lock-in crítico sem plano de
saída (não aplicável — nenhum vendor novo).

### Veredito por ADR marcado (e revisado) para este Gate 2

| ADR | Skill aplicada | Veredito |
|---|---|---|
| ADR-012 (self-host de fonte via `next/font`) | `risk-and-compliance-check` | **Aprovado**, sem ressalva bloqueante — resolve integralmente a tensão CSP×fonte externa sinalizada por mim no Gate 1 desta iniciativa; verificado contra código real, não apenas contra o texto do ADR |
| ADR-013 (substituição atômica de tokens) | `architecture-decision-review` | **Aprovado com ressalvas** — decisão tecnicamente correta e consequência de blast radius corretamente identificada e comunicada; três condições de execução (reestimativa formal linha a linha de FE-00 a FE-11, gate duro de `accessibility-review` pré-merge nas 11 telas, isolamento do commit de troca de tokens para preservar rollback trivial) |
| ADR-014 (simulador tático sem biblioteca gráfica nova) | Revisão de completude (não marcado) | **Aprovado**, sem ressalva |

### Veredito do `SDD.md` Anexo C: **Aprovado com ressalvas**

Nenhuma decisão estrutural é reprovada — o Tech Lead está liberado para
avançar a decomposição do `TASK.md` delta desta iniciativa sobre a
arquitetura do Anexo C como está, sem necessidade de o Software Architect
reabrir nenhum dos três ADRs. As ressalvas ficam registradas como
pendências rastreáveis, todas de responsabilidade de execução (Tech
Lead/UX-UI/Frontend), nenhuma de reabertura de arquitetura:

- [x] Ressalva do Gate 1 desta iniciativa ("fonte externa vs. CSP a decidir
      junto com `DEBT-03`") — **fechada formalmente neste Gate 2**, resolvida
      por ADR-012, verificada contra `vercel.json` real.
- [ ] `TASK.md` delta deve listar reestimativa formal linha a linha para
      `FE-00` a `FE-11` (12 tarefas), não uma frase genérica de revisão —
      dono: Tech Lead, antes do Gate 3 desta iniciativa.
- [ ] Nenhum PR de troca de `tokens.css`/`tokens.ts` é mesclado sem
      `accessibility-review` completo sobre os componentes compartilhados
      usados pelas 11 telas — dono: UX/UI (execução) + Tech Lead
      (sequenciamento), antes do merge do commit de troca.
- [ ] Commit/PR de troca de tokens deve ser isolado de qualquer mudança de
      layout/composição de tela (ex.: simulador tático de T09) para que a
      alegação de "rollback trivial via `git revert`" do ADR-013 permaneça
      válida na prática — dono: Tech Lead, no sequenciamento de PRs.
- [ ] Validação de catálogo de fonte (`next/font/google` oferece os pesos
      exatos de Bebas Neue/Public Sans/JetBrains Mono usados no mockup) —
      dono: Frontend, checagem de minutos no início da implementação, não
      bloqueia este Gate 2.

Confirmo, adicionalmente, os três pontos que motivaram esta revisão
específica: **(a)** ADR-012 resolve de fato a tensão CSP×fonte externa
sinalizada por mim no Gate 1 desta iniciativa — ressalva fechada. **(b)** a
implicação de reabrir estimativa de `FE-00` a `FE-11` inteiras (não só as 6
telas do mockup) é aceita como consequência técnica inevitável e correta, e
não muda minha avaliação de viabilidade desta iniciativa — a condição que
tornaria isso um problema de capacidade (competição com outra prioridade ou
prazo externo confirmado) não existe hoje, por decisão já registrada do
próprio organizador. **(c)** a cobertura de 11 telas reforça, não contradiz,
a decisão de cobertura já atribuída ao PM/UX-UI (RF-D04) — não há conflito a
arbitrar.

Nenhuma mudança em `GUARDRAILS.md` é necessária ou proposta neste Gate —
nenhum dos três ADRs cria exceção às 36 regras vigentes, nenhuma regra nova é
exigida por eles. As demais ressalvas remanescentes do Gate 1 desta
iniciativa (artefato de origem não versionado, cobertura de layout das 5
telas restantes, ambiguidade de paleta dupla, assets de marca fora de
processo, rótulo "v2.0"/nomenclatura) **não são matéria deste Gate 2** — já
corretamente roteadas a PM/UX-UI/Tech Lead pelo próprio BA
(`PRD-TECNICO.md` Parte II) e pelo próprio Software Architect (`SDD.md`
Anexo C, Seção C.8) — seguem em aberto, sem alteração de dono ou prazo, e
serão revisadas por mim quando os artefatos correspondentes (`UX-SPEC.md`
delta, `TASK.md` delta) chegarem aos próximos gates desta iniciativa.

---

## Gate 3 — Pré-TASK.md — Iniciativa "Redesenho Visual" — 2026-09-04

**Skills aplicadas**: `capacity-and-timeline-validation` (`TASK.md` Parte II),
`risk-and-compliance-check` (pontos residuais de LGPD/acessibilidade/governança
já abertos, para confirmar que nenhum foi silenciosamente fechado), `guardrails-governance`
(`GUARDRAILS.md` Seção 10, regras 37-40 propostas).
**Input avaliado**: `TASK.md` Parte II completa (Tech Lead, rascunho para este
Gate 3) + `GUARDRAILS.md` Seção 10 (proposta) + `SDD.md` Anexo C/ADR-012/013/014
(Aprovado com ressalvas no Gate 2 desta iniciativa) + `UX-SPEC.md` Parte II
completa, revisão 2 + este próprio `CTO-REVIEW.md` (Gate 1 em todas as
atualizações, Gate 2 e "Consolidação de Pendências Reais da v1" desta
iniciativa) + `GUARDRAILS.md` regras 1-36 vigentes, como referência de não
regressão.

### Verificação direta de fidelidade `TASK.md` → `SDD.md` Anexo C (não aceito por alegação)

Comparei item a item as três condições de execução que impus no Gate 2
(ressalva de `ADR-013`) contra o que a Parte II do `TASK.md` realmente
entrega, não contra o que ela *diz* entregar:

1. **Reestimativa formal linha a linha de `FE-00` a `FE-11`** — cobrada por
   mim como condição textual ("não pode ficar como uma frase genérica").
   Confirmado: Seção 3.2 tem 12 linhas (`FE-R00` a `FE-R11`) mais `FE-R12` por
   transparência (justificada corretamente como consumidora de tokens via
   `SessionExpiryBanner`/`Toast`, Guardrail 31) — nenhuma linha vazia, cada uma
   com justificativa específica do que muda. **Satisfeita**.
2. **`accessibility-review` completo pré-merge sobre as 11 telas, gate duro,
   não incremental** — Seção 1.2-R e Seção 4.1 (item 2) do `TASK.md`
   confirmam isso explicitamente como pré-condição do próprio `FE-R00`, não
   tarefa separada, e a Seção 4.3 reforça que nenhum sign-off de tela é válido
   antes desse fechamento. **Satisfeita**.
3. **Isolamento do commit de troca de tokens (sem layout no mesmo commit)** —
   Seção 1.2-R e a nota de estrutura de commits (Seção 3.0, após a tabela de
   lotes: commit 1 = tokens; commit 2 = `Icon`/`BrandCrest`; commits de
   composição por lote depois) implementam exatamente a condição. **Satisfeita**.

Nenhuma das três condições foi enfraquecida, reinterpretada ou parcialmente
satisfeita — o Tech Lead não tratou minhas ressalvas do Gate 2 como
formalidade a marcar "concluído" sem entregar, diferente do que aconteceu duas
vezes com o plano de saída do ADR-002 no Gate 3 original (registrado acima).
Registro isso porque é o oposto do padrão de risco que motivou a regra 35 —
aqui a condição foi de fato executada, não apenas prometida.

### Capacidade e prazo (`capacity-and-timeline-validation`) — ponto 1: o volume não é o que o Tech Lead alega

**Refiz a soma da própria tabela do Tech Lead (Seção 3.2) em vez de aceitar o
número enunciado, exatamente como fiz no Gate 3 original com a divisão
Backend/Frontend de 76.5 PD.** O resultado não bate:

| Tarefa | Esforço declarado |
|---|---|
| FE-R00 | 6 |
| FE-R01 | 1 |
| FE-R02 | 4 |
| FE-R03 | 1 |
| FE-R04 | 1 |
| FE-R05 | 6 |
| FE-R06 | 3 |
| FE-R07 | 1 |
| FE-R08 | 0.5 |
| FE-R09 | 7 |
| FE-R10 | 1 |
| FE-R11 | 1 |
| FE-R12 | 0.5 |
| **Soma real das 13 linhas** | **33** |

O `TASK.md` (Seção 3.2, linha final, e Seção 5, Risco 1) declara **27 PD** de
Frontend e **~33.5 PD** de volume total (27 + 6 Backend + 0.5 spike). A soma
real das 13 linhas que o próprio Tech Lead lista é **33 PD**, não 27 — uma
diferença de **6 PD (≈22% de subestimação do total de Frontend)**. O volume
total real desta Parte II é, portanto, **≈39.5 PD** (33 Frontend + 6 Backend +
0.5 spike), não 33.5 PD como declarado duas vezes no documento (uma vez na
Seção 3.2, outra na Seção 5). Não é um erro de transcrição isolado — o número
errado (33.5) é reutilizado no Risco 1 da Seção 5, que é exatamente o item que
pede a mim, CTO, para "calibrar a expectativa deste Gate 3" contra ele. Eu não
calibro a expectativa contra um número que não confere com os dados que o
sustentam.

**Isto muda a conclusão de viabilidade? Não — mas muda a magnitude que registro
formalmente.** Refazendo a conta de capacidade com o número correto (39.5 PD,
não 33.5 PD), ao mesmo padrão do Gate 3 original (PD ≈ 6h efetivas, ~5 PD/semana
por pessoa):

- Trilha Frontend (a mais longa, dominante do calendário desta iniciativa): 33
  PD ≈ **6.6 semanas** (não "5-6 semanas" como o Tech Lead estimou a partir do
  número errado) — uma diferença de ~1.5 semana, não trivial para calibração de
  expectativa, mas não muda a ordem de grandeza.
- Trilha Backend: 6 PD + 0.5 PD de `SPK-02` ≈ 1.3 semanas — folga real
  confirmada (Risco 5 do `TASK.md` permanece válido mesmo com o número
  corrigido: 6.5 PD de Backend contra 33 PD de Frontend é folga de sobra para
  `DEBT-05`/`DEBT-06` no mesmo período, como o próprio Tech Lead já apontou).
- **A conclusão de fundo do Tech Lead está correta apesar do erro de soma**: o
  volume, mesmo corrigido para ≈39.5 PD, continua plausível frente à condição
  já registrada por mim no Gate 2 desta iniciativa (squad de 1 Frontend + 1
  Backend, dedicação integral, sem prioridade concorrente, sem prazo externo
  confirmado — "Atualização por Instrução Direta de Inversão Total de
  Prioridade", acima). Não há restrição de prazo/orçamento declarada para este
  volume contradizer, pela mesma razão já registrada no Gate 3 original: o
  stakeholder nunca respondeu à Premissa 6 do `PRD.md`, e eu já adotei a
  postura de orçamento mínimo como decisão final desde aquele gate — isso não
  muda com mais 6 PD de Frontend.

**Decisão**: não reprovo o `TASK.md` por este erro — nenhuma tarefa individual
está com estimativa errada (cada linha, isoladamente, está correta e
justificada; o erro está apenas na soma/no número repetido na Seção 5) e a
conclusão de viabilidade não muda de sinal. Mas **não aceito o número 27/33.5
como válido para registro** — exijo, como condição não bloqueante de execução
(mesmo padrão usado para o plano de saída do ADR-002 no Gate 3 original: dono e
prazo nomeados, sem travar o início do trabalho), que o Tech Lead corrija a
soma na Seção 3.2 (27→33 PD) e o número consolidado na Seção 5, Risco 1
(33.5→39.5 PD) antes de qualquer relatório de acompanhamento de execução citar
esses números — o erro não bloqueia Backend/Frontend de começar (a ordem de
lotes/dependências da Seção 4 não depende do total agregado), mas não pode
circular como métrica oficial deste projeto sem correção.

### Capacidade e prazo — pontos 2-5 do checklist

- **Dependências e paralelismo (Seção 4)**: mapeamento consistente — toda
  tarefa referenciada nas Seções 4.1-4.3 existe na Seção 3, e vice-versa;
  `BE-R01`/`BE-R02`/`SPK-02` corretamente identificados como não bloqueantes do
  início de `FE-R00` (não tocam `tokens.css`); a distinção entre "bloqueia
  merge" e "bloqueia desenvolvimento" (Seção 4.1, itens 1 e 5) é o mesmo
  cuidado metodológico que já elogiei no Gate 3 original para `SPK-01`/`BE-15`.
  Nenhuma tarefa crítica sem dono.
- **Prazo vs. restrição de negócio conhecida**: nenhuma contradição — pela
  mesma ausência de restrição declarada já registrada acima.
- **Plausibilidade qualitativa**: 39.5 PD (corrigido) para reestimar uma
  baseline de design system inteira (12-13 telas) mais dois endpoints novos de
  agregação é proporcional ao que já era esperado desde a "Nota de Governança
  Ad Hoc" e o Gate 2 desta iniciativa — nenhuma surpresa de porte.

### Ponto 2 do meu roteiro: as duas lacunas escaladas pelo Tech Lead (Seção 6.1-R)

**Ambas estão corretamente tratadas como escalação, não como decisão
silenciosa — confirmo item a item, não aceito a alegação de "está escalado"
sem verificar o conteúdo real da escalação:**

1. **"Próxima rodada" no painel "Resumo da temporada" de T02.** Verifiquei
   contra `UX-SPEC.md` Parte II, Seção 2.2: o mockup real de fato mostra
   "Próxima rodada: Sáb, 05/09" como uma das 3 estatísticas do painel desktop.
   O Tech Lead tem razão ao apontar que isso pressupõe uma entidade "rodada
   agendada" inexistente em RF-01 a RF-08 — não é lacuna de apresentação, é
   ausência de funcionalidade/modelo de dados. A decisão de excluir esse dado
   específico de `BE-R01`/`FE-R02` (painel mostra só 2 das 3 métricas) e
   escalar como candidato a nova funcionalidade futura, sem implementar nem
   decidir, é exatamente o comportamento exigido pela Guardrail 32. **Não
   preciso decidir agora** se "agendar próxima rodada" vira backlog — isso é
   trabalho de Software Architect/BA/PM quando (e se) o organizador cobrar a
   ausência, como o próprio Risco 4 da Seção 5 já prevê corretamente. Nenhuma
   ação minha necessária neste gate além de confirmar que o tratamento foi
   correto.
2. **Disponibilidade de dado time/gol em rodadas legado (`SPK-02`).** Timebox
   de 0.5 PD, critério de saída binário (sim/parcialmente/não por amostragem
   direta), fallback técnico definido (`null`/"—", sem erro) independente do
   resultado do spike, e a pergunta de "o fallback é aceitável como
   comportamento permanente" corretamente roteada de volta ao Software
   Architect **depois** do spike rodar, não decidida agora no vácuo. Isto é
   tratamento de incerteza técnica genuína, do mesmo tipo que já aprovei para
   `SPK-01` no Gate 3 original — não é uma lacuna estrutural sendo empurrada
   para depois por conveniência, é a ordem correta (medir antes de decidir
   política de produto sobre o resultado). Nenhuma ação minha necessária agora.

### Ponto 3 do meu roteiro: pendência do Artifact do `claude.ai` (Tier 4, item 21)

Verifiquei o Risco 6 da Seção 5 do `TASK.md` linha a linha contra a alegação do
Tech Lead de tê-la tratado como "dependência pontual de tarefas específicas":
**confirmado, não é uma alegação vazia.** O texto nomeia exatamente 5 tarefas
afetadas (`FE-R01`, `FE-R02`, `FE-R05`, `FE-R06`, `FE-R09` — as 5 telas do
mockup fora de `FE-R00`) e exclui explicitamente `FE-R04`/`FE-R07`/`FE-R08`/
`FE-R10` (aplicação leve, suficientemente descrita em texto) e `FE-R00`
(tokens já têm hex exatos, não dependem de captura visual). O prazo de
resolução também é pontual e correto ("antes do início da implementação fina
de cada uma dessas 5 tarefas especificamente, se e quando o Frontend
identificar necessidade real"), não um bloqueio geral da iniciativa. Isto é
tratamento fiel do item 21 da minha "Consolidação de Pendências Reais da v1" —
nem ignorado, nem inflado para bloquear tarefas que não precisam dele. O dono
da resolução (PM/UX-UI, persistir o artefato) segue o mesmo desde aquela
consolidação; não requer nova ação minha aqui além de confirmar a
rastreabilidade.

### Ponto 4 do meu roteiro: `GUARDRAILS.md` Seção 10 (regras 37-40, `guardrails-governance`)

Revisei cada regra proposta contra as 36 regras vigentes (nenhuma
contradição a resolver, apenas checar coerência de generalização) e contra a
origem declarada (as três condições de execução do meu próprio Gate 2 desta
iniciativa + a obrigação de reestimativa já exercida):

- **Regra 37** (substituição atômica de tokens como evento único; proíbe
  coexistência de tema/paleta em runtime; exige novo ADR para qualquer
  mecanismo de theming). Generaliza corretamente `ADR-013` e não conflita com
  a Guardrail 1 (mudança de arquitetura exige novo ADR) nem com a Guardrail 31
  (componente único) — na verdade, é a Guardrail 31 aplicada
  prospectivamente ao caso específico de token global. **Aprovada, sem
  ajuste.**
- **Regra 38** (commit de fundação isolado de mudança de layout/composição).
  Generaliza a condição de execução 3 do meu Gate 2. Não conflita com nenhuma
  regra de commit/processo existente (não havia nenhuma até agora). É uma
  regra de disciplina de entrega, proporcional ao risco que ela mitiga
  (perda de `git revert` trivial). **Aprovada, sem ajuste.**
- **Regra 39** (`accessibility-review` completo, gate duro, sobre todos os
  componentes compartilhados de todas as telas afetadas, antes do merge de
  qualquer troca de fundação). Generaliza a condição de execução 2 do meu
  Gate 2, e a própria regra já se declara corretamente como extensão da
  Guardrail 28 para o caso específico de mudança de fundação global. Verifiquei
  que isso não é uma exigência desproporcional para o futuro: enquanto a
  Guardrail 31 (componente único reutilizado) permanecer em vigor, **qualquer**
  troca de valor global de design system atinge, por construção arquitetural,
  todas as telas que usam aquele componente — não é uma exigência nova
  desconectada da arquitetura, é a mesma invariante estrutural que já motivou
  a regra 37. **Aprovada, sem ajuste.**
- **Regra 40** (reestimativa formal linha a linha de toda tarefa fechada
  afetada por mudança de fundação compartilhada — design system, componente
  reutilizável de base, ou contrato de API central). Generaliza o mecanismo
  que o próprio Tech Lead acabou de exercer nesta Parte II (Seção 3.2). Não
  conflita com a Guardrail 32 (lacuna estrutural sempre escala) — é
  complementar: a regra 40 trata de tarefa **já fechada** sendo reaberta por
  mudança de fundação, não de lacuna nova. **Aprovada, sem ajuste.**

Nenhuma das quatro regras decide alocação nominal de pessoas, substitui a
análise tática de segurança do DevSecOps, ou usa linguagem vaga sujeita a
interpretação divergente — todas têm gatilho objetivo (evento de mudança de
fundação compartilhada) e ação concreta associada. **Promovo as quatro regras
de `[PROPOSTA]` para vigentes**, com efeito a partir desta data
(2026-09-04) — ver atualização de `GUARDRAILS.md` (cabeçalho, Seção 10 e Log de
Alterações) publicada junto com este registro.

### Riscos de Prazo (Seção 5) — demais itens

Itens 2 (gate de acessibilidade específico de `FE-R09` antes do sign-off), 3
(governança de `BrandCrest` não bloqueia o resto de `FE-R00`) e 5 (folga de
Backend, já discutida acima) estão corretamente sinalizados, com dono e ação
claros, sem necessidade de decisão adicional minha. Item 4 (escalada da
"próxima rodada") já tratado no ponto 2 do meu roteiro acima. Item 1 (volume
total) tratado com a correção de número acima — mantenho a leitura de que o
volume é plausível, corrigido o dado que o sustenta.

### Veredito do `TASK.md` Parte II: **Aprovado com ressalvas**

Nenhuma tarefa individual, dependência ou lacuna é reprovada — Backend e
Frontend estão liberados para iniciar a implementação de produção desta
Parte II, incluindo a ordem de lotes (RD0 precede RD1-RD4) e o paralelismo já
mapeado na Seção 4. As três condições de execução do meu Gate 2 foram de fato
cumpridas (verificado, não alegado), e as duas lacunas estruturais escaladas
foram tratadas corretamente (escalação real, não decisão silenciosa).

Ressalva não bloqueante, com dono e prazo:

- [ ] **Correção do total de esforço declarado** — Seção 3.2 (27→33 PD de
      Frontend) e Seção 5, Risco 1 (33.5→39.5 PD de volume total). Dono: Tech
      Lead. Prazo: antes do primeiro relatório de acompanhamento de execução
      (`EXECUTION-LOG.md`) desta iniciativa citar volume agregado. Não bloqueia
      o início de nenhum lote — nenhuma dependência ou sequenciamento da Seção
      4 depende do número agregado, e a conclusão de viabilidade de capacidade
      não muda com a correção.

Ressalvas já herdadas do Gate 2 desta iniciativa, que seguem em aberto sem
mudança de dono/prazo (não é matéria deste Gate 3 fechá-las, só confirmar que
não regrediram): confirmação de direito de uso do brasão real (`BrandCrest`,
bloqueia só o merge do componente, não o resto de `FE-R00`), validação de
catálogo de fonte do `next/font/google` (checagem de minutos, Frontend), e a
redação diferenciada de base legal LGPD adulto/menor em `FE-04` (herdada da
Parte I, prazo já fixado por mim no Gate 3 original: antes do freeze do texto
de privacidade).

### `GUARDRAILS.md` (`guardrails-governance`): regras 37-40 — **Aprovadas**

Ver análise regra a regra acima. As quatro regras propostas pelo Tech Lead na
Seção 10 passam de `[PROPOSTA]` para vigentes, sem nenhum ajuste de texto —
aprovadas exatamente como submetidas. Atualizo `GUARDRAILS.md` (cabeçalho,
remoção do bloco `[PROPOSTA]`/renumeração de seção, e nova linha no Log de
Alterações) na mesma data deste registro.

### Encerramento do fluxo de planejamento desta iniciativa

Com este Gate 3, **o fluxo de planejamento (Gates 1-3) da Iniciativa
"Redesenho Visual" está formalmente encerrado**:

- `SDD.md` Anexo C: Aprovado com ressalvas (Gate 2), permanece nesse status —
  as três condições de execução foram cumpridas e verificadas neste Gate 3;
  as ressalvas remanescentes (catálogo de fonte, direito de uso de
  `BrandCrest`) seguem rastreadas com dono e prazo, sem mudança.
- `UX-SPEC.md` Parte II: contexto confirmado nesta revisão como fielmente
  refletido em `TASK.md`; nenhuma divergência de mérito encontrada entre os
  dois documentos.
- `TASK.md` Parte II: **Aprovado com ressalvas** — Backend e Frontend
  liberados para iniciar a implementação de produção sobre esta Parte II,
  incluindo lotes RD0-RD4 e a ordem de execução da Seção 4.
- `GUARDRAILS.md`: **Aprovado** — regras 37-40 em vigor a partir de
  2026-09-04, vinculantes para todo agente downstream (não apenas para esta
  iniciativa — generalizam para qualquer mudança futura de fundação
  compartilhada, conforme a própria proposta do Tech Lead e minha análise
  acima).

O próximo ponto de atuação formal do CTO nesta iniciativa é ad hoc (arbitragem
de conflito escalado — ex.: se o organizador cobrar a "próxima rodada" fora de
escopo, ou se o direito de uso do brasão não for confirmado a tempo) ou o
Gate 4 (fechamento, registro após o deploy do DevOps desta iniciativa — sem
poder de veto).

---
