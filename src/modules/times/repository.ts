/**
 * Acesso a `app.atleta`/`app.atleta_nivel_tecnico`/`app.restricao_obrigatoria`
 * para o Serviço de Times (BE-11) — sempre via `getServiceRoleClient()`
 * (TASK.md Seção 1.2/GUARDRAILS.md regra 6: `anon` nunca lê/escreve estas
 * tabelas; toda leitura passa pela `service role` no servidor, atrás do
 * middleware de sessão).
 *
 * Consulta `app.atleta`/`app.atleta_nivel_tecnico` diretamente (mesma
 * projeção que `src/modules/atletas/repository.ts` já expõe, mas filtrada
 * por uma lista arbitrária de ids em vez de "todos os atletas") em vez de
 * chamar funções de `src/modules/atletas` uma a uma — mesmo racional já
 * usado por `buscarApelidosAtletas` em
 * `src/modules/times/restricoes/repository.ts` (BE-12), que também lê
 * `app.atleta` diretamente a partir de outro submódulo de `times` em vez de
 * importar o módulo de atletas.
 *
 * Puramente de LEITURA — nenhuma escrita em `app.time`/`app.time_atleta`
 * (ver nota de escopo em `montar.ts`/`route.ts`): a montagem de times não
 * altera saldo/histórico de pontuação de nenhum atleta, então não há
 * candidato a função/trigger PL/pgSQL aqui (TASK.md Seção 1.2 só exige isso
 * para operações que alteram saldo acumulado) — o algoritmo roda inteiro em
 * TypeScript porque backtracking/busca local são naturalmente mais simples
 * de expressar e testar fora do SQL, decisão de detalhe documentada
 * explicitamente aqui para não ficar como lacuna silenciosa (TASK.md Seção
 * 1.0).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type AtletaParaMontagemRow = {
  id: string;
  apelido_exibicao: string;
  data_nascimento: string | null;
  nivel_tecnico: number;
};

/**
 * Busca, para os ids informados, `apelido_exibicao`/`data_nascimento`
 * (RF-05.3 — base para a idade) e `nivel_tecnico` (RN-03, via
 * `app.atleta_nivel_tecnico`, mesma view criada por BE-06). Devolve só os
 * ids que de fato existem em `app.atleta` — a chamadora (`montar.ts`)
 * compara o tamanho do mapa devolvido contra `atletas_ids` para detectar
 * qualquer id inexistente e recusar com `404`, mesmo padrão de
 * `encontrarAtletaInexistente` em `src/modules/times/restricoes/mutate.ts`
 * (BE-12).
 */
export async function buscarAtletasParaMontagem(
  client: SupabaseClient<any, any, any>,
  ids: readonly string[],
): Promise<Map<string, AtletaParaMontagemRow>> {
  const idsUnicos = Array.from(new Set(ids));
  if (idsUnicos.length === 0) {
    return new Map();
  }

  const [atletasResultado, niveisResultado] = await Promise.all([
    client
      .from("atleta")
      .select("id, apelido_exibicao, data_nascimento")
      .in("id", idsUnicos),
    client
      .from("atleta_nivel_tecnico")
      .select("atleta_id, nivel_tecnico")
      .in("atleta_id", idsUnicos),
  ]);

  if (atletasResultado.error) {
    throw new Error(
      `Falha ao buscar app.atleta para montagem de times: ${atletasResultado.error.message}`,
    );
  }
  if (niveisResultado.error) {
    throw new Error(
      `Falha ao buscar app.atleta_nivel_tecnico para montagem de times: ${niveisResultado.error.message}`,
    );
  }

  const niveisPorId = new Map(
    (
      (niveisResultado.data ?? []) as unknown as Array<{
        atleta_id: string;
        nivel_tecnico: number;
      }>
    ).map((linha) => [linha.atleta_id, linha.nivel_tecnico]),
  );

  const resultado = new Map<string, AtletaParaMontagemRow>();
  for (const linha of (atletasResultado.data ?? []) as unknown as Array<{
    id: string;
    apelido_exibicao: string;
    data_nascimento: string | null;
  }>) {
    resultado.set(linha.id, {
      id: linha.id,
      apelido_exibicao: linha.apelido_exibicao,
      data_nascimento: linha.data_nascimento,
      // Fallback defensivo — mesma garantia estrutural (LEFT JOIN a partir
      // de `app.atleta`) já documentada em `src/modules/atletas/presenter.ts`
      // (BE-06): nunca deveria faltar, mas nunca deveria estourar 500 por um
      // problema puramente de exibição/equilíbrio se algum dia faltar.
      nivel_tecnico: niveisPorId.get(linha.id) ?? 0,
    });
  }
  return resultado;
}

export type RestricaoAtivaRow = {
  id: string;
  atleta_a_id: string;
  atleta_b_id: string;
};

/**
 * Restrições obrigatórias ATIVAS (RN-11) cujos dois lados estão dentro de
 * `atletasIds` — filtra no próprio banco por `ativo = true` e por cada lado
 * pertencer à lista de presentes (ADR-010, passo 1: "E = pares com registro
 * ativo... entre dois presentes"). Uma restrição envolvendo um atleta que
 * não está entre os presentes desta montagem é irrelevante para ela — é
 * descartada aqui, nunca chega ao algoritmo.
 */
export async function listarRestricoesAtivasEntre(
  client: SupabaseClient<any, any, any>,
  atletasIds: readonly string[],
): Promise<RestricaoAtivaRow[]> {
  if (atletasIds.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("restricao_obrigatoria")
    .select("id, atleta_a_id, atleta_b_id")
    .eq("ativo", true)
    .in("atleta_a_id", atletasIds)
    .in("atleta_b_id", atletasIds);
  if (error) {
    throw new Error(`Falha ao listar app.restricao_obrigatoria ativas: ${error.message}`);
  }
  return (data ?? []) as unknown as RestricaoAtivaRow[];
}
