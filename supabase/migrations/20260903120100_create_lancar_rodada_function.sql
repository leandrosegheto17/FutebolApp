-- BE-08 (TASK.md Secao 3.1) — funcao `app.lancar_rodada` (RF-02, RN-05):
-- lancamento de presenca/eventos de uma rodada inteira e calculo automatico
-- de pontos. Mesmo padrao arquitetural do ADR-006 (TASK.md Secao 1.2 —
-- "toda operacao que altera saldo/historico multi-tabela e implementada como
-- funcao/trigger PL/pgSQL rodando dentro de uma unica transacao Postgres"):
-- INSERT em `app.rodada` + `app.participacao_rodada` (uma por atleta) +
-- `app.evento_jogo` (gol/cartao) + `app.lancamento_pontos` (um lancamento
-- por atleta, ledger append-only) acontecem TODOS dentro da mesma chamada de
-- funcao (uma unica transacao implicita) — nunca como sequencia de chamadas
-- TypeScript separadas. Qualquer excecao levantada em qualquer ponto do loop
-- reverte 100% do que ja tinha sido inserido nesta chamada (nenhuma
-- gravacao parcial e visivel fora da transacao, RNF-10).
--
-- Contrato de entrada (`p_participacoes`, jsonb array), um item por atleta:
--   {
--     "atleta_id": "<uuid>",
--     "status": "presente" | "ausente" | "lesionado",
--     "eventos": [ { "tipo": "gol" | "cartao_amarelo" | "cartao_vermelho", "quantidade": <int > 0> }, ... ]
--   }
-- `eventos` e opcional (tratado como lista vazia quando ausente/null).
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. RF-02.6 (bloquear evento para atleta ausente) e verificado AQUI, dentro
--    da funcao — em profundidade, alem da validacao `zod` da camada de API
--    (`src/modules/rodadas/validation.ts`) que ja recusa esse payload com
--    `400` antes mesmo de chamar esta funcao. A checagem dupla existe porque
--    esta funcao e a unica garantia estrutural real de atomicidade/
--    integridade (TASK.md Secao 1.2) — a validacao de borda em TypeScript e
--    so uma otimizacao de UX (falha mais cedo, mensagem mais amigavel), nao
--    pode ser a UNICA garantia. Mesmo racional ja registrado na migration de
--    `evento_jogo` (BE-02): "implementacao do bloqueio em si, incluindo
--    checar o status, e escopo de BE-08" — este e esse escopo.
-- 2. RN-05/RF-02.3: "lesionado" e tratado como "presente" para efeito de
--    PONTOS de presenca (le o evento "presenca" de `configuracao_pontuacao`,
--    nao um evento "lesao" proprio — nao existe tal evento, ver migration de
--    seed) — mas o `status` gravado em `participacao_rodada` preserva o
--    valor literal "lesionado" (nunca reescrito para "presente"), porque
--    RF-02.3 tambem exige "permitindo ainda registrar eventos ocorridos ate
--    o momento da lesao" — ou seja, o dado de status por si so precisa
--    continuar distinguivel de "presente" para leitura futura (ex.: T05/T06
--    do UX-SPEC.md mostram "Lesionado" como estado proprio na revisao).
-- 3. Cada atleta recebe EXATAMENTE UMA linha em `app.lancamento_pontos` por
--    rodada (soma de presenca/ausencia + todos os eventos daquele atleta
--    nesta rodada) — nao uma linha por evento individual. Decisao de
--    modelagem fisica ja registrada na propria migration de
--    `lancamento_pontos` (BE-02): "RN-04/RN-05 corrigem/calculam por
--    atleta+rodada, nao por evento individual" — mantem a granularidade do
--    ledger consistente com o que a correcao/estorno (BE-09) vai precisar
--    reverter (um unico lancamento por atleta/rodada a estornar, nunca uma
--    lista de lancamentos por evento).
-- 4. Valor de pontos de cada evento SEMPRE lido de
--    `app.configuracao_pontuacao` na data da rodada (`vigente_desde <=
--    p_data`, pegando a vigencia mais recente) — nunca hardcoded aqui
--    (TASK.md Secao 1.2). Se nao houver NENHUMA configuracao vigente para um
--    evento necessario nesta chamada, a funcao levanta excecao (`errcode =
--    'RN005'`) em vez de gravar um lancamento com valor ausente/zerado
--    silenciosamente — RN-05, PRD-TECNICO.md Secao 2 ("Bloqueia RF-02.1 a
--    RF-02.5"): o calculo automatico de pontos nao pode ocorrer sem os
--    valores configurados. Isso so deveria acontecer se a semeadura desta
--    mesma tarefa (`20260903120000_seed_configuracao_pontuacao.sql`) for
--    removida manualmente do banco — comportamento defensivo, nao um caso de
--    uso esperado.
-- 5. Duplicidade de data (RF-02.8) NAO e verificada dentro desta funcao —
--    permanece uma checagem da camada de aplicacao (`src/modules/rodadas/
--    repository.ts`, mesmo padrao ja usado por RF-01.5/BE-06 para nome de
--    atleta duplicado), porque e um ALERTA confirmavel pelo organizador, nao
--    uma restricao de unicidade de dado (nao ha `UNIQUE(data)` em
--    `app.rodada`, BE-02) — duas rodadas com a mesma data sao um estado
--    valido do sistema quando confirmado explicitamente. Mesma decisao de
--    "alerta, nao bloqueio" ja usada por BE-06 (RF-01.5), documentada la e
--    reaproveitada aqui por analogia, nao reaberta.
-- 6. `set search_path = app, pg_temp` — mesma defesa em profundidade padrao
--    ja usada em `app.anonimizar_atleta` (BE-07).
--
-- ROLLBACK: DROP FUNCTION IF EXISTS app.lancar_rodada(date, jsonb);
-- (aditiva por natureza — nenhuma tabela/coluna existente e alterada; bloco
-- listado mesmo assim por clareza, mesmo padrao ja usado nas demais
-- migrations deste projeto.)

create function app.lancar_rodada(p_data date, p_participacoes jsonb)
returns uuid
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_rodada_id uuid;
  v_participacao jsonb;
  v_evento jsonb;
  v_participacao_id uuid;
  v_atleta_id uuid;
  v_status text;
  v_evento_tipo text;
  v_evento_quantidade integer;
  v_pontos_evento_base text;
  v_pontos_delta numeric;
  v_valor_configurado numeric;
  v_qtd_eventos integer;
begin
  if p_participacoes is null or jsonb_typeof(p_participacoes) <> 'array'
     or jsonb_array_length(p_participacoes) = 0 then
    raise exception 'p_participacoes deve ser um array jsonb com ao menos um item.'
      using errcode = '22023'; -- invalid_parameter_value
  end if;

  insert into app.rodada (data, status)
  values (p_data, 'lancada')
  returning id into v_rodada_id;

  for v_participacao in select * from jsonb_array_elements(p_participacoes)
  loop
    v_atleta_id := (v_participacao ->> 'atleta_id')::uuid;
    v_status := v_participacao ->> 'status';

    if v_status not in ('presente', 'ausente', 'lesionado') then
      raise exception 'status de participacao invalido: %', v_status
        using errcode = '22023';
    end if;

    v_qtd_eventos := jsonb_array_length(coalesce(v_participacao -> 'eventos', '[]'::jsonb));

    -- RF-02.6: bloqueio estrutural (defesa em profundidade alem da validacao
    -- zod da API) — nenhum evento de jogo pode existir para atleta ausente.
    if v_status = 'ausente' and v_qtd_eventos > 0 then
      raise exception
        'RF-02.6: nao e permitido registrar evento de jogo (gol/cartao) para atleta ausente (atleta_id=%).',
        v_atleta_id
        using errcode = 'RF026';
    end if;

    insert into app.participacao_rodada (rodada_id, atleta_id, status)
    values (v_rodada_id, v_atleta_id, v_status)
    returning id into v_participacao_id;

    -- RN-05/RF-02.3: "lesionado" pontua como "presente" (evento "presenca");
    -- "ausente" pontua pelo evento "ausencia".
    v_pontos_evento_base := case when v_status = 'ausente' then 'ausencia' else 'presenca' end;

    select cp.pontos into v_valor_configurado
    from app.configuracao_pontuacao cp
    where cp.evento = v_pontos_evento_base
      and cp.vigente_desde <= p_data
    order by cp.vigente_desde desc
    limit 1;

    if v_valor_configurado is null then
      raise exception
        'RN-05: nenhum valor de app.configuracao_pontuacao vigente para o evento "%" na data %.',
        v_pontos_evento_base, p_data
        using errcode = 'RN005';
    end if;

    v_pontos_delta := v_valor_configurado;

    for v_evento in select * from jsonb_array_elements(coalesce(v_participacao -> 'eventos', '[]'::jsonb))
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

      insert into app.evento_jogo (participacao_id, tipo, quantidade)
      values (v_participacao_id, v_evento_tipo, v_evento_quantidade);

      select cp.pontos into v_valor_configurado
      from app.configuracao_pontuacao cp
      where cp.evento = v_evento_tipo
        and cp.vigente_desde <= p_data
      order by cp.vigente_desde desc
      limit 1;

      if v_valor_configurado is null then
        raise exception
          'RN-05: nenhum valor de app.configuracao_pontuacao vigente para o evento "%" na data %.',
          v_evento_tipo, p_data
          using errcode = 'RN005';
      end if;

      v_pontos_delta := v_pontos_delta + (v_valor_configurado * v_evento_quantidade);
    end loop;

    insert into app.lancamento_pontos (atleta_id, rodada_id, origem, pontos_delta)
    values (v_atleta_id, v_rodada_id, 'lancamento', v_pontos_delta);
  end loop;

  return v_rodada_id;
end;
$$;

comment on function app.lancar_rodada(date, jsonb) is
  'BE-08 (RF-02, RN-05). Lanca uma rodada inteira (presenca + eventos de '
  'jogo + calculo automatico de pontos) em uma unica transacao — insere '
  'app.rodada, uma app.participacao_rodada por atleta, app.evento_jogo por '
  'evento e exatamente um app.lancamento_pontos por atleta (ledger '
  'append-only). Bloqueia estruturalmente evento de jogo para atleta '
  'ausente (RF-02.6, errcode RF026). Valor de pontos sempre lido do vigente '
  'em app.configuracao_pontuacao na data da rodada (nunca hardcoded).';

revoke all on function app.lancar_rodada(date, jsonb) from public;
revoke all on function app.lancar_rodada(date, jsonb) from anon;
grant execute on function app.lancar_rodada(date, jsonb) to service_role;
