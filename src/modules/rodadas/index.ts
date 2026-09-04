/**
 * Serviço de Rodadas/Eventos (SDD.md Seção 2.1) — lançamento de
 * presença/eventos, cálculo automático de pontos (RN-05), bloqueio de
 * evento para atleta ausente (RF-02.6), alerta de rodada duplicada
 * (RF-02.8). Implementado em BE-08 (TASK.md Seção 3.1). Correção/exclusão
 * com reversão automática de pontos (RF-04.1/RF-04.2) implementadas em
 * BE-09, reaproveitando este mesmo módulo (mesmas tabelas/domínio). Preview
 * read-only de correção (RF-04.2, TASK.md Seção 6.2 item 2) implementado em
 * BE-10, também reaproveitando este módulo. Leitura de listagem/detalhe de
 * rodada (`GET /api/rodadas`/`GET /api/rodadas/:id`, T06/T07 do
 * `UX-SPEC.md`) implementada em BE-16 — lacuna deixada por BE-08/BE-09/
 * BE-10 (nenhuma delas cobria leitura, só escrita/log de auditoria),
 * fechada por decisão explícita do usuário ao identificar o bloqueio de
 * FE-06 (TASK.md, nota de status de BE-16).
 */
export * from "./constants";
export * from "./validation";
export * from "./repository";
export * from "./lancar";
export * from "./excluir";
export * from "./corrigir";
export * from "./simular-correcao";
export * from "./listar";
export * from "./detalhar";
export * from "./presenter";
