/**
 * Constantes do Serviço de Rodadas/Eventos (BE-08, TASK.md Seção 3.1) e do
 * Serviço de Correção/Estorno (BE-09, TASK.md Seção 3.1 — reutiliza este
 * módulo por operar nas mesmas tabelas/domínio de BE-08, mesmo padrão já
 * usado por `anonimizar.ts` dentro de `src/modules/atletas`).
 */

/** `errcode` levantado pela função PL/pgSQL `app.lancar_rodada` (ver migration). */
export const ERRCODE_EVENTO_PARA_AUSENTE = "RF026";
export const ERRCODE_CONFIGURACAO_PONTUACAO_AUSENTE = "RN005";

/**
 * `errcode` levantados por `app.excluir_rodada`/`app.corrigir_participacao_rodada`
 * (BE-09, ver migrations `20260903130000_*`/`20260903130100_*`).
 */
export const ERRCODE_RODADA_NAO_ENCONTRADA = "P0002";
export const ERRCODE_RODADA_JA_EXCLUIDA = "RD001";
export const ERRCODE_PARTICIPACAO_NAO_ENCONTRADA = "RD002";

/** Mensagens de erro reutilizadas — nunca literais alternativos espalhados pelo código. */
export const EVENTO_PARA_AUSENTE_MENSAGEM =
  "Não é permitido registrar evento de jogo (gol/cartão) para atleta ausente (RF-02.6).";

export const CONFIGURACAO_PONTUACAO_AUSENTE_MENSAGEM =
  "Nenhum valor de pontuação configurado (app.configuracao_pontuacao) para calcular esta rodada (RN-05).";
