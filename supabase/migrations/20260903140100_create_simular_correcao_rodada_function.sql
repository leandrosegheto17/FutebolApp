-- BE-10 (TASK.md Secao 3.1) — funcao `app.simular_correcao_rodada`
-- (preview de impacto de correcao, decisao de detalhe documentada em
-- TASK.md Secao 6.2 item 2: "endpoint dedicado, RPC read-only
-- simular_correcao_rodada (BE-10), nao calculo no cliente" — motivo:
-- `app.configuracao_pontuacao` e versionada em banco, duplicar a leitura no
-- Frontend criaria risco de divergencia entre o preview e o resultado real
-- da correcao).
--
-- ESTRITAMENTE READ-ONLY: o corpo desta funcao nao contem NENHUM INSERT/
-- UPDATE/DELETE, em nenhum ponto, mesmo hipoteticamente — nao existe
-- "transacao com rollback" aqui, a funcao simplesmente nunca grava nada.
-- Delega 100% do calculo (mesma leitura de vigencia de
-- `app.configuracao_pontuacao` NA DATA DA RODADA + soma dos lancamentos
-- existentes vs. o novo valor hipotetico) ao helper criado nesta mesma
-- tarefa, `app.calcular_correcao_participacao_rodada`
-- (`20260903140000_create_calcular_correcao_participacao_rodada_function.sql`)
-- — a MESMA query usada por `app.corrigir_participacao_rodada` (BE-09, que
-- grava), nunca uma copia. Isso garante, por construcao, que "chamar a
-- funcao com um valor hipotetico novo retorna o delta de pontos calculado
-- sem gravar nenhuma linha nova" (criterio de aceite literal desta tarefa)
-- e que "usa a mesma tabela configuracao_pontuacao vigente que a correcao
-- real usaria" (idem) — nao ha como o preview divergir da correcao real
-- para o mesmo cenario, porque os dois caminhos de codigo convergem no
-- mesmo helper.
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. Contrato de entrada IDENTICO ao de `app.corrigir_participacao_rodada`
--    (`p_rodada_id`, `p_atleta_id`, `p_novo_status`, `p_novos_eventos` —
--    mesmo formato jsonb de `p_novos_eventos` documentado na migration de
--    BE-09) — o "valor hipotetico novo" do criterio de aceite e o par
--    (status, eventos) que o organizador esta considerando aplicar via
--    `PATCH /api/rodadas/:id/participacoes/:atletaId` (BE-09).
-- 2. Retorno (via OUT params, mesmo padrao Postgres do helper): `atleta_id`
--    (eco do parametro, conveniencia para quem consome via HTTP sem
--    precisar re-anexar o id na resposta), `status_atual`/`eventos_atuais`
--    (estado hoje, antes de qualquer correcao), `novo_status`/`novos_eventos`
--    (eco do hipotetico informado), `pontos_antes` (total liquido ja
--    gravado), `pontos_depois` (novo total hipotetico) e `pontos_delta` (a
--    DIFERENCA — exatamente o que `app.corrigir_participacao_rodada`
--    gravaria como `lancamento_pontos.pontos_delta` se esta simulacao fosse
--    de fato aplicada). Nomeado `pontos_delta` (nao `ajuste_aplicado`) por
--    ser o termo ja usado no criterio de aceite literal desta tarefa ("o
--    delta de pontos calculado").
-- 3. Mesmos `errcode`s do helper (`P0002`/`RD001`/`RD002`/`RF026`/`RN005`/
--    `22023`) — um cenario que a simulacao recusa e um cenario que a
--    correcao real (BE-09) tambem recusaria, e vice-versa (mesma validacao,
--    um unico lugar, ver migration do helper).
-- 4. `SELECT ... FOR UPDATE` (dentro do helper chamado por esta funcao) NAO
--    e uma escrita de dado — e uma clausula de LEITURA com bloqueio de
--    linha (nao insere/atualiza/remove nenhuma linha); o lock e liberado
--    automaticamente ao final desta unica chamada RPC (transacao implicita,
--    nenhum `BEGIN`/`COMMIT` explicito do lado cliente). Mantido de
--    proposito para que o preview reflita exatamente o mesmo estado
--    consistente que uma correcao real veria (ver decisao de detalhe 3 da
--    migration do helper).
-- 5. `set search_path = app, pg_temp` — mesma defesa em profundidade padrao
--    ja usada em todas as funcoes deste projeto.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS app.simular_correcao_rodada(uuid, uuid, text, jsonb);
-- (aditiva por natureza — nenhuma tabela/coluna/funcao existente e
-- alterada por este arquivo; bloco listado mesmo assim por clareza, mesmo
-- padrao ja usado nas demais migrations deste projeto.)

create function app.simular_correcao_rodada(
  p_rodada_id uuid,
  p_atleta_id uuid,
  p_novo_status text,
  p_novos_eventos jsonb,
  out atleta_id uuid,
  out status_atual text,
  out eventos_atuais jsonb,
  out novo_status text,
  out novos_eventos jsonb,
  out pontos_antes numeric,
  out pontos_depois numeric,
  out pontos_delta numeric
)
returns record
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_calc record;
begin
  select *
    into v_calc
  from app.calcular_correcao_participacao_rodada(
    p_rodada_id, p_atleta_id, p_novo_status, p_novos_eventos
  );

  atleta_id := p_atleta_id;
  status_atual := v_calc.o_status_atual;
  eventos_atuais := v_calc.o_eventos_atual;
  novo_status := p_novo_status;
  novos_eventos := coalesce(p_novos_eventos, '[]'::jsonb);
  pontos_antes := v_calc.o_pontos_antes;
  pontos_depois := v_calc.o_pontos_depois;
  pontos_delta := v_calc.o_delta;
end;
$$;

comment on function app.simular_correcao_rodada(uuid, uuid, text, jsonb) is
  'BE-10 (preview read-only de RF-04.2, TASK.md Secao 6.2 item 2). Calcula '
  'o delta de pontos que app.corrigir_participacao_rodada aplicaria para o '
  'mesmo (status, eventos) hipotetico, SEM gravar nenhuma linha em nenhuma '
  'tabela — delega 100% do calculo a app.calcular_correcao_participacao_rodada '
  '(mesma query de app.corrigir_participacao_rodada, nunca duplicada). '
  'Mesmos errcodes de corrigir_participacao_rodada '
  '(P0002/RD001/RD002/RF026/RN005/22023).';

revoke all on function app.simular_correcao_rodada(uuid, uuid, text, jsonb) from public;
revoke all on function app.simular_correcao_rodada(uuid, uuid, text, jsonb) from anon;
grant execute on function app.simular_correcao_rodada(uuid, uuid, text, jsonb) to service_role;
