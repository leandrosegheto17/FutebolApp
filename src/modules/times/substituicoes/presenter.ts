/**
 * Monta o payload de resposta de `POST`/`GET /api/rodadas/:id/substituicoes`
 * a partir do resultado de `mutate.ts`. Função pura, separada da
 * orquestração de I/O — mesmo racional de
 * `src/modules/times/restricoes/presenter.ts` (BE-12).
 */
import type { SubstituicaoRow } from "./repository";

const NOME_ATLETA_DESCONHECIDO = "Atleta desconhecido";

export type SubstituicaoResponse = {
  id: string;
  rodada_id: string;
  time_id: string;
  atleta_sai_id: string;
  atleta_sai_nome: string;
  atleta_entra_id: string;
  atleta_entra_nome: string;
  criado_em: string;
};

export function paraSubstituicaoResponse(
  substituicao: SubstituicaoRow,
  apelidos: ReadonlyMap<string, string>,
): SubstituicaoResponse {
  return {
    id: substituicao.id,
    rodada_id: substituicao.rodada_id,
    time_id: substituicao.time_id,
    atleta_sai_id: substituicao.atleta_sai_id,
    atleta_sai_nome: apelidos.get(substituicao.atleta_sai_id) ?? NOME_ATLETA_DESCONHECIDO,
    atleta_entra_id: substituicao.atleta_entra_id,
    atleta_entra_nome:
      apelidos.get(substituicao.atleta_entra_id) ?? NOME_ATLETA_DESCONHECIDO,
    criado_em: substituicao.criado_em,
  };
}

export function paraSubstituicoesResponse(
  substituicoes: readonly SubstituicaoRow[],
  apelidos: ReadonlyMap<string, string>,
): SubstituicaoResponse[] {
  return substituicoes.map((substituicao) =>
    paraSubstituicaoResponse(substituicao, apelidos),
  );
}
