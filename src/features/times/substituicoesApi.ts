import { assertSessionAlive } from "@/features/sessao";
import type { Substituicao, SubstituicaoInput } from "./types";

/**
 * Cliente HTTP de T11 (Substituição no Intervalo) — TASK.md FE-11. Os dois
 * endpoints (`GET`/`POST /api/rodadas/{id}/substituicoes`, BE-13) são
 * **reais**, já `Concluída`/em uso — nenhum é mock a substituir depois.
 * Mesmo padrão de `request()`/`assertSessionAlive` já usado por
 * `timesApi.ts`/`atletasApi.ts` (FE-09/FE-04).
 */

/**
 * Sem texto literal no `UX-SPEC.md` para o carregamento inicial da lista
 * (Seção 4, linha "T11 Substituição", só define Vazio/Carregando/Erro/Sucesso
 * para a AÇÃO de registrar, não para o carregamento da tela) — decisão de
 * detalhe documentada, mesmo tom genérico já usado por
 * `RODADA_ATUAL_ERROR_MESSAGE` (`timesApi.ts`)/`AtletasList`.
 */
export const CARREGAR_SUBSTITUICOES_ERROR_MESSAGE =
  "Não foi possível carregar as substituições agora. Tente novamente.";

/** Texto literal do `UX-SPEC.md` Seção 4 (linha "T11 Substituição", coluna Erro). */
export const REGISTRAR_SUBSTITUICAO_ERROR_MESSAGE =
  "Não foi possível registrar — verifique se o atleta já está em outro time.";

export class SubstituicaoApiError extends Error {}

/** `fetch` + tradução de falha de rede + checagem de sessão (401), comum aos dois endpoints. */
async function request(input: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new SubstituicaoApiError(CARREGAR_SUBSTITUICOES_ERROR_MESSAGE);
  }
  return assertSessionAlive(response);
}

/**
 * `GET /api/rodadas/{id}/substituicoes` (BE-13, RF-06.2) — devolve TODAS as
 * substituições da rodada (todos os times), sem limite de quantidade,
 * ordenadas da mais antiga para a mais recente (já garantido pelo servidor).
 */
export async function listarSubstituicoes(rodadaId: string): Promise<Substituicao[]> {
  const response = await request(`/api/rodadas/${rodadaId}/substituicoes`);
  if (response.status !== 200) {
    throw new SubstituicaoApiError(CARREGAR_SUBSTITUICOES_ERROR_MESSAGE);
  }
  return (await response.json()) as Substituicao[];
}

/**
 * `POST /api/rodadas/{id}/substituicoes` (BE-13, RF-06.1). O bloqueio de
 * "mesmo atleta em 'sai' e 'entra'" já acontece de forma acessível no cliente
 * antes do envio (`SubstituicoesModal`, UX-SPEC.md Seção 5.2) — este `400`
 * (assim como um eventual `404` de `time_id`/atleta inexistente) é tratado
 * com a MESMA mensagem genérica literal do `UX-SPEC.md` (Seção 4, sem
 * sub-caso distinto por causa), mesmo critério já usado por
 * `gerarSugestao`/`confirmarTimes` (`timesApi.ts`) para erros sem texto
 * próprio.
 */
export async function registrarSubstituicao(
  rodadaId: string,
  body: SubstituicaoInput,
): Promise<Substituicao> {
  const response = await request(`/api/rodadas/${rodadaId}/substituicoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 201) {
    return (await response.json()) as Substituicao;
  }
  throw new SubstituicaoApiError(REGISTRAR_SUBSTITUICAO_ERROR_MESSAGE);
}
