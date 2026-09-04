/**
 * Formatação de exibição do módulo de Rodadas (T05) — mesmo racional de
 * `format.ts` de `atletas`/`ranking-publico`/`presenca-mensal` (função pura,
 * testável isoladamente, RNF-08/pt-BR).
 */

const DATA_CIVIL_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `data` civil (`"AAAA-MM-DD"`, sem componente de hora) -> `"DD/MM/AAAA"`.
 * Nunca passa por `new Date(...)`/`Intl.DateTimeFormat` — para uma data
 * civil pura (sem timezone), isso arriscaria um deslocamento de um dia em
 * fusos negativos (ex.: `America/Sao_Paulo`), mesma armadilha que
 * `DateInput` já documenta evitar ao usar `<input type="date">` nativo.
 * Devolve a string original se não estiver no formato esperado (nunca
 * lança — mantém o rótulo visível mesmo com dado inesperado).
 */
export function formatDataExibicao(data: string): string {
  const match = DATA_CIVIL_REGEX.exec(data);
  if (!match) return data;
  const [, ano, mes, dia] = match;
  return `${dia}/${mes}/${ano}`;
}
