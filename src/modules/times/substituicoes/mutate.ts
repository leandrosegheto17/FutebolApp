/**
 * Orquestração de escrita do Serviço de Substituições (BE-13, RF-06) —
 * combina a checagem de existência do time (precisa pertencer à rodada da
 * URL) e dos dois atletas envolvidos com a gravação em `app.substituicao`
 * (`repository.ts`). Separado dos Route Handlers
 * (`app/api/rodadas/[id]/substituicoes/route.ts`) para ser testável sem
 * montar um `Request`/`NextResponse` — mesmo racional de
 * `src/modules/times/restricoes/mutate.ts` (BE-12).
 *
 * RF-06.3 (substituição nunca gera pontuação): nenhuma função aqui toca
 * `app.lancamento_pontos` ou qualquer outra tabela de saldo — a única
 * escrita de todo este módulo é o `INSERT` em `app.substituicao`
 * (`repository.ts#inserirSubstituicao`).
 *
 * RN-12 (sem hierarquia/campo de autor): nenhuma função aqui recebe ou
 * verifica identidade de quem chama — mesmo racional já documentado em
 * `../restricoes/mutate.ts` (BE-12).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buscarApelidosAtletas,
  buscarTimePorId,
  inserirSubstituicao,
  listarSubstituicoesPorRodada,
  type SubstituicaoRow,
} from "./repository";
import type { SubstituicaoBody } from "./validation";

export type ResultadoRegistrarSubstituicao =
  | { tipo: "sucesso"; substituicao: SubstituicaoRow; apelidos: Map<string, string> }
  | { tipo: "time_nao_encontrado" }
  | { tipo: "atleta_nao_encontrado"; atletaId: string };

/**
 * Registra uma substituição vinculada à rodada `rodadaId` (RF-06.1 — "o
 * sistema deve vincular esse evento à rodada e ao time correspondente"). O
 * `time_id` do corpo precisa pertencer a essa mesma rodada — um `time_id`
 * de outra rodada (ou inexistente) é tratado como "não encontrado" (`404`),
 * mesmo padrão de escopo por path já usado em
 * `app/api/rodadas/[id]/participacoes/[atletaId]` (BE-09).
 *
 * Não verifica se `atleta_sai_id` de fato integra este time
 * (`app.time_atleta`) — decisão de detalhe, não escalada: nem RF-06.1 nem
 * RF-06.2/RF-06.3 exigem essa checagem adicional (o critério de aceite
 * literal de BE-13 cobre apenas "não altera saldo", "sem limite" e "sai ≠
 * entra"); inventar essa regra extra seria além do critério de aceite
 * literal (TASK.md Seção 1.0 — solução mais simples que satisfaz o
 * critério), então fica registrado aqui como decisão consciente, não uma
 * lacuna silenciosa.
 */
export async function registrarSubstituicao(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  dados: SubstituicaoBody,
): Promise<ResultadoRegistrarSubstituicao> {
  const time = await buscarTimePorId(client, dados.time_id);
  if (!time || time.rodada_id !== rodadaId) {
    return { tipo: "time_nao_encontrado" };
  }

  const apelidos = await buscarApelidosAtletas(client, [
    dados.atleta_sai_id,
    dados.atleta_entra_id,
  ]);
  if (!apelidos.has(dados.atleta_sai_id)) {
    return { tipo: "atleta_nao_encontrado", atletaId: dados.atleta_sai_id };
  }
  if (!apelidos.has(dados.atleta_entra_id)) {
    return { tipo: "atleta_nao_encontrado", atletaId: dados.atleta_entra_id };
  }

  const substituicao = await inserirSubstituicao(client, {
    rodada_id: rodadaId,
    time_id: dados.time_id,
    atleta_sai_id: dados.atleta_sai_id,
    atleta_entra_id: dados.atleta_entra_id,
  });

  return { tipo: "sucesso", substituicao, apelidos };
}

/** Lista as substituições de uma rodada (RF-06.2), já com apelidos resolvidos (RN-06). */
export async function listarSubstituicoesComApelidos(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<{ substituicoes: SubstituicaoRow[]; apelidos: Map<string, string> }> {
  const substituicoes = await listarSubstituicoesPorRodada(client, rodadaId);
  const idsAtletas = substituicoes.flatMap((substituicao) => [
    substituicao.atleta_sai_id,
    substituicao.atleta_entra_id,
  ]);
  const apelidos = await buscarApelidosAtletas(client, idsAtletas);
  return { substituicoes, apelidos };
}
