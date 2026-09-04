/**
 * Lógica de validação testável do Serviço de Rodadas/Eventos (BE-08) —
 * separada do wiring de I/O (`app/api/rodadas/route.ts`), mesmo padrão já
 * usado em `src/modules/atletas/validation.ts` (BE-06).
 *
 * Cobre a forma do corpo de `POST /api/rodadas` (RF-02): lista de
 * participações (presença por atleta) + eventos de jogo (gol/cartão) por
 * participação. A validação zod aqui é a PRIMEIRA linha de defesa de RF-02.6
 * (bloquear evento para atleta ausente) — recusa o payload com `400` antes
 * mesmo de chamar o banco; a função PL/pgSQL `app.lancar_rodada` (migration
 * BE-08) repete a mesma checagem como defesa em profundidade estrutural
 * (TASK.md Seção 1.2), nunca depende só desta validação de borda.
 */
import { z } from "zod";

const DATA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const STATUS_PARTICIPACAO = ["presente", "ausente", "lesionado"] as const;
export const TIPO_EVENTO_JOGO = ["gol", "cartao_amarelo", "cartao_vermelho"] as const;

const eventoJogoSchema = z.object({
  tipo: z.enum(TIPO_EVENTO_JOGO, {
    message: "tipo de evento deve ser gol, cartao_amarelo ou cartao_vermelho.",
  }),
  quantidade: z
    .number({ message: "quantidade deve ser numérica." })
    .int({ message: "quantidade deve ser um número inteiro." })
    .positive({ message: "quantidade deve ser maior que zero." })
    .default(1),
});

const participacaoRodadaSchema = z.object({
  atleta_id: z.string().uuid({ message: "atleta_id deve ser um uuid válido." }),
  status: z.enum(STATUS_PARTICIPACAO, {
    message: "status deve ser presente, ausente ou lesionado.",
  }),
  eventos: z.array(eventoJogoSchema).optional().default([]),
});

/**
 * Corpo de `POST /api/rodadas` (BE-08). `confirmar_duplicidade`: mesmo
 * contrato já usado por `POST/PUT /api/atletas` (RF-01.5/BE-06) —
 * quando já existe uma rodada `lancada` com a mesma `data` e este campo não
 * vem `true`, a escrita é recusada com `409` (alerta RF-02.8) em vez de
 * criada silenciosamente; o Frontend reenvia a mesma requisição com
 * `confirmar_duplicidade: true` depois da confirmação do organizador.
 */
export const lancarRodadaBodySchema = z
  .object({
    data: z.string().regex(DATA_ISO_REGEX, {
      message: "data deve estar no formato AAAA-MM-DD.",
    }),
    confirmar_duplicidade: z.boolean().optional().default(false),
    participacoes: z
      .array(participacaoRodadaSchema)
      .min(1, { message: "participacoes deve conter ao menos um atleta." }),
  })
  .superRefine((valores, ctx) => {
    const nascimentoValido = !Number.isNaN(
      new Date(`${valores.data}T00:00:00.000Z`).getTime(),
    );
    if (!nascimentoValido) {
      ctx.addIssue({
        path: ["data"],
        code: z.ZodIssueCode.custom,
        message: "data não é uma data válida.",
      });
    }

    const idsVistos = new Set<string>();
    valores.participacoes.forEach((participacao, index) => {
      // RF-02.6: atleta ausente nunca pode carregar evento de jogo — recusa
      // aqui, antes de chegar ao banco (a função PL/pgSQL repete a mesma
      // checagem como defesa em profundidade estrutural, não como única
      // garantia).
      if (participacao.status === "ausente" && participacao.eventos.length > 0) {
        ctx.addIssue({
          path: ["participacoes", index, "eventos"],
          code: z.ZodIssueCode.custom,
          message:
            "Não é permitido registrar evento de jogo (gol/cartão) para atleta ausente (RF-02.6).",
        });
      }

      // Decisão de detalhe (não escalada): um mesmo atleta_id duplicado na
      // mesma requisição violaria a UNIQUE(rodada_id, atleta_id) do banco de
      // qualquer forma (BE-02) — recusado aqui com uma mensagem específica em
      // vez de deixar a requisição inteira falhar com um erro genérico de
      // constraint do Postgres.
      if (idsVistos.has(participacao.atleta_id)) {
        ctx.addIssue({
          path: ["participacoes", index, "atleta_id"],
          code: z.ZodIssueCode.custom,
          message: "atleta_id repetido em mais de uma participação da mesma rodada.",
        });
      }
      idsVistos.add(participacao.atleta_id);
    });
  });

