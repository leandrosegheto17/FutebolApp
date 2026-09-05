/**
 * Formatação de exibição do módulo de Histórico (T06) — mesmo racional de
 * `format.ts` de `atletas`/`ranking-publico`/`presenca-mensal`/`rodadas`
 * (função pura, testável isoladamente, RNF-08/pt-BR).
 */
import type { ConfrontoRodada } from "./types";

/**
 * "Confronto" (`FE-R06`/`BE-R02`) -> rótulo literal do mockup (`UX-SPEC.md`
 * Parte II Seção 2.5): `"Colete {pontos} × {pontos} Sem Colete"`. Mapeamento
 * posicional (`colete`/`sem_colete`), não uma correspondência semântica real
 * a `app.time.label` (ainda "Time A"/"Time B" nesta release para rodadas
 * anteriores a `FE-R09`) — ver `ConfrontoRodada`, `types.ts`.
 */
export function formatConfronto(confronto: ConfrontoRodada): string {
  return `Colete ${confronto.colete} × ${confronto.sem_colete} Sem Colete`;
}
