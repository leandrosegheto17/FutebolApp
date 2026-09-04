/**
 * Fase 2 do ADR-007 — busca local sobre a partição já validada pela Fase 1
 * (`backtracking.ts`), em duas etapas, ambas preservando SEMPRE as
 * restrições obrigatórias (hard constraints) já garantidas pela Fase 1:
 *
 * 1. `rebalancearTamanhos` — move jogadores individuais entre times para
 *    aproximar cada time do seu tamanho-alvo (`calcularCapacidades`).
 *    Necessário porque a Fase 1 só garante uma coloração VÁLIDA quanto às
 *    restrições (ADR-010 não menciona tamanho de time em nenhum momento do
 *    algoritmo) — sem este passo, todo vértice "livre" (sem nenhuma
 *    restrição) tende a cair no time de menor índice tentado primeiro,
 *    produzindo times de tamanho muito desigual.
 * 2. `otimizarEquilibrio` — "swap iterativo entre times" (texto literal do
 *    ADR-007) minimizando a diferença agregada de nível técnico + idade
 *    (RF-05.3, soft constraint) entre os times, sem alterar o tamanho de
 *    nenhum time (troca sempre 1-para-1) nem violar nenhuma restrição.
 *
 * RF-05.3 não define uma fórmula exata de "diferença agregada" — decisão de
 * detalhe documentada abaixo (`calcularCusto`): mede a variância das médias
 * de cada critério entre os times, normalizada pela variância populacional
 * do próprio critério (uma espécie de coeficiente de variação), para somar
 * nível técnico + idade em uma única função-objetivo comparável mesmo tendo
 * escalas numéricas muito diferentes (nível técnico tipicamente ~0-15
 * pontos; idade ~10-60 anos) sem depender de uma constante de conversão
 * arbitrária entre as duas.
 */
import { EPSILON_MELHORIA_CUSTO, MAX_ITERACOES_BUSCA_LOCAL } from "./constants";
import type { Deadline } from "./timeout";

export type AtletaParaMontagem = {
  atletaId: string;
  apelidoExibicao: string;
  nivelTecnico: number;
  idade: number | null;
};

/**
 * Tamanho-alvo de cada time para `total` presentes divididos em
 * `quantidadeTimes` times — o mais equilibrado possível (diferença máxima de
 * 1 jogador entre o maior e o menor time). Os primeiros `total % quantidadeTimes`
 * times (por índice) recebem o excedente — decisão de detalhe, irrelevante
 * na prática porque "Time A"/"Time B" (ou índices 0..N-1) não têm
 * significado próprio além do rótulo.
 */
export function calcularCapacidades(total: number, quantidadeTimes: number): number[] {
  const base = Math.floor(total / quantidadeTimes);
  const resto = total % quantidadeTimes;
  return Array.from(
    { length: quantidadeTimes },
    (_, indice) => base + (indice < resto ? 1 : 0),
  );
}

function podeReceber(
  candidato: string,
  destino: readonly string[],
  adjacenciaGlobal: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  const vizinhos = adjacenciaGlobal.get(candidato);
  if (!vizinhos || vizinhos.size === 0) {
    return true;
  }
  return !destino.some((membro) => vizinhos.has(membro));
}

type ParCandidato = { deIndice: number; paraIndice: number; atletaId: string };

function encontrarParCandidato(
  times: readonly string[][],
  capacidades: readonly number[],
  adjacenciaGlobal: ReadonlyMap<string, ReadonlySet<string>>,
): ParCandidato | null {
  const acimaIndices = times
    .map((_, indice) => indice)
    .filter((indice) => times[indice]!.length > capacidades[indice]!);
  const abaixoIndices = times
    .map((_, indice) => indice)
    .filter((indice) => times[indice]!.length < capacidades[indice]!);

  for (const deIndice of acimaIndices) {
    for (const paraIndice of abaixoIndices) {
      const candidato = [...times[deIndice]!]
        .sort()
        .find((atletaId) => podeReceber(atletaId, times[paraIndice]!, adjacenciaGlobal));
      if (candidato) {
        return { deIndice, paraIndice, atletaId: candidato };
      }
    }
  }
  return null;
}

