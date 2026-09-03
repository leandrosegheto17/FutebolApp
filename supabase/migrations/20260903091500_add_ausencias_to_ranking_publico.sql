-- Adendo a BE-03 (TASK.md Secao 3.1), resolucao de BLOCKER-005 —
-- adiciona a coluna computada `ausencias` na view `app.ranking_publico`
-- (RF-03.1), conforme especificacao exata de SDD.md Secao 5.1 ("Adendo
-- 2026-09-03 — Campo `ausencias` em `app.ranking_publico`").
--
-- Migration ADITIVA — nao edita a migration ja aplicada e aprovada
-- `20260902101300_create_public_views.sql` (preserva o historico de
-- migration ja executado, GUARDRAILS.md regra de imutabilidade aplicada
-- a esta camada, supabase/migrations/README.md). Usa
-- `CREATE OR REPLACE VIEW` reproduzindo integralmente a definicao atual
-- da view (mesmas colunas `atleta_id`, `nome_exibicao`,
-- `pontuacao_acumulada`, `presencas`, `cartoes`, na mesma ordem e mesmos
-- tipos) e acrescenta `ausencias` como nova coluna ao final do SELECT —
-- o Postgres preserva os GRANTs ja concedidos a `anon`/`service_role`
-- (BE-03) neste caso, porque nomes/ordem/tipos das colunas existentes nao
-- mudam; por isso nenhum GRANT e reemitido nesta migration.
--
-- Decisao (SDD.md Secao 5.1, nao reaberta aqui): `ausencias` e contagem
-- direta e simetrica de `participacao_rodada.status = 'ausente'` em
-- rodada com `status = 'lancada'` — mesmo padrao de subquery ja usado por
-- `presenca`/`cartao` nesta view, SEM subtracao (`total_rodadas -
-- presencas` foi explicitamente rejeitado no SDD.md, ver Secao 5.1).
-- `lesionado` permanece uma terceira categoria, mutuamente exclusiva de
-- `presente`/`ausente` em `participacao_rodada.status`, e NAO e contado
-- nem em `presencas` nem em `ausencias` nesta view (RF-02.3/RN-05 amarram
-- `lesionado` apenas ao calculo de PONTOS, nao a esta metrica de
-- exibicao) — consistente com o tratamento ja aprovado pelo QA de
-- `presencas`, que ja exclui `lesionado`.
--
-- Nenhuma coluna sensivel (`contato`/`data_nascimento` de `app.atleta`) e
-- selecionada por esta subquery nem por nenhuma outra parte da view —
-- mesma garantia do ADR-005 ja documentada na migration original,
-- reforcada aqui (GUARDRAILS.md regras 19/21).
--
-- ROLLBACK: restaura a definicao anterior da view (sem `ausencias`),
-- reexecutando o mesmo `CREATE OR REPLACE VIEW` de
-- `20260902101300_create_public_views.sql`:
--   create or replace view app.ranking_publico as
--   select
--     a.id as atleta_id,
--     a.apelido_exibicao as nome_exibicao,
--     a.pontuacao_inicial + coalesce(saldo.total_pontos, 0) as pontuacao_acumulada,
--     coalesce(presenca.total_presencas, 0) as presencas,
--     coalesce(cartao.total_cartoes, 0) as cartoes
--   from app.atleta a
--   left join (
--     select lp.atleta_id, sum(lp.pontos_delta) as total_pontos
--     from app.lancamento_pontos lp
--     group by lp.atleta_id
--   ) saldo on saldo.atleta_id = a.id
--   left join (
--     select pr.atleta_id, count(*) as total_presencas
--     from app.participacao_rodada pr
--     join app.rodada r on r.id = pr.rodada_id
--     where pr.status = 'presente'
--       and r.status = 'lancada'
--     group by pr.atleta_id
--   ) presenca on presenca.atleta_id = a.id
--   left join (
--     select pr.atleta_id, sum(ej.quantidade) as total_cartoes
--     from app.evento_jogo ej
--     join app.participacao_rodada pr on pr.id = ej.participacao_id
--     join app.rodada r on r.id = pr.rodada_id
--     where ej.tipo in ('cartao_amarelo', 'cartao_vermelho')
--       and r.status = 'lancada'
--     group by pr.atleta_id
--   ) cartao on cartao.atleta_id = a.id
--   where a.ativo = true
--   order by
--     pontuacao_acumulada desc,
--     presencas desc,
--     cartoes asc,
--     nome_exibicao asc;
-- (bloco incluido mesmo esta migration nao contendo DROP/ALTER — nenhum
-- comando aqui aciona o verificador mecanico de convencao do CI, ver
-- supabase/migrations/README.md — mas o padrao de documentar rollback
-- explicito e mantido para clareza de quem revisar no futuro, mesmo
-- criterio ja usado em `20260902101300_create_public_views.sql`.)

create or replace view app.ranking_publico as
select
  a.id as atleta_id,
  a.apelido_exibicao as nome_exibicao,
  a.pontuacao_inicial + coalesce(saldo.total_pontos, 0) as pontuacao_acumulada,
  coalesce(presenca.total_presencas, 0) as presencas,
  coalesce(cartao.total_cartoes, 0) as cartoes,
  coalesce(ausencia.total_ausencias, 0) as ausencias
from app.atleta a
left join (
  select lp.atleta_id, sum(lp.pontos_delta) as total_pontos
  from app.lancamento_pontos lp
  group by lp.atleta_id
) saldo on saldo.atleta_id = a.id
left join (
  select pr.atleta_id, count(*) as total_presencas
  from app.participacao_rodada pr
  join app.rodada r on r.id = pr.rodada_id
  where pr.status = 'presente'
    and r.status = 'lancada'
  group by pr.atleta_id
) presenca on presenca.atleta_id = a.id
left join (
  select pr.atleta_id, sum(ej.quantidade) as total_cartoes
  from app.evento_jogo ej
  join app.participacao_rodada pr on pr.id = ej.participacao_id
  join app.rodada r on r.id = pr.rodada_id
  where ej.tipo in ('cartao_amarelo', 'cartao_vermelho')
    and r.status = 'lancada'
  group by pr.atleta_id
) cartao on cartao.atleta_id = a.id
left join (
  select pr.atleta_id, count(*) as total_ausencias
  from app.participacao_rodada pr
  join app.rodada r on r.id = pr.rodada_id
  where pr.status = 'ausente'
    and r.status = 'lancada'
  group by pr.atleta_id
) ausencia on ausencia.atleta_id = a.id
where a.ativo = true
order by
  pontuacao_acumulada desc,
  presencas desc,
  cartoes asc,
  nome_exibicao asc;

comment on view app.ranking_publico is
  'BE-03 (ADR-005, RN-01/RN-06/RN-08), incrementada por BLOCKER-005 '
  '(SDD.md Secao 5.1) com a coluna `ausencias`. NUNCA seleciona contato/'
  'data_nascimento — unica leitura publica permitida sobre app.atleta. '
  'Ordenada pela cascata de desempate RN-08 (pontuacao_acumulada desc, '
  'presencas desc, cartoes asc, nome_exibicao asc). Exclui atleta '
  'anonimizado/inativo (ativo=false, ADR-011) e nao conta presenca/'
  'ausencia/cartao de rodada com status=excluida. `ausencias` e contagem '
  'direta de status=ausente (nao subtracao), simetrica a `presencas`; '
  '`lesionado` nao conta em nenhuma das duas (RF-02.3/RN-05 amarram '
  'lesionado apenas ao calculo de pontos, nao a esta metrica de exibicao '
  '— decisao de detalhe documentada no topo do arquivo de migration).';
