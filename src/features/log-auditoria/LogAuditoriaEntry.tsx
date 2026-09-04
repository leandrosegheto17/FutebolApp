import { Card, DiffViewer } from "@/components/ui";
import type { LogAuditoriaEntryViewModel } from "./entryPresenter";
import styles from "./LogAuditoriaEntry.module.css";

export interface LogAuditoriaEntryProps {
  entry: LogAuditoriaEntryViewModel;
}

/**
 * Uma entrada da lista de T08 (`UX-SPEC.md` Seção 2 — "02/09/2026 14:32 /
 * Rodada 05/09/2026 — correção / Carlinhos: presença / Antes: Presente →
 * Depois: Ausente"). `Card` (design system) como `<li>`, somente leitura —
 * nenhum elemento interativo/de escrita nesta entrada (critério de aceite
 * literal de FE-08).
 *
 * Reaproveita `DiffViewer` (`src/components/ui/DiffViewer`, já criado por
 * FE-07 especificamente para T07/T08 reutilizarem, `UX-SPEC.md` Seção 3.2)
 * — nenhuma variação paralela criada.
 *
 * NUNCA renderiza nenhum campo de autor: `entry` (`entryPresenter.ts`) só
 * carrega timestamp, título, subtítulo (rodada/atleta afetado) e diff —
 * nenhum desses campos jamais recebe "sistema"/"organizador
 * desconhecido"/qualquer placeholder de autoria (RN-12/RN-07).
 */
export function LogAuditoriaEntry({ entry }: LogAuditoriaEntryProps) {
  return (
    <Card as="li" className={styles.item}>
      <p className={styles.timestamp}>{entry.ocorridoEm}</p>
      <p className={styles.titulo}>{entry.titulo}</p>
      {entry.subtitulo && <p className={styles.subtitulo}>{entry.subtitulo}</p>}
      {entry.diffItems.length > 0 && <DiffViewer items={entry.diffItems} />}
      {entry.resumoLinhas.map((linha) => (
        <p key={linha} className={styles.resumo}>
          {linha}
        </p>
      ))}
    </Card>
  );
}
