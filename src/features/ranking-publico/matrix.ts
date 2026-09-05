import type { RankingPublicoRecentesItem, RodadaRecenteStatus } from "./types";

/**
 * `N` de rodadas exibidas em desktop (`lg`) — reduzido de 7 para 5 a pedido
 * direto do organizador (ajuste pós-deploy, 2026-09-05): a matriz completa de
 * 7 colunas fazia a home pública precisar de rolagem; a API (`BE-R01`,
 * `app.ranking_publico_recentes`) continua devolvendo uma janela de N=7 por
 * atleta (`TASK.md` Parte II Seção 6.2-R item 2, inalterado) — o corte para 5
 * é só de apresentação, feito aqui, sem tocar a view/migration. Mobile exibe
 * um subconjunto responsivo das mesmas últimas 5: 2 mais recentes (também
 * reduzido de 5 para 2 pelo mesmo pedido).
 */
export const DESKTOP_COLUMN_LIMIT = 5;
export const MOBILE_COLUMN_LIMIT = 2;

export interface RankingColumn {
  rodadaId: string;
  data: string;
}

/**
 * Reconcilia o cabeçalho ÚNICO de colunas do mockup real (uma linha de
 * datas compartilhada por toda a tabela) com o contrato real de `BE-R01`,
 * que devolve uma **janela própria por atleta** ("não um conjunto fixo de
 * datas compartilhado", `API-CONTRACT.yaml` v0.13.0) — dois atletas com
 * históricos de tamanhos diferentes (ex.: um atleta cadastrado no meio da
 * temporada) podem ter arrays de tamanhos diferentes, mas nunca datas
 * DIFERENTES para a mesma posição relativa: como toda rodada lançada gera
 * uma `participacao_rodada` para todo atleta ativo, o array mais longo entre
 * todos os atletas retornados já contém, como subconjunto (a partir do
 * final, mais recente), exatamente as mesmas rodadas que qualquer atleta
 * mais novo também tem.
 *
 * Decisão de detalhe (documentada, não escalada — TASK.md Guardrail 32
 * distingue lacuna estrutural, que sempre escala, de lacuna de detalhe, que
 * o próprio implementador decide e documenta; este é o segundo caso: o
 * requisito "mostrar matriz de últimas N rodadas com cabeçalho de datas" já
 * está totalmente especificado, só o algoritmo exato de reconciliação de
 * colunas entre atletas com históricos de tamanhos diferentes não estava
 * escrito literalmente no UX-SPEC.md): em vez de assumir que todos os
 * arrays têm as mesmas rodadas (frágil), constrói o conjunto de colunas a
 * partir da UNIÃO de `rodada_id` de todos os atletas retornados, ordenada
 * por data decrescente e cortada em `limit` — o resultado é o mesmo em
 * qualquer cenário normal (todos os atletas ativos alinhados) e continua
 * correto no caso de borda (atleta com histórico mais curto).
 */
export function buildRankingColumns(
  items: readonly RankingPublicoRecentesItem[],
  limit: number,
): RankingColumn[] {
  const byRodadaId = new Map<string, RodadaRecenteStatus>();
  for (const item of items) {
    for (const rodada of item.rodadas_recentes) {
      if (!byRodadaId.has(rodada.rodada_id)) {
        byRodadaId.set(rodada.rodada_id, rodada);
      }
    }
  }

  return Array.from(byRodadaId.values())
    .sort((a, b) => b.data.localeCompare(a.data)) // mais recente primeiro
    .slice(0, limit)
    .sort((a, b) => a.data.localeCompare(b.data)) // exibição: mais antiga -> mais recente (esquerda -> direita, como o mockup)
    .map((rodada) => ({ rodadaId: rodada.rodada_id, data: rodada.data }));
}

/** Índice (0-based) a partir do qual uma coluna deve permanecer visível em
 * `base`/`sm` (mobile) — as colunas mais antigas (índice menor) ficam ocultas
 * fora de `lg`, mantendo sempre as `MOBILE_COLUMN_LIMIT` mais recentes
 * (últimas do array, já em ordem cronológica ascendente). */
export function firstMobileVisibleColumnIndex(totalColumns: number): number {
  return Math.max(0, totalColumns - MOBILE_COLUMN_LIMIT);
}

/**
 * Busca o status do atleta para uma coluna (rodada) específica — `undefined`
 * quando o atleta não tem registro para aquela rodada (ex.: ainda não fazia
 * parte do grupo naquela data), caso em que a célula deve mostrar um
 * placeholder textual (nunca uma célula vazia sem explicação, WCAG 1.4.1).
 */
export function statusForColumn(
  item: RankingPublicoRecentesItem | undefined,
  column: RankingColumn,
): RodadaRecenteStatus["status"] | undefined {
  return item?.rodadas_recentes.find((r) => r.rodada_id === column.rodadaId)?.status;
}
