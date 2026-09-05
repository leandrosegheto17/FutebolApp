/**
 * Monta os payloads de resposta de `POST /api/rodadas` (BE-08),
 * `DELETE /api/rodadas/:id`/`PATCH /api/rodadas/:id/participacoes/:atletaId`
 * (BE-09) e `GET /api/rodadas`/`GET /api/rodadas/:id` (BE-16) a partir dos
 * resultados de `lancar.ts`/`excluir.ts`/`corrigir.ts`/`listar.ts`/
 * `detalhar.ts`. Funções puras, separadas da orquestração de I/O — mesmo
 * racional de `src/modules/atletas/presenter.ts`.
 */
import type { Confronto } from "./confronto";
import type { ParticipacaoDetalheResultado } from "./detalhar";
import type { ParticipacaoResultado } from "./lancar";
import type { RodadaResumoComConfrontoRow } from "./listar";
import type { RodadaRow } from "./repository";

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
 *
 * `confronto`/`status_correcao` (BE-R02, TASK.md Parte II Seção 3.1) —
 * "Confronto"/"Status" de T06 redesenhado (`UX-SPEC.md` Parte II Seção
 * 2.5), consumidos por `FE-R06`:
 * - `confronto`: `{ colete, sem_colete }` (placar agregado de pontos de gol
 *   por time daquela rodada, `confronto.ts`) ou `null` quando a rodada não
 *   tem exatamente 2 `app.time` persistidos — comportamento **padrão e
 *   esperado** para toda rodada de origem legado (`SPK-02`: `BE-15` não
 *   migrou `app.time`/`app.time_atleta` por cobertura de dado
 *   insuficiente), nunca um erro.
 * - `status_correcao`: `"corrigida"` quando existe ao menos uma entrada em
 *   `app.log_auditoria` para esta rodada (RF-04.4), `"encerrada"` caso
 *   contrário (TASK.md Parte II Seção 6.2-R item 5). **Campo novo,
 *   deliberadamente NÃO chamado `status`** — o critério de aceite literal
 *   de `BE-R02` usa esse nome, mas `status` já é publicado neste mesmo
 *   schema com um significado incompatível (`"lancada" | "excluida"`,
 *   estado de ciclo de vida da rodada em `app.rodada`, consumido por
 *   `FE-06`/Parte I, `RodadaListItem.tsx`); reaproveitar o nome trocando o
 *   tipo de valores seria uma mudança de contrato INCOMPATÍVEL disfarçada
 *   de aditiva. Desvio pequeno de nomenclatura resolvido e documentado
 *   aqui (não escalado) — mesmo padrão de "detalhe de implementação" já
 *   usado por BA/UX-UI/Tech Lead nesta cadeia.
 */
export type RodadaResumoResponse = {
  id: string;
  data: string;
  status: string;
  criado_em: string;
  presentes: number;
  confronto: Confronto | null;
  status_correcao: "encerrada" | "corrigida";
};

export function paraRodadaResumoResponse(
  rodada: RodadaResumoComConfrontoRow,
): RodadaResumoResponse {
  return {
    id: rodada.id,
    data: rodada.data,
    status: rodada.status,
    criado_em: rodada.criado_em,
    presentes: rodada.presentes,
    confronto: rodada.confronto,
    status_correcao: rodada.status_correcao,
  };
}

export function paraRodadasResumoResponse(
  rodadas: readonly RodadaResumoComConfrontoRow[],
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
