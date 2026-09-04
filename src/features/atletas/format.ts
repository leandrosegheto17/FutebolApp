/**
 * Formatação de exibição do módulo de Atletas (T04) — mesmo racional de
 * `format.ts` de `ranking-publico`/`presenca-mensal` (função pura, testável
 * isoladamente, RNF-08/pt-BR).
 */

/** `anonimizado_em` (timestamp ISO) -> "DD/MM/AAAA" (RNF-08, pt-BR). */
export function formatDataAnonimizacao(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** Nível técnico (RN-03, média) — inteiro sem casas decimais, fracionário com 2. */
export function formatNivelTecnico(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
