import { getAnonClient } from "@/lib/supabase/anon-client";
import type { RankingPublicoRecentesItem } from "./types";

/**
 * Lista literal e exaustiva de colunas pedidas à view `app.ranking_publico_recentes`
 * (`API-CONTRACT.yaml` v0.13.0, `BE-R01`). Nunca `select("*")` — mesma
 * disciplina defensiva já usada por `rankingApi.ts` (FE-02): a garantia real
 * de nunca expor `contato`/`data_nascimento` já está no banco (RLS + view
 * curada), isto é a segunda camada, do lado do Frontend.
 */
const RANKING_PUBLICO_RECENTES_COLUMNS =
  "atleta_id, nome_exibicao, rodadas_recentes, rodadas_jogadas, media_presenca";

/**
 * Busca a matriz de últimas N=7 rodadas por atleta + estatísticas de grupo da
 * temporada (T02 redesenhado, `FE-R02`/`BE-R01`, `API-CONTRACT.yaml`
 * `GET /ranking_publico_recentes`). Integração contra a API **real** — a
 * view já está `Concluída`/publicada, não é mock.
 *
 * Este endpoint não define a ordem de classificação do ranking (isso
 * continua vindo de `fetchRankingPublico`/`ranking_publico`, BE-03) — a
 * ordem retornada aqui é alfabética por `nome_exibicao` (contrato explícito),
 * irrelevante para quem consome (`RankingList.tsx` reindexa por `atleta_id`).
 */
export async function fetchRankingPublicoRecentes(): Promise<
  RankingPublicoRecentesItem[]
> {
  const { data, error } = await getAnonClient()
    .from("ranking_publico_recentes")
    .select(RANKING_PUBLICO_RECENTES_COLUMNS);

  if (error) {
    throw new Error(error.message);
  }

  // Cast documentado — mesma justificativa de `rankingApi.ts`: sem schema
  // TypeScript gerado a partir do Postgres neste projeto; a lista de colunas
  // acima é a fonte da verdade do formato, validada pelo teste de integração
  // de `BE-R01` do lado do banco.
  return (data ?? []) as unknown as RankingPublicoRecentesItem[];
}
