import { assertSessionAlive } from "@/features/sessao";
import type { LogAuditoriaItem } from "./types";

/**
 * Cliente HTTP de T08 (Log de Auditoria) — TASK.md FE-08. `GET
 * /api/log-auditoria` (BE-09, RF-04.5) é um endpoint **real**, já
 * `Concluída`/em uso — não é mock a substituir depois. Mesmo padrão de
 * `request()`/`assertSessionAlive` já usado por `historicoApi.ts`/
 * `correcaoApi.ts` (FE-06/FE-07); leitura protegida por sessão mesmo sendo
 * `GET` (RF-07.1, `middleware.ts`, `INTERNAL_READ_PROTECTED_PREFIXES`).
 */

const BASE_URL = "/api/log-auditoria";

/** Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha "T08 Log de Auditoria", coluna Erro). */
export const LOG_AUDITORIA_ERROR_MESSAGE = "Não foi possível carregar o log";

export class LogAuditoriaApiError extends Error {}

/**
 * Sem `limit` explícito nesta chamada — decisão de detalhe, mesmo racional
 * já usado por `listarRodadas()`/FE-06: nem o critério de aceite literal
 * desta tarefa ("lista somente leitura, mais recente → mais antigo") nem o
 * wireframe da Seção 2 do `UX-SPEC.md` preveem paginação nesta tela; o
 * `limit` do contrato (padrão `50`, teto `200`) é só um teto de segurança do
 * lado do Backend contra `app.log_auditoria` crescer indefinidamente
 * (retido sem expurgo, RNF-06) — não um requisito de UI desta tarefa.
 */
export async function fetchLogAuditoria(): Promise<LogAuditoriaItem[]> {
  let response: Response;
  try {
    response = await fetch(BASE_URL);
  } catch {
    throw new LogAuditoriaApiError(LOG_AUDITORIA_ERROR_MESSAGE);
  }
  const checked = assertSessionAlive(response);
  if (checked.status === 200) {
    return (await checked.json()) as LogAuditoriaItem[];
  }
  throw new LogAuditoriaApiError(LOG_AUDITORIA_ERROR_MESSAGE);
}
