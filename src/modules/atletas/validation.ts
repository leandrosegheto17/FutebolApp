/**
 * Lógica de validação testável do Serviço de Atletas (BE-06) — separada do
 * wiring de I/O (Route Handlers em `app/api/atletas/*`), mesmo padrão já
 * usado em `src/modules/autenticacao` (ex.: `rate-limit.ts`/`redefinir-senha.ts`
 * como lógica pura, `login/route.ts` como orquestração).
 *
 * Cobre:
 * - RF-01.3/RN-02: idade < 18 anos exige `consentimento_responsavel_obtido`.
 * - RF-01.5: alerta de duplicidade de `nome_completo`.
 * - RF-01.2/RN-06: apelido de exibição derivado do primeiro nome quando em
 *   branco.
 */
import { z } from "zod";
import {
  CONSENTIMENTO_OBRIGATORIO_MENSAGEM,
  IDADE_MINIMA_SEM_CONSENTIMENTO,
} from "./constants";

const DATA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calcula a idade em anos completos na data de referência (por padrão,
 * "agora" — RF-01.3 fala em "idade... na data do cadastro"; para edição
 * (RF-01.6/UX-SPEC.md T04) o mesmo bloco de consentimento é recalculado a
 * cada salvamento, então "agora" é a única referência estável disponível
 * tanto para criação quanto para edição — decisão de detalhe documentada,
 * não escalada). Aritmética em UTC para não depender do fuso horário do
 * processo Node.js/Vercel.
 */
export function calcularIdade(
  dataNascimentoISO: string,
  referencia: Date = new Date(),
): number {
  const nascimento = new Date(`${dataNascimentoISO}T00:00:00.000Z`);
  let idade = referencia.getUTCFullYear() - nascimento.getUTCFullYear();
  const aniversarioJaOcorreuNoAno =
    referencia.getUTCMonth() > nascimento.getUTCMonth() ||
    (referencia.getUTCMonth() === nascimento.getUTCMonth() &&
      referencia.getUTCDate() >= nascimento.getUTCDate());
  if (!aniversarioJaOcorreuNoAno) {
    idade -= 1;
  }
  return idade;
}

/** RF-01.3/RN-02: verdadeiro quando o consentimento do responsável é exigido. */
export function exigeConsentimentoResponsavel(idade: number): boolean {
  return idade < IDADE_MINIMA_SEM_CONSENTIMENTO;
}

/**
 * Normaliza `nome_completo` para comparação de duplicidade (RF-01.5):
 * remove espaços nas pontas, colapsa espaços internos repetidos e ignora
 * caixa — "João  Silva" e "joão silva" são tratados como o mesmo nome.
 * Decisão de detalhe (não escalada): RF-01.5 fala em "nome completo
 * idêntico", mas uma comparação sensível a caixa/espaçamento deixaria
 * passar duplicidade óbvia digitada de forma levemente diferente, o que
 * contradiria o próprio motivo da regra ("reduzir risco de duplicidade de
 * registro").
 */
