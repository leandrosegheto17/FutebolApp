/**
 * Cálculo de idade no cliente (RF-01.3/RN-02, T04) — usado só para decidir,
 * reativamente a cada tecla, se o bloco de consentimento do responsável
 * legal (Seção 2 do UX-SPEC.md) deve aparecer.
 *
 * Deliberadamente duplicado de `calcularIdade`/`exigeConsentimentoResponsavel`
 * (`src/modules/atletas/validation.ts`, BE-06) em vez de importado de lá —
 * mesma decisão de fronteira documentada em `types.ts` desta pasta: o
 * módulo de backend existe para rodar no servidor, e a fonte de verdade que
 * efetivamente bloqueia o salvamento é sempre a validação do servidor
 * (`atletaBodySchema`) — este cálculo é só para a experiência reativa da
 * tela, nunca a autoridade final. A lógica em si (idade em anos completos,
 * aritmética em UTC) é copiada byte a byte da versão do servidor para nunca
 * divergir em qual data o bloco aparece/desaparece.
 */
export const IDADE_MINIMA_SEM_CONSENTIMENTO = 18;

const DATA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Verdadeiro quando `dataNascimentoISO` é uma data `AAAA-MM-DD` válida e parseável. */
export function idadeValida(dataNascimentoISO: string): boolean {
  if (!DATA_ISO_REGEX.test(dataNascimentoISO)) return false;
  const parsed = new Date(`${dataNascimentoISO}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

/** Idade em anos completos na data de referência (por padrão, "agora"). */
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
