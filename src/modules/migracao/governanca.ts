/**
 * Guarda técnica de governança (GUARDRAILS.md regra 35 / `BLOCKERS.md`
 * `BLOCKER-003`, TASK.md Seção 3.1/BE-15) — nenhuma execução REAL de BE-15
 * contra a schema legada real pode acontecer sem uma autorização explícita,
 * gravada em variável de ambiente, que só deveria ser definida depois de
 * confirmação formal do Tech Lead/Software Architect/CTO de que a condição
 * da regra 35 está satisfeita.
 *
 * Reforço TÉCNICO (não só documentação/instrução) do mesmo espírito já
 * aplicado por BE-14 (trava de banco contra DDL destrutivo na schema
 * legada): um guardrail de processo vira também uma trava no código, não só
 * uma instrução que depende inteiramente de disciplina humana. Usado por
 * `scripts/migrar-legado.ts` ANTES de abrir qualquer conexão com a schema
 * legada real.
 *
 * Função pura (só lê o `source` recebido, nunca `process.env` implicitamente
 * quando um `source` é passado) — testável sem variável de ambiente real.
 */
export const VARIAVEL_AUTORIZACAO_GOVERNANCA = "LEGADO_MIGRACAO_AUTORIZACAO";

export const VALOR_AUTORIZACAO_ESPERADO =
  "AUTORIZO-EXECUCAO-REAL-CONTRA-LEGADO-REGRA-35-SATISFEITA";

export type ResultadoVerificacaoGovernanca =
  { autorizado: true } | { autorizado: false; mensagem: string };

export function verificarAutorizacaoGovernanca(
  source: Record<string, string | undefined> = process.env,
): ResultadoVerificacaoGovernanca {
  const valor = source[VARIAVEL_AUTORIZACAO_GOVERNANCA];
  if (valor === VALOR_AUTORIZACAO_ESPERADO) {
    return { autorizado: true };
  }
  return {
    autorizado: false,
    mensagem:
      "BLOQUEIO DE GOVERNANÇA (GUARDRAILS.md regra 35 / BLOCKERS.md BLOCKER-003): " +
      "nenhuma execução real de BE-15 contra a schema legada real pode acontecer " +
      "sem confirmação EXPLÍCITA e formal do Tech Lead/Software Architect/CTO de " +
      "que a condição da regra 35 está satisfeita (ADR-002 com o parágrafo de " +
      "'plano de saída' redigido e aceito). Depois dessa confirmação — nunca por " +
      `conta própria —, defina a variável de ambiente ` +
      `${VARIAVEL_AUTORIZACAO_GOVERNANCA}=${VALOR_AUTORIZACAO_ESPERADO} no ` +
      "ambiente que vai rodar este script. Sem essa variável, o script pode ser " +
      "usado apenas contra fixtures/dado de teste (npm test), nunca apontado " +
      "para LEGACY_SUPABASE_URL/LEGACY_SUPABASE_SERVICE_ROLE_KEY reais.",
  };
}
