-- BE-R01 (TASK.md Parte II, Secao 3.1) — nova view publica curada
-- `app.ranking_publico_recentes`, extensao do padrao ja aprovado em BE-03
-- (ADR-005, mesma classe de decisao ja registrada em TASK.md Secao 6.2-R
-- item 1: "extensao de view publica ja existente ou nova view curada,
-- usando o mecanismo de RLS+views ja aprovado — nenhum novo ADR
-- necessario"). Objetivo: consumo de FE-R02 (T02 redesenhado) — matriz
-- atleta x ultimas N=7 rodadas + estatisticas agregadas de temporada,
-- SEM o campo "proxima rodada" (escalado e explicitamente excluido do
-- escopo, TASK.md Secao 6.1-R item 1 — nao implementado aqui).
--
-- Por que uma VIEW NOVA em vez de estender `app.ranking_publico` (como o
-- adendo de `ausencias`/BLOCKER-005 fez): a forma do dado e
-- estruturalmente diferente — `ranking_publico` e uma linha "plana" por
-- atleta (colunas escalares); a matriz de "ultimas N rodadas" precisa de
-- uma coluna do tipo array/JSON por atleta (`rodadas_recentes`), o que
-- mudaria o formato de TODAS as colunas existentes de `ranking_publico`
-- se fosse embutido na mesma view (quebraria o contrato ja publicado e
-- consumido por FE-02/T02 original). Uma view curada nova e aditiva,
-- preserva `ranking_publico` inalterada, e seleciona as MESMAS tabelas
-- base (nenhuma tabela nova).
--
-- Mecanismo, exatamente como especificado (TASK.md Secao 3.1 desta
-- Parte II, coluna "descricao"): `ROW_NUMBER() OVER (PARTITION BY
-- atleta_id ORDER BY data_rodada DESC)` limitado a N=7 (valor fixado
-- pelo Tech Lead, TASK.md Secao 6.2-R item 2), agregado em `jsonb_agg`
-- por atleta. Cada atleta tem sua PROPRIA janela das ultimas 7 rodadas
-- em que participou (nao um conjunto fixo de datas compartilhado entre
-- todos os atletas) — consequencia direta e literal do particionamento
-- por atleta prescrito no mecanismo acima; atletas mais novos no grupo
-- naturalmente tem menos de 7 elementos no array.
--
-- Nenhuma coluna sensivel (`contato`/`data_nascimento` de `app.atleta`)
-- e selecionada em nenhum ponto desta view — mesma garantia do ADR-005 ja
-- aplicada em `app.ranking_publico`/`app.presenca_mensal_publica`
-- (`20260902101300_create_public_views.sql`). Mesmo tratamento ja
-- aprovado de atleta anonimizado/inativo (excluido por completo,
-- ADR-011) e de rodada com `status = 'excluida'` (nunca contada).
--
-- Decisoes de detalhe tomadas aqui pelo Backend Developer (desvio
-- pequeno, documentado, nao escalado — TASK.md Secao 6.2-R item 1 delega
-- o mecanismo, nao cada detalhe de calculo):
-- 1. `rodadas_jogadas` e a contagem TOTAL do GRUPO (todas as rodadas com
--    `status = 'lancada'` do sistema inteiro), NAO uma contagem por
--    atleta — leitura literal da propria redacao da tarefa ("rodadas_
--    jogadas (contagem total do grupo)", TASK.md Parte II Secao 3.1),
--    reforcada por UX-SPEC.md Secao 2.2 ("3 estatisticas agregadas DO
--    GRUPO, nao do atleta individual") sobre o painel "Resumo da
--    temporada" que exibe "Rodadas jogadas: 21"/"Media de presenca: 78%"
--    como estatisticas UNICAS do grupo. Por isso esta coluna repete o
--    MESMO valor em toda linha da view.
-- 2. `media_presenca` e, pela MESMA razao do item 1 (UX-SPEC.md Secao
--    2.2 — "nao do atleta individual"), tambem uma estatistica do GRUPO,
--    NAO uma razao por atleta: soma de `status = 'presente'` (mesma
--    definicao ja usada por `ranking_publico.presencas` — NAO conta
--    `lesionado`, RF-02.3/RN-05 amarram lesao apenas a pontos, nao a
--    esta metrica de exibicao, decisao ja aprovada em BLOCKER-005 e
--    reaproveitada aqui por analogia, nao reaberta) de TODOS os atletas
--    ativos, dividida por (numero de atletas ativos x rodadas_jogadas do
--    grupo), em percentual, arredondado a 1 casa decimal. Repete o MESMO
--    valor em toda linha, igual a `rodadas_jogadas`. Quando
--    `rodadas_jogadas = 0` ou nao ha atleta ativo, o valor e 0 (evita
--    divisao por zero).
-- 3. `rodadas_recentes` inclui `rodada_id`/`data`/`status` por elemento —
--    o minimo necessario para FE-R02 renderizar a matriz (data da coluna
--    + status do dot) sem exigir uma segunda consulta. Esta coluna
--    PERMANECE por atleta (a unica das quatro que varia entre linhas) —
--    é a matriz em si, distinta das duas estatisticas de grupo acima.
--
-- ROLLBACK: DROP VIEW IF EXISTS app.ranking_publico_recentes;
-- (aditiva por natureza — nenhuma tabela/coluna/view existente e
-- alterada; bloco listado para satisfazer o verificador de convencao do
-- CI, ver supabase/migrations/README.md.)

create view app.ranking_publico_recentes as
with participacoes_numeradas as (
  select
    pr.atleta_id,
    r.id as rodada_id,
    r.data as rodada_data,
    pr.status,
    row_number() over (
      partition by pr.atleta_id
      order by r.data desc, r.id desc
    ) as posicao
  from app.participacao_rodada pr
  join app.rodada r on r.id = pr.rodada_id
  where r.status = 'lancada'
),
recentes_por_atleta as (
  select
    atleta_id,
    jsonb_agg(
      jsonb_build_object(
        'rodada_id', rodada_id,
        'data', rodada_data,
        'status', status
      )
      order by rodada_data desc, rodada_id desc
    ) as rodadas_recentes
  from participacoes_numeradas
  where posicao <= 7
  group by atleta_id
),
grupo_stats as (
  select
    (select count(*)::int from app.rodada where status = 'lancada')
      as rodadas_jogadas,
    (select count(*)::int from app.atleta where ativo = true)
      as total_atletas_ativos,
    (
      select count(*)::int
      from app.participacao_rodada pr
      join app.rodada r on r.id = pr.rodada_id
      join app.atleta at2 on at2.id = pr.atleta_id
      where pr.status = 'presente'
        and r.status = 'lancada'
        and at2.ativo = true
    ) as total_presencas_grupo
)
select
  a.id as atleta_id,
  a.apelido_exibicao as nome_exibicao,
  coalesce(recentes_por_atleta.rodadas_recentes, '[]'::jsonb) as rodadas_recentes,
  grupo_stats.rodadas_jogadas,
  case
    when grupo_stats.rodadas_jogadas = 0 or grupo_stats.total_atletas_ativos = 0
      then 0
    else round(
      (grupo_stats.total_presencas_grupo::numeric
        / (grupo_stats.total_atletas_ativos * grupo_stats.rodadas_jogadas)) * 100,
      1
    )
  end as media_presenca
from app.atleta a
cross join grupo_stats
left join recentes_por_atleta on recentes_por_atleta.atleta_id = a.id
where a.ativo = true
order by a.apelido_exibicao asc;

comment on view app.ranking_publico_recentes is
  'BE-R01 (TASK.md Parte II Secao 3.1, ADR-005). Matriz atleta x ultimas '
  'N=7 rodadas lancadas (janela por atleta via ROW_NUMBER particionado '
  'por atleta_id, unica coluna que varia por atleta) + duas estatisticas '
  'de GRUPO repetidas em toda linha (UX-SPEC.md Secao 2.2: "nao do '
  'atleta individual"): `rodadas_jogadas` (total de rodadas com '
  'status=lancada no sistema) e `media_presenca` (percentual: soma de '
  'presencas de todos os atletas ativos / (atletas ativos x '
  'rodadas_jogadas), 1 casa decimal). NUNCA seleciona contato/'
  'data_nascimento. Exclui atleta anonimizado/inativo (ativo=false, '
  'ADR-011) e rodada com status=excluida. Nao inclui "proxima rodada" '
  '(excluido do escopo, TASK.md Secao 6.1-R item 1).';

-- Defesa em profundidade explicita (mesmo padrao de
-- `20260902101300_create_public_views.sql`) antes do GRANT.
revoke all on app.ranking_publico_recentes from public;

-- Unico GRANT de SELECT necessario para a role `anon` (ADR-005,
-- GUARDRAILS.md regra 5/6) — nenhuma tabela base recebe GRANT novo.
grant select on app.ranking_publico_recentes to anon;

-- service_role tambem le a view (mesmo racional simetrico ja aplicado a
-- `ranking_publico`/`presenca_mensal_publica`).
grant select on app.ranking_publico_recentes to service_role;
