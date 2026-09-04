-- BE-06 (TASK.md Secao 3.1) — view interna `atleta_nivel_tecnico`, suporte a
-- RN-03 ("nivel tecnico" do atleta): media de pontos obtidos em eventos de
-- jogo (gol/cartao — excluindo pontos de presenca/ausencia) por numero de
-- rodadas em que o atleta esteve presente; fallback = `pontuacao_inicial`
-- para atleta sem nenhuma presenca registrada (RN-03/RN-10).
--
-- Diferente das views publicas de BE-03 (`ranking_publico`/
-- `presenca_mensal_publica`), esta view e **interna** — nunca concede
-- `SELECT` para `anon` (GRANT abaixo so para `service_role`), porque so e
-- consumida pelo Servico de Atletas (BE-06, `app/api/atletas/*`), atras do
-- middleware de sessao (`middleware.ts`, BE-04/GUARDRAILS.md regra 17). Nao
-- expoe nenhuma coluna sensivel (`contato`/`data_nascimento`) de proposito
-- mesmo assim — retorna so `atleta_id`/`rodadas_presentes`/`nivel_tecnico`.
--
-- Decisoes de detalhe documentadas aqui (modelagem fisica delegada ao Backend
-- Developer, SDD.md Secao 5, "nao e modelagem fisica detalhada... cabe ao
-- Backend Developer"), nenhuma escalada:
--
-- 1. Fonte dos "pontos obtidos em eventos de jogo": `app.evento_jogo`
--    (tipo + quantidade), NUNCA `app.lancamento_pontos`. `lancamento_pontos`
--    e o ledger append-only do SALDO TOTAL (presenca + eventos agregados
--    num unico `pontos_delta` por lancamento, ADR-006) — nao tem uma coluna
--    que distinga "pontos de presenca" de "pontos de evento de jogo" dentro
--    de um mesmo lancamento, entao nao da para isolar a partir dele a media
--    exigida por RN-03 ("excluindo pontos de presenca/ausencia"). `evento_jogo`
--    ja e granular por tipo (gol|cartao_amarelo|cartao_vermelho, BE-02),
--    entao e a fonte correta — mesmo padrao ja usado por BE-03 para a coluna
--    `cartoes` de `ranking_publico` (conta `evento_jogo` diretamente, nao
--    deriva de `lancamento_pontos`).
-- 2. O valor em pontos de cada `tipo` de evento e lido do valor VIGENTE na
--    data da rodada em `app.configuracao_pontuacao` (subquery correlacionada
--    por `evento`/`vigente_desde <= rodada.data`, pegando a vigencia mais
--    recente) — nunca hardcoded em SQL/TypeScript (TASK.md Secao 1.2: "codigo
--    de calculo deve sempre ler o valor vigente na data do evento"). Se nao
--    houver nenhuma configuracao vigente para um `tipo` na data da rodada
--    (`app.configuracao_pontuacao` ainda nao tem seed em nenhuma migration
--    ate esta tarefa — fora do escopo de BE-06), a subquery retorna NULL e
--    aquele evento simplesmente nao contribui para a soma (`sum` ignora NULL
--    em vez de propagar) — comportamento aceitavel enquanto a configuracao
--    nao existir; quem seed'ar `configuracao_pontuacao` (BE-08 ou operacao
--    manual) passa a ver o evento contar corretamente, sem precisar mudar
--    esta view.
-- 3. "Rodadas em que esteve presente" (denominador) conta `status IN
--    ('presente', 'lesionado')` — RF-02.3 trata lesionado como presente para
--    efeito de pontuacao, e eventos de jogo podem ocorrer nesse status
--    (RF-02.4/RF-02.5: "atleta presente OU lesionado"), entao excluir
--    `lesionado` do denominador subestimaria o nivel tecnico de quem se
--    machucou em campo. Mesma leitura de `status` ja usada por BE-03 (que
--    nao filtra `evento_jogo`/`cartoes` por status alem de `rodada.status =
--    'lancada'`, ja que so participacao presente/lesionada pode ter evento).
-- 4. Rodada com `status = 'excluida'` (soft-delete, BE-02/RF-04.1) nunca
--    conta nem no numerador nem no denominador — mesma decisao/motivo ja
--    documentado na migration de BE-03 (`20260902101300_create_public_views.sql`):
--    pontos de uma rodada excluida ja foram revertidos via lancamento de
--    estorno (ledger append-only), contar presenca/evento dela deixaria o
--    nivel tecnico inconsistente com o saldo real.
-- 5. Atleta anonimizado/inativo (`ativo = false`) NAO e filtrado aqui de
--    proposito (diferente das views publicas de BE-03) — esta view e
--    consumida internamente por BE-06/API de atletas, que pode legitimamente
--    precisar do nivel tecnico de um atleta inativo (ex.: tela de historico).
--    Se uma tela futura precisar excluir inativo, filtra no consumidor
--    (`WHERE ativo = true` na query da API), nao aqui — mantem a view como
--    fonte de calculo pura, sem acoplar a decisao de exibicao.
--
-- ROLLBACK: DROP VIEW IF EXISTS app.atleta_nivel_tecnico;
-- (aditiva por natureza — nenhuma tabela base e alterada; bloco listado aqui
-- apenas para satisfazer o verificador de convencao do CI, mesmo padrao ja
-- usado em `20260902101300_create_public_views.sql`.)

create view app.atleta_nivel_tecnico as
select
  a.id as atleta_id,
  coalesce(presencas.total, 0) as rodadas_presentes,
  case
    when coalesce(presencas.total, 0) = 0 then a.pontuacao_inicial
    else coalesce(eventos.total_pontos, 0) / presencas.total
  end as nivel_tecnico
from app.atleta a
left join (
  select pr.atleta_id, count(*) as total
  from app.participacao_rodada pr
  join app.rodada r on r.id = pr.rodada_id
  where pr.status in ('presente', 'lesionado')
    and r.status = 'lancada'
  group by pr.atleta_id
) presencas on presencas.atleta_id = a.id
left join (
  select
    pr.atleta_id,
    sum(
      ej.quantidade * (
        select cp.pontos
        from app.configuracao_pontuacao cp
        where cp.evento = ej.tipo
          and cp.vigente_desde <= r.data
        order by cp.vigente_desde desc
        limit 1
      )
    ) as total_pontos
  from app.evento_jogo ej
  join app.participacao_rodada pr on pr.id = ej.participacao_id
  join app.rodada r on r.id = pr.rodada_id
  where pr.status in ('presente', 'lesionado')
    and r.status = 'lancada'
  group by pr.atleta_id
) eventos on eventos.atleta_id = a.id;

comment on view app.atleta_nivel_tecnico is
  'BE-06 (RN-03). Nivel tecnico = media de pontos de app.evento_jogo (valor '
  'vigente em app.configuracao_pontuacao na data da rodada) por numero de '
  'rodadas com status presente|lesionado em rodada lancada; fallback = '
  'pontuacao_inicial para atleta sem nenhuma presenca (RN-10). Interna — '
  'nunca concedida a anon (ver GRANT abaixo), so service_role.';

-- Defesa em profundidade explicita (mesmo padrao ja usado em BE-02/BE-03):
-- nenhuma view nova concede nada a `public` por padrao no Postgres, mas a
-- instrucao deixa isso inequivoco.
revoke all on app.atleta_nivel_tecnico from public;
revoke all on app.atleta_nivel_tecnico from anon;
grant select on app.atleta_nivel_tecnico to service_role;
