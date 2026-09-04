-- BE-08 (TASK.md Secao 3.1) — seed inicial de `app.configuracao_pontuacao`
-- com a tabela fixa de pontuacao RN-05 (PRD-TECNICO.md Secao 3): Presenca =
-- +2, Ausencia = 0, Lesao tratada como presenca (RF-02.3, mesmo evento
-- "presenca"), Gol = +3, Cartao amarelo = -1, Cartao vermelho = -3.
--
-- Motivo desta migration existir (nao e so um dado de teste): a propria nota
-- de dependencia de RN-05 no PRD-TECNICO.md (Secao 2, tabela de
-- dependencias) e explicita — "O calculo automatico de pontos NAO PODE
-- OCORRER sem os valores de pontuacao definidos/configurados no sistema
-- antes do primeiro lancamento de rodada" — e o SDD.md Secao 5 ja registra
-- que `configuracao_pontuacao` e "editavel apenas via migration/acesso
-- direto, sem UI de edicao nesta release". A migration da view de nivel
-- tecnico de BE-06 (`20260903100000_create_atleta_nivel_tecnico_view.sql`)
-- ja antecipava isso: "quem seed'ar configuracao_pontuacao (BE-08 ou
-- operacao manual) passa a ver o evento contar corretamente" — esta e essa
-- semeadura.
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. `evento` usa dois valores novos ("presenca"/"ausencia") alem dos tres ja
--    usados por `evento_jogo.tipo` ("gol"/"cartao_amarelo"/"cartao_vermelho")
--    — `configuracao_pontuacao.evento` e texto livre por desenho (sem CHECK
--    fechado, ver comentario da propria migration da tabela), entao nao ha
--    conflito de dominio. "Lesionado" (RF-02.3) NAO ganha uma linha propria:
--    a regra e explicita — "tratado como presenca para efeito da pontuacao
--    de presenca" — entao o calculo de pontos de BE-08 le o evento
--    "presenca" tanto para `participacao_rodada.status = 'presente'` quanto
--    para `'lesionado'`; `'ausente'` le o evento "ausencia".
-- 2. `vigente_desde = '2000-01-01'` — ancora deliberadamente muito anterior a
--    qualquer rodada real esperada deste projeto (nao ha rodada historica
--    pre-migracao do legado ainda carregada, BE-15 continua pendente,
--    GUARDRAILS.md regra 35), so para garantir que a subquery de "valor
--    vigente na data do evento" (TASK.md Secao 1.2) sempre encontre uma
--    linha correspondente para qualquer data de rodada lancada nesta
--    release, sem depender de uma data de corte especifica ainda nao
--    definida pelo organizador. RN-13 (preservacao do historico migrado sem
--    recalculo) nao e afetada — esta semeadura so passa a valer para
--    lancamentos NOVOS feitos a partir de agora (BE-08), nunca aplicada
--    retroativamente a nada, porque nao ha nenhum lancamento anterior a
--    esta migration.
-- 3. Valores gravados como `numeric` inteiros, identicos ao texto literal de
--    RN-05 — nenhuma conversao/arredondamento.
--
-- ROLLBACK: delete from app.configuracao_pontuacao
--   where vigente_desde = '2000-01-01'
--     and evento in ('presenca', 'ausencia', 'gol', 'cartao_amarelo', 'cartao_vermelho');
-- (aditiva por natureza — nenhuma tabela/coluna alterada; bloco listado
-- mesmo assim por clareza, mesmo padrao ja usado nas demais migrations deste
-- projeto.)

insert into app.configuracao_pontuacao (evento, pontos, vigente_desde)
values
  ('presenca', 2, '2000-01-01'),
  ('ausencia', 0, '2000-01-01'),
  ('gol', 3, '2000-01-01'),
  ('cartao_amarelo', -1, '2000-01-01'),
  ('cartao_vermelho', -3, '2000-01-01');
