/**
 * Monta os payloads de resposta de `POST /api/rodadas` (BE-08),
 * `DELETE /api/rodadas/:id`/`PATCH /api/rodadas/:id/participacoes/:atletaId`
 * (BE-09) e `GET /api/rodadas`/`GET /api/rodadas/:id` (BE-16) a partir dos
 * resultados de `lancar.ts`/`excluir.ts`/`corrigir.ts`/`listar.ts`/
 * `detalhar.ts`. Funções puras, separadas da orquestração de I/O — mesmo
 * racional de `src/modules/atletas/presenter.ts`.
 */
import type { ParticipacaoDetalheResultado } from "./detalhar";
import type { ParticipacaoResultado } from "./lancar";
import type { RodadaResumoRow, RodadaRow } from "./repository";

export type RodadaResponse = {
  id: string;
  data: string;
  status: string;
  criado_em: string;
  participacoes: ParticipacaoResultado[];
};

export function paraRodadaResponse(
  rodada: RodadaRow,
  participacoes: ParticipacaoResultado[],
): RodadaResponse {
  return {
    id: rodada.id,
    data: rodada.data,
    status: rodada.status,
    criado_em: rodada.criado_em,
    participacoes,
  };
}

/** Resposta de sucesso de `DELETE /api/rodadas/:id` (BE-09, RF-04.1). */
export type RodadaExcluidaResponse = {
  id: string;
  data: string;
  status: string;
  atletas_afetados: number;
};

export function paraRodadaExcluidaResponse(
  rodada: RodadaRow,
  atletasAfetados: number,
): RodadaExcluidaResponse {
  return {
    id: rodada.id,
    data: rodada.data,
    status: rodada.status,
    atletas_afetados: atletasAfetados,
  };
}

/**
 * Um item de `GET /api/rodadas` (BE-16, T06 do `UX-SPEC.md`) — lista
 * cronológica decrescente de rodadas. `presentes` é o único campo além dos
 * já publicados por `RodadaResponse`/`RodadaExcluidaResponse`
 * (`id`/`data`/`status`/`criado_em`), literal do wireframe T06
 * ("19/09/2026 · 18 presentes").
 */
export type RodadaResumoResponse = {
  id: string;
  data: string;
  status: string;
  criado_em: string;
  presentes: number;
};

export function paraRodadaResumoResponse(rodada: RodadaResumoRow): RodadaResumoResponse {
  return {
    id: rodada.id,
    data: rodada.data,
    status: rodada.status,
    criado_em: rodada.criado_em,
    presentes: rodada.presentes,
  };
}

export function paraRodadasResumoResponse(
  rodadas: readonly RodadaResumoRow[],
): RodadaResumoResponse[] {
  return rodadas.map(paraRodadaResumoResponse);
}

/**
 * Uma participação dentro do detalhe de `GET /api/rodadas/:id` (BE-16, T07
 * do `UX-SPEC.md`) — `apelido_exibicao` (RN-06) para exibição direta na
 * tela de correção ("Carlinhos"), sem o Frontend precisar de uma segunda
 * chamada a `GET /api/atletas` só para resolver o nome.
 */
export type ParticipacaoDetalheResponse = {
  atleta_id: string;
  apelido_exibicao: string;
  status: string;
  eventos: Array<{ tipo: string; quantidade: number }>;
  pontos_delta: number;
};

export type RodadaDetalheResponse = {
  id: string;
  data: string;
  status: string;
  criado_em: string;
  participacoes: ParticipacaoDetalheResponse[];
};

export function paraRodadaDetalheResponse(
  rodada: RodadaRow,
  participacoes: readonly ParticipacaoDetalheResultado[],
): RodadaDetalheResponse {
  return {
    id: rodada.id,
    data: rodada.data,
    status: rodada.status,
    criado_em: rodada.criado_em,
    participacoes: participacoes.map((participacao) => ({
      atleta_id: participacao.atleta_id,
      apelido_exibicao: participacao.apelido_exibicao,
      status: participacao.status,
      eventos: participacao.eventos,
      pontos_delta: participacao.pontos_delta,
    })),
  };
}
