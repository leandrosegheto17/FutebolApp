-- BE-12 (TASK.md Secao 3.1, RF-05.5/RN-11) — reforco estrutural de "nunca
-- exclusao fisica de restricao_obrigatoria" (RN-11, criterio de aceite
-- literal de BE-12: "Desativar uma restricao preserva o registro
-- historico com desativado_em, nunca exclui fisicamente") no proprio
-- banco, mesmo padrao ja adotado em app.atleta (GUARDRAILS.md regra 9,
-- migration 20260902100100_create_atleta_table.sql) e
-- app.lancamento_pontos (GUARDRAILS.md regra 8, migration
-- 20260902100800_create_lancamento_pontos_table.sql): bloqueia DELETE
-- incondicionalmente, valido mesmo para service_role (trigger executa
-- independente de RLS bypass) — a API (`app/api/restricoes/*`, BE-12)
-- nunca emite DELETE, apenas UPDATE (ativo=false/desativado_em, soft-
-- delete, `src/modules/times/restricoes/repository.ts`), entao este
-- trigger nunca colide com o comportamento normal da aplicacao; existe soh
-- como segunda camada de defesa contra um DELETE acidental/direto no
-- banco.
--
-- Decisao de detalhe (nao escalada, ver nota de status de BE-12 no
-- TASK.md): RN-11/RF-05.5 nao tem um numero de regra dedicado no
-- GUARDRAILS.md (diferente de atleta/regra 9 e lancamento_pontos/regra 8),
-- mas o criterio de aceite literal de BE-12 e a propria RN-11
-- (PRD-TECNICO.md) exigem exatamente a mesma garantia estrutural —
-- reaproveitar o padrao ja estabelecido pelas duas tabelas irmas evita uma
-- segunda convencao paralela para o mesmo tipo de garantia dentro do
-- mesmo projeto.
--
-- ROLLBACK: DROP TRIGGER IF EXISTS trg_restricao_obrigatoria_no_delete ON
-- app.restricao_obrigatoria; DROP FUNCTION IF EXISTS
-- app.forbid_restricao_obrigatoria_delete(); -- aditiva por natureza
-- (nenhuma tabela/coluna existente e alterada) — bloco listado mesmo assim
-- por clareza, mesmo padrao ja usado em
-- 20260903110000_create_anonimizar_atleta_function.sql.

create function app.forbid_restricao_obrigatoria_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'app.restricao_obrigatoria nunca e excluida fisicamente (RN-11/RF-05.5, BE-12) — use a desativacao (ativo=false/desativado_em) via POST /api/restricoes/{id}/desativar.';
end;
$$;

comment on function app.forbid_restricao_obrigatoria_delete() is
  'Bloqueia DELETE em app.restricao_obrigatoria incondicionalmente, mesmo '
  'para service_role (trigger executa independente de RLS bypass) — '
  'reforco estrutural do soft-delete exigido por RN-11/RF-05.5 (BE-12), '
  'mesmo padrao ja adotado em app.atleta/app.lancamento_pontos.';

create trigger trg_restricao_obrigatoria_no_delete
  before delete on app.restricao_obrigatoria
  for each row execute function app.forbid_restricao_obrigatoria_delete();
