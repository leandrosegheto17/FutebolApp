/**
 * Acesso a `app.substituicao`/`app.time`/`app.atleta` para o Serviço de
 * Substituições (BE-13, RF-06) — sempre via `getServiceRoleClient()`
 * (TASK.md Seção 1.2/GUARDRAILS.md regra 6: `anon` nunca lê/escreve estas
 * tabelas; toda leitura/escrita passa pela `service role` no servidor,
 * atrás do middleware de sessão).
 *
 * Operação simples de INSERT/SELECT sobre uma única tabela por chamada
 * (nunca escreve em `app.lancamento_pontos` nem em qualquer tabela de
 * saldo, RF-06.3) — por isso, ao contrário de `app.confirmar_times_rodada`
 * (`../confirmacao`), não precisa de função/trigger PL/pgSQL dedicada: cada
 * gravação desta tarefa é uma única linha numa única tabela, já atômica por
 * natureza de uma única chamada HTTP ao PostgREST (TASK.md Seção 1.2 só
 * exige função/trigger dedicada para operação que altera saldo/histórico
 * multi-tabela do atleta) — mesmo racional já aplicado ao CRUD de
 * `app.restricao_obrigatoria` (BE-12) e `app.atleta` (BE-06).
 *
 * `buscarApelidosAtletas` é duplicado aqui (em vez de importado de
 * `../restricoes`) por decisão de detalhe consistente com o racional já
 * documentado em `../repository.ts` (BE-11, sobre `buscarApelidosAtletas`
 * em `../restricoes/repository.ts`): cada submódulo de `times` lê
 * `app.atleta` diretamente, em vez de depender de um submódulo irmão.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type TimeRow = {
  id: string;
  rodada_id: string;
  label: string;
};

/** Busca um time por id (`app.time`). `null` se não existir. */
export async function buscarTimePorId(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<TimeRow | null> {
  const { data, error } = await client
    .from("time")
    .select("id, rodada_id, label")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao buscar app.time ${id}: ${error.message}`);
  }
  return (data as unknown as TimeRow | null) ?? null;
}

export type SubstituicaoRow = {
  id: string;
  rodada_id: string;
  time_id: string;
  atleta_sai_id: string;
  atleta_entra_id: string;
  criado_em: string;
};

export type NovaSubstituicao = {
  rodada_id: string;
  time_id: string;
  atleta_sai_id: string;
  atleta_entra_id: string;
};

const SUBSTITUICAO_COLUNAS =
  "id, rodada_id, time_id, atleta_sai_id, atleta_entra_id, criado_em";

/**
 * Registra uma substituição (RF-06.1) — sem limite de quantidade por rodada
 * (RF-06.2, nenhuma checagem de teto aqui, "sempre permitir múltiplas
 * substituições... sem limite fixo"). Nunca escreve em nenhuma outra
 * tabela — puramente registro de fidelidade histórica (RF-06.3), nenhuma
 * FK/trigger desta tabela altera `app.lancamento_pontos` (BE-02).
 */
export async function inserirSubstituicao(
  client: SupabaseClient<any, any, any>,
  dados: NovaSubstituicao,
): Promise<SubstituicaoRow> {
  const { data, error } = await client
    .from("substituicao")
    .insert({
      rodada_id: dados.rodada_id,
      time_id: dados.time_id,
      atleta_sai_id: dados.atleta_sai_id,
      atleta_entra_id: dados.atleta_entra_id,
    })
    .select(SUBSTITUICAO_COLUNAS)
    .single();
  if (error) {
    throw new Error(`Falha ao inserir app.substituicao: ${error.message}`);
  }
  return data as unknown as SubstituicaoRow;
}

/**
 * Lista todas as substituições de uma rodada (RF-06.2 — sem limite), mais
 * antiga primeiro — mesma ordem cronológica do wireframe T11 do
 * `UX-SPEC.md` ("Substituições registradas").
 */
export async function listarSubstituicoesPorRodada(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<SubstituicaoRow[]> {
  const { data, error } = await client
    .from("substituicao")
    .select(SUBSTITUICAO_COLUNAS)
    .eq("rodada_id", rodadaId)
    .order("criado_em", { ascending: true });
  if (error) {
    throw new Error(
      `Falha ao listar app.substituicao da rodada ${rodadaId}: ${error.message}`,
    );
  }
  return (data ?? []) as unknown as SubstituicaoRow[];
}

/** `id -> apelido_exibicao` (RN-06) dos atletas informados — usado para a resposta denormalizada. */
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
