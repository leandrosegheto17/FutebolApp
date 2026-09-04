/**
 * Tipos do lado do Frontend para T08 (Log de Auditoria) — TASK.md FE-08.
 *
 * `LogAuditoriaItem` espelha campo a campo `LogAuditoriaItem` de
 * `API-CONTRACT.yaml` (BE-09, `GET /api/log-auditoria`) e o modelo
 * `LOG_AUDITORIA` de `SDD.md` Seção 5: `rodada_id`/`atleta_id` são o
 * identificador cru (uuid), NUNCA um nome/data já resolvido — nem
 * `API-CONTRACT.yaml` nem o modelo de dados denormalizam essa informação
 * aqui (diferente de `ParticipacaoDetalheItem`/BE-16, que já resolve
 * `apelido_exibicao` do lado do servidor para T07). `valores_antes`/
 * `valores_depois` são jsonb livre (`{}` no OpenAPI) cujo formato depende de
 * `tipo_evento` — nunca tipados como um schema fixo aqui; `entryPresenter.ts`
 * faz a leitura defensiva campo a campo.
 *
 * NUNCA existe (e nunca deve ser adicionado) um campo de autor individual
 * neste tipo — RN-12/RN-07/GUARDRAILS.md regra 18: a própria tabela não tem
 * essa coluna.
 */
export type TipoEventoAuditoria = "correcao" | "estorno" | "anonimizacao";

export interface LogAuditoriaItem {
  id: string;
  /** Preenchido para `tipo_evento` `correcao`/`estorno`; nulo para `anonimizacao`. */
  rodada_id: string | null;
  /** Preenchido para `tipo_evento` `correcao`/`anonimizacao`; nulo para `estorno`. */
  atleta_id: string | null;
  tipo_evento: TipoEventoAuditoria;
  /** Timestamp ISO 8601 (`format: date-time` no contrato). */
  ocorrido_em: string;
  /** jsonb livre — formato depende de `tipo_evento` (ver `entryPresenter.ts`). */
  valores_antes: unknown;
  valores_depois: unknown;
}

/** Um evento (gol/cartão) contado — mesmo formato de `ParticipacaoDetalheItem.eventos`/BE-16. */
export interface EventoContagem {
  tipo: "gol" | "cartao_amarelo" | "cartao_vermelho";
  quantidade: number;
}
