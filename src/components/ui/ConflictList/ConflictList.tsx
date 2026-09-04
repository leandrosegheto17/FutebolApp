import { cn } from "@/lib/cn";
import styles from "./ConflictList.module.css";

/** Um par de atletas em conflito — subconjunto de `restricoes_conflitantes` (ADR-010). */
export interface ConflictPairItem {
  /** Chave estável para a lista — `restricao_id` do contrato real. */
  id: string;
  atletaANome: string;
  atletaBNome: string;
  /** 1-based — agrupa pares do mesmo componente conexo do grafo de restrições (ADR-010). */
  grupoConflito: number;
}

/** Um componente conexo sem coloração válida — subconjunto de `grupos_conflito` (ADR-010). */
export interface ConflictGroupInfo {
  grupoConflito: number;
  /** Texto já pronto do backend, ex.: "Com 2 time(s) disponível(is), não é possível separar os 3 atletas...". */
  mensagem: string;
}

export interface ConflictListProps {
  pares: ConflictPairItem[];
  /**
   * Opcional — quando presente, os pares são agrupados por `grupoConflito` e
   * cada grupo exibe sua própria `mensagem` explicativa (UX-SPEC.md Seção 2,
   * linha "→ Com apenas 2 times, não é possível separar os três
   * simultaneamente."). Sem `grupos`, os pares são exibidos como lista plana.
   */
  grupos?: ConflictGroupInfo[];
  className?: string;
}

/**
 * ConflictList — UX-SPEC.md Seção 3.2, componente novo específico do domínio
 * ("Lista de pares de atletas em conflito de restrição, com ícone + texto
 * explicando o motivo"), usado por T09 (RF-05.2/ADR-010). Contrato de dado
 * confirmado (revisão 2026-09-02, resolução de BLOCKER-001) como subconjunto
 * de `restricoes_conflitantes`/`grupos_conflito` — este componente recebe já
 * o subconjunto relevante (nomes resolvidos, `atleta_a_nome`/`atleta_b_nome`
 * via RN-06), não o payload bruto da API (mesma fronteira já usada por
 * `DiffViewer`, que recebe itens já formatados pelo consumidor).
 *
 * `role="alert"` no próprio componente (UX-SPEC.md Seção 5.2, "T09 Montagem
 * de Times": "deve ser navegável por teclado e anunciada como alerta ao
 * aparecer") — mudança de estado relevante que o organizador precisa
 * perceber sem depender só de leitura visual da tela; navegável por teclado
 * "de graça" por não conter nenhum elemento interativo próprio (lista
 * estática em fluxo normal de documento, sem armadilha de foco).
 * `⚡` é puramente decorativo (`aria-hidden`) — o motivo do conflito é sempre
 * comunicado por texto também ("não podem ficar juntos"), nunca só pelo
 * ícone (WCAG 1.1.1/1.4.1).
 */
export function ConflictList({ pares, grupos, className }: ConflictListProps) {
  if (grupos && grupos.length > 0) {
    return (
      <div role="alert" className={cn(styles.wrapper, className)}>
        <ul className={styles.groupList}>
          {grupos.map((grupo) => (
            <li key={grupo.grupoConflito} className={styles.group}>
              <ul className={styles.pairList}>
                {pares
                  .filter((par) => par.grupoConflito === grupo.grupoConflito)
                  .map((par) => (
                    <ConflictPair key={par.id} par={par} />
                  ))}
              </ul>
              <p className={styles.groupMessage}>
                <span aria-hidden="true">→ </span>
                {grupo.mensagem}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div role="alert" className={cn(styles.wrapper, className)}>
      <ul className={styles.pairList}>
        {pares.map((par) => (
          <ConflictPair key={par.id} par={par} />
        ))}
      </ul>
    </div>
  );
}

function ConflictPair({ par }: { par: ConflictPairItem }) {
  return (
    <li className={styles.pairRow}>
      {par.atletaANome} <span aria-hidden="true">⚡</span> {par.atletaBNome} (não podem
      ficar juntos)
    </li>
  );
}
