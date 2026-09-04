/**
 * Lógica de validação testável do Serviço de Auditoria (BE-09, RF-04.5) —
 * separada do wiring de I/O (`app/api/log-auditoria/route.ts`), mesmo
 * padrão já usado em `src/modules/rodadas/validation.ts` (BE-08/BE-09).
 *
 * Único parâmetro aceito por `GET /api/log-auditoria`: `limit` (opcional).
 * Decisão de detalhe (não exigida literalmente pelo critério de aceite de
 * BE-09, TASK.md Seção 1.0 — "nunca lacuna silenciosa", não escalada):
 * `log_auditoria` é retido indefinidamente, sem expurgo automático (RNF-06)
 * — sem um teto, uma consulta em produção tenderia a crescer sem limite ao
 * longo do tempo. Um `limit` opcional com default/teto conservadores evita
 * esse crescimento não controlado sem exigir paginação completa (fora do
 * escopo literal do critério de aceite desta tarefa).
 */
import { z } from "zod";

export const LOG_AUDITORIA_LIMIT_DEFAULT = 50;
export const LOG_AUDITORIA_LIMIT_MAXIMO = 200;

export const logAuditoriaQuerySchema = z.object({
  limit: z.coerce
    .number({ message: "limit deve ser numérico." })
    .int({ message: "limit deve ser um número inteiro." })
    .positive({ message: "limit deve ser maior que zero." })
    .max(LOG_AUDITORIA_LIMIT_MAXIMO, {
      message: `limit não pode exceder ${LOG_AUDITORIA_LIMIT_MAXIMO}.`,
    })
    .optional()
    .default(LOG_AUDITORIA_LIMIT_DEFAULT),
});

export type LogAuditoriaQuery = z.infer<typeof logAuditoriaQuerySchema>;
