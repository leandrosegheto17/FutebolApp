import type { MesCivil } from "./types";

/**
 * Nomes de mês civil em pt-BR (RNF-08 — formato regional), array estático em
 * vez de `Intl.DateTimeFormat` — decisão de detalhe: evita depender da
 * capitalização/locale de runtime (o formato "long" do Intl em pt-BR retorna
 * o nome em minúsculas, exigindo lógica extra de capitalização) e é
 * determinístico em qualquer ambiente (SSR/CI/navegador), sem custo real já
 * que a lista de 12 nomes de mês civil (Gregoriano, RN-09) é fixa.
 */
const MESES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "Setembro/2026" — cabeçalho de navegação de T03 (UX-SPEC.md Seção 2). */
export function formatMesCivil({ ano, mes }: MesCivil): string {
  const nome = MESES_PT_BR[mes - 1];
  return `${nome}/${ano}`;
}

/**
 * "05/09" a partir de uma data ISO (`YYYY-MM-DD`, formato `date` do
 * PostgREST). Manipulação de string pura, nunca via `new Date(iso)` —
 * decisão de detalhe: `new Date("YYYY-MM-DD")` é interpretado como meia-noite
 * UTC pelo motor JS; extrair dia/mês de volta com métodos locais
 * (`getDate()`/`getMonth()`) pode voltar um dia a menos em fusos horários
 * negativos (ex.: Brasil, UTC-3), um bug de "off-by-one" clássico de data
 * only. Evitado por completo lendo os componentes direto da string.
 */
export function formatRodadaDiaMes(isoDate: string): string {
  const [, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}`;
}

/**
 * Move `delta` meses civis a partir de `{ano, mes}` (RN-09), com rollover de
 * ano correto em qualquer direção (ex.: janeiro/2026 - 1 mês = dezembro/2025).
 */
export function shiftMesCivil({ ano, mes }: MesCivil, delta: number): MesCivil {
  const totalMeses = ano * 12 + (mes - 1) + delta;
  const novoAno = Math.floor(totalMeses / 12);
  const novoMes = totalMeses - novoAno * 12 + 1;
  return { ano: novoAno, mes: novoMes };
}
