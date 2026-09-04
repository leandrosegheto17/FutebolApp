/**
 * Tipos do lado do Frontend para T07 (Correção/Estorno, detalhe de uma
 * rodada) — TASK.md FE-07. Espelham `RodadaDetalheResponse`/
 * `ParticipacaoDetalheItem` (`GET /api/rodadas/{id}`, BE-16),
 * `CorrigirParticipacaoBody`/`ParticipacaoCorrigidaResponse`
 * (`PATCH .../participacoes/{atletaId}`, BE-09) e
 * `PreviewCorrecaoParticipacaoResponse`
 * (`POST .../participacoes/{atletaId}/simular-correcao`, BE-10) de
 * `API-CONTRACT.yaml`, conferidos campo a campo contra o contrato real —
 * nenhum é mock a substituir depois.
 *
 * `StatusParticipacao`/`EventoJogoBody` reaproveitados de
 * `@/features/rodadas/types` (mesmo formato exato, mesma convenção de
 * reuso entre features já usada por `RodadaListItem.tsx`/FE-06 ao importar
 * `formatDataExibicao` de `@/features/rodadas/format`) — nenhum tipo
 * duplicado para o mesmo formato de dado.
 */
import type { EventoJogoBody, StatusParticipacao } from "@/features/rodadas/types";

export type {
  EventoJogoBody,
  StatusParticipacao,
  TipoEvento,
} from "@/features/rodadas/types";

/**
 * Uma participação dentro do detalhe de `GET /api/rodadas/{id}` (BE-16).
 * `apelido_exibicao` já resolvido pelo próprio endpoint (RN-06) — a tela de
 * correção nunca precisa de uma segunda chamada a `GET /api/atletas`.
 */
export interface ParticipacaoDetalheItem {
  atleta_id: string;
  apelido_exibicao: string;
  status: StatusParticipacao;
  eventos: EventoJogoBody[];
  /** Total líquido já gravado (soma de todos os lançamentos existentes). */
  pontos_delta: number;
}

/** Resposta de sucesso (`200`) de `GET /api/rodadas/{id}` (BE-16, T07). */
export interface RodadaDetalhe {
  id: string;
  data: string;
  status: "lancada" | "excluida";
  criado_em: string;
  participacoes: ParticipacaoDetalheItem[];
}

/**
 * Corpo de `PATCH .../participacoes/{atletaId}` (BE-09) e, sem nenhuma
 * mudança de forma, de `POST .../simular-correcao` (BE-10) — mesmo par
 * `(status, eventos)`, decisão de contrato já tomada pelo Backend (nenhum
 * schema duplicado no lado do Frontend).
 */
export interface CorrigirParticipacaoBody {
  status: StatusParticipacao;
  eventos: EventoJogoBody[];
}

/** Resposta de sucesso (`200`) de `PATCH .../participacoes/{atletaId}` (BE-09, RF-04.2). */
export interface ParticipacaoCorrigida {
  atleta_id: string;
  status: StatusParticipacao;
  eventos: EventoJogoBody[];
  pontos_delta: number;
}

/**
 * Resposta de sucesso (`200`) de `POST .../simular-correcao` (BE-10) —
 * ESTRITAMENTE read-only, nunca grava nada (ver `correcaoApi.ts`).
 */
export interface PreviewCorrecaoParticipacao {
  atleta_id: string;
  status_atual: StatusParticipacao;
  eventos_atuais: EventoJogoBody[];
  novo_status: StatusParticipacao;
  novos_eventos: EventoJogoBody[];
  pontos_antes: number;
  pontos_depois: number;
  pontos_delta: number;
}
