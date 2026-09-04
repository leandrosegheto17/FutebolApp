/**
 * Serviço de Auditoria (SDD.md Seção 2.1) — grava e disponibiliza log de
 * correções (antes/depois, timestamp) e de eventos centrados no atleta (ex.:
 * anonimização, sempre com valores pessoais redigidos). Nunca grava campo de
 * autor individual (RN-12).
 *
 * A GRAVAÇÃO em si (`log_auditoria`) acontece inteiramente dentro das
 * funções PL/pgSQL de cada operação (`anonimizar_atleta`, BE-07;
 * `excluir_rodada`/`corrigir_participacao_rodada`, BE-09) — este módulo
 * nunca insere em `log_auditoria` diretamente (TASK.md Seção 1.2), por isso
 * ficou como placeholder até aqui. A partir de BE-09, este módulo passa a
 * existir de fato para a CONSULTA do log (RF-04.5, `GET
 * /api/log-auditoria`), ordenada do mais recente ao mais antigo.
 */
export * from "./validation";
export * from "./repository";
export * from "./presenter";
