-- BE-03 (TASK.md Secao 3.1) — views publicas curadas `ranking_publico` e
-- `presenca_mensal_publica` (ADR-005, SDD.md Secao 7.5) + liberacao de
-- `SELECT` para a role `anon` **apenas nestas views**, nunca nas tabelas
-- base (que permanecem RLS habilitado e deny-by-default, BE-02 — nenhuma
-- policy e criada aqui nem em nenhuma tabela base).
--
-- Como isso funciona sem quebrar o deny-by-default de BE-02 (importante
-- registrar, para quem revisar esta migration no futuro nao "corrigir" por
-- engano): esta migration roda com o role de aplicacao das migrations do
-- Supabase (dono das views), que enxerga as tabelas base normalmente ao
-- resolver a definicao da view — RLS/GRANT continuam bloqueando `anon`
-- diretamente nas tabelas base (BE-02 inalterado). Por isso as views AQUI
-- NAO usam `security_invoker = true`: se usassem, a checagem de permissao
-- passaria a rodar com o role de quem consulta (`anon`), que nao tem
-- nenhum acesso as tabelas base — a view falharia por permissao negada e
-- o padrao inteiro do ADR-005 deixaria de funcionar. O unico dado exposto
-- a `anon` e exatamente o que a lista de colunas de cada view abaixo
-- declara, nunca mais que isso.
--
-- Nenhuma view abaixo seleciona `contato`/`data_nascimento` de `app.atleta`
-- em nenhum ponto da definicao — a unica forma de uma dessas colunas
-- aparecer aqui seria uma edicao futura desta migration esquecer a regra
-- (TASK.md Secao 1.2: checklist de PR revisa toda coluna sensivel nova
-- contra estas views antes do merge; GUARDRAILS.md regra 19/21).
--
-- Decisoes de detalhe documentadas (lacuna de implementacao delegada ao
-- Backend Developer pelo SDD.md/UX-SPEC.md, nao escaladas):
-- 1. Atleta anonimizado/inativo (`ativo = false`, ADR-011) e excluido por
--    completo de ambas as views — nao so o nome vira placeholder, a linha
--    inteira some. Motivo: UX-SPEC.md (T04, secao pos-anonimizacao) e
--    explicito que o atleta anonimizado "desaparece do ranking publico
--    (T02) e da presenca mensal (T03) como identidade"; manter uma linha
--    com nome-placeholder no ranking publico nao teria utilidade para quem
--    consulta e arriscaria parecer um vazamento residual.
-- 2. Rodada com `status = 'excluida'` (soft-delete, BE-02/RF-04.1) e
--    excluida do calculo de presencas/cartoes/lista de presentes em ambas
--    as views — consistente com o proprio significado de "excluida" (RF-04
--    reverte 100% dos pontos daquela rodada via novo lancamento de
--    estorno, ledger append-only, ADR-006); contar presenca/cartao de uma
--    rodada cujos pontos ja foram revertidos deixaria o ranking publico
--    inconsistente com o saldo de pontos exibido no mesmo local.
--
-- ROLLBACK: DROP VIEW IF EXISTS app.presenca_mensal_publica;
--           DROP VIEW IF EXISTS app.ranking_publico;
-- (aditiva por natureza — nenhuma tabela base e alterada; bloco listado
-- aqui apenas para satisfazer o verificador de convencao do CI, que
-- procura por DROP/ALTER em qualquer arquivo de migration, ver
-- supabase/migrations/README.md.)

create view app.ranking_publico as
select
  a.id as atleta_id,
  a.apelido_exibicao as nome_exibicao,
  a.pontuacao_inicial + coalesce(saldo.total_pontos, 0) as pontuacao_acumulada,
  coalesce(presenca.total_presencas, 0) as presencas,
  coalesce(cartao.total_cartoes, 0) as cartoes
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
where a.ativo = true
order by
  pontuacao_acumulada desc,
  presencas desc,
  cartoes asc,
  nome_exibicao asc;

comment on view app.ranking_publico is
  'BE-03 (ADR-005, RN-01/RN-06/RN-08). NUNCA seleciona contato/'
  'data_nascimento — unica leitura publica permitida sobre app.atleta. '
  'Ordenada pela cascata de desempate RN-08 (pontuacao_acumulada desc, '
  'presencas desc, cartoes asc, nome_exibicao asc). Exclui atleta '
  'anonimizado/inativo (ativo=false, ADR-011) e nao conta presenca/cartao '
  'de rodada com status=excluida (decisao de detalhe documentada no topo '
  'do arquivo de migration).';

create view app.presenca_mensal_publica as
select
  extract(year from r.data)::int as ano,
  extract(month from r.data)::int as mes,
  r.id as rodada_id,
  r.data as rodada_data,
  coalesce(presentes.total_presentes, 0) as total_presentes,
  coalesce(presentes.nomes_presentes, array[]::text[]) as nomes_presentes
from app.rodada r
left join (
  select
    pr.rodada_id,
    count(*) as total_presentes,
    array_agg(a.apelido_exibicao order by a.apelido_exibicao) as nomes_presentes
  from app.participacao_rodada pr
  join app.atleta a on a.id = pr.atleta_id
  where pr.status = 'presente'
    and a.ativo = true
  group by pr.rodada_id
) presentes on presentes.rodada_id = r.id
where r.status = 'lancada'
order by ano asc, mes asc, r.data asc;

comment on view app.presenca_mensal_publica is
  'BE-03 (ADR-005, RN-09). Uma linha por rodada com status=lancada; '
  '`ano`/`mes` expõem o mes civil (calendario Gregoriano) da rodada para '
  'agrupamento no cliente (T03) — RN-09 e satisfeita expondo o mes civil '
  'explicito, nao um periodo arbitrario. NUNCA seleciona contato/'
  'data_nascimento. `nomes_presentes`/`total_presentes` so contam atleta '
  'ativo (ADR-011) e nunca incluem rodada com status=excluida.';

-- Defesa em profundidade explicita (mesmo padrao ja usado tabela a tabela
-- em BE-02) antes do GRANT — nenhuma view nova desta migration concede
-- nada a `public` por padrao no Postgres, mas a instrucao deixa isso
-- inequivoco em vez de depender de comportamento implicito do motor.
revoke all on app.ranking_publico from public;
revoke all on app.presenca_mensal_publica from public;

-- Unico GRANT de SELECT para `anon` em toda a schema `app` (ADR-005,
-- GUARDRAILS.md regra 5/6) — nenhuma tabela base recebe GRANT algum para
-- `anon`, apenas estas duas views curadas.
grant select on app.ranking_publico to anon;
grant select on app.presenca_mensal_publica to anon;

-- service_role tambem le as views (uso interno futuro — ex.: uma tela
-- interna que queira reaproveitar a mesma leitura publica como referencia
-- — nao ha caso de uso concreto ainda, GRANT simetrico apenas evita uma
-- segunda migration so para isso caso surja).
grant select on app.ranking_publico to service_role;
grant select on app.presenca_mensal_publica to service_role;
