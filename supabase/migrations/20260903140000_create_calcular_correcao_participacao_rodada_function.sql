-- BE-10 (TASK.md Secao 3.1) — refatoracao recomendada explicitamente pelo
-- agente que implementou BE-09 (nota de status de BE-09, TASK.md): extrai a
-- logica de CALCULO da correcao de uma participacao (busca da vigencia de
-- `app.configuracao_pontuacao` na data da rodada + soma dos lancamentos
-- existentes vs. o novo valor hipotetico) para uma funcao auxiliar
-- PURAMENTE DE LEITURA, `app.calcular_correcao_participacao_rodada` —
-- reutilizada tanto por `app.corrigir_participacao_rodada` (que GRAVA,
-- migration `20260903130100_*`, BE-09) quanto pela nova funcao de preview
-- `app.simular_correcao_rodada` (que so LE, BE-10, migration
-- `20260903140100_*`). Nenhuma query de calculo fica duplicada entre as
-- duas funcoes que gravam/leem.
--
-- Migration ADITIVA por natureza (nao edita o arquivo ja aplicado de BE-09,
-- `supabase/migrations/README.md`: "nunca editar um arquivo de migration ja
-- aplicado... mudanca sempre e uma nova migration") — `CREATE OR REPLACE
-- FUNCTION app.corrigir_participacao_rodada` REDEFINE o CORPO da funcao
-- (assinatura/tipo de retorno identicos: `(uuid, uuid, text, jsonb) returns
-- void`) para delegar todo o CALCULO ao helper novo, preservando exatamente
-- o mesmo comportamento observavel (mesmos `errcode`s, mesmo
-- `log_auditoria`, mesmo unico novo `lancamento_pontos` de ajuste) — os 7
-- testes de integracao de `corrigir.integration.test.ts` (BE-09) continuam
-- cobrindo esta funcao sem alteracao.
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. O helper `app.calcular_correcao_participacao_rodada` e ESTRUTURALMENTE
--    read-only: nenhuma instrucao INSERT/UPDATE/DELETE em nenhum ponto do
--    corpo — so SELECT (inclusive `FOR UPDATE`, que e uma clausula de
--    LEITURA com bloqueio de linha, nao uma escrita de dado; nao insere/
--    atualiza/remove nenhuma linha de nenhuma tabela). Devolve, via OUT
--    params (padrao Postgres de "funcao que retorna uma linha", chamada com
--    `select * from app.calcular_correcao_participacao_rodada(...)`):
--    `o_participacao_id`, `o_status_atual`, `o_eventos_atual` (estado ANTES,
--    exatamente como `corrigir_participacao_rodada` ja calculava para
--    `log_auditoria.valores_antes`), `o_pontos_antes` (soma liquida de
--    TODOS os `lancamento_pontos` ja gravados para este atleta+rodada —
--    cobre tambem correcao sobre correcao anterior), `o_pontos_depois`
--    (novo total hipotetico, lido de `app.configuracao_pontuacao` vigente
--    na DATA DA RODADA — nunca "agora"/na data da chamada, mesma leitura
--    que `app.lancar_rodada`/`app.corrigir_participacao_rodada` ja usam) e
--    `o_delta` (`o_pontos_depois - o_pontos_antes`, o valor que um NOVO
--    `lancamento_pontos` de ajuste receberia se a correcao fosse de fato
--    aplicada). Os OUT params usam o prefixo `o_` (nunca o mesmo nome
--    literal de uma coluna real, ex.: `participacao_id`) de proposito —
--    achado empirico desta tarefa: um OUT param sem qualificador que
--    coincide com o nome de uma coluna de uma tabela em escopo dentro do
--    corpo da funcao (`app.evento_jogo.participacao_id`) faz o PL/pgSQL
--    levantar "column reference ... is ambiguous" ao comparar os dois sem
--    qualificacao — corrigido antes de considerar esta tarefa pronta
--    (TASK.md Secao 1.0, nunca lacuna silenciosa), coberto pelos testes de
--    integracao de BE-10.
-- 2. Mesmas validacoes/`errcode`s ja documentados na migration original de
--    `corrigir_participacao_rodada` (`20260903130100_*`), reproduzidos aqui
--    sem alteracao de significado: status invalido (`22023`), rodada
--    inexistente (`P0002`), rodada ja excluida (`RD001`), atleta sem
--    participacao nesta rodada (`RD002`), evento de jogo para status
--    ausente — RF-02.6 (`RF026`), nenhuma configuracao de pontuacao vigente
--    — RN-05 (`RN005`), tipo/quantidade de evento invalidos (`22023`). Isso
--    garante que uma simulacao bem-sucedida (BE-10) SEMPRE corresponde a uma
--    correcao real que tambem seria bem-sucedida (`app.corrigir_participacao_rodada`,
--    BE-09) para o MESMO cenario, e vice-versa — mesma validacao, um unico
--    lugar.
-- 3. `SELECT ... FOR UPDATE` na rodada e depois na participacao (mesma ordem
--    e mesmo racional ja documentado em `corrigir_participacao_rodada`:
--    evita deadlock com `app.excluir_rodada`) e mantido tambem quando o
--    helper e chamado a partir da funcao de preview (`simular_correcao_rodada`,
--    BE-10) — o lock e liberado automaticamente ao final da unica chamada
--    RPC (transacao implicita), e garante que o preview reflete exatamente
--    o mesmo estado consistente que uma correcao real veria se rodasse
--    imediatamente em seguida (nenhuma leitura "suja" de uma correcao
--    concorrente pela metade). Decisao de detalhe (nao escalada): nao foi
--    adicionado um parametro para "pular o lock" na leitura de preview —
--    manter o mesmo caminho de codigo entre gravacao e preview e o que
--    garante a propriedade pedida pelo criterio de aceite de BE-10 ("o delta
--    calculado" precisa ser o mesmo que a correcao real aplicaria).
-- 4. `set search_path = app, pg_temp` — mesma defesa em profundidade padrao
--    ja usada em todas as funcoes deste projeto.
--
-- ROLLBACK: restaura `app.corrigir_participacao_rodada` para a definicao
-- ANTERIOR (BE-09, sem o helper — corpo integral abaixo, identico ao de
-- `20260903130100_create_corrigir_participacao_rodada_function.sql`) e
-- remove o helper novo:
--
--   create or replace function app.corrigir_participacao_rodada(
--     p_rodada_id uuid, p_atleta_id uuid, p_novo_status text, p_novos_eventos jsonb
--   ) returns void language plpgsql set search_path = app, pg_temp as $$
--   declare
--     v_rodada_status text; v_rodada_data date; v_participacao_id uuid;
--     v_status_antes text; v_eventos_antes jsonb; v_pontos_antes numeric;
--     v_pontos_depois numeric; v_pontos_evento_base text; v_valor_configurado numeric;
--     v_evento jsonb; v_evento_tipo text; v_evento_quantidade integer;
--     v_qtd_eventos_novos integer; v_delta numeric;
--   begin
--     -- ver corpo completo em 20260903130100_create_corrigir_participacao_rodada_function.sql
--     null;
--   end; $$;
--   DROP FUNCTION IF EXISTS app.calcular_correcao_participacao_rodada(uuid, uuid, text, jsonb);
--
-- (o corpo completo do "antes" fica versionado no proprio arquivo de BE-09,
-- nunca editado por esta migration — o bloco acima e só o ponteiro de
-- rollback exigido pela convencao; reexecutar
-- `20260903130100_create_corrigir_participacao_rodada_function.sql` via
-- `create or replace function` é o passo de rollback real e completo.)

create function app.calcular_correcao_participacao_rodada(
  p_rodada_id uuid,
  p_atleta_id uuid,
  p_novo_status text,
  p_novos_eventos jsonb,
  out o_participacao_id uuid,
  out o_status_atual text,
  out o_eventos_atual jsonb,
  out o_pontos_antes numeric,
  out o_pontos_depois numeric,
  out o_delta numeric
)
returns record
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_rodada_status text;
  v_rodada_data date;
  v_pontos_evento_base text;
  v_valor_configurado numeric;
  v_evento jsonb;
  v_evento_tipo text;
  v_evento_quantidade integer;
  v_qtd_eventos_novos integer;
begin
  if p_novo_status not in ('presente', 'ausente', 'lesionado') then
    raise exception 'status de participacao invalido: %', p_novo_status
      using errcode = '22023';
  end if;

  select r.status, r.data into v_rodada_status, v_rodada_data
  from app.rodada r
  where r.id = p_rodada_id
  for update;

  if not found then
    raise exception 'Rodada % nao encontrada.', p_rodada_id
      using errcode = 'P0002';
  end if;

  if v_rodada_status = 'excluida' then
    raise exception 'Rodada % ja foi excluida — nao e possivel corrigir uma rodada excluida.', p_rodada_id
      using errcode = 'RD001';
  end if;

  select pr.id, pr.status into o_participacao_id, o_status_atual
  from app.participacao_rodada pr
  where pr.rodada_id = p_rodada_id
    and pr.atleta_id = p_atleta_id
  for update;

  if not found then
    raise exception 'Atleta % nao participou da rodada %.', p_atleta_id, p_rodada_id
      using errcode = 'RD002';
  end if;

  v_qtd_eventos_novos := jsonb_array_length(coalesce(p_novos_eventos, '[]'::jsonb));

  -- RF-02.6: bloqueio estrutural (defesa em profundidade alem da validacao
  -- zod da API) — nenhum evento de jogo pode existir para atleta ausente.
  if p_novo_status = 'ausente' and v_qtd_eventos_novos > 0 then
    raise exception
      'RF-02.6: nao e permitido registrar evento de jogo (gol/cartao) para atleta ausente (atleta_id=%).',
      p_atleta_id
      using errcode = 'RF026';
  end if;

  -- NOTA (achado empírico desta tarefa, corrigido antes de considerar BE-10
  -- pronta — TASK.md Secao 1.0, nunca lacuna silenciosa): comparar um OUT
  -- param sem qualificador contra uma coluna de mesmo nome de uma tabela em
  -- escopo (`evento_jogo.participacao_id`) levanta "column reference ...
  -- is ambiguous" em PL/pgSQL — por isso os OUT params deste helper usam o
  -- prefixo `o_`, nunca o mesmo nome literal de uma coluna real.
  select coalesce(jsonb_agg(jsonb_build_object('tipo', ej.tipo, 'quantidade', ej.quantidade) order by ej.tipo), '[]'::jsonb)
    into o_eventos_atual
  from app.evento_jogo ej
  where ej.participacao_id = o_participacao_id;

  -- "Aplica so a diferenca" (RF-04.2): o total "antes" e a soma LIQUIDA de
  -- TODOS os lancamentos ja gravados para este atleta+rodada (nao so o
  -- lancamento original de app.lancar_rodada) — cobre tambem correcoes
  -- anteriores sobre a mesma participacao.
  select coalesce(sum(lp.pontos_delta), 0) into o_pontos_antes
  from app.lancamento_pontos lp
  where lp.atleta_id = p_atleta_id
    and lp.rodada_id = p_rodada_id;

  -- RN-05/RF-02.3: "lesionado" pontua como "presente" (evento "presenca");
  -- "ausente" pontua pelo evento "ausencia". Mesmo valor SEMPRE lido de
  -- app.configuracao_pontuacao vigente na DATA DA RODADA (nunca "agora"),
  -- para neutralizar exatamente o metodo de calculo original (TASK.md
  -- Secao 1.2).
  v_pontos_evento_base := case when p_novo_status = 'ausente' then 'ausencia' else 'presenca' end;

  select cp.pontos into v_valor_configurado
  from app.configuracao_pontuacao cp
  where cp.evento = v_pontos_evento_base
    and cp.vigente_desde <= v_rodada_data
  order by cp.vigente_desde desc
  limit 1;

  if v_valor_configurado is null then
    raise exception
      'RN-05: nenhum valor de app.configuracao_pontuacao vigente para o evento "%" na data %.',
      v_pontos_evento_base, v_rodada_data
      using errcode = 'RN005';
  end if;

  o_pontos_depois := v_valor_configurado;

  for v_evento in select * from jsonb_array_elements(coalesce(p_novos_eventos, '[]'::jsonb))
  loop
    v_evento_tipo := v_evento ->> 'tipo';
    v_evento_quantidade := (v_evento ->> 'quantidade')::integer;

    if v_evento_tipo not in ('gol', 'cartao_amarelo', 'cartao_vermelho') then
      raise exception 'tipo de evento invalido: %', v_evento_tipo
        using errcode = '22023';
    end if;
    if v_evento_quantidade is null or v_evento_quantidade <= 0 then
      raise exception 'quantidade de evento invalida para tipo %: %', v_evento_tipo, v_evento_quantidade
        using errcode = '22023';
    end if;

    select cp.pontos into v_valor_configurado
    from app.configuracao_pontuacao cp
    where cp.evento = v_evento_tipo
      and cp.vigente_desde <= v_rodada_data
    order by cp.vigente_desde desc
    limit 1;

    if v_valor_configurado is null then
      raise exception
        'RN-05: nenhum valor de app.configuracao_pontuacao vigente para o evento "%" na data %.',
        v_evento_tipo, v_rodada_data
        using errcode = 'RN005';
    end if;

    o_pontos_depois := o_pontos_depois + (v_valor_configurado * v_evento_quantidade);
  end loop;

  o_delta := o_pontos_depois - o_pontos_antes;
end;
$$;

comment on function app.calcular_correcao_participacao_rodada(uuid, uuid, text, jsonb) is
  'BE-10 (refatoracao recomendada por BE-09). Helper PURAMENTE DE LEITURA '
  '(nenhum INSERT/UPDATE/DELETE) que calcula o total de pontos ja gravado '
  '(pontos_antes), o novo total hipotetico sob o status/eventos informados '
  '(pontos_depois, lido de app.configuracao_pontuacao vigente na data da '
  'rodada) e a diferenca (delta) para a participacao de um atleta numa '
  'rodada. Reutilizado por app.corrigir_participacao_rodada (grava o '
  'ajuste) e por app.simular_correcao_rodada (so preview, BE-10) — mesma '
  'query, nunca duplicada. Mesmos errcodes de corrigir_participacao_rodada '
  '(P0002/RD001/RD002/RF026/RN005/22023).';

revoke all on function app.calcular_correcao_participacao_rodada(uuid, uuid, text, jsonb) from public;
revoke all on function app.calcular_correcao_participacao_rodada(uuid, uuid, text, jsonb) from anon;
grant execute on function app.calcular_correcao_participacao_rodada(uuid, uuid, text, jsonb) to service_role;

-- Redefine app.corrigir_participacao_rodada (BE-09) para delegar todo o
-- calculo ao helper acima — o corpo abaixo so faz as ESCRITAS (UPDATE
-- participacao_rodada, substituicao de evento_jogo, INSERT do lancamento de
-- ajuste, INSERT do log_auditoria), usando os valores ja calculados e
-- validados pelo helper. Comportamento observavel identico ao de
-- `20260903130100_create_corrigir_participacao_rodada_function.sql`.
create or replace function app.corrigir_participacao_rodada(
  p_rodada_id uuid,
  p_atleta_id uuid,
  p_novo_status text,
  p_novos_eventos jsonb
)
returns void
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_calc record;
  v_evento jsonb;
begin
  select *
    into v_calc
  from app.calcular_correcao_participacao_rodada(
    p_rodada_id, p_atleta_id, p_novo_status, p_novos_eventos
  );

  update app.participacao_rodada
  set status = p_novo_status
  where id = v_calc.o_participacao_id;

  delete from app.evento_jogo where participacao_id = v_calc.o_participacao_id;

  for v_evento in select * from jsonb_array_elements(coalesce(p_novos_eventos, '[]'::jsonb))
  loop
    insert into app.evento_jogo (participacao_id, tipo, quantidade)
    values (
      v_calc.o_participacao_id,
      v_evento ->> 'tipo',
      (v_evento ->> 'quantidade')::integer
    );
  end loop;

  insert into app.lancamento_pontos (atleta_id, rodada_id, origem, pontos_delta)
  values (p_atleta_id, p_rodada_id, 'correcao', v_calc.o_delta);

  insert into app.log_auditoria (rodada_id, atleta_id, tipo_evento, valores_antes, valores_depois)
  values (
    p_rodada_id,
    p_atleta_id,
    'correcao',
    jsonb_build_object(
      'status', v_calc.o_status_atual,
      'eventos', v_calc.o_eventos_atual,
      'pontos_acumulados', v_calc.o_pontos_antes
    ),
    jsonb_build_object(
      'status', p_novo_status,
      'eventos', coalesce(p_novos_eventos, '[]'::jsonb),
      'pontos_acumulados', v_calc.o_pontos_depois,
      'ajuste_aplicado', v_calc.o_delta
    )
  );
end;
$$;

comment on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) is
  'BE-09 (RF-04.2, RN-04), redefinida em BE-10 para delegar o calculo a '
  'app.calcular_correcao_participacao_rodada (mesmo comportamento '
  'observavel). Corrige a participacao de um atleta (status + eventos de '
  'jogo) numa rodada ja lancada, calculando e aplicando SOMENTE a '
  'diferenca de pontos (novo total vigente na data da rodada menos o '
  'total ja liquido no ledger) via um unico novo lancamento '
  '(origem=correcao, ledger append-only, ADR-006) — nunca UPDATE/DELETE em '
  'lancamento_pontos ja gravado. Grava uma entrada em log_auditoria (sem '
  'campo de autor, RN-12) com status/eventos antes e depois. Bloqueia '
  'estruturalmente evento de jogo para status ausente (RF-02.6, errcode '
  'RF026) e correcao de rodada ja excluida (errcode RD001).';

revoke all on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) from public;
revoke all on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) from anon;
grant execute on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) to service_role;
