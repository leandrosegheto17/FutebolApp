/**
 * Mensagens de erro de T01 — Login (UX-SPEC.md Seção 4/5.2, RF-07.3).
 *
 * `LOGIN_GENERIC_ERROR_MESSAGE` é usada apenas como *fallback* se a resposta
 * `401` do servidor vier sem o campo `error` esperado pelo contrato
 * (`API-CONTRACT.yaml`, `AuthErroGenerico`) — em condições normais, o texto
 * exibido é sempre o que o servidor devolveu (idêntico esteja a falha por
 * senha incorreta ou por bloqueio de rate limiting, RF-07.3/GUARDRAILS.md
 * regra 15; o próprio Backend garante essa igualdade, o Frontend nunca
 * decide qual dos dois casos aconteceu).
 *
 * `LOGIN_TECHNICAL_ERROR_MESSAGE` cobre uma classe de erro diferente,
 * documentada explicitamente em `API-CONTRACT.yaml` (`400`/rede/servidor) —
 * nunca reaproveitada para "senha incorreta", para não sugerir ao usuário
 * que o problema foi a senha digitada quando na verdade foi uma falha
 * técnica (TASK.md Seção 1.0 — nunca lacuna silenciosa).
 */
export const LOGIN_GENERIC_ERROR_MESSAGE = "Senha incorreta.";
export const LOGIN_TECHNICAL_ERROR_MESSAGE = "Não foi possível entrar. Tente novamente.";
