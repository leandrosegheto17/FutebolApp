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