/**
 * Move jogadores de times acima da capacidade-alvo para times abaixo dela,
 * sempre respeitando as restrições obrigatórias (`adjacenciaGlobal`) — se
 * nenhum jogador puder ser movido com segurança entre um par específico de
 * times, tenta outro par; se NENHUM par tiver candidato seguro, aceita o
 * desequilíbrio residual (hard constraint sempre vence tamanho — RF-05.1
 * está acima de qualquer preferência de tamanho, que não é sequer um
 * requisito literal do PRD-TECNICO.md). Cada movimento bem-sucedido reduz
 * estritamente o excedente total acima da capacidade, então o laço sempre
 * termina.
 */
export function rebalancearTamanhos(
  times: string[][],
  capacidades: readonly number[],
  adjacenciaGlobal: ReadonlyMap<string, ReadonlySet<string>>,
  deadline: Deadline,
): void {
  for (;;) {
    if (deadline.vencido()) {
      return; // Fase 2: nunca descarta a partição válida da Fase 1 por timeout.
    }
    const par = encontrarParCandidato(times, capacidades, adjacenciaGlobal);
    if (!par) {
      return;
    }
    const { deIndice, paraIndice, atletaId } = par;
    times[deIndice] = times[deIndice]!.filter((id) => id !== atletaId);
    times[paraIndice] = [...times[paraIndice]!, atletaId];
  }
}

function media(valores: readonly number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((acumulado, valor) => acumulado + valor, 0) / valores.length;
}

function variancia(valores: readonly number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  const mediaValores = media(valores);
  return media(valores.map((valor) => (valor - mediaValores) ** 2));
}

function mediasPorTime(
  times: readonly string[][],
  atletasPorId: ReadonlyMap<string, AtletaParaMontagem>,
): { nivelMedio: number[]; idadeMedia: Array<number | null> } {
  const nivelMedio = times.map((time) =>
    media(time.map((atletaId) => atletasPorId.get(atletaId)!.nivelTecnico)),
  );
  const idadeMedia = times.map((time) => {
    const idades = time
      .map((atletaId) => atletasPorId.get(atletaId)!.idade)
      .filter((idade): idade is number => idade !== null);
    return idades.length === 0 ? null : media(idades);
  });
  return { nivelMedio, idadeMedia };
}

/**
 * Custo (RF-05.3, "diferença agregada" entre os times) = variância das
 * médias de nível técnico entre os times, normalizada pela variância
 * populacional do nível técnico entre TODOS os presentes, mais o mesmo
 * cálculo para idade. Quanto menor, mais equilibrados os times. Um critério
 * cuja variância populacional é zero (ex.: todos os presentes com o mesmo
 * nível técnico, ou nenhum `data_nascimento` disponível) contribui 0 ao
 * custo — não há o que equilibrar nesse eixo.
 */
export function calcularCusto(
  times: readonly string[][],
  atletasPorId: ReadonlyMap<string, AtletaParaMontagem>,
  varianciaNivelPopulacao: number,
  varianciaIdadePopulacao: number,
): number {
  const { nivelMedio, idadeMedia } = mediasPorTime(times, atletasPorId);
  const idadesMediasValidas = idadeMedia.filter(
    (valor): valor is number => valor !== null,
  );

  const custoNivel =
    varianciaNivelPopulacao > 0 ? variancia(nivelMedio) / varianciaNivelPopulacao : 0;
  const custoIdade =
    varianciaIdadePopulacao > 0 && idadesMediasValidas.length > 1
      ? variancia(idadesMediasValidas) / varianciaIdadePopulacao
      : 0;

  return custoNivel + custoIdade;
}