export type LancarRodadaBody = z.infer<typeof lancarRodadaBodySchema>;
export type ParticipacaoRodadaBody = z.infer<typeof participacaoRodadaSchema>;
export type EventoJogoBody = z.infer<typeof eventoJogoSchema>;

/**
 * Corpo de `PATCH /api/rodadas/:id/participacoes/:atletaId` (BE-09, RF-04.2)
 * — corrige a participação de UM atleta já lançado numa rodada (status +
 * lista de eventos, que SUBSTITUI por completo a lista atual, não é
 * incremental — mesmo contrato de `p_novos_eventos` da função PL/pgSQL
 * `app.corrigir_participacao_rodada`). RF-02.6 é validado aqui com o mesmo
 * `superRefine` de `lancarRodadaBodySchema` (defesa em profundidade — a
 * função PL/pgSQL repete a mesma checagem estruturalmente).
 */
export const corrigirParticipacaoBodySchema = z
  .object({
    status: z.enum(STATUS_PARTICIPACAO, {
      message: "status deve ser presente, ausente ou lesionado.",
    }),
    eventos: z.array(eventoJogoSchema).optional().default([]),
  })
  .superRefine((valores, ctx) => {
    if (valores.status === "ausente" && valores.eventos.length > 0) {
      ctx.addIssue({
        path: ["eventos"],
        code: z.ZodIssueCode.custom,
        message:
          "Não é permitido registrar evento de jogo (gol/cartão) para atleta ausente (RF-02.6).",
      });
    }
  });

export type CorrigirParticipacaoBody = z.infer<typeof corrigirParticipacaoBodySchema>;

/**
 * Query string de `GET /api/rodadas` (BE-16 — TASK.md Seção 3.1, lacuna
 * deixada por BE-08/BE-09/BE-10: nenhuma tarefa anterior cobria LEITURA de
 * listagem/detalhe de rodada). Único parâmetro aceito: `limit` (opcional) —
 * mesmo padrão de decisão de detalhe já usado por
 * `src/modules/auditoria/validation.ts` (`GET /api/log-auditoria`, BE-09):
 * `app.rodada` cresce indefinidamente ao longo das temporadas, sem expurgo
 * automático, então um teto conservador evita uma resposta sem limite,
 * mesmo sem exigir paginação completa (cursor/offset) — fora do escopo
 * literal do critério de aceite desta tarefa (decisão de detalhe, não
 * escalada, TASK.md Seção 1.0). Mesmos valores de default/teto de
 * `logAuditoriaQuerySchema` por consistência entre os dois endpoints de
 * leitura interna mais próximos em natureza (ambos listas cronológicas
 * decrescentes da área interna).
 */
export const LISTAR_RODADAS_LIMIT_DEFAULT = 50;
export const LISTAR_RODADAS_LIMIT_MAXIMO = 200;

export const listarRodadasQuerySchema = z.object({
  limit: z.coerce
    .number({ message: "limit deve ser numérico." })
    .int({ message: "limit deve ser um número inteiro." })
    .positive({ message: "limit deve ser maior que zero." })
    .max(LISTAR_RODADAS_LIMIT_MAXIMO, {
      message: `limit não pode exceder ${LISTAR_RODADAS_LIMIT_MAXIMO}.`,
    })
    .optional()
    .default(LISTAR_RODADAS_LIMIT_DEFAULT),
});

export type ListarRodadasQuery = z.infer<typeof listarRodadasQuerySchema>;
