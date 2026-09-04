/**
 * Monta o payload de resposta da API de Restrições Obrigatórias (BE-12) a
 * partir da linha de `app.restricao_obrigatoria` + os apelidos de exibição
 * (RN-06) dos dois atletas do par. Função pura, separada da orquestração de
 * I/O dos Route Handlers — mesmo racional de `src/modules/atletas/presenter.ts`.
 *
 * Nomes de campo (`atleta_a_nome`/`atleta_b_nome`, via `apelido_exibicao`)
 * espelham de propósito o contrato `restricoes_conflitantes` do ADR-010
 * (que `BE-11` vai devolver a partir desta mesma tabela) — decisão de
 * consistência, não escalada, para minimizar retrabalho de mapeamento no
 * Frontend quando T09/T10 consumirem as duas respostas lado a lado.
 */
import type { RestricaoObrigatoriaRow } from "./repository";

export type RestricaoObrigatoriaResponse = {
  id: string;
  atleta_a_id: string;
  atleta_a_nome: string;
  atleta_b_id: string;
  atleta_b_nome: string;
  ativo: boolean;
  desativado_em: string | null;
  criado_em: string;
};

/**
 * Fallback defensivo (nunca deveria faltar — `criarRestricao`/
 * `editarRestricao` em `mutate.ts` já recusam gravar um id de atleta
 * inexistente antes de chegar aqui): se por algum motivo o mapa de apelidos
 * não tiver o id, usa este placeholder em vez de lançar exceção — nunca uma
 * lacuna silenciosa (TASK.md Seção 1.0), mas também nunca uma resposta 500
 * por um problema puramente de exibição.
 */
const NOME_ATLETA_DESCONHECIDO = "Atleta desconhecido";

export function paraRestricaoResponse(
  restricao: RestricaoObrigatoriaRow,
  apelidos: ReadonlyMap<string, string>,
): RestricaoObrigatoriaResponse {
  return {
    id: restricao.id,
    atleta_a_id: restricao.atleta_a_id,
    atleta_a_nome: apelidos.get(restricao.atleta_a_id) ?? NOME_ATLETA_DESCONHECIDO,
    atleta_b_id: restricao.atleta_b_id,
    atleta_b_nome: apelidos.get(restricao.atleta_b_id) ?? NOME_ATLETA_DESCONHECIDO,
    ativo: restricao.ativo,
    desativado_em: restricao.desativado_em,
    criado_em: restricao.criado_em,
  };
}

export function paraRestricoesResponse(
  restricoes: readonly RestricaoObrigatoriaRow[],
  apelidos: ReadonlyMap<string, string>,
): RestricaoObrigatoriaResponse[] {
  return restricoes.map((restricao) => paraRestricaoResponse(restricao, apelidos));
}
