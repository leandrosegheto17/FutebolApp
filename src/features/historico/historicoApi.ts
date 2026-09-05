import { assertSessionAlive } from "@/features/sessao";
import type { RodadaHistoricoItem } from "./types";

/**
 * Cliente HTTP de T06 (Histórico de Rodadas) — TASK.md FE-06.
 *
 * ---------------------------------------------------------------------
 * Finalização (GAP estrutural resolvido por BE-16, `GET /api/rodadas` +
 * `GET /api/rodadas/{id}`, versão 0.12.0 de `API-CONTRACT.yaml`):
 * ---------------------------------------------------------------------
 * Até esta finalização, `listarRodadas()` sempre rejeitava com
 * `HistoricoIndisponivelError` — não existia nenhum endpoint de LEITURA de
 * rodadas publicado (só `POST /api/rodadas`, BE-08, e
 * `DELETE .../{id}`/`PATCH .../participacoes/{atletaId}`/
 * `POST .../simular-correcao`, BE-09/BE-10). BE-16 fechou essa lacuna
 * publicando `GET /api/rodadas` (lista, `RodadaResumoItem[]`) — consumido
 * abaixo, endpoint **real**, sem pendência de mock. `HistoricoIndisponivelError`
 * foi removida (decisão de detalhe, documentada aqui, não escalada): não
 * existe mais nenhum caminho real que a produza, e mantê-la só como
 * "tratamento de erro de rede/servidor genérico" duplicaria
 * `HistoricoApiError` abaixo sem nenhum ganho — os demais clientes deste
 * projeto (`atletasApi.ts`/`rodadasApi.ts`) já usam uma única classe de erro
 * genérico por módulo para falha de rede/técnica, sem uma segunda classe
 * "indisponível" ao lado dela.
 */
export class HistoricoApiError extends Error {}

/** Texto exigido pelo `UX-SPEC.md` Seção 4 (linha "T06 Histórico", coluna Erro). */
const HISTORICO_ERROR_MESSAGE = "Não foi possível carregar o histórico";

const BASE_URL = "/api/rodadas";

const GENERIC_ERROR_MESSAGE =
  "Não foi possível aplicar a correção. Nenhuma alteração foi salva.";

/**
 * Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha "T07 Correção/
 * Estorno", coluna Erro) — a mesma tela/fluxo cobre tanto correção de campo
 * quanto exclusão (RF-04), e o `UX-SPEC.md` não distingue um texto próprio
 * por sub-fluxo. Reaproveitado aqui, exportado, para nenhuma tela reformular.
 */
export const RODADA_EXCLUSAO_ERROR_MESSAGE = GENERIC_ERROR_MESSAGE;

export class RodadaExclusaoApiError extends Error {}

export class RodadaNaoEncontradaError extends Error {
  constructor() {
    super("Rodada não encontrada.");
    this.name = "RodadaNaoEncontradaError";
  }
}

/** Idempotência (`errcode` PL/pgSQL `RD001`, BE-09) — reprocessar uma exclusão já confirmada. */
export class RodadaJaExcluidaError extends Error {
  constructor() {
    super("Esta rodada já foi excluída anteriormente.");
    this.name = "RodadaJaExcluidaError";
  }
}

export interface RodadaExcluidaResponse {
  id: string;
  data: string;
  status: "excluida";
  /** Atletas com participação nesta rodada, todos com pontos já revertidos (BE-09). */
  atletas_afetados: number;
}

/**
 * `fetch` + tradução de falha de rede + checagem de sessão (401), comum a
 * todo endpoint deste módulo. `onNetworkError` é chamado só para falha de
 * rede real (o `fetch` em si rejeitou) — cada endpoint deste módulo tem sua
 * própria classe/mensagem de erro genérico (`HistoricoApiError`, T06, vs.
 * `RodadaExclusaoApiError`, T07), então a tradução não pode ser centralizada
 * numa única classe/mensagem fixa como nos demais clientes HTTP do projeto
 * (`atletasApi.ts`/`rodadasApi.ts`, que só atendem uma tela cada). A checagem
 * de sessão (`assertSessionAlive`) fica **fora** do `try/catch` de rede de
 * propósito — `SessionExpiredError` nunca deve ser reinterpretada como falha
 * de rede.
 */
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
 * `GET /api/rodadas` (BE-16, T06 do `UX-SPEC.md`; estendido por `BE-R02`,
 * `API-CONTRACT.yaml` 0.14.0, com `confronto`/`status_correcao` para
 * `FE-R06`) — endpoint **real**, já `Concluída`; não é mock a substituir
 * depois. Sem `limit` explícito nesta
 * chamada — decisão de detalhe, não escalada: nem o critério de aceite
 * literal de FE-06 ("lista cronológica decrescente") nem o wireframe da
 * Seção 2 do `UX-SPEC.md` preveem paginação/infinite-scroll nesta tela; o
 * `limit` do contrato (padrão `50`, teto `200`) é só um teto de segurança do
 * lado do Backend contra `app.rodada` crescer indefinidamente ao longo das
 * temporadas (`API-CONTRACT.yaml`, BE-16) — não um requisito de UI desta
 * tarefa. Se o histórico plurianual completo precisar de paginação
 * client-side no futuro, é uma tarefa nova, não uma lacuna desta.
 */
export async function listarRodadas(): Promise<RodadaHistoricoItem[]> {
  const response = await request(
    BASE_URL,
    undefined,
    () => new HistoricoApiError(HISTORICO_ERROR_MESSAGE),
  );
  if (response.status === 200) {
    return (await response.json()) as RodadaHistoricoItem[];
  }
  throw new HistoricoApiError(HISTORICO_ERROR_MESSAGE);
}

/**
 * `DELETE /api/rodadas/{id}` (BE-09, RF-04.1) — endpoint **real**, já
 * `Concluída`/em uso; não é mock a substituir depois. Reverte
 * automaticamente 100% dos pontos da rodada para todos os atletas afetados
 * (ledger append-only, ADR-006) — ação destrutiva e em cascata, por isso só
 * chamada depois de confirmação explícita em modal bloqueante
 * (`ExcluirRodadaModal`), nunca diretamente a partir do menu "⋮".
 */
export async function excluirRodada(id: string): Promise<RodadaExcluidaResponse> {
  const response = await request(
    `${BASE_URL}/${id}`,
    { method: "DELETE" },
    () => new RodadaExclusaoApiError(GENERIC_ERROR_MESSAGE),
  );

  if (response.status === 200) {
    return (await response.json()) as RodadaExcluidaResponse;
  }
  if (response.status === 404) {
    throw new RodadaNaoEncontradaError();
  }
  if (response.status === 409) {
    throw new RodadaJaExcluidaError();
  }
  throw new RodadaExclusaoApiError(GENERIC_ERROR_MESSAGE);
}
