/**
 * Tipos do lado do Frontend para T06 (Histórico de Rodadas) — TASK.md FE-06.
 *
 * `RodadaHistoricoItem` espelha campo a campo `RodadaResumoItem`
 * (`API-CONTRACT.yaml`, schema publicado por BE-16 — `GET /api/rodadas`,
 * versão 0.12.0), conferido contra o contrato real, não mais uma
 * extrapolação: `id`/`data`/`status`/`criado_em` e `presentes` (contagem de
 * `participacao_rodada.status = "presente"` desta rodada, único campo que
 * `RodadaResponse`/`RodadaExcluidaResponse` não publicavam).
 *
 * `status` inclui `"excluida"` — o próprio `RodadaResumoItem` documenta que
 * uma rodada excluída (soft-delete) aparece normalmente nesta listagem, com
 * o status visível, "quem decide o que fazer com uma rodada excluída na
 * tela é o Frontend, não uma omissão do Backend". Decisão deste agente
 * (`RodadaListItem.tsx`): nunca escondida, sempre distinguível de uma
 * rodada ativa via `Badge` textual "Excluída" (nunca só cor, WCAG 1.4.1) —
 * mesmo padrão já usado por `AtletasList.tsx`/FE-04 para "Inativo"/
 * "Anonimizado".
 */
export interface RodadaHistoricoItem {
  id: string;
  /** Data civil `"AAAA-MM-DD"` — mesmo formato de `RodadaResponse.data` (BE-08). */
  data: string;
  status: "lancada" | "excluida";
  /**
   * Timestamp de criação (ISO 8601) — usado só como critério de desempate
   * ao reordenar no cliente (ver `ordenarDecrescente`, `HistoricoRodadasList.tsx`),
   * nunca exibido na UI. Mesmo desempate documentado pelo contrato real de
   * `GET /api/rodadas`: `data desc` e, em empate de data civil (cenário
   * válido via `confirmar_duplicidade`, RF-02.8), `criado_em desc`.
   */
  criado_em: string;
  /** Quantidade de atletas com `participacao_rodada.status = "presente"` nesta rodada. */
  presentes: number;
}
