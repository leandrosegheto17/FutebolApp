# ADR-005: Aplicar a Fronteira de Exposição Pública via Row Level Security e Views Curadas no Postgres

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, security, lgpd, database

> **Marcado para `risk-and-compliance-check` no Gate 2 do CTO** — implementa
> diretamente o risco estratégico #1 do Gate 1 (LGPD/dados pessoais expostos
> publicamente).

## Context and Problem Statement

RF-03.1/RN-01 exigem que a área pública (sem login) **nunca** exiba contato ou
data de nascimento do atleta, expondo apenas nome de exibição, pontuação,
presenças e ausências. O ADR-002 adotou Supabase, cuja plataforma expõe
automaticamente uma API REST/GraphQL (PostgREST) sobre **toda tabela** do banco
por padrão, salvo restrição explícita. Isso significa que o risco de vazamento de
dado sensível não é só "esquecer de renderizar na tela" — é "esquecer de
bloquear o acesso direto à tabela via API autogerada da plataforma", que
existiria mesmo sem qualquer código de frontend consultá-la.

## Decision Drivers

- RN-01/RF-03.1: contato e data de nascimento nunca trafegam nem são renderizados
  na área pública.
- RNF-01 (LGPD): minimização de dados, base legal de legítimo interesse restrita
  à finalidade de organização das peladas.
- Superfície de exposição herdada da plataforma (PostgREST expõe tabela por
  padrão) — ver ADR-002, consequência negativa.

## Decision Drivers (continuação)

- Necessidade de que a checagem de exposição pública não dependa de disciplina de
  código de frontend (o frontend pode ter bug; a política de dado no banco não
  deveria).

## Considered Options

- **RLS habilitado em todas as tabelas base com dado sensível + views públicas
  curadas** (`ranking_publico`, `presenca_mensal_publica`) expondo somente as
  colunas permitidas (RN-01), acessadas pela role `anon`; toda escrita bloqueada
  para `anon` (só a API server-side, com service role, escreve).
- **Filtrar dado sensível somente na camada de aplicação** (API/frontend nunca
  seleciona as colunas sensíveis), mantendo RLS desabilitado ou permissivo.
- **Desabilitar completamente a API autogerada do Supabase** e servir todo dado
  (público e interno) exclusivamente pela camada de API própria (Next.js Route
  Handlers).

## Decision Outcome

Chosen option: **"RLS + views públicas curadas"**, porque é a única opção em que
a proteção do dado sensível é garantida **no próprio banco**, independente de
qualquer camada de aplicação esquecer um filtro — alinhado ao princípio de
minimização de dados da LGPD (RNF-01) de forma estrutural, não incidental.
Filtrar só na aplicação foi descartada porque deixaria a API autogerada da
plataforma (PostgREST) acessível diretamente com as colunas sensíveis, um vazamento
que independe de qualquer bug de frontend. Desabilitar a API autogerada por
completo foi descartada por eliminar um benefício real da plataforma (ADR-002)
sem necessidade — o problema não é a API autogerada existir, é ela expor dado
que não deveria; RLS resolve isso sem abrir mão da conveniência da plataforma
para o restante do sistema.

### Positive Consequences

- Proteção de dado sensível garantida no nível de banco, sobrevive a qualquer bug
  de frontend ou nova tela futura que esqueça de filtrar campo.
- Views públicas (`ranking_publico`, `presenca_mensal_publica`) tornam explícito,
  em um único lugar versionado (migration SQL), exatamente o que é público — bom
  para auditoria/DevSecOps mais adiante.
- Toda operação de escrita exige passar pela camada de API server-side (role
  `anon` sem permissão de INSERT/UPDATE/DELETE), reforçando RF-07 (senha exigida
  para escrita) numa segunda camada independente da lógica de aplicação.

### Negative Consequences

- Exige disciplina de sempre atualizar a política de RLS/view ao adicionar novo
  campo sensível no futuro — se um campo sensível for adicionado à tabela base
  sem revisar a view pública, o vazamento não acontece (RLS/view continuam
  restritos), mas a funcionalidade nova pode "falhar silenciosamente" ao não
  aparecer onde deveria — trade-off aceitável (falha seguro, não falha aberto).
- Lógica de autorização fica distribuída entre RLS (banco) e a camada de API
  (validação de senha) — exige que ambas sejam revisadas juntas em mudanças
  futuras de modelo de dados.

## Pros and Cons of the Options

### RLS + views públicas curadas ✅ Chosen

- ✅ Proteção no nível de banco, independente de bug de aplicação
- ✅ Ponto único e versionado (migration) de "o que é público"
- ❌ Exige disciplina de revisão de RLS a cada novo campo sensível

### Filtro só na aplicação

- ✅ Mais simples de implementar inicialmente
- ❌ API autogerada da plataforma (PostgREST) continuaria expondo colunas
  sensíveis diretamente, contornando qualquer filtro de frontend — falha grave
  de LGPD

### Desabilitar API autogerada por completo

- ✅ Elimina o vetor de exposição da API autogerada
- ❌ Abre mão de um benefício real da plataforma (leitura pública direta e
  rápida via `anon` key para o ranking, sem round-trip pela camada de API
  própria) sem necessidade, aumentando código próprio a manter

## Links

- Relacionado: ADR-002 (Supabase), ADR-004 (Autenticação Custom)
- PRD-TECNICO.md, RF-03.1, RN-01, RNF-01
- `CTO-REVIEW.md`, Gate 1, risco estratégico #1
- Supersedes: Nenhum
- Superseded by: Nenhum
