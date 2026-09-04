import { assertSessionAlive } from "@/features/sessao";
import type { Restricao, RestricaoBody, RestricaoErroDetalhe } from "./types";

/**
 * Cliente HTTP de T10 (Gestão de Restrições Obrigatórias) — TASK.md FE-10.
 * Os cinco endpoints (`GET/POST /api/restricoes`, `PUT /api/restricoes/{id}`,
 * `POST /api/restricoes/{id}/desativar`, `POST /api/restricoes/{id}/reativar`,
 * BE-12) são **reais**, já `Concluída`/aprovada pelo QA — nenhum é mock a
 * substituir depois. Mesmo padrão de `request()`/`assertSessionAlive` já
 * usado por `atletasApi.ts`/`timesApi.ts`/`substituicoesApi.ts` (FE-04/FE-09/
 * FE-11); `GET /api/restricoes` também exige sessão válida mesmo sendo
 * leitura (mesmo racional já aplicado a `GET /api/atletas`).
 */

const BASE_URL = "/api/restricoes";

const GENERIC_ERROR_MESSAGE =
  "Não foi possível completar a operação agora. Tente novamente.";

export const CARREGAR_RESTRICOES_ERROR_MESSAGE =
  "Não foi possível carregar as restrições agora. Tente novamente.";

export class RestricaoApiError extends Error {}

export class RestricaoValidationError extends Error {
  detalhes: RestricaoErroDetalhe[];
  constructor(message: string, detalhes: RestricaoErroDetalhe[] = []) {
    super(message);
    this.name = "RestricaoValidationError";
    this.detalhes = detalhes;
  }
}

/** `404` de `POST/PUT /api/restricoes*` — `atleta_a_id`/`atleta_b_id` inexistente. */
export class RestricaoAtletaNaoEncontradoError extends Error {
  constructor() {
    super("Atleta não encontrado.");
    this.name = "RestricaoAtletaNaoEncontradoError";
  }
}

/** `404` de `PUT/.../desativar/.../reativar` — id de restrição inexistente. */
export class RestricaoNaoEncontradaError extends Error {
  constructor() {
    super("Restrição obrigatória não encontrada.");
    this.name = "RestricaoNaoEncontradaError";
  }
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** `fetch` + tradução de falha de rede + checagem de sessão (401), comum a todo endpoint. */
async function request(input: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new RestricaoApiError(GENERIC_ERROR_MESSAGE);
  }
  return assertSessionAlive(response);
}

/**
 * `GET /api/restricoes` (RF-05.5) — devolve TODAS as restrições, ativas e
 * desativadas (RN-11 — histórico nunca some da lista), já com os nomes
 * (`atleta_a_nome`/`atleta_b_nome`) resolvidos pelo servidor.
 */
export async function listarRestricoes(): Promise<Restricao[]> {
  const response = await request(BASE_URL);
  if (response.status !== 200) {
    throw new RestricaoApiError(CARREGAR_RESTRICOES_ERROR_MESSAGE);
  }
  return (await response.json()) as Restricao[];
}

async function handleWriteError(response: Response): Promise<never> {
  const body = await safeReadJson(response);

  if (response.status === 400) {
    throw new RestricaoValidationError(
      typeof body?.error === "string" ? body.error : "Requisição inválida.",
      Array.isArray(body?.detalhes) ? (body.detalhes as RestricaoErroDetalhe[]) : [],
    );
  }
  if (response.status === 404) {
    // `ErroAtletaReferenciadoNaoEncontrado` (POST/PUT) sempre traz `atleta_id`;
    // `ErroRestricaoNaoEncontrada` (PUT/id inexistente) nunca traz esse campo
    // — os dois schemas de erro 404 de `PUT` são distinguidos por essa forma
    // (API-CONTRACT.yaml não expõe um discriminador de tipo próprio).
    if (typeof body?.atleta_id === "string") {
      throw new RestricaoAtletaNaoEncontradoError();
    }
    throw new RestricaoNaoEncontradaError();
  }
  throw new RestricaoApiError(GENERIC_ERROR_MESSAGE);
}

/** `POST /api/restricoes` (RF-05.5 — "cadastrar"). */
export async function criarRestricao(body: RestricaoBody): Promise<Restricao> {
  const response = await request(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 201) {
    return (await response.json()) as Restricao;
  }
  return handleWriteError(response);
}

/** `PUT /api/restricoes/{id}` (RF-05.5 — "editar"). Nunca altera `ativo`/`desativado_em`. */
export async function atualizarRestricao(
  id: string,
  body: RestricaoBody,
): Promise<Restricao> {
  const response = await request(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 200) {
    return (await response.json()) as Restricao;
  }
  return handleWriteError(response);
}

/** `POST /api/restricoes/{id}/desativar` (RF-05.5 — "desativar", soft-delete/RN-11). Idempotente. */
export async function desativarRestricao(id: string): Promise<Restricao> {
  const response = await request(`${BASE_URL}/${id}/desativar`, { method: "POST" });
  if (response.status === 200) {
    return (await response.json()) as Restricao;
  }
  if (response.status === 404) {
    throw new RestricaoNaoEncontradaError();
  }
  throw new RestricaoApiError(GENERIC_ERROR_MESSAGE);
}

/** `POST /api/restricoes/{id}/reativar` (BE-12 — botão "Reativar" do wireframe de T10). Idempotente. */
export async function reativarRestricao(id: string): Promise<Restricao> {
  const response = await request(`${BASE_URL}/${id}/reativar`, { method: "POST" });
  if (response.status === 200) {
    return (await response.json()) as Restricao;
  }
  if (response.status === 404) {
    throw new RestricaoNaoEncontradaError();
  }
  throw new RestricaoApiError(GENERIC_ERROR_MESSAGE);
}
