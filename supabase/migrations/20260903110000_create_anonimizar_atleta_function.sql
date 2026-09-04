-- BE-07 (TASK.md Secao 3.1) — funcao `app.anonimizar_atleta` (ADR-011, LGPD
-- Art. 18): mecanismo de anonimizacao in-place da linha `app.atleta` a
-- pedido do titular. Mesmo padrao arquitetural do ADR-006 (TASK.md Secao 1.2
-- — "toda operacao que altera saldo/historico multi-tabela e implementada
-- como funcao/trigger PL/pgSQL rodando dentro de uma unica transacao
-- Postgres"): sobrescrita de `app.atleta` + desativacao de
-- `app.restricao_obrigatoria` + gravacao de `app.log_auditoria` acontecem
-- todas dentro da mesma chamada de funcao (uma unica transacao implicita),
-- nunca como sequencia de chamadas TypeScript separadas.
--
-- Decisoes de detalhe documentadas aqui, nenhuma escalada:
--
-- 1. `nome_completo` -> literal `'Atleta anonimizado'` e `apelido_exibicao`
--    -> `'Atleta #' || substring(id::text, 1, 8)` — texto exato do mecanismo
--    do ADR-011 ("Sobrescreve nome_completo -> 'Atleta anonimizado'" /
--    "Sobrescreve apelido_exibicao -> placeholder estavel e nao
--    identificavel (ex.: 'Atleta #' || substring(id::text, 1, 8))"). O
--    mockup do UX-SPEC.md (T04, revisao 2026-09-02) mostra um texto
--    ligeiramente diferente no wireframe ("[Atleta anonimizado #4821]" no
--    campo nome completo, "[Anônimo]" no apelido) — tratado aqui como
--    ilustracao visual do estado somente-leitura da tela, nao como
--    especificacao literal de string, ja que o ADR-011 (fonte primaria
--    desta funcao, conforme instrucao de execucao desta tarefa) e explicito
--    e determinístico nesse texto. Nenhuma reinterpretacao de ADR — apenas
--    a leitura mais literal de uma fonte contra um wireframe ilustrativo.
-- 2. Idempotencia/reentrancia: chamar a funcao para um atleta ja anonimizado
--    (`anonimizado_em is not null`) levanta excecao dedicada (`errcode =
--    'AN001'`) em vez de sobrescrever de novo silenciosamente — evita gerar
--    uma segunda entrada em `log_auditoria` para uma operacao que, por
--    desenho, e irreversivel e so deveria acontecer uma vez por atleta
--    (ADR-011, "Acao irreversivel — nao existe funcao inversa"). Decisao de
--    detalhe (nao exigida literalmente pelo criterio de aceite de BE-07, mas
--    consistente com TASK.md Secao 1.0 — "nunca lacuna silenciosa"; o
--    endpoint (BE-07, `app/api/atletas/[id]/anonimizar/route.ts`) traduz
--    isso em `409`).
-- 3. Atleta inexistente levanta excecao com `errcode = 'P0002'` (mesmo
--    codigo que o PL/pgSQL usa nativamente para "no_data_found" em SELECT
--    INTO STRICT — reaproveitado aqui de proposito por ja ser o codigo
--    convencional para esse significado) — o endpoint traduz em `404`.
-- 4. `SELECT ... FOR UPDATE` antes de checar `anonimizado_em` serializa
--    chamadas concorrentes para o MESMO atleta_id (a segunda chamada
--    aguarda a primeira transacao commitar antes de ler o valor mais
--    recente de `anonimizado_em`) — nunca duas chamadas concorrentes
--    conseguem gravar duas entradas de log/duas sobrescritas para o mesmo
--    atleta.
-- 5. `valores_antes` gravado em `log_auditoria` contem SOMENTE marcadores
--    redigidos (`'[REDACTED]'`) — a funcao nunca le nem atribui a nenhuma
--    variavel PL/pgSQL o valor real de `nome_completo`/`apelido_exibicao`/
--    `contato`/`data_nascimento` antes da sobrescrita (nao ha necessidade:
--    o UPDATE nao precisa do valor antigo para sobrescrever), entao o dado
--    pessoal real nunca existe em memoria de execucao desta funcao em
--    momento algum, muito menos e gravado (TASK.md Secao 1.5/GUARDRAILS.md
--    regra 20).
-- 6. Nao toca `lancamento_pontos`/`participacao_rodada`/`time_atleta`/
--    `substituicao`/`legado_migracao_registro` (nenhum destes e referenciado
--    nesta funcao) — o saldo/historico agregado do atleta permanece intacto
--    e consultavel pelo mesmo `atleta_id` (ADR-011).
-- 7. `set search_path = app, pg_temp` — mesmo que todo objeto referenciado ja
--    seja qualificado por schema (`app.atleta`, etc.), fixar o
--    `search_path` e defesa em profundidade padrao para funcao PL/pgSQL
--    (evita qualquer ambiguidade de resolucao de schema independente de
--    quem chama).
--
-- ROLLBACK: DROP FUNCTION IF EXISTS app.anonimizar_atleta(uuid);
-- (aditiva por natureza — nenhuma tabela/coluna existente e alterada; bloco
-- listado mesmo assim por clareza, mesmo padrao ja usado em
-- `20260902101300_create_public_views.sql`/`20260903100000_create_atleta_nivel_tecnico_view.sql`.)

create function app.anonimizar_atleta(p_atleta_id uuid)
returns void
language plpgsql
set search_path = app, pg_temp
as $$
declare
  v_ja_anonimizado boolean;
  v_novo_apelido text;
begin
  select (a.anonimizado_em is not null)
    into v_ja_anonimizado
  from app.atleta a
  where a.id = p_atleta_id
  for update;

  if not found then
    raise exception 'Atleta % nao encontrado.', p_atleta_id
      using errcode = 'P0002';
  end if;

  if v_ja_anonimizado then
    raise exception 'Atleta % ja foi anonimizado anteriormente.', p_atleta_id
      using errcode = 'AN001';
  end if;

  v_novo_apelido := 'Atleta #' || substring(p_atleta_id::text, 1, 8);

  update app.atleta
  set
    nome_completo = 'Atleta anonimizado',
    apelido_exibicao = v_novo_apelido,
    contato = null,
    data_nascimento = null,
    ativo = false,
    anonimizado_em = now()
  where id = p_atleta_id;

  -- ADR-011: "Desativa toda linha de RESTRICAO_OBRIGATORIA onde o atleta
  -- anonimizado seja atleta_a_id ou atleta_b_id" — mesmo padrao de
  -- soft-delete ja adotado em RN-11/RF-05.5 (BE-12).
  update app.restricao_obrigatoria
  set ativo = false, desativado_em = now()
  where (atleta_a_id = p_atleta_id or atleta_b_id = p_atleta_id)
    and ativo = true;

  insert into app.log_auditoria (atleta_id, tipo_evento, valores_antes, valores_depois)
  values (
    p_atleta_id,
    'anonimizacao',
    jsonb_build_object(
      'nome_completo', '[REDACTED]',
      'apelido_exibicao', '[REDACTED]',
      'contato', '[REDACTED]',
      'data_nascimento', '[REDACTED]'
    ),
    jsonb_build_object(
      'nome_completo', 'Atleta anonimizado',
      'apelido_exibicao', v_novo_apelido,
      'contato', null,
      'data_nascimento', null,
      'ativo', false
    )
  );
end;
$$;

comment on function app.anonimizar_atleta(uuid) is
  'BE-07/ADR-011 (LGPD Art. 18). Sobrescreve nome_completo/apelido_exibicao/'
  'contato/data_nascimento, marca ativo=false/anonimizado_em, desativa '
  'restricao_obrigatoria associada e grava log_auditoria (valores_antes só '
  'com marcadores redigidos) — tudo em uma unica transacao. Nunca toca '
  'lancamento_pontos/participacao_rodada/time_atleta/substituicao. '
  'Irreversivel por desenho (sem funcao inversa) — chamar de novo para um '
  'atleta ja anonimizado levanta excecao (errcode AN001) em vez de '
  'sobrescrever de novo.';

revoke all on function app.anonimizar_atleta(uuid) from public;
revoke all on function app.anonimizar_atleta(uuid) from anon;
grant execute on function app.anonimizar_atleta(uuid) to service_role;
