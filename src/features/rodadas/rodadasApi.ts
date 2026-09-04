import { assertSessionAlive } from "@/features/sessao";
import type {
  LancarRodadaBody,
  RodadaDuplicada,
  RodadaErroDetalhe,
  RodadaResponse,
} from "./types";

/**
 * Cliente HTTP do Serviço de Rodadas (BE-08 — endpoint **real**, já
 * `Concluída`; não é mock a substituir depois — ver `app/api/rodadas/route.ts`).
 * Todo request passa por `assertSessionAlive` (FE-12), mesmo padrão de
 * `src/features/atletas/atletasApi.ts` (FE-04).
 */

const BASE_URL = "/api/rodadas";

/**
 * Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha T05, coluna Erro):
 * "Falha na transação atômica" — reforça RNF-10 (nunca estado parcial
 * visível). Nenhuma tela deve reformular este texto.
 */
export const RODADA_SUBMIT_ERROR_MESSAGE =
  "Não foi possível lançar a rodada. Nada foi salvo — tente novamente.";

export class RodadaApiError extends Error {}

export class RodadaValidationError extends Error {
  detalhes: RodadaErroDetalhe[];
  constructor(message: string, detalhes: RodadaErroDetalhe[] = []) {
    super(message);
    this.name = "RodadaValidationError";
    this.detalhes = detalhes;
  }
}

/** RF-02.8 — alerta de duplicidade de data, nunca um bloqueio definitivo. */
export class RodadaDuplicidadeError extends Error {
  rodadasDuplicadas: RodadaDuplicada[];
  constructor(rodadasDuplicadas: RodadaDuplicada[]) {
    super("duplicidade");
    this.name = "RodadaDuplicidadeError";
    this.rodadasDuplicadas = rodadasDuplicadas;
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
    throw new RodadaApiError(RODADA_SUBMIT_ERROR_MESSAGE);
  }
  return assertSessionAlive(response);
}

/**
 * `POST /api/rodadas` (BE-08, RF-02). Uma única chamada por tentativa de
 * lançamento — nunca uma sequência de chamadas incrementais (TASK.md Seção
 * 1.2: `app.lancar_rodada` já roda dentro de uma única transação Postgres,
 * o cliente reflete isso com um único `POST`). `confirmar_duplicidade` já
 * deve vir setado no `body` quando reenviado após o modal de RF-02.8.
 */
export async function lancarRodada(body: LancarRodadaBody): Promise<RodadaResponse> {
  const response = await request(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 201) {
    return (await response.json()) as RodadaResponse;
  }

  const parsed = await safeReadJson(response);

  if (response.status === 400) {
    throw new RodadaValidationError(
      typeof parsed?.error === "string" ? parsed.error : "Requisição inválida.",
      Array.isArray(parsed?.detalhes) ? (parsed.detalhes as RodadaErroDetalhe[]) : [],
    );
  }
  if (response.status === 409) {
    throw new RodadaDuplicidadeError(
      Array.isArray(parsed?.rodadas_duplicadas)
        ? (parsed.rodadas_duplicadas as RodadaDuplicada[])
        : [],
    );
  }
  throw new RodadaApiError(RODADA_SUBMIT_ERROR_MESSAGE);
}
