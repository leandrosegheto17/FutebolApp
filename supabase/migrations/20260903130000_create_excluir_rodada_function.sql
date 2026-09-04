-- BE-09 (TASK.md Secao 3.1) — funcao `app.excluir_rodada` (RF-04.1, RN-04):
-- exclusao (soft-delete) de uma rodada ja lancada, com reversao automatica de
-- 100% dos pontos daquela rodada para todos os atletas afetados. Mesmo
-- padrao arquitetural do ADR-006 (TASK.md Secao 1.2 — "toda operacao que
-- altera saldo/historico multi-tabela e implementada como funcao/trigger
-- PL/pgSQL rodando dentro de uma unica transacao Postgres"): insercao dos
-- lancamentos de estorno + marcacao de `rodada.status = 'excluida'` +
-- gravacao de `log_auditoria` acontecem TODOS dentro da mesma chamada de
-- funcao (uma unica transacao implicita) — nunca como sequencia de chamadas
-- TypeScript separadas.
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. `app.lancamento_pontos` e ledger append-only (GUARDRAILS.md regra 8) —
--    o estorno NUNCA edita/remove os lancamentos originais (`origem =
--    'lancamento'`); insere, para cada atleta que participou da rodada, um
--    NOVO lancamento (`origem = 'estorno'`) cujo `pontos_delta` e o
--    NEGATIVO da soma liquida ja gravada para aquele `(atleta_id,
--    rodada_id)` ate este momento (soma de TODOS os lancamentos daquele
--    atleta nesta rodada, nao so o lancamento original — cobre tambem o
--    caso de uma rodada que ja tenha sofrido uma correcao antes de ser
--    excluida). Depois do estorno, `sum(pontos_delta) where atleta_id=X and
--    rodada_id=Y` e sempre exatamente 0 — reversao de 100% dos pontos
--    (criterio de aceite literal desta tarefa), verificavel diretamente no
--    ledger.
-- 2. `app.ranking_publico` (BE-03) soma `pontos_delta` de TODOS os
--    `lancamento_pontos` do atleta, sem filtrar por `rodada.status` (nao ha
--    join com `rodada` na subquery de saldo) — por isso o estorno via novo
--    lancamento e o UNICO mecanismo que de fato reverte o saldo publico;
--    marcar `rodada.status = 'excluida'` sozinho NAO reverteria pontos
--    (view so usa `rodada.status` para excluir presenca/cartao das
--    contagens, nao da soma de pontos).
-- 3. `app.participacao_rodada`/`app.evento_jogo` (presenca, gols, cartoes)
--    NAO sao apagados/alterados por esta funcao — permanecem como registro
--    historico fiel do que de fato ocorreu naquela rodada (mesma filosofia
--    nao-destrutiva de ADR-006/008/011 aplicada por analogia, ja usada por
--    `rodada.status` desde a migration de BE-02: "a funcao de correcao/
--    exclusao... reverte pontos via novos lancamentos... e marca status =
--    'excluida'"). O efeito pratico de "excluida" sobre presenca/cartao
--    publico ja e garantido pelas views de BE-03 (filtram `r.status =
--    'lancada'` nas contagens de presenca/cartao/lista de presentes), sem
--    exigir nenhuma mutacao adicional aqui.
-- 4. `app.substituicao` (RF-06) nunca gera pontuacao propria (RF-06.3) —
--    nao ha efeito numerico a reverter. RF-04.3 ("reverter/ajustar tambem
--    os efeitos de substituicoes/eventos vinculados") e satisfeita para
--    substituicao por transitividade: a rodada a que ela pertence passa a
--    `status = 'excluida'`, e a contagem de substituicoes vinculadas entra
--    no proprio `log_auditoria` desta operacao (`substituicoes_vinculadas`,
--    abaixo) para transparencia/rastreabilidade (RF-04.4) — nenhuma linha
--    de `substituicao` e apagada ou alterada (preserva fidelidade
--    historica, RF-06.1).
-- 5. Reentrancia: excluir uma rodada ja `status = 'excluida'` levanta
--    excecao dedicada (`errcode = 'RD001'`) em vez de gravar um segundo
--    conjunto de estornos/segunda entrada de log para a mesma exclusao —
--    mesmo racional de idempotencia ja usado por `app.anonimizar_atleta`
--    (BE-07, `errcode = 'AN001'`). O endpoint traduz isso em `409`.
-- 6. Rodada inexistente levanta `errcode = 'P0002'` (mesmo codigo
--    convencional ja reaproveitado por `app.anonimizar_atleta`, BE-07) — o
--    endpoint traduz em `404`.
-- 7. `SELECT ... FOR UPDATE` na rodada serializa chamadas concorrentes para
--    a MESMA rodada (mesmo padrao de `app.anonimizar_atleta`) — nunca duas
--    chamadas concorrentes conseguem estornar/logar a mesma rodada duas
--    vezes.
-- 8. `valores_antes`/`valores_depois` de `log_auditoria` (RF-04.4) gravam,
--    para esta operacao, `status` antes/depois da rodada, a lista de
--    `{atleta_id, pontos_revertidos}` por atleta afetado, o total de
--    atletas afetados e o total de substituicoes vinculadas (item 4 acima)
--    — UMA UNICA entrada de log por operacao de exclusao (nao uma por
--    atleta), consistente com RF-04.4 ("o sistema deve registrar UMA
--    entrada de log de auditoria") e com o wireframe do `UX-SPEC.md` T08
--    ("Rodada 29/08/2026 — exclusao (20 atletas afetados)").
-- 9. `set search_path = app, pg_temp` — mesma defesa em profundidade padrao
--    ja usada em `app.anonimizar_atleta`/`app.lancar_rodada`.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS app.excluir_rodada(uuid);
-- (aditiva por natureza — nenhuma tabela/coluna existente e alterada; bloco
-- listado mesmo assim por clareza, mesmo padrao ja usado nas demais
-- migrations deste projeto.)

create function app.excluir_rodada(p_rodada_id uuid)
returns void
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_status_atual text;
  v_atleta record;
  v_net numeric;
  v_total_atletas integer := 0;
  v_total_substituicoes integer;
  v_pontos_revertidos jsonb := '[]'::jsonb;
begin
  select r.status into v_status_atual
  from app.rodada r
  where r.id = p_rodada_id
  for update;

  if not found then
    raise exception 'Rodada % nao encontrada.', p_rodada_id
      using errcode = 'P0002';
  end if;

  if v_status_atual = 'excluida' then
    raise exception 'Rodada % ja foi excluida anteriormente.', p_rodada_id
      using errcode = 'RD001';
  end if;

  for v_atleta in
    select distinct pr.atleta_id
    from app.participacao_rodada pr
    where pr.rodada_id = p_rodada_id
  loop
    select coalesce(sum(lp.pontos_delta), 0) into v_net
    from app.lancamento_pontos lp
    where lp.atleta_id = v_atleta.atleta_id
      and lp.rodada_id = p_rodada_id;

    insert into app.lancamento_pontos (atleta_id, rodada_id, origem, pontos_delta)
    values (v_atleta.atleta_id, p_rodada_id, 'estorno', -v_net);

    v_pontos_revertidos := v_pontos_revertidos || jsonb_build_object(
      'atleta_id', v_atleta.atleta_id,
      'pontos_revertidos', -v_net
    );
    v_total_atletas := v_total_atletas + 1;
  end loop;

  select count(*) into v_total_substituicoes
  from app.substituicao s
  where s.rodada_id = p_rodada_id;

  update app.rodada
  set status = 'excluida'
  where id = p_rodada_id;

  insert into app.log_auditoria (rodada_id, tipo_evento, valores_antes, valores_depois)
  values (
    p_rodada_id,
    'estorno',
    jsonb_build_object('status', v_status_atual),
    jsonb_build_object(
      'status', 'excluida',
      'atletas_afetados', v_total_atletas,
      'pontos_revertidos', v_pontos_revertidos,
      'substituicoes_vinculadas', v_total_substituicoes
    )
  );
end;
$$;

comment on function app.excluir_rodada(uuid) is
  'BE-09 (RF-04.1, RN-04). Exclui (soft-delete, status=excluida) uma rodada '
  'ja lancada e reverte 100% dos pontos daquela rodada para todos os '
  'atletas afetados via novos lancamentos de estorno (ledger append-only, '
  'ADR-006) — nunca UPDATE/DELETE em lancamento_pontos ja gravado. Grava '
  'exatamente uma entrada em log_auditoria por operacao (sem campo de '
  'autor, RN-12). Reentrada numa rodada ja excluida levanta excecao '
  '(errcode RD001) em vez de estornar/logar de novo.';

revoke all on function app.excluir_rodada(uuid) from public;
revoke all on function app.excluir_rodada(uuid) from anon;
grant execute on function app.excluir_rodada(uuid) to service_role;
