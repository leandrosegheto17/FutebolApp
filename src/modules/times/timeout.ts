/**
 * Guarda de timeout do Serviço de Times (BE-11, TASK.md Seção 6.2 item 3) —
 * um único orçamento de tempo (`TIMEOUT_MONTAGEM_MS`) compartilhado entre as
 * duas fases do algoritmo (ADR-007), mas com semânticas DIFERENTES em cada
 * uma, decisão de detalhe documentada aqui por ser central para a garantia
 * de RF-05.1/RF-05.2:
 *
 * - Fase 1 (backtracking + componentes conexos, `backtracking.ts`): usa
 *   `verificar()` (lança `TimeoutError`). Estourar o tempo aqui significa
 *   que o algoritmo AINDA NÃO SABE se existe uma divisão 100% válida — não
 *   é seguro devolver nem `"ok"` (poderia haver uma restrição violada que a
 *   busca não teve tempo de descartar) nem `"conflito"` (poderia haver uma
 *   solução válida que a busca não teve tempo de encontrar). A única
 *   resposta honesta é "falha técnica real" (TASK.md Seção 3.1, critério de
 *   aceite literal de BE-11).
 * - Fase 2 (busca local de soft constraints, `busca-local.ts`): usa
 *   `vencido()` (checagem não-lançadora). Ao chegar na fase 2, a fase 1 já
 *   PROVOU uma divisão 100% válida quanto às restrições obrigatórias — se o
 *   tempo acabar durante o refinamento de equilíbrio (RF-05.3), a resposta
 *   correta é devolver a MELHOR divisão já encontrada até aquele ponto
 *   (ainda 100% válida), não descartar um resultado correto e transformar
 *   uma otimização de "melhor esforço" (RF-05.3 não exige otimalidade) em
 *   uma falha técnica desnecessária.
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class Deadline {
  private readonly limiteEm: number;

  constructor(orcamentoMs: number, agora: number = Date.now()) {
    this.limiteEm = agora + orcamentoMs;
  }

  /** `true` quando o orçamento de tempo já foi consumido. */
  vencido(agora: number = Date.now()): boolean {
    return agora > this.limiteEm;
  }

  /** Lança `TimeoutError` se o orçamento já foi consumido — uso exclusivo da Fase 1. */
  verificar(): void {
    if (this.vencido()) {
      throw new TimeoutError(
        "Tempo máximo de geração de sugestão de times excedido (TASK.md Seção 6.2 item 3).",
      );
    }
  }
}
