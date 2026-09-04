import { getAnonClient } from "@/lib/supabase/anon-client";
import type { PresencaMensalPublicaItem } from "./types";

/**
 * Lista literal e exaustiva de colunas pedidas à view
 * `app.presenca_mensal_publica` (API-CONTRACT.yaml, endpoint
 * `/presenca_mensal_publica`). Nunca `select("*")` — mesmo reforço defensivo
 * já aplicado por `rankingApi.ts` (FE-02): a garantia real de que
 * `contato`/`data_nascimento` nunca são expostos já está no banco (RLS +
 * GRANT restrito às colunas da view, BE-03); isto é a segunda camada, do
 * lado do Frontend.
 */
const PRESENCA_MENSAL_COLUMNS =
  "ano, mes, rodada_id, rodada_data, total_presentes, nomes_presentes";

/**
 * Busca a presença mensal pública (T03) para um mês civil específico
 * (RN-09), filtrando no servidor via `?ano=eq.&mes=eq.` (mesma sintaxe já
 * documentada em `API-CONTRACT.yaml` para este endpoint) — evita trazer o
 * histórico inteiro de rodadas só para descartar no cliente todo mês que não
 * é o selecionado.
 *
 * Ordenação por `rodada_data` reforçada explicitamente via `.order()` (mesmo
 * racional já usado por `fetchRankingPublico`/RN-08 em `rankingApi.ts`):
 * `API-CONTRACT.yaml` não documenta uma garantia formal de ordem para este
 * endpoint (ao contrário de `ranking_publico`), então o cliente não depende
 * de nenhum comportamento implícito da view.
 */
export async function fetchPresencaMensal(
  ano: number,
  mes: number,
): Promise<PresencaMensalPublicaItem[]> {
  const { data, error } = await getAnonClient()
    .from("presenca_mensal_publica")
    .select(PRESENCA_MENSAL_COLUMNS)
    .eq("ano", ano)
    .eq("mes", mes)
    .order("rodada_data", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Cast documentado, mesmo padrão de `rankingApi.ts`: não há schema
  // TypeScript gerado a partir do Postgres neste projeto; `PRESENCA_MENSAL_COLUMNS`
  // acima é a fonte da verdade do formato retornado, validada pelo teste de
  // integração de BE-03 do lado do banco.
  return (data ?? []) as unknown as PresencaMensalPublicaItem[];
}
