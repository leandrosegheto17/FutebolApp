import { assertSessionAlive } from "@/features/sessao";
import type {
  CorrigirParticipacaoBody,
  ParticipacaoCorrigida,
  PreviewCorrecaoParticipacao,
  RodadaDetalhe,
} from "./types";

/**
 * Cliente HTTP de T07 (Correção/Estorno, detalhe) — TASK.md FE-07. Todos os
 * três endpoints consumidos aqui são **reais**, já `Concluída` (BE-16/BE-09/
 * BE-10) — nenhum é mock a substituir depois. Mesmo padrão de
 * `request()`/`assertSessionAlive` já usado por `historicoApi.ts`/
 * `rodadasApi.ts` (FE-05/FE-06).
 */

const BASE_URL = "/api/rodadas";

/** Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha "T07 Correção/Estorno", coluna Erro). */
export const CORRECAO_ERROR_MESSAGE =
  "Não foi possível aplicar a correção. Nenhuma alteração foi salva.";

/** Texto exigido pelo `UX-SPEC.md` Seção 4 (linha "T06 Histórico", coluna Erro) — reaproveitado
 * aqui só para o carregamento do detalhe (mesma classe de falha, mesma tela-mãe). */
const DETALHE_ERROR_MESSAGE = "Não foi possível carregar o histórico";

export class CorrecaoRodadaApiError extends Error {}

export class RodadaNaoEncontradaError extends Error {
  constructor() {
    super("Rodada não encontrada.");
    this.name = "RodadaNaoEncontradaError";
  }
}

export class ParticipacaoNaoEncontradaError extends Error {
  constructor() {
    super("Este atleta não participou desta rodada.");
    this.name = "ParticipacaoNaoEncontradaError";
  }
}

/** Rodada já `status: "excluida"` — não é possível corrigi-la/simular sobre ela (BE-09/BE-10, 409). */
export class RodadaJaExcluidaError extends Error {
  constructor() {
    super("Esta rodada já foi excluída — não é possível corrigi-la.");
    this.name = "RodadaJaExcluidaError";
  }
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** `fetch` + tradução de falha de rede + checagem de sessão (401), comum a todo endpoint deste módulo. */
async function request(
  input: string,
  init: RequestInit | undefined,
  onNetworkError: () => Error,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw onNetworkError();
  }
  return assertSessionAlive(response);
}

/**
 * `GET /api/rodadas/{id}` (BE-16) — detalhe da rodada a corrigir, com
 * participações/eventos/pontos por atleta. Rodada `status: "excluida"` é
 * devolvida normalmente (ver `CorrecaoRodadaDetalhe.tsx` — decisão de
 * detalhe: a tela mostra a lista somente-leitura nesse caso, sem oferecer
 * controles de edição, já que `PATCH`/`simular-correcao` recusariam com
 * `409`).
 */
export async function detalharRodada(id: string): Promise<RodadaDetalhe> {
  const response = await request(
    `${BASE_URL}/${id}`,
    undefined,
    () => new CorrecaoRodadaApiError(DETALHE_ERROR_MESSAGE),
  );
  if (response.status === 200) {
    return (await response.json()) as RodadaDetalhe;
  }
  if (response.status === 404) {
    throw new RodadaNaoEncontradaError();
  }
  throw new CorrecaoRodadaApiError(DETALHE_ERROR_MESSAGE);
}

/** Traduz o `404` compartilhado por `simular-correcao`/`PATCH` (rodada vs. participação, mesmo formato de corpo). */
async function erroNaoEncontrado(response: Response): Promise<Error> {
  const parsed = await safeReadJson(response);
  if (parsed?.error === "Este atleta não participou desta rodada.") {
    return new ParticipacaoNaoEncontradaError();
  }
  return new RodadaNaoEncontradaError();
}

/**
 * `POST /api/rodadas/{id}/participacoes/{atletaId}/simular-correcao` (BE-10)
 * — ESTRITAMENTE READ-ONLY (nenhuma linha é gravada em nenhuma tabela,
 * mesmo quando o cenário simulado seria aceito por uma correção real).
 * Chamado sempre ANTES do `PATCH` real, para calcular o preview inline
 * (UX-SPEC.md Seção 2, T07 — "Pré-visualização do impacto").
 */
export async function simularCorrecao(
  rodadaId: string,
  atletaId: string,
  body: CorrigirParticipacaoBody,
): Promise<PreviewCorrecaoParticipacao> {
  const response = await request(
    `${BASE_URL}/${rodadaId}/participacoes/${atletaId}/simular-correcao`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    () => new CorrecaoRodadaApiError(CORRECAO_ERROR_MESSAGE),
  );

  if (response.status === 200) {
    return (await response.json()) as PreviewCorrecaoParticipacao;
  }
  if (response.status === 404) {
    throw await erroNaoEncontrado(response);
  }
  if (response.status === 409) {
    throw new RodadaJaExcluidaError();
  }
  throw new CorrecaoRodadaApiError(CORRECAO_ERROR_MESSAGE);
}

/**
 * `PATCH /api/rodadas/{id}/participacoes/{atletaId}` (BE-09, RF-04.2) —
 * correção real, só chamada depois que o organizador confirma o preview
 * inline (nunca disparada automaticamente pela mudança de campo — só
 * `simularCorrecao` acima é chamada nesse momento).
 */
export async function corrigirParticipacao(
  rodadaId: string,
  atletaId: string,
  body: CorrigirParticipacaoBody,
): Promise<ParticipacaoCorrigida> {
  const response = await request(
    `${BASE_URL}/${rodadaId}/participacoes/${atletaId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    () => new CorrecaoRodadaApiError(CORRECAO_ERROR_MESSAGE),
  );

  if (response.status === 200) {
    return (await response.json()) as ParticipacaoCorrigida;
  }
  if (response.status === 404) {
    throw await erroNaoEncontrado(response);
  }
  if (response.status === 409) {
    throw new RodadaJaExcluidaError();
  }
  throw new CorrecaoRodadaApiError(CORRECAO_ERROR_MESSAGE);
}
