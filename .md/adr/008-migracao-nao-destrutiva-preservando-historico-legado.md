# ADR-008: Migrar via Schema Nova Dentro do Mesmo Projeto Supabase, Preservando a Schema Legada Intocada até Validação

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, migration, database

> **Marcado para `risk-and-compliance-check` no Gate 2 do CTO** — decisão
> diretamente derivada da restrição confirmada pelo stakeholder (RF-08, RNF-11,
> RNF-12, RN-13) e da Interpretação #12/#13 do BA (`PRD-TECNICO.md`, Seção 7).

## Context and Problem Statement

O banco legado Supabase contém cadastro de jogadores, histórico de rodadas/
eventos, ranking calculado, configuração de pontuação e times, com schema exato
ainda não detalhado (spike formal — ver Seção 6 do SDD.md) e credenciais só
disponíveis na fase de execução. RNF-12 proíbe qualquer perda de dado durante a
migração; RNF-11 exige que a migração seja auditável e **reversível** até a
validação final do organizador (RF-08.5); RF-08.6 proíbe descontinuar o banco
legado antes dessa validação explícita; RN-13 exige que a pontuação histórica já
lançada seja preservada exatamente como está, sem recálculo sob a nova tabela de
pontuação (RN-05), que passa a valer só a partir da primeira rodada pós-migração.

## Decision Drivers

- RNF-12: zero perda de dados, restrição não negociável.
- RNF-11: migração auditável e reversível (rollback possível) até validação.
- RF-08.5/RF-08.6: relatório de conferência explícito antes de qualquer
  descontinuação do legado.
- RN-13: histórico preservado exatamente como está, sem recálculo retroativo.
- ADR-002: mesmo projeto Supabase físico é reaproveitado (não há troca de
  plataforma).

## Considered Options

- **Migração em-lugar (in-place)**: alterar diretamente as tabelas legadas
  (ALTER TABLE) até chegarem ao novo schema, sem cópia intermediária.
- **Nova schema (`app`) dentro do mesmo projeto Supabase**, com scripts de
  migração/transformação que **leem** da schema legada e **escrevem** na
  schema nova, mantendo a schema legada 100% intocada (somente leitura) até
  RF-08.5 ser validado; após validação explícita, a schema legada é arquivada/
  removida (RF-08.6).
- **Novo projeto Supabase separado**, com replicação/cópia de dados do projeto
  legado para o novo projeto.

## Decision Outcome

Chosen option: **"Nova schema dentro do mesmo projeto Supabase, schema legada
intocada até validação"**, porque é a única opção que oferece um caminho de
rollback real e barato: se o relatório de conferência (RF-08.5) revelar
divergência, a schema legada ainda existe, intacta, como fonte de verdade para
reconciliar — nenhuma etapa da migração é destrutiva antes da validação
explícita do organizador (RF-08.6). Migração in-place foi descartada porque
`ALTER TABLE` destrutivo sobre a única cópia dos dados não oferece caminho de
rollback caso um passo da transformação esteja errado — viola diretamente
RNF-11 ("reversível até a validação final"). Novo projeto Supabase separado foi
descartado porque contradiz a restrição do stakeholder de reaproveitar **o**
banco legado (ADR-002) e adicionaria complexidade de replicação entre dois
projetos sem necessidade, além de custo adicional (segundo projeto).

### Positive Consequences

- Rollback trivial durante a janela de validação: a schema legada nunca é
  alterada, então "desfazer" a migração é simplesmente não promover a schema
  nova a produção.
- Relatório de conferência (RF-08.5) pode comparar contagens/valores entre
  schema legada e schema nova diretamente via SQL, dentro do mesmo banco
  (sem cruzar rede entre dois projetos).
- RN-13 é natural de implementar: os registros de pontuação histórica são
  copiados para a schema nova com uma marca `origem_migracao = true` e seus
  valores de pontos preservados como estavam, sem reaplicar RN-05 sobre eles.

### Negative Consequences

- Mantém, temporariamente, dado duplicado (schema legada + schema nova) dentro
  do mesmo projeto até a validação — custo de armazenamento extra transitório,
  aceitável dado o volume esperado (grupo amador, não big data).
- Exige que o script de migração seja idempotente/reexecutável com segurança
  (caso precise rodar de novo após corrigir uma divergência apontada no
  relatório), o que exige desenho cuidadoso (chaves de mapeamento
  origem→destino, tabela `legado_migracao_registro` — ver Seção 5 do SDD.md).

## Pros and Cons of the Options

### Nova schema no mesmo projeto, legado intocado ✅ Chosen

- ✅ Rollback real durante a janela de validação (RNF-11)
- ✅ Relatório de conferência comparável dentro do mesmo banco
- ✅ Preserva RN-13 de forma direta (flag de origem, sem recálculo)
- ❌ Dado duplicado temporariamente (custo de armazenamento transitório)

### Migração in-place (ALTER TABLE direto)

- ✅ Sem duplicação de dado, mais "econômico" em armazenamento
- ❌ Sem caminho de rollback real — viola RNF-11
- ❌ Um erro de transformação pode corromper a única cópia dos dados,
  incompatível com RNF-12

### Novo projeto Supabase separado

- ✅ Isolamento total entre legado e novo sistema durante a transição
- ❌ Contradiz a restrição do stakeholder de reaproveitar o banco legado
  específico (ADR-002)
- ❌ Custo adicional de um segundo projeto + complexidade de replicação entre
  projetos

## Links

- Relacionado: ADR-002 (Supabase como plataforma)
- PRD-TECNICO.md, RF-08, RNF-11, RNF-12, RN-13, Seção 5.2, Seção 6 item 8,
  Seção 7 Interpretações #12 e #13
- Ver também: Seção 5 do SDD.md (tabela `legado_migracao_registro`) e Seção 6
  (spike técnico de descoberta do schema legado)
- Supersedes: Nenhum
- Superseded by: Nenhum
