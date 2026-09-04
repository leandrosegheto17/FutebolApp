import { cn } from "@/lib/cn";
import styles from "./DiffViewer.module.css";

export interface DiffViewerItem {
  /** Rótulo do campo comparado, ex.: "Presença", "Gols". */
  label: string;
  /** Valor antes, já formatado para exibição (ex.: "Presente", "1"). */
  before: string;
  /** Valor depois, já formatado para exibição. */
  after: string;
  /**
   * Marca visualmente o item como alterado — sempre também comunicado por
   * texto (rótulo "(alterado)"), nunca só por cor/estilo (WCAG 1.4.1).
   * `true` por padrão (o caso mais comum: só itens de fato alterados são
   * passados a este componente).
   */
  changed?: boolean;
}

export interface DiffViewerProps {
  items: DiffViewerItem[];
  className?: string;
}

/**
 * DiffViewer — UX-SPEC.md Seção 3.2, componente novo específico do domínio
 * ("Exibição 'antes → depois' para correção e log de auditoria"), usado por
 * T07 (preview inline de correção, BE-10) e T08 (log de auditoria, FE-08,
 * ainda não implementada nesta trilha). Implementado uma única vez aqui
 * (design system) para T08 reutilizar sem duplicar — nenhuma tela cria uma
 * variação paralela (TASK.md Seção 1.6).
 *
 * `<dl>` semântico (WCAG 1.3.1 — relação rótulo/valor real, não só visual):
 * cada par rótulo+valor é um grupo `dt`/`dd` opcionalmente envolvido por um
 * `div` (permitido pelo modelo de conteúdo de `<dl>` desde HTML5).
 */
export function DiffViewer({ items, className }: DiffViewerProps) {
  return (
    <dl className={cn(styles.list, className)}>
      {items.map((item) => {
        const changed = item.changed ?? true;
        return (
          <div key={item.label} className={cn(styles.row, changed && styles.changedRow)}>
            <dt className={styles.label}>{item.label}</dt>
            <dd className={styles.value}>
              <span className={styles.before}>{item.before}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={styles.after}>{item.after}</span>
              {changed && <span className={styles.changedTag}>(alterado)</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
