/**
 * Lógica de validação testável de `POST /api/times/sugestao` (BE-11,
 * RF-05.1/RF-05.3) — separada do wiring de I/O, mesmo padrão já usado em
 * `src/modules/atletas/validation.ts`/`src/modules/times/restricoes/validation.ts`.
 *
 * Corpo: `atletas_ids` (presentes desta montagem — RF-05.1 fala em "lista de
 * presentes definida"; BE-11 não depende de BE-08/rodada, ver `TASK.md`
 * Seção 4.1 — então a lista é informada diretamente no corpo, não derivada
 * de uma rodada já lançada) e `quantidade_times` (o `N` parametrizável do
 * ADR-010/TASK.md Seção 1.4 — a interface desta release só envia `2`,
 * TASK.md Seção 6.2 item 1, mas o corpo aceita qualquer valor dentro dos
 * limites abaixo).
 */
import { z } from "zod";
import { MAX_QUANTIDADE_TIMES, MIN_ATLETAS_PARA_MONTAGEM } from "./constants";

const QUANTIDADE_TIMES_MINIMA = 2;

export const sugestaoTimesBodySchema = z
  .object({
    atletas_ids: z
      .array(
        z.string().uuid({ message: "cada item de atletas_ids deve ser um uuid válido." }),
      )
      .min(MIN_ATLETAS_PARA_MONTAGEM, {
        message: `atletas_ids precisa ter ao menos ${MIN_ATLETAS_PARA_MONTAGEM} atletas presentes.`,
      }),
    quantidade_times: z
      .number({ message: "quantidade_times deve ser numérico." })
      .int({ message: "quantidade_times deve ser um número inteiro." })
      .min(QUANTIDADE_TIMES_MINIMA, {
        message: `quantidade_times deve ser >= ${QUANTIDADE_TIMES_MINIMA}.`,
      })
      .max(MAX_QUANTIDADE_TIMES, {
        message: `quantidade_times deve ser <= ${MAX_QUANTIDADE_TIMES}.`,
      }),
  })
  .superRefine((valores, ctx) => {
    const idsUnicos = new Set(valores.atletas_ids);
    if (idsUnicos.size !== valores.atletas_ids.length) {
      ctx.addIssue({
        path: ["atletas_ids"],
        code: z.ZodIssueCode.custom,
        message: "atletas_ids não pode conter ids repetidos.",
      });
    }
    if (valores.quantidade_times > valores.atletas_ids.length) {
      ctx.addIssue({
        path: ["quantidade_times"],
        code: z.ZodIssueCode.custom,
        message:
          "quantidade_times não pode ser maior que a quantidade de atletas em atletas_ids.",
      });
    }
  });

export type SugestaoTimesBody = z.infer<typeof sugestaoTimesBodySchema>;