function swapValido(
  times: readonly string[][],
  iIndice: number,
  jIndice: number,
  atletaA: string,
  atletaB: string,
  adjacenciaGlobal: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  const vizinhosA = adjacenciaGlobal.get(atletaA) ?? new Set<string>();
  const vizinhosB = adjacenciaGlobal.get(atletaB) ?? new Set<string>();
  const membrosIAposSwap = times[iIndice]!.filter((id) => id !== atletaA);
  const membrosJAposSwap = times[jIndice]!.filter((id) => id !== atletaB);
  const conflitoEmI = membrosIAposSwap.some((id) => vizinhosB.has(id));
  const conflitoEmJ = membrosJAposSwap.some((id) => vizinhosA.has(id));
  return !conflitoEmI && !conflitoEmJ;
}

function aplicarSwap(
  times: string[][],
  iIndice: number,
  jIndice: number,
  atletaA: string,
  atletaB: string,
): void {
  times[iIndice] = times[iIndice]!.map((id) => (id === atletaA ? atletaB : id));
  times[jIndice] = times[jIndice]!.map((id) => (id === atletaB ? atletaA : id));
}

/**
 * "Swap iterativo entre times" (ADR-007) — busca local por melhoria
 * (first-improvement): a cada iteração, procura o primeiro par de
 * jogadores de times diferentes cuja troca (a) não viola nenhuma restrição
 * obrigatória e (b) reduz o custo agregado (`calcularCusto`); aplica a
 * troca e recomeça a busca. Termina quando nenhuma troca melhora o custo
 * (ótimo local — RF-05.3 não exige ótimo global, ADR-007 aceita isso
 * conscientemente como dívida técnica), quando `MAX_ITERACOES_BUSCA_LOCAL`
 * é atingido, ou quando o `deadline` vence (sem descartar a melhor partição
 * já encontrada, sempre 100% válida quanto a restrições obrigatórias).
 */
export function otimizarEquilibrio(
  times: string[][],
  atletasPorId: ReadonlyMap<string, AtletaParaMontagem>,
  adjacenciaGlobal: ReadonlyMap<string, ReadonlySet<string>>,
  deadline: Deadline,
): void {
  const todosAtletas = Array.from(atletasPorId.values());
  const varianciaNivelPopulacao = variancia(
    todosAtletas.map((atleta) => atleta.nivelTecnico),
  );
  const idadesPopulacao = todosAtletas
    .map((atleta) => atleta.idade)
    .filter((idade): idade is number => idade !== null);
  const varianciaIdadePopulacao = variancia(idadesPopulacao);

  let custoAtual = calcularCusto(
    times,
    atletasPorId,
    varianciaNivelPopulacao,
    varianciaIdadePopulacao,
  );

  for (let iteracao = 0; iteracao < MAX_ITERACOES_BUSCA_LOCAL; iteracao += 1) {
    if (deadline.vencido()) {
      return;
    }

    let melhorou = false;
    buscaDeMelhoria: for (let i = 0; i < times.length; i += 1) {
      for (let j = i + 1; j < times.length; j += 1) {
        for (const atletaA of times[i]!) {
          for (const atletaB of times[j]!) {
            if (!swapValido(times, i, j, atletaA, atletaB, adjacenciaGlobal)) {
              continue;
            }
            aplicarSwap(times, i, j, atletaA, atletaB);
            const novoCusto = calcularCusto(
              times,
              atletasPorId,
              varianciaNivelPopulacao,
              varianciaIdadePopulacao,
            );
            if (novoCusto < custoAtual - EPSILON_MELHORIA_CUSTO) {
              custoAtual = novoCusto;
              melhorou = true;
              break buscaDeMelhoria;
            }
            aplicarSwap(times, i, j, atletaB, atletaA); // desfaz — não melhorou
          }
        }
      }
    }

    if (!melhorou) {
      return; // ótimo local — nenhuma troca reduz mais o custo
    }
  }
}
