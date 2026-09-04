/**
 * Monta o payload de resposta de `POST /api/times/sugestao` (BE-11) a partir
 * do resultado de `montar.ts`. Função pura, separada da orquestração de I/O
 * dos Route Handlers — mesmo racional de `src/modules/atletas/presenter.ts`/
 * `src/modules/times/restricoes/presenter.ts`.
 *
 * Caso `status: "conflito"`: contrato de dado EXATO do ADR-010 (`TASK.md`
 * Seção 1.4 — "não um formato simplificado"), incluindo os nomes de campo
 * (`restricoes_conflitantes`/`grupos_conflito`/`atleta_a_nome`/
 * `atleta_b_nome`) já espelhados por `RestricaoObrigatoriaResponse` (BE-12).
 * Caso `status: "ok"`: formato aditivo — ADR-010 diz apenas que "segue o
 * formato já implícito no ADR-007 (times sugeridos + indicadores de
 * equilíbrio)" sem detalhar o schema exato, então o shape abaixo é uma
 * decisão de detalhe desta tarefa, não escalada.
 */
import type { Componente } from "./grafo";
import type { AtletaParaMontagem } from "./busca-local";

export type SugestaoTimesOkResponse = {
  status: "ok";
  quantidade_times_solicitada: number;
  times: Array<{
    indice: number;
    atletas: Array<{
      atleta_id: string;
      apelido_exibicao: string;
      nivel_tecnico: number;
      idade: number | null;
    }>;
    nivel_tecnico_medio: number;
    idade_media: number | null;
  }>;
};

export type RestricaoConflitanteResponse = {
  restricao_id: string;
  atleta_a_id: string;
  atleta_a_nome: string;
  atleta_b_id: string;
  atleta_b_nome: string;
  motivo: "restricao_obrigatoria_ativa";
  grupo_conflito: number;
};

export type GrupoConflitoResponse = {
  grupo_conflito: number;
  atletas_ids: string[];
  quantidade_times_solicitada: number;
  mensagem: string;
};

export type SugestaoTimesConflitoResponse = {
  status: "conflito";
  restricoes_conflitantes: RestricaoConflitanteResponse[];
  grupos_conflito: GrupoConflitoResponse[];
};

const NOME_ATLETA_DESCONHECIDO = "Atleta desconhecido";

function media(valores: readonly number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((acumulado, valor) => acumulado + valor, 0) / valores.length;
}

export function paraSugestaoOkResponse(
  times: readonly AtletaParaMontagem[][],
  quantidadeTimes: number,
): SugestaoTimesOkResponse {
  return {
    status: "ok",
    quantidade_times_solicitada: quantidadeTimes,
    times: times.map((time, indice) => {
      const idadesValidas = time
        .map((atleta) => atleta.idade)
        .filter((idade): idade is number => idade !== null);
      const nivelMedio = media(time.map((atleta) => atleta.nivelTecnico));
      const idadeMedia = idadesValidas.length === 0 ? null : media(idadesValidas);
      return {
        indice,
        atletas: time.map((atleta) => ({
          atleta_id: atleta.atletaId,
          apelido_exibicao: atleta.apelidoExibicao,
          nivel_tecnico: atleta.nivelTecnico,
          idade: atleta.idade,
        })),
        nivel_tecnico_medio: Number(nivelMedio.toFixed(2)),
        idade_media: idadeMedia === null ? null : Number(idadeMedia.toFixed(1)),
      };
    }),
  };
}

/**
 * `grupos` já vem em ordem determinística de `calcularComponentesConexos`
 * (`grafo.ts`) — `grupo_conflito` (1-based, ADR-010) é atribuído nessa
 * mesma ordem, então a mesma entrada sempre produz os mesmos números de
 * grupo (ADR-007: "determinístico").
 */
export function paraSugestaoConflitoResponse(
  grupos: readonly Componente[],
  quantidadeTimes: number,
  apelidos: ReadonlyMap<string, string>,
): SugestaoTimesConflitoResponse {
  const restricoesConflitantes: RestricaoConflitanteResponse[] = [];
  const gruposConflito: GrupoConflitoResponse[] = [];

  grupos.forEach((grupo, indice) => {
    const grupoConflito = indice + 1;
    for (const aresta of grupo.arestas) {
      restricoesConflitantes.push({
        restricao_id: aresta.restricaoId,
        atleta_a_id: aresta.atletaAId,
        atleta_a_nome: apelidos.get(aresta.atletaAId) ?? NOME_ATLETA_DESCONHECIDO,
        atleta_b_id: aresta.atletaBId,
        atleta_b_nome: apelidos.get(aresta.atletaBId) ?? NOME_ATLETA_DESCONHECIDO,
        motivo: "restricao_obrigatoria_ativa",
        grupo_conflito: grupoConflito,
      });
    }
    gruposConflito.push({
      grupo_conflito: grupoConflito,
      atletas_ids: grupo.vertices,
      quantidade_times_solicitada: quantidadeTimes,
      mensagem:
        `Com ${quantidadeTimes} time(s) disponível(is), não é possível separar os ` +
        `${grupo.vertices.length} atletas deste grupo sem que alguma restrição ` +
        `obrigatória fique violada.`,
    });
  });

  return {
    status: "conflito",
    restricoes_conflitantes: restricoesConflitantes,
    grupos_conflito: gruposConflito,
  };
}
