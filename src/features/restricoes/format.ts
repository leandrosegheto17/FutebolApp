/**
 * Formatação de exibição de T10 — mesmo racional de `format.ts` de
 * `atletas`/`ranking-publico`/`presenca-mensal` (função pura, testável
 * isoladamente, RNF-08/pt-BR).
 */

/** `desativado_em` (timestamp ISO) -> "DD/MM/AAAA" (RNF-08, pt-BR). */
export function formatDataDesativacao(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
