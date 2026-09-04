/**
 * Acesso a `app.restricao_obrigatoria` (BE-12, RF-05.5/RN-11) — sempre via
 * `getServiceRoleClient()` (TASK.md Seção 1.2/GUARDRAILS.md regra 6: `anon`
 * nunca escreve nem lê a tabela base; toda leitura/escrita passa pela
 * `service role` no servidor, atrás do middleware de sessão).
 *
 * Operação simples de CRUD sobre uma única tabela (não altera saldo
 * acumulado nem histórico multi-tabela do atleta) — por isso, ao contrário
 * de `app.lancar_rodada`/`app.corrigir_participacao_rodada`/
 * `app.anonimizar_atleta`, não exige função/trigger PL/pgSQL dedicada
 * (TASK.md Seção 1.2 só obriga isso para operações que alteram saldo
 * acumulado de atleta) — mesmo racional já aplicado ao CRUD de
 * `app.atleta` em `src/modules/atletas/repository.ts` (BE-06).
 *
 * Soft-delete (RN-11, critério de aceite literal de BE-12: "Desativar uma
 * restrição preserva o registro histórico com `desativado_em`, nunca
 * exclui fisicamente"): nenhuma função aqui emite `DELETE` — reforçado
 * estruturalmente também no banco por um trigger dedicado (migration
 * `20260903150000_forbid_restricao_obrigatoria_delete.sql`), mesmo padrão
 * já usado em `app.atleta`/`app.lancamento_pontos` (GUARDRAILS.md regras
 * 8/9).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RestricaoObrigatoriaRow = {
  id: string;
  atleta_a_id: string;
  atleta_b_id: string;
  ativo: boolean;
  desativado_em: string | null;
  criado_em: string;
};

export type NovaRestricao = {
  atleta_a_id: string;
  atleta_b_id: string;
};

const RESTRICAO_COLUNAS = "id, atleta_a_id, atleta_b_id, ativo, desativado_em, criado_em";

/**
 * Lista todas as restrições (ativas e desativadas — UX-SPEC.md T10: "histórico
 * permanece visível... nunca excluído fisicamente da tela"), ativas primeiro,
 * mais recente para mais antiga dentro de cada grupo — decisão de detalhe de
 * ordenação (não exigida literalmente pelo critério de aceite), não escalada.
 */
export async function listarRestricoes(
  client: SupabaseClient<any, any, any>,
): Promise<RestricaoObrigatoriaRow[]> {
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .select(RESTRICAO_COLUNAS)
    .order("ativo", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) {
    throw new Error(`Falha ao listar app.restricao_obrigatoria: ${error.message}`);
  }
  return (data ?? []) as unknown as RestricaoObrigatoriaRow[];
}

/** Busca uma restrição por id. `null` se não existir. */
export async function buscarRestricaoPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<RestricaoObrigatoriaRow | null> {
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .select(RESTRICAO_COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao buscar app.restricao_obrigatoria ${id}: ${error.message}`);
  }
  return (data as unknown as RestricaoObrigatoriaRow | null) ?? null;
}

/** Cria uma restrição (RF-05.5) — sempre `ativo=true`/`desativado_em=null` (default da coluna). */
export async function inserirRestricao(
  client: SupabaseClient<any, any, any>,
  dados: NovaRestricao,
): Promise<RestricaoObrigatoriaRow> {
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .insert({ atleta_a_id: dados.atleta_a_id, atleta_b_id: dados.atleta_b_id })
    .select(RESTRICAO_COLUNAS)
    .single();
  if (error) {
    throw new Error(`Falha ao inserir app.restricao_obrigatoria: ${error.message}`);
  }
  return data as unknown as RestricaoObrigatoriaRow;
}

/**
 * Atualiza o par `(atleta_a_id, atleta_b_id)` de uma restrição já cadastrada
 * (RF-05.5 — "editar"). Nunca altera `ativo`/`desativado_em` (mecanismos
 * próprios de `desativarRestricaoPorId`/`reativarRestricaoPorId` abaixo,
 * mesmo racional de `atualizarAtletaPorId` em `src/modules/atletas/repository.ts`
 * nunca tocar `ativo`/`anonimizado_em`). `null` se o id não existir.
 */
export async function atualizarRestricaoPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
  dados: NovaRestricao,
): Promise<RestricaoObrigatoriaRow | null> {
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .update({ atleta_a_id: dados.atleta_a_id, atleta_b_id: dados.atleta_b_id })
    .eq("id", id)
    .select(RESTRICAO_COLUNAS)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Falha ao atualizar app.restricao_obrigatoria ${id}: ${error.message}`,
    );
  }
  return (data as unknown as RestricaoObrigatoriaRow | null) ?? null;
}

