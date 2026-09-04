-- BE-13 (TASK.md Secao 3.1, escopo ampliado por decisao EXPLICITA do
-- usuario nesta execucao — ver nota de status de BE-13 no TASK.md) —
-- funcao `app.confirmar_times_rodada` (RF-05.4/RF-06.1): persiste em
-- app.time/app.time_atleta a divisao de times ja ajustada manualmente pelo
-- organizador e confirmada para uma rodada especifica.
--
-- Resolve o GAP estrutural sinalizado pela propria nota de status de BE-11
-- no TASK.md: o Servico de Times (BE-11) so gera/retorna a SUGESTAO
-- (RF-05.4 — "o organizador pode ajustar manualmente antes de confirmar"),
-- nunca persiste app.time/app.time_atleta; BE-13 (Substituicoes) exige um
-- `time_id` ja persistido para funcionar (RF-06.1 — "vincular esse evento a
-- rodada e AO TIME correspondente"). Nenhuma tarefa da decomposicao
-- original do TASK.md cobria literalmente esse "confirmar" — por decisao
-- explicita do usuario, esta mesma execucao de BE-13 tambem implementa essa
-- persistencia como pre-requisito, em vez de a tratar como lacuna
-- silenciosa.
--
-- Uso de funcao PL/pgSQL dedicada — decisao de detalhe documentada aqui,
-- nao escalada: TASK.md Secao 1.2 so EXIGE funcao/trigger PL/pgSQL para
-- operacao que altera SALDO ACUMULADO/HISTORICO MULTI-TABELA DO ATLETA;
-- persistir app.time/app.time_atleta nao altera saldo nem
-- app.lancamento_pontos, entao essa exigencia literal nao se aplica aqui
-- (mesmo racional ja usado por BE-11/BE-12 para NAO usar funcao PL/pgSQL).
-- Mesmo assim, esta operacao especifica PRECISA de uma funcao PL/pgSQL,
-- por um motivo diferente — NECESSIDADE TECNICA de atomicidade multi-
-- tabela, nao alteracao de saldo: o cliente `service_role` deste projeto
-- (`src/lib/supabase/server-client.ts`) fala com o Postgres exclusivamente
-- via PostgREST (ADR-002/003) — nao ha conexao Postgres direta nem
-- transacao client-side abrangendo multiplas chamadas HTTP separadas; cada
-- `.insert()`/`.delete()` do supabase-js e a propria transacao Postgres
-- (uma por chamada). Como o requisito explicito desta tarefa e "todos os
-- times de uma rodada sao gravados juntos ou nenhum e" (N linhas de
-- app.time + M linhas de app.time_atleta, mais a exclusao da divisao
-- anterior em caso de reconfirmacao, tudo-ou-nada), a UNICA forma de
-- garantir isso nesta arquitetura e concentrar todas as escritas dentro de
-- uma unica chamada de funcao (uma unica transacao implicita) — mesmo
-- padrao arquitetural ja usado por app.lancar_rodada/app.excluir_rodada/
-- app.anonimizar_atleta (ADR-006), aplicado aqui por analogia de
-- NECESSIDADE TECNICA de atomicidade, nao porque esta operacao altera
-- saldo.
--
-- Contrato de entrada (`p_times`, jsonb array), um item por time, formato
-- aceito equivalente ao `status: "ok"` de POST /api/times/sugestao (so
-- `atletas_ids` e necessario; os demais campos daquela resposta, quando
-- reenviados pelo cliente, sao ignorados pela camada de API antes de
-- chegar aqui):
--   [ { "label": "Time A", "atletas_ids": ["<uuid>", ...] }, ... ]
-- `label` e SEMPRE preenchido pela camada de API
-- (`src/modules/times/confirmacao/mutate.ts`) antes de chamar esta funcao
-- (default "Time <letra>" quando o organizador nao personalizar — decisao
-- de detalhe documentada la, mesmo texto do wireframe T09 do UX-SPEC.md:
-- "Time A"/"Time B").
--
-- Decisao de RECONFIRMACAO (rodada_id que ja tem uma divisao persistida —
-- pergunta explicita do enunciado desta tarefa: "UX-SPEC.md T09 ja sugere
-- algum comportamento?"): o wireframe de T09 (revisao 2026-09-02) mostra um
-- unico fluxo linear "Gerar sugestao -> ajustar -> Confirmar Times", sem
-- nenhuma tela separada de "editar divisao ja confirmada" e sem nenhuma
-- mencao textual a bloqueio de nova confirmacao; T11 (Substituicao no
-- Intervalo) e alcancada "a partir de T09, quando a rodada esta em
-- andamento (times ja definidos)", sugerindo um momento de confirmacao
-- seguido de substituicoes, mas sem proibir textualmente reconfirmar. Na
-- ausencia de uma resposta explicita do UX-SPEC.md, a decisao adotada (nao
-- escalada, TASK.md Secao 1.0 — solucao mais simples que satisfaz "gravar a
-- divisao ajustada, atomicamente"): reconfirmar SUBSTITUI a divisao
-- anterior por completo (DELETE dos times/time_atleta antigos da rodada +
-- INSERT da nova, na MESMA transacao) — CONTANTO que nenhuma substituicao
-- (app.substituicao) ja tenha sido registrada contra os times atuais
-- daquela rodada. Se ja houver substituicao registrada, reconfirmar e
-- BLOQUEADO (errcode 'TM001', traduzido em 409 pelo endpoint): substituir
-- silenciosamente a divisao de times invalidaria a fidelidade historica que
-- RF-06.1 exige para as substituicoes ja registradas (elas referenciam um
-- `time_id` especifico via FK `on delete restrict`, BE-02) — apagar aquele
-- time apagaria o contexto que da sentido ao registro historico. Este
-- bloqueio ja e reforcado estruturalmente pela propria FK
-- `on delete restrict` de app.substituicao.time_id (BE-02): mesmo sem a
-- checagem explicita abaixo, o DELETE de app.time acabaria falhando com
-- erro de FK; a checagem explicita aqui existe apenas para devolver uma
-- mensagem clara em vez de um erro generico de constraint do Postgres
-- (mesmo racional ja usado por outras funcoes deste projeto, ex.:
-- `encontrarAtletaInexistente` em restricoes/mutate.ts para nao deixar uma
-- FK estourar como erro 23503 ilegivel).
--
-- Defesa em profundidade adicional (nao exigida pelo criterio de aceite
-- literal, mas consistente com a filosofia de dupla checagem ja usada em
-- app.lancar_rodada/app.corrigir_participacao_rodada para RF-02.6): um
-- mesmo atleta_id nao pode aparecer em mais de um time simultaneamente
-- nesta chamada (ja bloqueado pela validacao `zod` da API,
-- `confirmarTimesBodySchema.superRefine` — esta checagem aqui e apenas a
-- segunda linha de defesa estrutural, errcode 'TM002').
--
-- ROLLBACK: DROP FUNCTION IF EXISTS app.confirmar_times_rodada(uuid, jsonb);
-- (aditiva por natureza — nenhuma tabela/coluna existente e alterada; bloco
-- listado mesmo assim por clareza, mesmo padrao ja usado nas demais
-- migrations deste projeto.)

create function app.confirmar_times_rodada(p_rodada_id uuid, p_times jsonb)
returns void
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_status text;
  v_time jsonb;
  v_time_id uuid;
  v_label text;
  v_atleta_id uuid;
  v_atletas_vistos uuid[] := '{}';
  v_substituicoes_existentes integer;
begin
  if p_times is null or jsonb_typeof(p_times) <> 'array' or jsonb_array_length(p_times) < 2 then
    raise exception 'p_times deve ser um array jsonb com ao menos 2 times.'
      using errcode = '22023';
  end if;

  select r.status into v_status
  from app.rodada r
  where r.id = p_rodada_id
  for update;

  if not found then
    raise exception 'Rodada % nao encontrada.', p_rodada_id
      using errcode = 'P0002';
  end if;

  if v_status = 'excluida' then
    raise exception
      'Rodada % ja foi excluida — nao e possivel confirmar times para uma rodada excluida.',
      p_rodada_id
      using errcode = 'RD001';
  end if;

  -- Bloqueia reconfirmacao/substituicao da divisao atual se ja existir
  -- app.substituicao registrada contra ela (fidelidade historica, RF-06.1)
  -- — ver nota de decisao no topo desta migration.
  select count(*) into v_substituicoes_existentes
  from app.substituicao s
  where s.rodada_id = p_rodada_id;

  if v_substituicoes_existentes > 0 then
    raise exception
      'Rodada % ja possui % substituicao(oes) registrada(s) contra a divisao de times atual — nao e possivel reconfirmar/substituir a divisao (fidelidade historica, RF-06.1).',
      p_rodada_id, v_substituicoes_existentes
      using errcode = 'TM001';
  end if;

  -- Reconfirmacao: substitui a divisao anterior por completo (delete +
  -- insert na mesma transacao) — seguro chegar aqui, ja confirmado acima
  -- que nenhuma substituicao referencia os times atuais desta rodada.
  delete from app.time_atleta
  where time_id in (select id from app.time where rodada_id = p_rodada_id);

  delete from app.time
  where rodada_id = p_rodada_id;

  for v_time in select * from jsonb_array_elements(p_times)
  loop
    v_label := v_time ->> 'label';
    if v_label is null or length(trim(v_label)) = 0 then
      raise exception 'label de time nao pode ser vazio.'
        using errcode = '22023';
    end if;

    if jsonb_array_length(coalesce(v_time -> 'atletas_ids', '[]'::jsonb)) = 0 then
      raise exception 'time "%": atletas_ids nao pode ser vazio.', v_label
        using errcode = '22023';
    end if;

    insert into app.time (rodada_id, label)
    values (p_rodada_id, v_label)
    returning id into v_time_id;

    for v_atleta_id in
      select t.val::uuid
      from jsonb_array_elements_text(v_time -> 'atletas_ids') as t(val)
    loop
      if v_atleta_id = any(v_atletas_vistos) then
        raise exception
          'Atleta % aparece em mais de um time simultaneamente — cada atleta pertence a exatamente um time.',
          v_atleta_id
          using errcode = 'TM002';
      end if;
      v_atletas_vistos := array_append(v_atletas_vistos, v_atleta_id);

      insert into app.time_atleta (time_id, atleta_id)
      values (v_time_id, v_atleta_id);
    end loop;
  end loop;
end;
$$;

comment on function app.confirmar_times_rodada(uuid, jsonb) is
  'BE-13 (escopo ampliado por decisao explicita do usuario, ver TASK.md). '
  'Persiste em app.time/app.time_atleta a divisao de times confirmada pelo '
  'organizador para uma rodada (RF-05.4), em uma unica transacao (delete da '
  'divisao anterior, se existir + insert da nova). Bloqueia reconfirmacao '
  'se ja existir app.substituicao registrada contra os times atuais da '
  'rodada (errcode TM001, fidelidade historica RF-06.1). errcode P0002 '
  '(rodada nao encontrada), RD001 (rodada excluida), TM002 (atleta em mais '
  'de um time simultaneamente, defesa em profundidade).';

revoke all on function app.confirmar_times_rodada(uuid, jsonb) from public;
revoke all on function app.confirmar_times_rodada(uuid, jsonb) from anon;
grant execute on function app.confirmar_times_rodada(uuid, jsonb) to service_role;
