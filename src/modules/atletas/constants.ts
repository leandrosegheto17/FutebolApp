/**
 * Constantes do Serviço de Atletas (BE-06, TASK.md Seção 3.1).
 */

/**
 * Idade (em anos completos) abaixo da qual o consentimento do responsável
 * legal é obrigatório para salvar o cadastro (RF-01.3/RN-02, LGPD Art. 14
 * §1º).
 */
export const IDADE_MINIMA_SEM_CONSENTIMENTO = 18;

/**
 * Mensagem de erro para o bloqueio de RF-01.3 — texto único reutilizado em
 * todo ponto do código que precise recusar o salvamento por falta de
 * consentimento (nenhum outro literal alternativo deve ser criado).
 */
export const CONSENTIMENTO_OBRIGATORIO_MENSAGEM =
  "Consentimento do responsável legal é obrigatório para atletas menores de " +
  `${IDADE_MINIMA_SEM_CONSENTIMENTO} anos (RF-01.3/RN-02).`;