/**
 * Desativa uma restrição (RF-05.5/RN-11, soft-delete — nunca `DELETE`):
 * marca `ativo=false`/`desativado_em=now()`. `null` se o id não existir.
 * Idempotente: se já estava desativada, devolve a linha como está, sem
 * sobrescrever `desativado_em` de novo — preserva a data original da
 * primeira desativação como o registro histórico real (RN-11), em vez de
 * "mover" a data a cada nova chamada.
 */
export async function desativarRestricaoPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<RestricaoObrigatoriaRow | null> {
  const atual = await buscarRestricaoPorId(client, id);
  if (!atual) {
    return null;
  }
  if (!atual.ativo) {
    return atual;
  }
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .update({ ativo: false, desativado_em: new Date().toISOString() })
    .eq("id", id)
    .select(RESTRICAO_COLUNAS)
    .single();
  if (error) {
    throw new Error(
      `Falha ao desativar app.restricao_obrigatoria ${id}: ${error.message}`,
    );
  }
  return data as unknown as RestricaoObrigatoriaRow;
}

/**
 * Reativa uma restrição previamente desativada: marca `ativo=true`/
 * `desativado_em=null`. Decisão de detalhe (não escalada, ver nota de
 * status de BE-12 no `TASK.md`): RF-05.5/RN-11 (PRD-TECNICO.md) só citam
 * literalmente "cadastrar, editar e desativar", mas o `UX-SPEC.md` (T10,
 * wireframe) já desenha um botão "Reativar" para toda restrição
 * desativada — ao contrário da anonimização de atleta (ADR-011,
 * explicitamente "irreversível por desenho, sem função inversa"), RN-11
 * não descreve a desativação de restrição como irreversível; reativar é
 * simplesmente o inverso operacional do mesmo toggle `ativo`, então
 * implementá-lo aqui evita deixar T10 (FE-10) sem endpoint de suporte para
 * um botão que o `UX-SPEC.md` já aprovou. Idempotente pelo mesmo motivo de
 * `desativarRestricaoPorId`. `null` se o id não existir.
 */
export async function reativarRestricaoPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<RestricaoObrigatoriaRow | null> {
  const atual = await buscarRestricaoPorId(client, id);
  if (!atual) {
    return null;
  }
  if (atual.ativo) {
    return atual;
  }
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .update({ ativo: true, desativado_em: null })
    .eq("id", id)
    .select(RESTRICAO_COLUNAS)
    .single();
  if (error) {
    throw new Error(
      `Falha ao reativar app.restricao_obrigatoria ${id}: ${error.message}`,
    );
  }
  return data as unknown as RestricaoObrigatoriaRow;
}

/**
 * `id -> apelido_exibicao` (RN-06) dos atletas informados — usado tanto
 * para montar a resposta denormalizada (`atleta_a_nome`/`atleta_b_nome`,
 * mesmos nomes de campo do contrato `restricoes_conflitantes` do ADR-010,
 * que `BE-11` vai consumir a partir desta mesma tabela) quanto para validar
 * que `atleta_a_id`/`atleta_b_id` referenciam atletas existentes antes de
 * um `INSERT`/`UPDATE` (`mutate.ts`) — um id ausente do mapa devolvido
 * aqui não existe em `app.atleta`. Não filtra por `ativo` de propósito:
 * mesmo um atleta anonimizado (ADR-011, `apelido_exibicao` já sobrescrito
 * para o placeholder estável) continua tendo uma linha válida — a
 * restrição associada a ele já foi desativada automaticamente pela própria
 * `anonimizar_atleta` (BE-07), então esta função não precisa (nem deve)
 * recusar a leitura do nome placeholder.
 */
export async function buscarApelidosAtletas(
  client: SupabaseClient<any, any, any>,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const idsUnicos = Array.from(new Set(ids));
  if (idsUnicos.length === 0) {
    return new Map();
  }
  const { data, error } = await client
    .from("atleta")
    .select("id, apelido_exibicao")
    .in("id", idsUnicos);
  if (error) {
    throw new Error(`Falha ao buscar apelido_exibicao de atletas: ${error.message}`);
  }
  return new Map(
    ((data ?? []) as unknown as Array<{ id: string; apelido_exibicao: string }>).map(
      (linha) => [linha.id, linha.apelido_exibicao],
    ),
  );
}
