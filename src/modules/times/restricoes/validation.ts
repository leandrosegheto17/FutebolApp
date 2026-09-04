/**
 * Lógica de validação testável do CRUD de Restrições Obrigatórias (BE-12,
 * RF-05.5/RN-11) — separada do wiring de I/O (Route Handlers em
 * `app/api/restricoes/*`), mesmo padrão já usado em
 * `src/modules/atletas/validation.ts`/`src/modules/rodadas/validation.ts`.
 *
 * Cobre a forma de `POST /api/restricoes` e `PUT /api/restricoes/:id`: um
 * par `(atleta_a_id, atleta_b_id)`, os dois `uuid` válidos e distintos entre
 * si — mesma checagem já reforçada no banco pela constraint
 * `restricao_obrigatoria_atletas_distintos_check` (BE-02, migration
 * `20260902100900_create_restricao_obrigatoria_table.sql`), replicada aqui
 * como defesa em profundidade (mesmo padrão de RF-02.6 em
 * `src/modules/rodadas/validation.ts`) para devolver `400` com mensagem
 * clara em vez de deixar a requisição estourar num erro genérico de
 * constraint do Postgres.
 *
 * RF-05.5 não pede nenhum campo de "motivo" (UX-SPEC.md T10: "sem campo de
 * motivo obrigatório no PRD-TECNICO... fora de escopo desta release") —
 * corpo intencionalmente mínimo, só os dois ids.
 */
import { z } from "zod";

export const restricaoBodySchema = z
  .object({
    atleta_a_id: z.string().uuid({ message: "atleta_a_id deve ser um uuid válido." }),
    atleta_b_id: z.string().uuid({ message: "atleta_b_id deve ser um uuid válido." }),
  })
  .refine((valores) => valores.atleta_a_id !== valores.atleta_b_id, {
    message: "atleta_a_id e atleta_b_id devem ser atletas diferentes.",
    path: ["atleta_b_id"],
  });

export type RestricaoBody = z.infer<typeof restricaoBodySchema>;
