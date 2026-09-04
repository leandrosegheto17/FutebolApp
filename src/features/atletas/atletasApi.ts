import { assertSessionAlive } from "@/features/sessao";
import type { Atleta, AtletaBody, AtletaDuplicado, AtletaErroDetalhe } from "./types";

/**
 * Cliente HTTP do Serviço de Atletas (BE-06/BE-07 — endpoints **reais**, já
 * `Concluída`/em uso; não é mock a substituir depois). Todo request passa
 * por `assertSessionAlive` (FE-12) — inclusive `GET`, já que
 * `GET /api/atletas*` também exige sessão válida (`middleware.ts`,
 * `INTERNAL_READ_PROTECTED_PREFIXES`) — "qualquer 401 em ação de escrita"
 * do critério de aceite de FE-12 é generalizado aqui para "qualquer 401",
 * já que esta é a primeira tela a consumir uma rota de leitura interna
 * também protegida.
 */

const BASE_URL = "/api/atletas";

const GENERIC_ERROR_MESSAGE =
  "Não foi possível completar a operação agora. Tente novamente.";

export class AtletaApiError extends Error {}

export class AtletaValidationError extends Error {
  detalhes: AtletaErroDetalhe[];
  constructor(message: string, detalhes: AtletaErroDetalhe[] = []) {
    super(message);
    this.name = "AtletaValidationError";
    this.detalhes = detalhes;
  }
}

/** RF-01.5 — alerta de duplicidade de nome (409), nunca um bloqueio definitivo. */
export class AtletaDuplicidadeError extends Error {
  atletasDuplicados: AtletaDuplicado[];
  constructor(atletasDuplicados: AtletaDuplicado[]) {
    super("duplicidade");
    this.name = "AtletaDuplicidadeError";
    this.atletasDuplicados = atletasDuplicados;
  }
}

export class AtletaNaoEncontradoError extends Error {
  constructor() {
    super("Atleta não encontrado.");
    this.name = "AtletaNaoEncontradoError";
  }
}

/** ADR-011 — irreversibilidade por desenho: a API recusa reanonimizar. */
export class AtletaJaAnonimizadoError extends Error {
  constructor() {
    super("Este atleta já foi anonimizado anteriormente.");
    this.name = "AtletaJaAnonimizadoError";
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
    throw new AtletaApiError(GENERIC_ERROR_MESSAGE);
  }
  return assertSessionAlive(response);
}

export async function fetchAtletas(): Promise<Atleta[]> {
  const response = await request(BASE_URL);
  if (!response.ok) {
    throw new AtletaApiError(GENERIC_ERROR_MESSAGE);
  }
  return (await response.json()) as Atleta[];
}

export async function fetchAtletaPorId(id: string): Promise<Atleta> {
  const response = await request(`${BASE_URL}/${id}`);
  if (response.status === 404) {
    throw new AtletaNaoEncontradoError();
  }
  if (!response.ok) {
    throw new AtletaApiError(GENERIC_ERROR_MESSAGE);
  }
  return (await response.json()) as Atleta;
}

async function handleWriteError(response: Response): Promise<never> {
  const body = await safeReadJson(response);

  if (response.status === 400) {
    throw new AtletaValidationError(
      typeof body?.error === "string" ? body.error : "Requisição inválida.",
      Array.isArray(body?.detalhes) ? (body.detalhes as AtletaErroDetalhe[]) : [],
    );
  }
  if (response.status === 404) {
    throw new AtletaNaoEncontradoError();
  }
  if (response.status === 409) {
    throw new AtletaDuplicidadeError(
      Array.isArray(body?.atletas_duplicados)
        ? (body.atletas_duplicados as AtletaDuplicado[])
        : [],
    );
  }
  throw new AtletaApiError(GENERIC_ERROR_MESSAGE);
}

/** `POST /api/atletas` (RF-01.1). `confirmar_duplicidade` já deve vir setado no `body` quando reenviado após o modal de RF-01.5. */
export async function createAtleta(body: AtletaBody): Promise<Atleta> {
  const response = await request(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 201) {
    return (await response.json()) as Atleta;
  }
  return handleWriteError(response);
}

/** `PUT /api/atletas/{id}` (RF-01.6). */
export async function updateAtleta(id: string, body: AtletaBody): Promise<Atleta> {
  const response = await request(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 200) {
    return (await response.json()) as Atleta;
  }
  return handleWriteError(response);
}

/** `POST /api/atletas/{id}/anonimizar` (ADR-011, BE-07). Sem corpo de requisição. */
export async function anonimizarAtleta(id: string): Promise<Atleta> {
  const response = await request(`${BASE_URL}/${id}/anonimizar`, { method: "POST" });
  if (response.status === 200) {
    return (await response.json()) as Atleta;
  }
  if (response.status === 404) {
    throw new AtletaNaoEncontradoError();
  }
  if (response.status === 409) {
    throw new AtletaJaAnonimizadoError();
  }
  throw new AtletaApiError(GENERIC_ERROR_MESSAGE);
}
