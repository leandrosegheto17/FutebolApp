-- BE-14 (TASK.md Secao 3.1, L7) — trava tecnica complementar a RF-08.6 (Gate
-- 2 item 5, TASK.md Secao 6.2 item 6): "revogar privilegio de DROP/ALTER
-- destrutivo da role usada pela aplicacao sobre a schema legada, liberado so
-- apos flag de validacao explicita gravada em legado_migracao_registro/
-- tabela de controle". Depende so de BE-02 (schema `app` ja existe).
--
-- Contexto confirmado antes de escrever esta migration (nao especulativo):
-- este projeto Supabase e o MESMO projeto legado reaproveitado (ADR-002/008,
-- SDD.md Secao 1.1) — nao ha dois bancos fisicos. Introspeccao read-only do
-- projeto legado real (raiz OpenAPI do PostgREST, sem nenhuma escrita/
-- alteracao) confirma que a schema legada exposta e literalmente `public`
-- ("standard public schema", com tabelas como `goleiros`/`presencas_rodada`)
-- — a mesma schema `public` que ja existe, vazia, em qualquer stack local/CI
-- (`supabase start`/`supabase db reset`, imagem padrao do Postgres). Por
-- isso esta migration referencia `public` por nome com seguranca: e o MESMO
-- nome de schema nos dois ambientes, mesmo que o CONTEUDO (tabelas legadas
-- reais) so exista no projeto remoto — a trava em si (evento/REVOKE) e
-- generica e nao assume nenhuma tabela legada especifica presente.
--
-- ============================================================================
-- Decisao de detalhe 1 — POR QUE UM EVENT TRIGGER, NAO SO UM REVOKE (nao
-- escalada; o proprio criterio de aceite ja sugere esse caminho: "REVOKE
-- real... condicionado dinamicamente... ja que REVOKE puro nao e condicional
-- por padrao")
-- ============================================================================
-- Em Postgres, DROP TABLE/ALTER TABLE/DROP SCHEMA NAO sao privilegios que se
-- possa GRANT/REVOKE por tabela (os privilegios de tabela concediveis via
-- GRANT sao SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN
-- — nunca "DROP" ou "ALTER"). Remover/alterar estruturalmente um objeto
-- depende de ser o DONO do objeto (ou superusuario) — nao existe
-- `REVOKE DROP ON TABLE ...` na linguagem SQL do Postgres. Logo, a unica
-- forma de bloquear DROP/ALTER TABLE/DROP SCHEMA **no proprio motor do
-- banco** (nao so por convencao de processo/aplicacao) e interceptar o
-- proprio comando DDL antes de ele se efetivar — mecanismo de EVENT TRIGGER,
-- unico recurso nativo do Postgres para isso. Abordagem: event trigger em
-- `ddl_command_end` (nao `ddl_command_start`) — `pg_event_trigger_ddl_commands()`,
-- que da acesso a `schema_name`/`object_identity`/`command_tag` por comando
-- (necessario para filtrar exatamente pela schema legada), so e valida
-- dentro de um trigger de `ddl_command_end` (documentacao oficial do
-- Postgres: "pg_event_trigger_ddl_commands... when invoked in a function
-- attached to a ddl_command_end event trigger... if called in any other
-- context, an error is raised" — NAO funciona em `ddl_command_start`, apesar
-- de exemplos de terceiros por ai sugerirem o contrario). Levantar excecao
-- dentro de `ddl_command_end` ainda impede o comando de fato: DDL no
-- Postgres e transacional (diferente de outros bancos) — o comando inteiro
-- (incluindo as mudancas de catalogo ja aplicadas ate aquele ponto da mesma
-- transacao implicita/explicita) e revertido quando a excecao propaga,
-- entao "falha por permissao negada no proprio Postgres" e satisfeito de
-- forma literal: nenhuma linha de `pg_class`/`information_schema` muda,
-- confirmado pelo proprio teste de integracao desta tarefa.
-- Suportado sem superusuario real: o Supabase instala a extensao
-- `supautils` em todo projeto (local e hospedado), que concede a role
-- `postgres` (a mesma role usada por `supabase db push`/`db reset`, nao uma
-- role de aplicacao) permissao para `CREATE EVENT TRIGGER` sem exigir
-- superusuario literal — confirmado na documentacao oficial do Supabase
-- (https://supabase.com/docs/guides/database/postgres/event-triggers).
--
-- ============================================================================
-- Decisao de detalhe 2 — QUAL CAMPO REPRESENTA A "FLAG DE VALIDACAO
-- EXPLICITA" (nao escalada; TASK.md Secao 6.2 item 6 pede exatamente essa
-- decisao de detalhe caso o campo nao exista ainda)
-- ============================================================================
-- `app.legado_migracao_registro` (BE-02, SDD.md Secao 5) NAO serve para
-- isso por desenho: e uma tabela POR REGISTRO ("rastreia registro a
-- registro o mapeamento origem->destino", comentario da propria tabela em
-- `20260902101100_create_legado_migracao_registro_table.sql"), sem nenhuma
-- linha/campo que represente um unico evento GLOBAL e explicito de
-- "organizador validou o relatorio de conferencia" (RF-08.5: "...para
-- validacao explicita do organizador"; RF-08.6: "...enquanto o relatorio de
-- conferencia nao tiver sido validado explicitamente"). Criar uma tabela nova,
-- minima, dedicada a esse UNICO evento (`app.legado_migracao_validacao`) e
-- mais fiel ao criterio de aceite ("flag de validacao explicita gravada")
-- do que inferir a validacao a partir de um agregado de `status` das linhas
-- de `legado_migracao_registro` (isso mediria "toda linha migrada", nao "o
-- organizador confirmou explicitamente o relatorio" — RF-08.5 exige uma
-- acao humana explicita, distinta e posterior a migracao tecnica em si).
-- Padrao singleton identico ao ja usado por `app.auth_interno` (BE-04,
-- `20260903090000_create_auth_interno_table.sql`): `id smallint primary key
-- default 1 check (id = 1)` — o proprio Postgres impede uma segunda linha,
-- sem depender de disciplina de aplicacao. RN-12 (GUARDRAILS.md regra 18 —
-- nenhuma acao da area interna atribuida a pessoa fisica identificada):
-- nenhuma coluna de "validado_por"/autor individual.
-- Como a flag e gravada: nao ha endpoint HTTP novo nesta tarefa — RF-08.5/
-- RF-08.6 sao um evento operacional UNICO, na janela de execucao de BE-15
-- (nao uma feature recorrente da area interna), gravado via acesso direto
-- ao banco (`INSERT INTO app.legado_migracao_validacao (observacao) VALUES
-- (...)`, mesmo padrao ja decidido pelo Tech Lead para o procedimento de
-- redefinicao de senha unica, TASK.md Secao 6.2 item 4: "resolvido
-- operacionalmente via script/CLI de acesso direto ao banco (runbook),
-- sem introduzir fluxo novo na interface"). Se o Software Architect/CTO
-- decidirem no futuro que esse evento precisa de UI/endpoint dedicado (ex.:
-- botao "Validar migracao" na area interna), isso e um desvio de escopo
-- novo, fora desta tarefa (TASK.md Secao 1.0/GUARDRAILS.md regra 32).
--
-- ============================================================================
-- Decisao de detalhe 3 — ESCOPO DA TRAVA (aplicada a TODA role/conexao, nao
-- so a uma role de aplicacao especifica) — documentada, nao escalada
-- ============================================================================
-- O criterio de aceite fala em "role usada pela aplicacao", mas esta
-- aplicacao (Next.js, ADR-002/003) NUNCA abre conexao SQL bruta com o
-- Postgres em tempo de execucao — fala com o banco exclusivamente via
-- PostgREST/HTTP (`src/lib/supabase/server-client.ts`), que nem sequer
-- expoe um jeito de emitir DDL arbitrario (DROP/ALTER TABLE nao sao
-- operacoes de PostgREST). Quem de fato teria como emitir DROP/ALTER TABLE
-- contra a schema legada e um script/ferramenta com conexao Postgres direta
-- (`pg`, ja dependencia deste projeto; ou `supabase db push`/psql) — BE-15
-- (proxima tarefa desta cadeia) ou um acesso manual/administrativo. Como
-- Postgres nao tem como restringir DROP/ALTER "so para a role X" via GRANT
-- (Decisao 1 acima), a trava construida aqui (event trigger) protege a
-- schema `public` contra QUALQUER role/conexao (inclusive `postgres`,
-- inclusive um acesso administrativo direto) — estrutural e literalmente
-- mais forte do que "so a role de aplicacao", nunca mais fraca, satisfazendo
-- o espirito do criterio de aceite ("nao so por convencao de processo") de
-- forma mais robusta do que um REVOKE escopado a uma unica role permitiria
-- tecnicamente (mesmo se REVOKE de DROP/ALTER existisse, o que nao existe).
--
-- ============================================================================
-- Decisao de detalhe 4 — REVOKE complementar de escrita comum (INSERT/
-- UPDATE/DELETE/TRUNCATE), permanente, NUNCA reconcedido pela flag
-- [HISTORICO ORIGINAL — REVERTIDO, ver "CORRECAO (2026-09-04)" logo abaixo]
-- ============================================================================
-- Alem de DROP/ALTER (pedido literal do criterio de aceite), GUARDRAILS.md
-- regra 11 e mais ampla: "a schema legada permanece intocada (SOMENTE
-- LEITURA) ate validacao explicita". BE-15 (ADR-008) so LE da schema legada,
-- nunca escreve nela — entao revogar INSERT/UPDATE/DELETE/TRUNCATE das
-- roles padrao do Supabase (`anon`/`authenticated`/`service_role`) sobre
-- toda tabela da schema `public`, hoje e no futuro (`ALTER DEFAULT
-- PRIVILEGES`), e uma camada adicional de defesa em profundidade que reforca
-- o guardrail sem custo (nenhum fluxo legitimo depende de escrever ali).
-- Diferente do bloqueio de DROP/ALTER (Decisoes 1-3), este REVOKE E
-- PERMANENTE — a flag de validacao (RF-08.6) libera especificamente "a
-- operacao de arquivamento" (texto literal do criterio de aceite de BE-14),
-- nao escrita comum; nao ha necessidade de restaurar INSERT/UPDATE/DELETE
-- na schema legada em nenhum momento do ciclo de vida deste projeto.
-- Limite honesto desta camada (documentado, nao uma lacuna silenciosa):
-- `REVOKE ... ON ALL TABLES IN SCHEMA public` so alcanca as tabelas que ja
-- existem NO MOMENTO em que esta migration roda — nao e uma regra "viva"
-- que se reaplica automaticamente. `ALTER DEFAULT PRIVILEGES` cobre so
-- tabelas futuras criadas pela MESMA role que rodou este comando (a role
-- de migration, tipicamente `postgres`), retirando o GRANT implicito
-- automatico — mas nao impede um `GRANT` explicito futuro. Isso nao e um
-- problema para o caso real: a schema legada `public` do projeto
-- reaproveitado (ADR-002) JA EXISTE INTEIRA hoje, antes desta migration
-- rodar contra o projeto remoto — entao "todas as tabelas que ja existem
-- no momento em que a migration roda" cobre literalmente 100% da schema
-- legada real. Continua valendo, como sempre, a trava mais forte desta
-- tarefa (Decisoes 1-3, event trigger) para DROP/ALTER, que E dinamica por
-- natureza (reavalia a flag a cada tentativa, nao depende de quando rodou).
--
-- CORRECAO (2026-09-04, BE-14) — a suposicao acima estava ERRADA e a Secao 3
-- (o REVOKE/ALTER DEFAULT PRIVILEGES descrito acima) foi REMOVIDA por
-- inteiro desta migration. Motivo: a decisao acima foi escrita assumindo que
-- o app legado real (`FutebolRanking`) seria descontinuado em breve e que
-- "ninguem mais escreve" nas tabelas de `public` alem de BE-15 (que so LE).
-- O stakeholder confirmou, depois deste lote (L7) ja fechado, que o
-- `FutebolRanking` **continua no ar e em uso normal por tempo indeterminado**
-- (organizador lanca dado manualmente nos dois sistemas em paralelo, meses
-- possiveis, ate decidir por conta propria aposentar o legado) — e esse app
-- legado real (RLS desabilitado, confirmado no ADR-002/`LEGADO-SCHEMA.md`)
-- escreve nessas mesmas tabelas via uma das roles padrao do Supabase
-- (`anon`/`authenticated`/`service_role`). O REVOKE permanente acima, se
-- aplicado ao projeto remoto compartilhado, teria derrubado a capacidade de
-- escrita do app legado imediatamente — exatamente o que o stakeholder disse
-- explicitamente que nao pode acontecer. GUARDRAILS.md regra 11 ("somente
-- leitura ate validacao explicita") permanece correta sobre o que os
-- SCRIPTS DESTE PROJETO fazem (BE-15 so le, nunca foi alterado) — nunca foi,
-- e nunca poderia ser, uma regra que restrinja a operacao do proprio app
-- legado, que escreve em `public` por conta propria, fora do controle deste
-- projeto (ver GUARDRAILS.md regra 11, nota adicionada na mesma data). A
-- trava de DROP/ALTER TABLE/DROP SCHEMA (Decisoes 1-3, event trigger) NAO
-- muda com esta correcao — continua fazendo sentido e nao afeta a operacao
-- normal do app legado (ele nunca faz DDL em tempo de execucao); a flag de
-- validacao (RF-08.5/RF-08.6) passa a representar exclusivamente "o
-- organizador decidiu, no futuro, arquivar/remover a schema legada" — evento
-- manual e distante, nao consequencia automatica de BE-15.
--
-- ROLLBACK:
--   drop event trigger if exists trg_bloqueia_alter_schema_legada;
--   drop event trigger if exists trg_bloqueia_drop_schema_legada;
--   drop function if exists app.bloqueia_ddl_destrutivo_schema_legada();
--   drop trigger if exists trg_legado_migracao_validacao_no_delete on app.legado_migracao_validacao;
--   drop function if exists app.forbid_legado_migracao_validacao_delete();
--   drop table if exists app.legado_migracao_validacao cascade;
-- (aditiva por natureza -- nenhuma tabela/coluna ja existente e alterada;
-- bloco listado porque o arquivo contem os literais "DROP TABLE"/"DROP
-- SCHEMA" dentro do filtro WHEN TAG do event trigger, o que aciona o grep
-- mecanico do CI -- mesmo padrao ja usado em
-- 20260903150000_forbid_restricao_obrigatoria_delete.sql.)
--
-- CORRECAO (2026-09-04, BE-14): as duas linhas `grant insert, update, delete,
-- truncate .../alter default privileges ... grant ...` que existiam aqui,
-- revertendo o REVOKE permanente da antiga Secao 3, foram REMOVIDAS deste
-- bloco de rollback porque essa Secao 3 deixou de existir (ver comentario no
-- lugar onde ela estava, mais abaixo neste arquivo, e "Decisao de detalhe 4 —
-- CORRECAO" logo acima da antiga Secao 3). Nao ha mais nenhum REVOKE de
-- INSERT/UPDATE/DELETE/TRUNCATE aplicado por esta migration para reverter.

-- ----------------------------------------------------------------------------
-- 1. Tabela de controle — flag de validacao explicita (Decisao 2)
-- ----------------------------------------------------------------------------

create table app.legado_migracao_validacao (
  id smallint primary key default 1,
  validado_em timestamptz not null default now(),
  observacao text,
  constraint legado_migracao_validacao_singleton_check check (id = 1)
);

comment on table app.legado_migracao_validacao is
  'BE-14/RF-08.5/RF-08.6/ADR-008. Singleton (id fixo em 1, mesmo padrao de '
  'app.auth_interno) — existencia de UMA linha aqui e a flag de validacao '
  'explicita do organizador sobre o relatorio de conferencia (RF-08.5), que '
  'libera a operacao de arquivamento/DROP-ALTER destrutivo da schema legada '
  '`public` (RF-08.6, ver app.bloqueia_ddl_destrutivo_schema_legada). '
  'Gravada via acesso direto ao banco na janela de execucao de BE-15 '
  '(decisao de detalhe documentada nesta migration) — sem endpoint HTTP '
  'dedicado nesta tarefa. RN-12: sem coluna de autor/validado_por.';
comment on column app.legado_migracao_validacao.observacao is
  'Texto livre opcional (ex.: referencia ao relatorio de conferencia '
  'RF-08.5 revisado). Nunca dado pessoal do atleta.';

alter table app.legado_migracao_validacao enable row level security;

revoke all on app.legado_migracao_validacao from public;
revoke all on app.legado_migracao_validacao from anon;
grant select, insert, update on app.legado_migracao_validacao to service_role;

-- Imutavel apos gravada (mesmo racional/padrao ja usado em app.auth_interno,
-- app.atleta, app.lancamento_pontos, app.restricao_obrigatoria — nunca
-- exclusao fisica de um registro que representa fato/decisao consumado,
-- mesmo para service_role, mesmo com RLS bypassado).
create function app.forbid_legado_migracao_validacao_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'app.legado_migracao_validacao nunca e excluida fisicamente (BE-14/RF-08.6) — a validacao do organizador, uma vez gravada, e um fato permanente.';
end;
$$;

comment on function app.forbid_legado_migracao_validacao_delete() is
  'Bloqueia DELETE em app.legado_migracao_validacao incondicionalmente, '
  'mesmo para service_role — a flag de validacao (RF-08.5/RF-08.6), uma '
  'vez gravada, nunca e desfeita silenciosamente.';

create trigger trg_legado_migracao_validacao_no_delete
  before delete on app.legado_migracao_validacao
  for each row execute function app.forbid_legado_migracao_validacao_delete();

-- ----------------------------------------------------------------------------
-- 2. Event trigger — bloqueia DROP/ALTER TABLE e DROP SCHEMA na schema
--    legada `public` enquanto a flag de validacao nao existir (Decisoes 1/3)
-- ----------------------------------------------------------------------------

-- Achado empirico durante a validacao desta tarefa (TASK.md Secao 1.0 —
-- nunca lacuna silenciosa, documentado aqui em vez de assumido pela
-- documentacao de terceiros): `pg_event_trigger_ddl_commands()` (valida
-- dentro de `ddl_command_end`, per documentacao oficial do Postgres) NAO
-- reporta nenhuma linha para comandos DROP — reproduzido empiricamente
-- contra o Supabase local desta tarefa (`DROP TABLE` disparou o event
-- trigger normalmente, mas o loop sobre `pg_event_trigger_ddl_commands()`
-- nao encontrou nenhuma linha, entao nada era bloqueado). `ALTER TABLE`
-- funciona corretamente em `ddl_command_end` (linha reportada com
-- `schema_name` correto, confirmado empiricamente). Para DROP, o mecanismo
-- correto e OUTRO evento — `sql_drop` — com OUTRA funcao de sistema,
-- `pg_event_trigger_dropped_objects()` (tambem so valida dentro do proprio
-- contexto de `sql_drop`). Por isso esta funcao unica trata os dois eventos
-- separadamente, ramificando por `tg_event` (variavel especial disponivel
-- dentro de funcao de event trigger PL/pgSQL) — evita duplicar a logica de
-- "flag validada? senao verifica schema e levanta excecao" em duas funcoes.
create function app.bloqueia_ddl_destrutivo_schema_legada()
returns event_trigger
language plpgsql
security definer
set search_path = app, pg_temp
as $$
declare
  cmd record;
  obj record;
  v_validado boolean;
begin
  select exists(select 1 from app.legado_migracao_validacao) into v_validado;

  -- RF-08.6: apos a flag de validacao explicita ser gravada, a operacao de
  -- arquivamento (DROP/ALTER destrutivo da schema legada) passa a ser
  -- permitida — o proprio criterio de aceite literal desta tarefa.
  if v_validado then
    return;
  end if;

  if tg_event = 'ddl_command_end' then
    -- Cobre ALTER TABLE (ver achado empirico acima — DROP nao aparece aqui).
    for cmd in select * from pg_event_trigger_ddl_commands()
    loop
      if cmd.schema_name = 'public'
         or (cmd.object_type = 'schema' and cmd.object_identity = 'public')
      then
        raise exception
          using
            errcode = '42501', -- insufficient_privilege: o mesmo SQLSTATE que o Postgres usa nativamente para permissao negada — "falha por permissao negada no proprio Postgres", nao so mensagem de aplicacao (criterio de aceite literal de BE-14)
            message = format(
              'permissao negada: schema legada "public" esta protegida contra DROP/ALTER TABLE e DROP SCHEMA destrutivo ate a validacao explicita do relatorio de conferencia (RF-08.5/RF-08.6, GUARDRAILS.md regra 11). Grave a flag em app.legado_migracao_validacao antes de arquivar/remover a schema legada. Comando bloqueado: %s em %s.',
              cmd.command_tag,
              cmd.object_identity
            );
      end if;
    end loop;
  elsif tg_event = 'sql_drop' then
    -- Cobre DROP TABLE/DROP SCHEMA (achado empirico acima).
    for obj in select * from pg_event_trigger_dropped_objects()
    loop
      if obj.schema_name = 'public'
         or (obj.object_type = 'schema' and obj.object_identity = 'public')
      then
        raise exception
          using
            errcode = '42501',
            message = format(
              'permissao negada: schema legada "public" esta protegida contra DROP TABLE/DROP SCHEMA destrutivo ate a validacao explicita do relatorio de conferencia (RF-08.5/RF-08.6, GUARDRAILS.md regra 11). Grave a flag em app.legado_migracao_validacao antes de arquivar/remover a schema legada. Objeto bloqueado: %s (%s).',
              obj.object_identity,
              obj.object_type
            );
      end if;
    end loop;
  end if;
end;
$$;

comment on function app.bloqueia_ddl_destrutivo_schema_legada() is
  'BE-14/RF-08.6/GUARDRAILS.md regra 11. Funcao de event trigger unica, '
  'usada por dois event triggers (ddl_command_end para ALTER TABLE; '
  'sql_drop para DROP TABLE/DROP SCHEMA — pg_event_trigger_ddl_commands() '
  'nao reporta comandos DROP, achado empirico documentado no arquivo de '
  'migration), ramificando por tg_event. Bloqueia contra a schema legada '
  '`public`, para QUALQUER role/conexao (inclusive postgres/acesso direto '
  '— Postgres nao suporta REVOKE de DROP/ALTER por GRANT, ver comentario no '
  'topo do arquivo de migration), condicionado dinamicamente a existencia '
  'de uma linha em app.legado_migracao_validacao (RF-08.5). SECURITY '
  'DEFINER: o dono da funcao (quem rodou esta migration) e isento de RLS na '
  'propria tabela por padrao (Postgres so sujeita o dono a RLS com ALTER '
  'TABLE ... FORCE ROW LEVEL SECURITY, nao usado aqui de proposito), '
  'garantindo que a checagem da flag funcione independente de quem '
  'disparou o DDL bloqueado.';

revoke all on function app.bloqueia_ddl_destrutivo_schema_legada() from public;
revoke all on function app.bloqueia_ddl_destrutivo_schema_legada() from anon;
grant execute on function app.bloqueia_ddl_destrutivo_schema_legada() to service_role;

create event trigger trg_bloqueia_alter_schema_legada
  on ddl_command_end
  when tag in ('ALTER TABLE')
  execute function app.bloqueia_ddl_destrutivo_schema_legada();

create event trigger trg_bloqueia_drop_schema_legada
  on sql_drop
  when tag in ('DROP TABLE', 'DROP SCHEMA')
  execute function app.bloqueia_ddl_destrutivo_schema_legada();

comment on event trigger trg_bloqueia_alter_schema_legada is
  'BE-14/RF-08.6. Dispara em ALTER TABLE em todo o banco (ddl_command_end); '
  'a funcao associada so bloqueia (RAISE EXCEPTION) quando o alvo e a '
  'schema `public` (legada) e app.legado_migracao_validacao ainda esta '
  'vazia — nunca afeta a schema `app` (dominio novo) nem qualquer outra.';

comment on event trigger trg_bloqueia_drop_schema_legada is
  'BE-14/RF-08.6. Dispara em DROP TABLE/DROP SCHEMA em todo o banco '
  '(sql_drop — pg_event_trigger_ddl_commands() nao reporta DROP, por isso '
  'este e um event trigger separado do de ALTER TABLE, achado empirico '
  'documentado acima); a funcao associada so bloqueia quando o alvo e a '
  'schema `public` (legada) e app.legado_migracao_validacao ainda esta '
  'vazia — nunca afeta a schema `app` (dominio novo) nem qualquer outra.';

-- ----------------------------------------------------------------------------
-- 3. [REMOVIDA — CORRECAO 2026-09-04, BE-14] REVOKE complementar de escrita
--    comum sobre a schema legada — nao mais aplicado
-- ----------------------------------------------------------------------------
--
-- Esta secao continha, ate 2026-09-04, um `REVOKE INSERT, UPDATE, DELETE,
-- TRUNCATE ON ALL TABLES IN SCHEMA public` + `ALTER DEFAULT PRIVILEGES`
-- equivalente para tabelas futuras, aplicado permanentemente as roles
-- `anon`/`authenticated`/`service_role` (Decisao de detalhe 4, ver historico
-- completo e a nota de correcao logo acima, antes da Secao 2). Foi removida
-- por inteiro porque o stakeholder confirmou, apos este lote ja fechado, que
-- o app legado real (`FutebolRanking`) continua no ar e em uso normal por
-- tempo indeterminado, escrevendo diretamente nas mesmas tabelas de `public`
-- via uma dessas roles (RLS desabilitado no legado). Aplicar este REVOKE ao
-- projeto remoto compartilhado (ADR-002) derrubaria a escrita do app legado
-- imediatamente — o oposto do que o stakeholder pediu explicitamente. A
-- trava de DROP/ALTER/DROP SCHEMA da Secao 2 (event trigger) nao e afetada
-- por esta remocao e continua ativa normalmente.
