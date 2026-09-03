# ADR-009: Combinar PITR Nativo do Supabase com Exportação Lógica Agendada para Backup/Recuperação

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, backup, availability

## Context and Problem Statement

RNF-05 exige mecanismo de backup periódico dos dados de cadastro e rodadas, com
possibilidade de restauração — requisito derivado diretamente do problema
original do PRD.md ("perda de histórico"). RNF-06 exige retenção indefinida do
log de auditoria nesta release. RNF-04, ao mesmo tempo, exige custo próximo de
zero. O Supabase oferece backup/point-in-time recovery (PITR) nativo, mas a
granularidade e a janela de retenção variam por tier comercial — depender
exclusivamente do backup nativo de um tier gratuito/baixo custo é um risco
declarado (ver Seção 6 do SDD.md).

## Decision Drivers

- RNF-05: backup periódico com restauração possível.
- RNF-06: retenção indefinida do log de auditoria.
- RNF-04: custo mínimo — não introduzir serviço de backup pago dedicado.
- Independência de fornecedor único para a garantia de durabilidade: se o
  projeto Supabase tiver um incidente (ex.: pausa por inatividade em tier
  gratuito, remoção acidental), o backup não deveria depender só da mesma
  plataforma.

## Considered Options

- **Confiar apenas no backup/PITR nativo do Supabase**, sem exportação externa.
- **Combinar PITR nativo do Supabase com exportação lógica agendada** (`pg_dump`
  ou export via SQL das tabelas principais) para um destino externo à
  plataforma (ex.: repositório privado de storage de objeto), executada por um
  job agendado (ex.: GitHub Actions cron, gratuito para o volume esperado).
- **Backup gerenciado por serviço terceiro pago dedicado** (ex.: ferramenta de
  backup-as-a-service para Postgres).

## Decision Outcome

Chosen option: **"Combinar PITR nativo do Supabase com exportação lógica
agendada externa"**, porque cobre o requisito de restauração (RNF-05) com dois
níveis de redundância sem custo adicional relevante: o PITR nativo cobre
recuperação rápida de incidentes operacionais recentes (ex.: engano em uma
correção — complementar ao próprio estorno automático do RF-04), enquanto a
exportação lógica agendada para um destino externo à plataforma cobre o cenário
mais severo de indisponibilidade/perda do próprio projeto Supabase (ex.: pausa
por inatividade de tier gratuito, remoção acidental de projeto), que o PITR
nativo, por definição, não cobriria (já que vive dentro da mesma plataforma).
Confiar somente no backup nativo foi descartado por deixar a única cópia de
segurança sob controle total de um único fornecedor. Um serviço terceiro pago
dedicado foi descartado por introduzir custo recorrente sem necessidade,
quando um job agendado gratuito (GitHub Actions) já resolve o cenário de
redundância externa com volume de dados baixo.

### Positive Consequences

- Duas camadas de recuperação independentes: PITR nativo (rápido, granular) e
  exportação externa (redundância contra falha da própria plataforma).
- Sem custo adicional relevante — GitHub Actions cron é gratuito no volume
  esperado.
- Exportação lógica versionável/auditável (cada execução gera um arquivo
  datado), reforçando também RNF-06 (retenção do log de auditoria).

### Negative Consequences

- Exportação lógica agendada introduz mais um script a manter e monitorar (se o
  job falhar silenciosamente, a redundância externa para de existir sem
  ninguém perceber) — mitigação: o job deve falhar de forma visível/alertável,
  registrado como item de acompanhamento para o DevOps mais adiante.
- Restaurar a partir da exportação lógica externa é mais lento/manual que o
  PITR nativo — aceitável porque é o plano de contingência secundário, não o
  primário.

## Pros and Cons of the Options

### PITR nativo + exportação lógica agendada externa ✅ Chosen

- ✅ Duas camadas de redundância independentes
- ✅ Sem custo adicional relevante
- ❌ Mais um script a manter/monitorar

### Somente PITR nativo do Supabase

- ✅ Zero esforço adicional de implementação
- ❌ Única cópia de segurança sob controle do mesmo fornecedor — não cobre
  incidente na própria plataforma

### Serviço terceiro pago dedicado

- ✅ Solução gerenciada, provavelmente mais robusta
- ❌ Custo recorrente não justificado pelo volume real (contradiz RNF-04)

## Links

- Relacionado: ADR-002 (Supabase como plataforma)
- PRD-TECNICO.md, RNF-04, RNF-05, RNF-06
- Supersedes: Nenhum
- Superseded by: Nenhum
