# ADR-011: Anonimização In-Place do Dado Pessoal do Atleta a Pedido do Titular (LGPD Art. 18)

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, database, security, compliance

> **Resolve BLOCKER-002** (`BLOCKERS.md`, origem UX/UI) e a ressalva item 3 do
> Gate 2 do CTO (`CTO-REVIEW.md`, "Direitos do titular de dado — LGPD Art. 18 —
> não endereçados no SDD.md"). Não supersede nenhum ADR existente — é uma
> decisão nova e aditiva, compatível com ADR-005 (RLS/views públicas) e ADR-006
> (ledger append-only via funções PL/pgSQL).

## Context and Problem Statement

O PRD-TECNICO.md e o SDD.md (Seção 7.6) tratam a coleta de dado pessoal do
atleta (`nome_completo`, `contato`, `data_nascimento`) sob a base legal de
legítimo interesse do organizador, mas não desenham nenhum mecanismo para
atender ao direito do titular de solicitar anonimização/eliminação de dado
pessoal (LGPD Art. 18, incisos IV e VI) — cenário concreto: um atleta sai do
grupo e pede a remoção de nome/contato/data de nascimento.

A dificuldade real não é jurídica, é estrutural: o modelo de dados (Seção 5 do
SDD.md) tem um ledger de pontos **append-only** (`LANCAMENTO_PONTOS`,
ADR-006) e outras tabelas (`PARTICIPACAO_RODADA`, `TIME_ATLETA`,
`SUBSTITUICAO`, `RESTRICAO_OBRIGATORIA`, `LEGADO_MIGRACAO_REGISTRO`) que
referenciam `atleta_id` por chave estrangeira. Excluir fisicamente a linha de
`ATLETA` quebraria a integridade referencial de todo o histórico de rodadas e
pontuação já lançado — exatamente o cenário que RNF-10/RN-04/RN-07/RN-13 (e o
próprio ADR-006) proíbem.

## Decision Drivers

- LGPD Art. 18, IV: direito à anonimização/bloqueio/eliminação de dado
  desnecessário; Art. 18, VI: eliminação de dado tratado com consentimento
  (exceto hipóteses do Art. 16 — retenção anonimizada para uso exclusivo do
  controlador é uma dessas hipóteses).
- Compatibilidade obrigatória com o ledger append-only (ADR-006) — nenhuma
  reescrita retroativa de `lancamento_pontos`, nenhuma quebra de FK.
- RNF-06: log de auditoria retido indefinidamente — mas **sem** perpetuar
  exatamente o dado pessoal que está sendo eliminado (contradição a evitar).
- RNF-04: custo mínimo — mecanismo deve caber no mesmo padrão arquitetural já
  adotado (função PL/pgSQL, mesma linha do ADR-006), sem novo serviço externo.
- RN-11/RF-05.5: soft-delete já é o padrão adotado no projeto para
  desativação (restrição obrigatória usa `ativo`/`desativado_em`) — reaproveitar
  o mesmo padrão de convenção aumenta a consistência arquitetural.

## Considered Options

- **Opção A — Exclusão física (hard delete) com reatribuição de FK** para um
  "atleta fantasma" compartilhado entre todos os pedidos de exclusão.
- **Opção B — Anonimização in-place**: mantém a linha de `ATLETA` (mesmo
  `id`), sobrescreve apenas as colunas de dado pessoal
  (`nome_completo`, `contato`, `data_nascimento`) e o nome de exibição público
  (`apelido_exibicao`) por um placeholder não identificável, marca
  `ativo = false` e `anonimizado_em = now()`. Toda tabela dependente continua
  referenciando o mesmo `atleta_id` sem nenhuma alteração de schema ou de
  linha.
- **Opção C — Tabela de PII separada com TTL/criptografia dedicada**, mantendo
  só um `atleta_id` opaco na tabela principal desde o início.
- **Opção D — Não implementar mecanismo algum**, aceitar o risco de
  compliance como está hoje.

## Decision Outcome

Chosen option: **"Opção B — Anonimização in-place"**, porque preserva 100% da
integridade referencial do ledger de pontos e das demais tabelas dependentes
(nenhuma FK muda, nenhum `lancamento_pontos` é tocado) enquanto satisfaz a
finalidade prática do Art. 18: depois da operação, `nome_completo`, `contato`
e `data_nascimento` deixam de existir em qualquer forma identificável, e o
nome de exibição público (`apelido_exibicao`, hoje exposto em `ranking_publico`
sem login, RN-01) também é substituído por um placeholder — sem isso, o
histórico público continuaria expondo o nome real do atleta mesmo após o
pedido de anonimização, o que anularia o propósito do próprio pedido. A Opção
A foi descartada porque reatribuir múltiplos atletas anonimizados a um único
"atleta fantasma" compartilhado misturaria o histórico de pessoas distintas
(quebra RN-13 — integridade do histórico), além de exigir reescrever FKs em
todas as tabelas dependentes, um custo e risco de erro desproporcional (RNF-12
aplica-se por analogia: zero perda/corrupção de dado). A Opção C foi
descartada por introduzir uma segunda estrutura de armazenamento (custo e
complexidade operacional, RNF-04) desproporcional ao volume real (dezenas de
atletas, pedidos de anonimização esperados como evento raro). A Opção D foi
descartada porque deixa a ressalva do Gate 2 sem resposta, mantendo o gap de
compliance já identificado pelo CTO.

### Mecanismo (resumo determinístico)

1. Nova coluna `ATLETA.anonimizado_em` (`timestamp`, nullable) — marca se e
   quando o atleta foi anonimizado.
2. Nova função PL/pgSQL `anonimizar_atleta(p_atleta_id uuid)`, no mesmo padrão
   arquitetural do ADR-006 (roda inteiramente dentro de uma transação
   Postgres), chamável exclusivamente via `service role` a partir de uma rota
   de API server-side protegida por sessão válida (RF-07 — mesma exigência de
   autenticação de qualquer ação de escrita da área interna):
   - Sobrescreve `nome_completo` → `'Atleta anonimizado'`.
   - Sobrescreve `apelido_exibicao` → placeholder estável e não identificável
     (ex.: `'Atleta #' || substring(id::text, 1, 8)`), preservando unicidade
     para exibição sem reintroduzir identidade.
   - Sobrescreve `contato` → `NULL`.
   - Sobrescreve `data_nascimento` → `NULL`.
   - Define `ativo = false` (reaproveita o padrão de soft-delete já adotado em
     RN-11/RF-05.5 — atleta anonimizado não pode mais ser selecionado como
     presente em rodadas futuras).
   - Define `anonimizado_em = now()`.
   - Desativa (mesmo padrão `ativo = false`, `desativado_em = now()`) toda
     linha de `RESTRICAO_OBRIGATORIA` onde o atleta anonimizado seja
     `atleta_a_id` ou `atleta_b_id` — uma restrição sobre uma identidade
     anonimizada não tem mais função operacional e sua permanência ativa só
     manteria um vínculo de dado potencialmente identificável na tela interna
     de restrições (T10).
   - **Não toca** `lancamento_pontos`, `participacao_rodada`, `time_atleta`,
     `substituicao` nem `legado_migracao_registro` — nenhuma linha dessas
     tabelas é criada, alterada ou removida; o saldo agregado do atleta
     permanece íntegro e consultável pelo mesmo `atleta_id` (agora
     desassociado de qualquer PII).
   - Grava uma entrada em `log_auditoria` (ver atualização da Seção 5 do
     SDD.md) com `tipo_evento = 'anonimizacao'`, `atleta_id` preenchido,
     `rodada_id` nulo, `valores_antes` contendo **apenas marcadores redigidos**
     (ex.: `{"nome_completo": "[REDACTED]", "contato": "[REDACTED]",
     "data_nascimento": "[REDACTED]"}`) — nunca o dado pessoal real, para não
     recriar em `log_auditoria` (retido indefinidamente, RNF-06) exatamente o
     dado que a operação existe para eliminar — e `valores_depois` contendo os
     valores já anonimizados (não sensíveis).
3. A operação é **irreversível por desenho** (não existe função inversa) —
   consistente com a natureza do pedido de anonimização. A UX/UI (agora
   desbloqueada por este ADR) deve desenhar a ação correspondente em T04 com
   confirmação explícita de dupla etapa, dado o caráter irreversível — decisão
   de copy/fluxo de confirmação é do UX/UI, não deste ADR.
4. Retenção anonimizada como base legal de permanência: o `atleta_id` e o saldo
   agregado de pontos permanecem armazenados após a anonimização, amparados no
   Art. 16 da LGPD (uso exclusivo do controlador, vedado o acesso a terceiro,
   desde que anonimizados os dados) — o ranking/histórico segue existindo
   para fins estatísticos do grupo, sem qualquer campo que permita
   reidentificar o atleta.

### Positive Consequences

- Satisfaz o pedido de anonimização do titular (Art. 18) sem violar a garantia
  de integridade referencial do ledger append-only (ADR-006) — nenhuma FK
  quebrada, nenhum `lancamento_pontos` reescrito.
- Reaproveita o mesmo padrão arquitetural já aceito (função PL/pgSQL
  transacional, ADR-006; soft-delete via `ativo`/`desativado_em`, já usado em
  RN-11) — sem introduzir novo padrão de infraestrutura, custo adicional
  mínimo (RNF-04).
- Evita a contradição de perpetuar o próprio dado pessoal dentro do log de
  auditoria retido indefinidamente (RNF-06), ao redigir `valores_antes`.
- `RESTRICAO_OBRIGATORIA` órfã (referenciando identidade já anonimizada) é
  desativada automaticamente, evitando vínculo residual identificável em T10.

### Negative Consequences

- **Dívida técnica/risco residual aceito conscientemente** (ver Seção 6 do
  SDD.md, atualizada): backups já realizados antes do pedido de anonimização
  (PITR nativo do Supabase e exportação lógica externa, ADR-009) continuam
  contendo o dado pessoal original até expirarem/rotacionarem pela política de
  retenção de backup em vigor — este ADR anonimiza o dado **operacional**
  (schema ativa), não retroage sobre backups já tirados. Mitigação: registrar
  a janela de retenção de backup vigente (dono: DevOps) como informação a
  comunicar ao titular, se perguntado; condição de revisão: se o volume de
  pedidos de anonimização crescer, avaliar política de expurgo de backups
  antigos.
- Histórico público (ranking) exibido antes da anonimização pode já ter sido
  capturado em print/export por terceiros fora do controle do sistema — risco
  operacional inerente a qualquer dado que já foi público, fora do escopo de
  controle arquitetural.
- Ação irreversível — erro do organizador ao executar não pode ser desfeito
  automaticamente; mitigação de UX (confirmação de dupla etapa) fica a cargo
  do UX/UI, não deste ADR.

## Pros and Cons of the Options

### Opção B — Anonimização in-place ✅ Chosen

- ✅ Zero impacto em integridade referencial do ledger (ADR-006)
- ✅ Reaproveita padrões já aceitos (função PL/pgSQL, soft-delete)
- ✅ Custo mínimo, sem nova infraestrutura
- ❌ Não retroage sobre backups já existentes (risco residual documentado)

### Opção A — Hard delete com atleta fantasma compartilhado

- ✅ Remove fisicamente o dado da tabela principal
- ❌ Mistura histórico de pessoas distintas no mesmo `atleta_id` fantasma —
  quebra RN-13
- ❌ Exige reescrever FK em múltiplas tabelas — risco e custo desproporcional

### Opção C — Tabela de PII separada com TTL

- ✅ Isola PII estruturalmente desde a origem
- ❌ Nova infraestrutura/complexidade operacional desproporcional ao volume
  real (RNF-04)
- ❌ Não resolve, por si só, o pedido pontual de anonimização — ainda exigiria
  um mecanismo equivalente ao da Opção B para agir sobre essa tabela

### Opção D — Não implementar

- ❌ Deixa a ressalva do Gate 2 (item 3) sem resposta
- ❌ Risco de compliance mantido sem mitigação

## Links

- Relacionado: ADR-005 (RLS/views públicas), ADR-006 (atomicidade via funções
  Postgres, mesmo padrão reaproveitado aqui).
- `BLOCKERS.md`, BLOCKER-002 (origem UX/UI).
- `CTO-REVIEW.md`, Gate 2, Risco 3 / Recomendação item 3.
- `UX-SPEC.md`, Seção 7.2, item 2 (T04).
- PRD-TECNICO.md, RF-01.6, RNF-01, RN-01, RN-13.
- Ver também: Seção 5 (Modelo de Dados) e Seção 7.7 do SDD.md (atualizadas).
- Supersedes: Nenhum
- Superseded by: Nenhum
