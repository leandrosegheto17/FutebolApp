/**
 * Formatação de exibição do módulo de Log de Auditoria (T08) — mesmo
 * racional de `format.ts` de `atletas`/`ranking-publico`/`presenca-mensal`
 * (função pura, testável isoladamente, RNF-08/pt-BR).
 */

/**
 * `ocorrido_em` (timestamp ISO 8601, `Date` real — diferente da `data` civil
 * de `RodadaHistoricoItem`, que é formatada sem passar por `Date`) ->
 * `"DD/MM/AAAA HH:mm"` (wireframe T08, `UX-SPEC.md` Seção 2 — "02/09/2026
 * 14:32"). Data e hora são formatadas separadamente e unidas com um espaço
 * (decisão de detalhe): `Intl.DateTimeFormat("pt-BR", {...dia+hora})`
 * combinado insere vírgula entre as duas partes em várias implementações de
 * ICU (`"02/09/2026, 14:32"`), o que não bate com o wireframe literal — sem
 * `timeZone` explícito, mesmo racional já usado por `formatUpdatedAt`
 * (`ranking-publico/format.ts`), usa o fuso local do navegador.
 */
export function formatDataHora(iso: string): string {
  const date = new Date(iso);
  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const horaFormatada = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${dataFormatada} ${horaFormatada}`;
}

/** Primeiros 8 caracteres de um uuid — mesmo recorte já usado por `apelido_exibicao` pós-anonimização (BE-07, "Atleta #" + 8 primeiros chars do id). */
export function truncateId(id: string): string {
  return id.slice(0, 8);
}
