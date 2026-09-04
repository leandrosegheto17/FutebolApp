/**
 * Lógica de validação testável de `POST /api/rodadas/:id/times` — endpoint
 * de CONFIRMAÇÃO/persistência da divisão de times (RF-05.4), escopo
 * ampliado desta execução de BE-13 por decisão EXPLÍCITA do usuário (ver
 * TASK.md, nota de status de BE-13) — resolve o GAP estrutural sinalizado
 * na própria nota de status de BE-11: BE-11 só gera/retorna a SUGESTÃO,
 * nunca persiste `app.time`/`app.time_atleta`.
 *
 * Corpo: `times` — formato de entrada equivalente ao `status: "ok"`
 * retornado por `POST /api/times/sugestao` (`SugestaoTimesOkResponse.times`),
 * aceitando o reenvio quase integral daquela resposta depois do organizador
 * ajustar manualmente (RF-05.4, "ajustar antes de confirmar") — possivelmente
 * reordenado/editado. Só `atletas_ids` é obrigatório por time; `label` é
 * opcional (default "Time <letra>" gerado por `mutate.ts` quando ausente,
 * decisão de detalhe documentada lá, mesmo texto do wireframe T09 do
 * `UX-SPEC.md`: "Time A"/"Time B"). Os demais campos calculados daquela
 * resposta (`indice`, `nivel_tecnico_medio`, `idade_media`, dados agregados
 * de cada atleta) são ignorados por este schema caso venham no corpo — este
 * endpoint não precisa deles para persistir (TASK.md Seção 1.0 — solução
 * mais simples que satisfaz o critério de aceite).
 */
import { z } from "zod";
import { MAX_QUANTIDADE_TIMES } from "../constants";

const QUANTIDADE_TIMES_MINIMA = 2;

export const confirmarTimesBodySchema = z
  .object({
    times: z
      .array(
        z
          .object({
            label: z
              .string()
              .trim()
              .min(1, { message: "label, quando informado, não pode ser vazio." })
              .max(50, { message: "label não pode ter mais de 50 caracteres." })
              .optional(),
            atletas_ids: z
              .array(
                z.string().uuid({
                  message: "cada item de atletas_ids deve ser um uuid válido.",
                }),
              )
              .min(1, { message: "cada time precisa ter ao menos 1 atleta." }),
          })
          .passthrough(),
      )
      .min(QUANTIDADE_TIMES_MINIMA, {
        message: `times precisa ter ao menos ${QUANTIDADE_TIMES_MINIMA} times.`,
      })
      .max(MAX_QUANTIDADE_TIMES, {
        message: `times não pode ter mais de ${MAX_QUANTIDADE_TIMES} times.`,
      }),
  })
  .superRefine((valores, ctx) => {
    const idsVistos = new Set<string>();
    valores.times.forEach((time, indiceTime) => {
      const idsUnicosNesteTime = new Set(time.atletas_ids);
      if (idsUnicosNesteTime.size !== time.atletas_ids.length) {
        ctx.addIssue({
          path: ["times", indiceTime, "atletas_ids"],
          code: z.ZodIssueCode.custom,
          message: "atletas_ids não pode conter ids repetidos dentro do mesmo time.",
        });
      }
      for (const id of time.atletas_ids) {
        if (idsVistos.has(id)) {
          ctx.addIssue({
            path: ["times", indiceTime, "atletas_ids"],
            code: z.ZodIssueCode.custom,
            message: `atleta ${id} aparece em mais de um time — cada atleta pertence a exatamente um time.`,
          });
        }
        idsVistos.add(id);
      }
    });
  });

export type ConfirmarTimesBody = z.infer<typeof confirmarTimesBodySchema>;
