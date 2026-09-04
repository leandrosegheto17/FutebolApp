-- BE-09 (TASK.md Secao 3.1) — funcao `app.corrigir_participacao_rodada`
-- (RF-04.2, RN-04): corrige a participacao de UM atleta numa rodada ja
-- lancada (status de presenca e/ou lista de eventos de jogo), calcula
-- automaticamente a DIFERENCA entre o valor antigo e o novo, e aplica
-- somente essa diferenca ao saldo acumulado do atleta (nunca substitui o
-- lancamento antigo). Mesmo padrao arquitetural do ADR-006 (TASK.md Secao
-- 1.2): atualizacao de `participacao_rodada`/`evento_jogo` + insercao do
-- lancamento de ajuste + gravacao de `log_auditoria` acontecem TODOS dentro
-- da mesma chamada de funcao (uma unica transacao implicita).
--
-- Contrato de entrada (mesmo formato de `p_eventos` de
-- `app.lancar_rodada`, migration BE-08), `p_novos_eventos` (jsonb array,
-- SUBSTITUI por completo a lista de eventos atual da participacao — nao e
-- incremental):
--   [ { "tipo": "gol" | "cartao_amarelo" | "cartao_vermelho", "quantidade": <int > 0> }, ... ]
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. "Aplica so a diferenca" (criterio de aceite literal desta tarefa,
--    RF-04.2): a funcao NUNCA edita/remove o(s) lancamento(s) ja gravados
--    para este `(atleta_id, rodada_id)` (ledger append-only, GUARDRAILS.md
--    regra 8) — calcula o total de pontos ja liquido para esta participacao
--    (soma de TODOS os `lancamento_pontos` existentes para este
--    atleta+rodada, cobrindo tambem o caso de uma correcao sobre uma
--    participacao ja corrigida antes), recalcula o NOVO total sob o novo
--    status/eventos (mesma leitura de `app.configuracao_pontuacao` vigente
--    na DATA DA RODADA que `app.lancar_rodada` ja usa — nunca o valor
--    vigente "agora"/na data da correcao, TASK.md Secao 1.2: "o ajuste deve
--    neutralizar exatamente o que foi lancado, lido pelo valor vigente na
--    data do evento original"), e insere um UNICO novo lancamento
--    (`origem = 'correcao'`) cujo `pontos_delta` e exatamente a diferenca
--    (`novo_total - total_ja_liquido`) — inclusive quando a diferenca e
--    zero (uma correcao que nao muda o total efetivo ainda gera log,
--    RN-07: "toda correcao gera log, inclusive correcoes triviais").
-- 2. `participacao_rodada.status`/`evento_jogo` (ao contrario de
--    `lancamento_pontos`) NAO sao ledger append-only — sao o registro
--    "corrente" do que a rodada reflete hoje, e SAO atualizados/
--    substituidos diretamente por esta funcao (nenhuma trigger de bloqueio
--    existe sobre essas duas tabelas, so sobre `lancamento_pontos`/
--    `atleta`) — `evento_jogo` antigo desta participacao e apagado e
--    recriado a partir de `p_novos_eventos`; `participacao_rodada.status` e
--    sobrescrito para `p_novo_status`. O historico "antes" de ambos e
--    preservado no proprio `log_auditoria.valores_antes` desta operacao
--    (RF-04.4), nao na tabela operacional em si.
-- 3. RF-02.6 (bloquear evento para atleta ausente) e verificado AQUI, dentro
--    da funcao — mesma defesa em profundidade estrutural ja documentada em
--    `app.lancar_rodada` (BE-08): a validacao `zod` da API e so a primeira
--    linha de defesa, nunca a unica garantia (`errcode = 'RF026'`, mesmo
--    codigo reaproveitado de BE-08 por ser a mesma regra).
-- 4. Rodada inexistente levanta `errcode = 'P0002'`; rodada com
--    `status = 'excluida'` nao pode ser corrigida (nao ha "corrigir" um
--    estorno ja completo — o organizador so pode excluir uma vez) e levanta
--    `errcode = 'RD001'` (mesmo codigo de "rodada ja excluida" usado por
--    `app.excluir_rodada`, mesmo significado); atleta sem participacao
--    nesta rodada levanta `errcode = 'RD002'` (codigo novo, distinto de
--    "rodada nao encontrada" para o endpoint poder devolver uma mensagem
--    `404` mais precisa).
-- 5. `SELECT ... FOR UPDATE` na rodada e depois na participacao (nesta
--    ordem — evita deadlock com `app.excluir_rodada`, que so trava a
--    rodada) serializa chamadas concorrentes para a MESMA participacao.
-- 6. `set search_path = app, pg_temp` — mesma defesa em profundidade padrao
--    ja usada em `app.anonimizar_atleta`/`app.lancar_rodada`/
--    `app.excluir_rodada`.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS app.corrigir_participacao_rodada(uuid, uuid, text, jsonb);
-- (aditiva por natureza — nenhuma tabela/coluna existente e alterada; bloco
-- listado mesmo assim por clareza, mesmo padrao ja usado nas demais
-- migrations deste projeto.)

create function app.corrigir_participacao_rodada(
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
  v_rodada_status text;
  v_rodada_data date;
  v_participacao_id uuid;
  v_status_antes text;
  v_eventos_antes jsonb;
  v_pontos_antes numeric;
  v_pontos_depois numeric;
  v_pontos_evento_base text;
  v_valor_configurado numeric;
  v_evento jsonb;
  v_evento_tipo text;
  v_evento_quantidade integer;
  v_qtd_eventos_novos integer;
  v_delta numeric;
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

  select pr.id, pr.status into v_participacao_id, v_status_antes
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

  select coalesce(jsonb_agg(jsonb_build_object('tipo', ej.tipo, 'quantidade', ej.quantidade) order by ej.tipo), '[]'::jsonb)
    into v_eventos_antes
  from app.evento_jogo ej
  where ej.participacao_id = v_participacao_id;

  -- "Aplica so a diferenca" (RF-04.2): o total "antes" e a soma LIQUIDA de
  -- TODOS os lancamentos ja gravados para este atleta+rodada (nao so o
  -- lancamento original de app.lancar_rodada) — cobre tambem correcoes
  -- anteriores sobre a mesma participacao.
  select coalesce(sum(lp.pontos_delta), 0) into v_pontos_antes
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

  v_pontos_depois := v_valor_configurado;

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

    v_pontos_depois := v_pontos_depois + (v_valor_configurado * v_evento_quantidade);
  end loop;

  v_delta := v_pontos_depois - v_pontos_antes;

  update app.participacao_rodada
  set status = p_novo_status
  where id = v_participacao_id;

  delete from app.evento_jogo where participacao_id = v_participacao_id;

  for v_evento in select * from jsonb_array_elements(coalesce(p_novos_eventos, '[]'::jsonb))
  loop
    insert into app.evento_jogo (participacao_id, tipo, quantidade)
    values (
      v_participacao_id,
      v_evento ->> 'tipo',
      (v_evento ->> 'quantidade')::integer
    );
  end loop;

  insert into app.lancamento_pontos (atleta_id, rodada_id, origem, pontos_delta)
  values (p_atleta_id, p_rodada_id, 'correcao', v_delta);

  insert into app.log_auditoria (rodada_id, atleta_id, tipo_evento, valores_antes, valores_depois)
  values (
    p_rodada_id,
    p_atleta_id,
    'correcao',
    jsonb_build_object(
      'status', v_status_antes,
      'eventos', v_eventos_antes,
      'pontos_acumulados', v_pontos_antes
    ),
    jsonb_build_object(
      'status', p_novo_status,
      'eventos', coalesce(p_novos_eventos, '[]'::jsonb),
      'pontos_acumulados', v_pontos_depois,
      'ajuste_aplicado', v_delta
    )
  );
end;
$$;

comment on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) is
  'BE-09 (RF-04.2, RN-04). Corrige a participacao de um atleta (status + '
  'eventos de jogo) numa rodada ja lancada, calculando e aplicando SOMENTE '
  'a diferenca de pontos (novo total vigente na data da rodada menos o '
  'total ja liquido no ledger) via um unico novo lancamento '
  '(origem=correcao, ledger append-only, ADR-006) — nunca UPDATE/DELETE em '
  'lancamento_pontos ja gravado. Grava uma entrada em log_auditoria (sem '
  'campo de autor, RN-12) com status/eventos antes e depois. Bloqueia '
  'estruturalmente evento de jogo para status ausente (RF-02.6, errcode '
  'RF026) e correcao de rodada ja excluida (errcode RD001).';

revoke all on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) from public;
revoke all on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) from anon;
grant execute on function app.corrigir_participacao_rodada(uuid, uuid, text, jsonb) to service_role;
