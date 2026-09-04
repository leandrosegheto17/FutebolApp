/**
 * Tipos da Presença Mensal (T03) — espelham `PresencaMensalPublicaItem` de
 * `API-CONTRACT.yaml` (view `app.presenca_mensal_publica`, BE-03, já
 * `Concluída`/aprovada pelo QA — integração real, não mock). Lista de campos
 * idêntica ao contrato: nunca inclui `contato`/`data_nascimento` (RN-01/
 * ADR-005), nem nome completo de nenhum atleta — só `apelido_exibicao`
 * (RN-06) via `nomes_presentes`.
 */
export interface PresencaMensalPublicaItem {
  ano: number;
  mes: number;
  rodada_id: string;
  /** Formato ISO `YYYY-MM-DD` (PostgREST `date`). */
  rodada_data: string;
  total_presentes: number;
  /** `apelido_exibicao` (RN-06) dos presentes, já ordenado alfabeticamente
   * pela própria view (BE-03) — nunca reordenado de novo no cliente. */
  nomes_presentes: string[];
}

/** Mês civil (RN-09): 1 (janeiro) a 12 (dezembro), sempre com o ano associado. */
export interface MesCivil {
  ano: number;
  mes: number;
}
