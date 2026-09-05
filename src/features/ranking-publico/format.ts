/** Posição em ordinal português ("1º", "2º", "12º"...). */
export function formatOrdinal(position: number): string {
  return `${position}º`;
}

/** Concordância singular/plural simples (pt-BR: só 1 é singular). */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function formatPontos(pontuacao: number): string {
  return `${pontuacao} pts`;
}

export function formatPresencas(count: number): string {
  return `${count} ${pluralize(count, "presença", "presenças")}`;
}

export function formatCartoes(count: number): string {
  return `${count} ${pluralize(count, "cartão", "cartões")}`;
}

/** RNF-08 — datas em formato dia/mês/ano (pt-BR), nunca outro formato regional. */
export function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * "05/09" a partir de uma data ISO (`YYYY-MM-DD`, formato `date` do
 * PostgREST) — cabeçalho de coluna da matriz de T02 (UX-SPEC.md Parte II
 * Seção 2.2). Manipulação de string pura, nunca via `new Date(iso)` — mesma
 * justificativa (evitar off-by-one por fuso horário) já documentada em
 * `presenca-mensal/format.ts#formatRodadaDiaMes`.
 */
export function formatColunaData(isoDate: string): string {
  const [, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}`;
}

/**
 * "Atualizado hoje às 21:40 · 24 atletas" (UX-SPEC.md Parte II Seção 2.2,
 * wireframe do hero de T02) — concordância singular/plural do total de
 * atletas via `pluralize`.
 */
export function formatAtualizadoResumo(date: Date, totalAtletas: number): string {
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `Atualizado hoje às ${hora} · ${totalAtletas} ${pluralize(totalAtletas, "atleta", "atletas")}`;
}

/** "78,3%" — 1 casa decimal, vírgula como separador decimal (pt-BR, RNF-08). */
export function formatMediaPresenca(percentual: number): string {
  return `${percentual.toFixed(1).replace(".", ",")}%`;
}