export function normalizarNomeCompleto(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

/** RF-01.2/RN-06: primeiro "token" de `nome_completo`, usado como apelido de exibição padrão. */
export function derivarApelidoExibicao(nomeCompleto: string): string {
  const normalizado = nomeCompleto.trim().replace(/\s+/g, " ");
  return normalizado.split(" ")[0] ?? normalizado;
}

export type AtletaExistente = { id: string; nome_completo: string };

/**
 * Retorna os atletas existentes cujo `nome_completo` normalizado coincide
 * com o informado (RF-01.5) — exclui `excluirId` (edição não deve alertar
 * duplicidade contra si mesmo).
 */
export function encontrarDuplicatasDeNome(
  nomeCompleto: string,
  atletasExistentes: readonly AtletaExistente[],
  excluirId?: string,
): AtletaExistente[] {
  const alvo = normalizarNomeCompleto(nomeCompleto);
  return atletasExistentes.filter(
    (atleta) =>
      atleta.id !== excluirId && normalizarNomeCompleto(atleta.nome_completo) === alvo,
  );
}

/**
 * Corpo de `POST /api/atletas` e `PUT /api/atletas/:id` (BE-06). Campos
 * espelham `app.atleta` (BE-02) em `snake_case`, mesma convenção já adotada
 * pelas respostas de `ranking_publico`/`presenca_mensal_publica` (BE-03) no
 * restante do contrato de API — decisão de consistência, não escalada.
 *
 * `data_nascimento` e `pontuacao_inicial` são obrigatórios aqui (RF-01.1 —
 * "nome, data de nascimento e pontuação inicial preenchidos" — e
 * UX-SPEC.md T04 marca os dois com `*`), mesmo a coluna correspondente em
 * `app.atleta` sendo `nullable` no banco — a nulidade no schema físico
 * existe para acomodar registros migrados do legado sem essa informação
 * (RF-08.3/BE-15), não para tornar o campo opcional neste formulário de
 * cadastro/edição operado pelo organizador.
 *
 * `confirmar_duplicidade`: quando o Backend detecta `nome_completo`
 * duplicado (RF-01.5) e este campo não veio `true`, a escrita é recusada
 * com `409` (alerta) em vez de criada silenciosamente — o Frontend reenvia
 * a mesma requisição com `confirmar_duplicidade: true` depois que o
 * organizador confirma no modal (UX-SPEC.md T04, "modal de confirmação
 * aparece antes de permitir salvar"). Decisão de contrato de detalhe (BE-06,
 * não há endpoint de "verificar duplicidade" separado): mantém a API com um
 * único endpoint de escrita por operação, alinhado ao comportamento descrito
 * literalmente no UX-SPEC.md, sem expor um segundo endpoint especulativo.
 */
export const atletaBodySchema = z
  .object({
    nome_completo: z.string().trim().min(1, { message: "nome_completo é obrigatório." }),
    apelido_exibicao: z
      .string()
      .trim()
      .min(1, { message: "apelido_exibicao, quando informado, não pode ser vazio." })
      .optional(),
    contato: z
      .string()
      .trim()
      .min(1, { message: "contato, quando informado, não pode ser vazio." })
      .optional(),
    data_nascimento: z.string().regex(DATA_ISO_REGEX, {
      message: "data_nascimento deve estar no formato AAAA-MM-DD.",
    }),
    consentimento_responsavel_obtido: z.boolean().optional().default(false),
    pontuacao_inicial: z
      .number({ message: "pontuacao_inicial deve ser numérico." })
      .min(0, { message: "pontuacao_inicial não pode ser negativa." }),
    confirmar_duplicidade: z.boolean().optional().default(false),
  })
  .superRefine((valores, ctx) => {
    const nascimento = new Date(`${valores.data_nascimento}T00:00:00.000Z`);
    if (Number.isNaN(nascimento.getTime())) {
      ctx.addIssue({
        path: ["data_nascimento"],
        code: z.ZodIssueCode.custom,
        message: "data_nascimento não é uma data válida.",
      });
      return;
    }
    const idade = calcularIdade(valores.data_nascimento);
    if (idade < 0) {
      ctx.addIssue({
        path: ["data_nascimento"],
        code: z.ZodIssueCode.custom,
        message: "data_nascimento não pode ser no futuro.",
      });
      return;
    }
    if (
      exigeConsentimentoResponsavel(idade) &&
      !valores.consentimento_responsavel_obtido
    ) {
      ctx.addIssue({
        path: ["consentimento_responsavel_obtido"],
        code: z.ZodIssueCode.custom,
        message: CONSENTIMENTO_OBRIGATORIO_MENSAGEM,
      });
    }
  });

export type AtletaBody = z.infer<typeof atletaBodySchema>;
