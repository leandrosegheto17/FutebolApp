/**
 * Tipos do lado do Frontend para T06 (Histórico de Rodadas) — TASK.md FE-06/
 * `FE-R06` (Parte II, Iniciativa de Redesenho Visual).
 *
 * `RodadaHistoricoItem` espelha campo a campo `RodadaResumoItem`
 * (`API-CONTRACT.yaml`, schema publicado por BE-16 — `GET /api/rodadas`,
 * versão 0.12.0; estendido por `BE-R02` na versão 0.14.0), conferido contra
 * o contrato real, não mais uma extrapolação: `id`/`data`/`status`/
 * `criado_em` e `presentes` (contagem de `participacao_rodada.status =
 * "presente"` desta rodada, único campo que `RodadaResponse`/
 * `RodadaExcluidaResponse` não publicavam) + `confronto`/`status_correcao`
 * (`BE-R02`, colunas "Confronto"/"Status" de `FE-R06`).
 *
 * `status` inclui `"excluida"` — o próprio `RodadaResumoItem` documenta que
 * uma rodada excluída (soft-delete) aparece normalmente nesta listagem, com
 * o status visível, "quem decide o que fazer com uma rodada excluída na
 * tela é o Frontend, não uma omissão do Backend". Decisão deste agente
 * (`RodadaListItem.tsx`): nunca escondida, sempre distinguível de uma
 * rodada ativa via `Badge` textual "Excluída" (nunca só cor, WCAG 1.4.1) —
 * mesmo padrão já usado por `AtletasList.tsx`/FE-04 para "Inativo"/
 * "Anonimizado".
 *
 * ATENÇÃO — `status` (ciclo de vida de `app.rodada`, `"lancada"`/
 * `"excluida"`) e `status_correcao` (novo, `"encerrada"`/`"corrigida"`, se a
 * rodada já sofreu correção RF-04.4) são dois campos independentes, mesmo
 * nome parecido — NÃO confundir (`API-CONTRACT.yaml`, changelog 0.14.0).
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
  /**
   * "Confronto" (`FE-R06`/`BE-R02`) — placar agregado de pontos de gol por
   * time daquela rodada, mapeado posicionalmente para `colete`/`sem_colete`
   * (`ConfrontoRodada`, `API-CONTRACT.yaml` 0.14.0). `null` é o
   * comportamento **padrão e esperado** (não um erro) para toda rodada de
   * origem legado (`SPK-02`, cobertura de dado insuficiente confirmada) e
   * para qualquer rodada do sistema novo cujos dois times ainda não tenham
   * sido confirmados via T09 — ver placeholder textual "—" em
   * `RodadaListItem.tsx`.
   */
  confronto: ConfrontoRodada | null;
  /**
   * "Status" (`FE-R06`/`BE-R02`) — `"corrigida"` quando a rodada já sofreu
   * ao menos uma correção/estorno (RF-04.4, log de auditoria), `"encerrada"`
   * caso contrário. Independente do campo `status` acima (ciclo de vida de
   * `app.rodada`).
   */
  status_correcao: "encerrada" | "corrigida";
}

/**
 * Estrutura fixa de 2 times (`ADR-007`/`ADR-010`) — ver
 * `RodadaHistoricoItem.confronto`. Mapeamento posicional (`colete`/
 * `sem_colete`), não uma correspondência semântica real a `app.time.label`
 * (`API-CONTRACT.yaml`, `ConfrontoRodada`).
 */
export interface ConfrontoRodada {
  colete: number;
  sem_colete: number;
}
