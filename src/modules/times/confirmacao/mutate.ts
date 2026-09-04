/**
 * Orquestração de `POST /api/rodadas/:id/times` (escopo ampliado desta
 * execução de BE-13, ver nota de status no `TASK.md`) — combina a checagem
 * de existência dos atletas informados (reaproveitando
 * `buscarAtletasParaMontagem` de `../repository`, já usada por BE-11) com a
 * persistência atômica via RPC (`confirmarTimesRodadaViaRpc`,
 * `./repository.ts`) e a releitura do resultado gravado. Separado do Route
 * Handler (`app/api/rodadas/[id]/times/route.ts`) para ser testável sem
 * montar um `Request`/`NextResponse` — mesmo racional já usado em todos os
 * módulos deste projeto (`src/modules/times/montar.ts`,
 * `src/modules/times/restricoes/mutate.ts`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarAtletasParaMontagem } from "../repository";
import {
  confirmarTimesRodadaViaRpc,
  listarAtletasDosTimes,
  listarTimesDaRodada,
  type TimeConfirmadoInput,
} from "./repository";
import type { ConfirmarTimesBody } from "./validation";

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * "Time A"/"Time B"/... por posição (0-based) — mesmo texto do wireframe
 * T09 (`UX-SPEC.md`), usado quando o organizador não personaliza `label`
 * (decisão de detalhe, não escalada: nem RF-05.4 nem o `UX-SPEC.md` exigem
 * um `label` explícito no corpo da requisição de confirmação). Além da
 * letra Z (índice 25, MAX_QUANTIDADE_TIMES=10 nunca chega lá), cai para
 * "Time <número>" como salvaguarda determinística.
 */
function gerarLabelPadrao(indice: number): string {
  const letra = LETRAS[indice] ?? String(indice + 1);
  return `Time ${letra}`;
}

export type TimeConfirmadoComAtletas = {
  time_id: string;
  label: string;
  atletas: Array<{ atleta_id: string; apelido_exibicao: string }>;
};

export type ResultadoConfirmarTimes =
  | { tipo: "sucesso"; rodadaId: string; times: TimeConfirmadoComAtletas[] }
  | { tipo: "atleta_nao_encontrado"; atletaId: string }
  | { tipo: "rodada_nao_encontrada" }
  | { tipo: "rodada_excluida" }
  | { tipo: "substituicao_existente"; mensagem: string };

/** `errcode`s levantados por `app.confirmar_times_rodada` (ver migration). */
const ERRCODE_RODADA_NAO_ENCONTRADA = "P0002";
const ERRCODE_RODADA_EXCLUIDA = "RD001";
const ERRCODE_SUBSTITUICAO_EXISTENTE = "TM001";

/**
 * Confirma/persiste a divisão de times de uma rodada (RF-05.4). Checa a
 * existência de todos os atletas informados ANTES de chamar a RPC (mesmo
 * padrão de `montarSugestaoTimes`/BE-11, devolve `404` sem sequer tentar
 * gravar) — a função PL/pgSQL não repete essa checagem porque
 * `app.time_atleta.atleta_id references app.atleta(id)` já garante
 * integridade referencial estrutural como rede de segurança adicional.
 */
export async function confirmarTimes(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  body: ConfirmarTimesBody,
): Promise<ResultadoConfirmarTimes> {
  const todosAtletasIds = body.times.flatMap((time) => time.atletas_ids);
  const atletasPorId = await buscarAtletasParaMontagem(client, todosAtletasIds);
  const idAusente = todosAtletasIds.find((id) => !atletasPorId.has(id));
  if (idAusente) {
    return { tipo: "atleta_nao_encontrado", atletaId: idAusente };
  }

  const timesParaRpc: TimeConfirmadoInput[] = body.times.map((time, indice) => ({
    label: time.label ?? gerarLabelPadrao(indice),
    atletas_ids: time.atletas_ids,
  }));

  const resultadoRpc = await confirmarTimesRodadaViaRpc(client, rodadaId, timesParaRpc);
  if ("erro" in resultadoRpc) {
    if (resultadoRpc.erro.code === ERRCODE_RODADA_NAO_ENCONTRADA) {
      return { tipo: "rodada_nao_encontrada" };
    }
    if (resultadoRpc.erro.code === ERRCODE_RODADA_EXCLUIDA) {
      return { tipo: "rodada_excluida" };
    }
    if (resultadoRpc.erro.code === ERRCODE_SUBSTITUICAO_EXISTENTE) {
      return { tipo: "substituicao_existente", mensagem: resultadoRpc.erro.message };
    }
    throw new Error(
      `Falha ao confirmar times da rodada ${rodadaId}: ${resultadoRpc.erro.message}`,
    );
  }

  const timesGravados = await listarTimesDaRodada(client, rodadaId);
  const timeIds = timesGravados.map((time) => time.id);
  const associacoes = await listarAtletasDosTimes(client, timeIds);

  const atletasIdsPorTime = new Map<string, string[]>();
  for (const associacao of associacoes) {
    const lista = atletasIdsPorTime.get(associacao.time_id) ?? [];
    lista.push(associacao.atleta_id);
    atletasIdsPorTime.set(associacao.time_id, lista);
  }

  const times: TimeConfirmadoComAtletas[] = timesGravados.map((time) => ({
    time_id: time.id,
    label: time.label,
    atletas: (atletasIdsPorTime.get(time.id) ?? []).map((atletaId) => ({
      atleta_id: atletaId,
      // Sempre presente na prática — os atletas gravados são exatamente os
      // que acabaram de ser validados/enviados acima; fallback defensivo
      // (nunca deveria acontecer) para nunca estourar 500 por um problema
      // puramente de exibição (mesmo padrão de `nivel_tecnico: niveisPorId.get(...) ?? 0`
      // em `../repository.ts`).
      apelido_exibicao: atletasPorId.get(atletaId)?.apelido_exibicao ?? atletaId,
    })),
  }));

  return { tipo: "sucesso", rodadaId, times };
}
