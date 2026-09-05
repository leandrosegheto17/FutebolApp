import type { ResumoRodada } from "./participacaoState";
import styles from "./LancamentoRodadaForm.module.css";

export interface RodadaStatTilesProps {
  resumo: ResumoRodada;
  total: number;
}

/**
 * Stat-tiles agregados no topo de T05 (`UX-SPEC.md` Parte II Seção 2.4:
 * "4 stat-tiles: Presentes/Lesionados/Ausentes/Total do grupo"). Valor
 * sempre ao vivo — recalculado a partir do mesmo estado local em memória que
 * alimenta a lista de atletas abaixo (`resumirParticipacoes`), nunca uma
 * segunda fonte de verdade.
 *
 * `<dl>` — mesmo padrão semântico já usado pelo painel "Resumo da temporada"
 * de `PublicHomeShell.tsx`/T02 (par rótulo/valor), reaproveitado aqui em vez
 * de inventar uma segunda estrutura para o mesmo propósito (Guardrail 31).
 */
export function RodadaStatTiles({ resumo, total }: RodadaStatTilesProps) {
  const tiles: Array<{ label: string; value: number }> = [
    { label: "Presentes", value: resumo.presentes },
    { label: "Lesionados", value: resumo.lesionados },
    { label: "Ausentes", value: resumo.ausentes },
    { label: "Total", value: total },
  ];

  return (
    // `role="group"` fica no `<div>` externo, não no `<dl>` — sobrescrever o
    // papel semântico nativo do próprio `<dl>` "órfãa" seus `<dt>`/`<dd>` aos
    // olhos do axe (`dlitem`, achado desta própria tarefa).
    <div role="group" aria-label="Resumo da rodada">
      <dl className={styles.statTiles}>
        {tiles.map((tile) => (
          <div key={tile.label} className={styles.statTile}>
            <dd className={styles.statValue}>{tile.value}</dd>
            <dt className={styles.statLabel}>{tile.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
