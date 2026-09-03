import { getAnonClient } from "@/lib/supabase/anon-client";
import type { RankingPublicoItem } from "./types";

/**
 * Lista literal e exaustiva de colunas pedidas à view `app.ranking_publico`
 * (API-CONTRACT.yaml, endpoint `/ranking_publico`). Nunca `select("*")` —
 * reforço defensivo, no próprio código do cliente, de que `contato`/
 * `data_nascimento` nunca são *solicitados* a esta view (TASK.md Seção 1.5/
 * 6.2, critério de aceite de FE-02: "nunca solicita contato/data_nascimento
 * à view"). A garantia real e não contornável já está no banco (RLS + GRANT
 * restrito às colunas da view, BE-03) — isto é a segunda camada, do lado do
 * Frontend, não um substituto dela.
 */
const RANKING_PUBLICO_COLUMNS =
  "atleta_id, nome_exibicao, pontuacao_acumulada, presencas, cartoes";

/**
 * Busca o ranking público (T02). A cascata de desempate completa de RN-08
 * (pontuação desc → presenças desc → cartões asc → nome asc) é aplicada
 * explicitamente via `.order()`, em vez de depender implicitamente da
 * ordenação interna da definição da view — reforça o contrato em vez de
 * confiar em um comportamento não garantido pelo SQL (uma consulta sobre uma
 * view com `ORDER BY` embutido não tem, por si só, garantia formal de
 * preservar essa ordem sem uma cláusula `ORDER BY` explícita na consulta
 * externa). `API-CONTRACT.yaml` já antecipa isso: "nenhum parâmetro order é
 * necessário... mas o PostgREST aceita order= se o Frontend precisar
 * reforçar explicitamente".
 */
export async function fetchRankingPublico(): Promise<RankingPublicoItem[]> {
  const { data, error } = await getAnonClient()
    .from("ranking_publico")
    .select(RANKING_PUBLICO_COLUMNS)
    .order("pontuacao_acumulada", { ascending: false })
    .order("presencas", { ascending: false })
    .order("cartoes", { ascending: true })
    .order("nome_exibicao", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Cast documentado: não há schema TypeScript gerado a partir do Postgres
  // neste projeto ainda (nenhum outro módulo o faz); `RANKING_PUBLICO_COLUMNS`
  // acima é a fonte da verdade do formato retornado, validada pelo teste de
  // integração de BE-03 do lado do banco.
  return (data ?? []) as unknown as RankingPublicoItem[];
}
