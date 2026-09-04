/**
 * Fase 1 do ADR-007 — backtracking com poda, restrito a um único componente
 * conexo por vez (ADR-010, passo 3): tenta atribuir a cada vértice do
 * componente um "time" em `[0, quantidadeTimes)` tal que nenhuma aresta do
 * componente tenha as duas pontas na mesma cor.
 *
 * É backtracking de verdade, não uma heurística gulosa pura substituindo-o
 * (TASK.md Seção 1.4): a busca é exaustiva sobre TODAS as cores possíveis
 * de cada vértice, com poda por "forward-checking" (descarta imediatamente
 * qualquer cor que já conflite com um vizinho já colorido, sem esperar o
 * ramo terminar) e retrocesso real — quando um ramo esgota as
 * `quantidadeTimes` cores para um vértice sem sucesso, a atribuição do
 * vértice anterior é desfeita (`cores.delete`) e a próxima cor alternativa
 * dele é tentada (`continue` do laço externo em `backtrack`). Uma heurística
 * gulosa pura nunca desfaria uma escolha já feita — é exatamente essa
 * diferença que garante a semântica exata de RF-05.1/RF-05.2 (ADR-007: uma
 * gulosa pura "não garante encontrar partição viável quando ela existe").
 *
 * Duas heurísticas de ORDENAÇÃO (não de substituição do backtracking, ADR-007
 * permite explicitamente heurísticas de poda dentro da fase 1):
 * - Ordem dos vértices: grau decrescente (mais restrito primeiro, no
 *   espírito do "most constrained variable" clássico de CSP) — reduz a
 *   chance de descobrir tarde um vértice sem nenhuma cor livre.
 * - Ordem das cores tentadas por vértice (`ordemCores`, recebida de fora):
 *   permite ao chamador (`colorirGrafo`) priorizar o time atualmente menos
 *   carregado entre os componentes já processados, produzindo uma partição
 *   inicial já razoavelmente equilibrada em tamanho antes mesmo da Fase 2
 *   (`busca-local.ts`) entrar em ação — só afeta a ORDEM em que os `N`
 *   valores são tentados, todos os `N` continuam sendo exaustivamente
 *   considerados se necessário.
 */
import type { Componente } from "./grafo";
import type { Deadline } from "./timeout";

export type ColoracaoComponenteResultado =
  { sucesso: true; cores: Map<string, number> } | { sucesso: false };

export function colorirComponente(
  componente: Componente,
  quantidadeTimes: number,
  deadline: Deadline,
  ordemCores: readonly number[],
): ColoracaoComponenteResultado {
  const adjacencia = new Map<string, Set<string>>();
  for (const vertice of componente.vertices) {
    adjacencia.set(vertice, new Set());
  }
  for (const aresta of componente.arestas) {
    adjacencia.get(aresta.atletaAId)!.add(aresta.atletaBId);
    adjacencia.get(aresta.atletaBId)!.add(aresta.atletaAId);
  }

  const ordemVertices = [...componente.vertices].sort((a, b) => {
    const grauA = adjacencia.get(a)!.size;
    const grauB = adjacencia.get(b)!.size;
    if (grauA !== grauB) {
      return grauB - grauA; // maior grau primeiro
    }
    return a < b ? -1 : 1; // desempate determinístico
  });

  const cores = new Map<string, number>();

  function backtrack(indice: number): boolean {
    deadline.verificar(); // Fase 1: timeout é falha técnica real, nunca "conflito" silencioso.
    if (indice === ordemVertices.length) {
      return true;
    }
    const vertice = ordemVertices[indice]!;
    const vizinhos = adjacencia.get(vertice)!;
    for (const cor of ordemCores) {
      let conflita = false;
      for (const vizinho of vizinhos) {
        if (cores.get(vizinho) === cor) {
          conflita = true;
          break;
        }
      }
      if (conflita) {
        continue; // poda: nem tenta descer este ramo
      }
      cores.set(vertice, cor);
      if (backtrack(indice + 1)) {
        return true;
      }
      cores.delete(vertice); // retrocesso real — desfaz e tenta a próxima cor
    }
    return false;
  }

  const encontrado = backtrack(0);
  if (!encontrado) {
    return { sucesso: false };
  }
  return { sucesso: true, cores: new Map(cores) };
}

export type ColoracaoGlobalResultado =
  | { sucesso: true; cores: Map<string, number> }
  | { sucesso: false; componentesFalhos: Componente[] };

/**
 * Aplica `colorirComponente` a CADA componente (ADR-010, passo 3) — como
 * componentes são, por definição, isolados entre si (nenhuma restrição
 * cruza a fronteira de dois componentes diferentes), o resultado de um
 * componente nunca afeta a viabilidade de outro. Por isso o processamento
 * continua mesmo depois de um componente falhar, para relatar TODOS os
 * grupos em conflito de uma vez (ADR-010, passo 5) — não só o primeiro
 * encontrado.
 *
 * A ordem de tentativa de cores dentro de cada componente prioriza o time
 * com menor carga acumulada até aquele ponto (`carga`), produzindo uma
 * partição inicial melhor distribuída para a Fase 2 (`busca-local.ts`)
 * refinar — decisão de qualidade de resultado, não de correção (a
 * corretude da coloração não depende desta ordem, ver `backtracking.ts`).
 */
export function colorirGrafo(
  componentes: readonly Componente[],
  quantidadeTimes: number,
  deadline: Deadline,
): ColoracaoGlobalResultado {
  const cores = new Map<string, number>();
  const componentesFalhos: Componente[] = [];
  const carga = new Array<number>(quantidadeTimes).fill(0);

  for (const componente of componentes) {
    const ordemCores = Array.from({ length: quantidadeTimes }, (_, cor) => cor).sort(
      (a, b) => carga[a]! - carga[b]! || a - b,
    );
    const resultado = colorirComponente(
      componente,
      quantidadeTimes,
      deadline,
      ordemCores,
    );
    if (!resultado.sucesso) {
      componentesFalhos.push(componente);
      continue;
    }
    for (const [vertice, cor] of resultado.cores) {
      cores.set(vertice, cor);
      carga[cor] = (carga[cor] ?? 0) + 1;
    }
  }

  if (componentesFalhos.length > 0) {
    return { sucesso: false, componentesFalhos };
  }
  return { sucesso: true, cores };
}
