/**
 * Grafo de restrições obrigatórias ativas entre os presentes (ADR-010,
 * passo 1) + decomposição em componentes conexos via union-find O(V+E)
 * (ADR-010, passo 2) — usado tanto pela fase de backtracking
 * (`backtracking.ts`, coloração por componente, ADR-010 passo 3) quanto
 * pela explicação de conflito (`presenter.ts`, `restricoes_conflitantes`/
 * `grupos_conflito`) quando algum componente não admite coloração válida em
 * `N` times (ADR-010 passo 5).
 */

export type ArestaConflito = {
  restricaoId: string;
  atletaAId: string;
  atletaBId: string;
};

/** Union-find com compressão de caminho + união por rank — O(V+E) amortizado (ADR-010). */
class UnionFind {
  private readonly pai = new Map<string, string>();
  private readonly rank = new Map<string, number>();

  constructor(vertices: readonly string[]) {
    for (const v of vertices) {
      this.pai.set(v, v);
      this.rank.set(v, 0);
    }
  }

  find(v: string): string {
    const atual = this.pai.get(v);
    if (atual === undefined) {
      throw new Error(`Vértice desconhecido no union-find do grafo de restrições: ${v}`);
    }
    if (atual === v) {
      return v;
    }
    const raiz = this.find(atual);
    this.pai.set(v, raiz); // compressão de caminho
    return raiz;
  }

  union(a: string, b: string): void {
    const raizA = this.find(a);
    const raizB = this.find(b);
    if (raizA === raizB) {
      return;
    }
    const rankA = this.rank.get(raizA) ?? 0;
    const rankB = this.rank.get(raizB) ?? 0;
    if (rankA < rankB) {
      this.pai.set(raizA, raizB);
    } else if (rankA > rankB) {
      this.pai.set(raizB, raizA);
    } else {
      this.pai.set(raizB, raizA);
      this.rank.set(raizA, rankA + 1);
    }
  }
}

export type Componente = {
  /** Ids dos atletas do componente, ordenados deterministicamente (menor id primeiro). */
  vertices: string[];
  /** Restrições ativas cujos dois lados pertencem a este componente. */
  arestas: ArestaConflito[];
};

/**
 * Decompõe `vertices` (todos os presentes solicitados) em componentes
 * conexos segundo `arestas` (pares com restrição obrigatória ATIVA entre
 * dois presentes). Vértices sem nenhuma aresta formam componente unitário
 * (singleton) — nunca representam conflito por definição (nenhuma
 * restrição os envolve), mas entram no resultado para a fase de coloração
 * poder atribuí-los a qualquer time livremente.
 *
 * Determinístico (ADR-007): a mesma entrada sempre produz a mesma lista de
 * componentes, na mesma ordem — vértices dentro de um componente ordenados
 * por id, e os próprios componentes ordenados pelo menor id que contêm.
 */
export function calcularComponentesConexos(
  vertices: readonly string[],
  arestas: readonly ArestaConflito[],
): Componente[] {
  const uf = new UnionFind(vertices);
  for (const aresta of arestas) {
    uf.union(aresta.atletaAId, aresta.atletaBId);
  }

  const porRaiz = new Map<string, { vertices: string[]; arestas: ArestaConflito[] }>();
  for (const vertice of vertices) {
    const raiz = uf.find(vertice);
    const grupo = porRaiz.get(raiz);
    if (grupo) {
      grupo.vertices.push(vertice);
    } else {
      porRaiz.set(raiz, { vertices: [vertice], arestas: [] });
    }
  }
  for (const aresta of arestas) {
    const raiz = uf.find(aresta.atletaAId);
    porRaiz.get(raiz)!.arestas.push(aresta);
  }

  return Array.from(porRaiz.values())
    .map((grupo) => ({
      vertices: [...grupo.vertices].sort(),
      arestas: grupo.arestas,
    }))
    .sort((a, b) => (a.vertices[0]! < b.vertices[0]! ? -1 : 1));
}
