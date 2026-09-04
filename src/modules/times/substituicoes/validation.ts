/**
 * Lógica de validação testável de `POST /api/rodadas/:id/substituicoes`
 * (BE-13, RF-06) — separada do wiring de I/O, mesmo padrão já usado em
 * `src/modules/times/restricoes/validation.ts` (BE-12).
 *
 * Corpo: `time_id` (o time da rodada que sofre a substituição, RF-06.1) e
 * `atleta_sai_id`/`atleta_entra_id` — os dois `uuid` válidos e distintos
 * entre si. Critério de aceite literal de BE-13: "tentar usar o mesmo
 * atleta em 'sai' e 'entra' é bloqueado com mensagem clara" — mesma
 * checagem já reforçada no banco pela constraint
 * `substituicao_atletas_distintos_check` (BE-02, migration
 * `20260902100700_create_substituicao_table.sql`), replicada aqui como
 * defesa em profundidade (mesmo padrão de `restricaoBodySchema`, BE-12)
 * para devolver `400` com mensagem clara em vez de deixar a requisição
 * estourar num erro genérico de constraint do Postgres.
 */
import { z } from "zod";

export const substituicaoBodySchema = z
  .object({
    time_id: z.string().uuid({ message: "time_id deve ser um uuid válido." }),
    atleta_sai_id: z.string().uuid({ message: "atleta_sai_id deve ser um uuid válido." }),
    atleta_entra_id: z
      .string()
      .uuid({ message: "atleta_entra_id deve ser um uuid válido." }),
  })
  .refine((valores) => valores.atleta_sai_id !== valores.atleta_entra_id, {
    message:
      "atleta_sai_id e atleta_entra_id devem ser atletas diferentes — não é possível " +
      "substituir um atleta por ele mesmo.",
    path: ["atleta_entra_id"],
  });

export type SubstituicaoBody = z.infer<typeof substituicaoBodySchema>;
