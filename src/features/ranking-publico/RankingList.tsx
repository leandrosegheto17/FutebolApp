"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertBanner,
  Button,
  EmptyState,
  MedalBadge,
  PresenceDot,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import type { PresenceStatus } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fetchRankingPublico } from "./rankingApi";
import { fetchRankingPublicoRecentes } from "./rankingRecentesApi";
import type { RankingPublicoItem, RankingPublicoRecentesItem } from "./types";
import {
  buildRankingColumns,
  DESKTOP_COLUMN_LIMIT,
  firstMobileVisibleColumnIndex,
  statusForColumn,
} from "./matrix";
import {
  formatAtualizadoResumo,
  formatColunaData,
  formatMediaPresenca,
  formatOrdinal,
  formatPontos,
} from "./format";
import styles from "./RankingList.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      ranking: RankingPublicoItem[];
      recentes: RankingPublicoRecentesItem[];
      updatedAt: Date;
    };

const ERROR_MESSAGE = "Não foi possível carregar o ranking agora. Tente novamente.";
const SKELETON_ROW_COUNT = 5;

const LEGEND_ITEMS: Array<{ status: PresenceStatus; label: string }> = [
  { status: "presente", label: "Presente" },
  { status: "ausente", label: "Ausente" },
  { status: "lesionado", label: "Lesionado" },
];

/**
 * T02 — Ranking Público (UX-SPEC.md Parte II Seção 2.2; TASK.md `FE-R02`).
 *
 * **Reescrita estrutural** desta revisão: de cartão-por-atleta com contagem
 * agregada (Parte I) para uma matriz atleta × últimas rodadas (dots
 * `P`/`A`/`L`) + coluna de pontos, com `MedalBadge` para os 3 primeiros
 * colocados. Combina DOIS endpoints (nenhum substitui o outro,
 * `API-CONTRACT.yaml` v0.13.0): `ranking_publico` (BE-03, já `Concluída`)
 * continua sendo a fonte da ORDEM de classificação e da pontuação — este
 * endpoint não muda nesta tarefa; `ranking_publico_recentes` (BE-R01, já
 * `Concluída` — integração real, não mock) é a fonte da matriz de últimas
 * rodadas e das estatísticas de grupo do painel "Resumo da temporada". A
 * junção é feita aqui, por `atleta_id`.
 *
 * Busca client-side (mesma decisão de detalhe já documentada na Parte I) —
 * agora com `Promise.all` das duas fontes, tratadas como uma única unidade de
 * carregamento/erro (nenhuma exigência do UX-SPEC.md de estados parciais
 * independentes entre a tabela e o painel lateral).
 */
export function RankingList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([fetchRankingPublico(), fetchRankingPublicoRecentes()])
      .then(([ranking, recentes]) => {
        setState({ status: "success", ranking, recentes, updatedAt: new Date() });
      })
      .catch(() => {
        // Mensagem sempre genérica (não vaza detalhe de erro de infra ao
        // público), qualquer que seja a fonte que falhou.
        setState({ status: "error", message: ERROR_MESSAGE });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === "loading") {
    return (
      <SkeletonGroup label="Carregando ranking">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} height={64} />
        ))}
      </SkeletonGroup>
    );
  }

  if (state.status === "error") {
    return (
      <div className={styles.errorWrapper}>
        <AlertBanner variant="danger">{state.message}</AlertBanner>
        <Button variant="secondary" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (state.ranking.length === 0) {
    return <EmptyState title="Nenhum atleta cadastrado ainda" />;
  }

  const { ranking, recentes, updatedAt } = state;
  const recentesById = new Map(recentes.map((item) => [item.atleta_id, item]));
  const columns = buildRankingColumns(recentes, DESKTOP_COLUMN_LIMIT);
  const mobileFrom = firstMobileVisibleColumnIndex(columns.length);
  // Estatísticas de GRUPO — mesmo valor em toda linha de `recentes`
  // (API-CONTRACT.yaml v0.13.0); a primeira linha disponível serve a
  // qualquer uma. Default 0 no caso de borda "nenhuma linha em `recentes`"
  // (não deveria acontecer com `ranking` não-vazio, mas nunca lança).
  const rodadasJogadas = recentes[0]?.rodadas_jogadas ?? 0;
  const mediaPresenca = recentes[0]?.media_presenca ?? 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.main}>
        <p className={styles.updatedAt}>
          {formatAtualizadoResumo(updatedAt, ranking.length)}
        </p>

        <div className={styles.scrollArea}>
          <table role="table" aria-label="Ranking de atletas" className={styles.table}>
            <caption className="sr-only">
              Matriz de presença (P), ausência (A) e lesão (L) nas últimas
              rodadas, por atleta, seguida da pontuação total. Os 3 primeiros
              colocados são indicados por uma medalha.
            </caption>
            <thead>
              <tr role="row">
                <th role="columnheader" scope="col" className={cn(styles.cell, styles.headerCell, styles.nameCell)}>
                  Atleta
                </th>
                {columns.map((column, index) => (
                  <th
                    key={column.rodadaId}
                    role="columnheader"
                    scope="col"
                    className={cn(
                      styles.cell,
                      styles.headerCell,
                      styles.dateCell,
                      index < mobileFrom && styles.hiddenOnMobile,
                    )}
                  >
                    {formatColunaData(column.data)}
                  </th>
                ))}
                <th role="columnheader" scope="col" className={cn(styles.cell, styles.headerCell, styles.pointsCell)}>
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => {
                const position = index + 1;
                const recente = recentesById.get(item.atleta_id);
                return (
                  <tr role="row" key={item.atleta_id} className={styles.row}>
                    <td role="cell" className={cn(styles.cell, styles.nameCell)}>
                      <span className={styles.positionIndicator}>
                        {position <= 3 ? (
                          <MedalBadge position={position as 1 | 2 | 3} />
                        ) : (
                          <span className={styles.ordinal}>{formatOrdinal(position)}</span>
                        )}
                      </span>
                      <span>{item.nome_exibicao}</span>
                    </td>
                    {columns.map((column, columnIndex) => {
                      const status = statusForColumn(recente, column);
                      return (
                        <td
                          role="cell"
                          key={column.rodadaId}
                          className={cn(
                            styles.cell,
                            styles.dateCell,
                            columnIndex < mobileFrom && styles.hiddenOnMobile,
                          )}
                        >
                          {status ? (
                            <PresenceDot status={status} />
                          ) : (
                            <span
                              role="img"
                              aria-label="Sem registro nesta rodada"
                              className={styles.noData}
                            >
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td role="cell" className={cn(styles.cell, styles.pointsCell)}>
                      {formatPontos(item.pontuacao_acumulada)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className={styles.legend}>
          {LEGEND_ITEMS.map(({ status, label }) => (
            <li key={status} className={styles.legendItem}>
              <PresenceDot status={status} decorative className={styles.legendDot} />
              {label}
            </li>
          ))}
        </ul>

        <p className={styles.publicNote}>
          Consulta pública · sem login. Acesso interno no rodapé.
        </p>
      </div>

      {/* Painel "Resumo da temporada" — desktop apenas (UX-SPEC.md Parte II
          Seção 2.2: "não visto na versão mobile do mockup"), oculto via CSS
          em `base`/`sm` (nunca `display:none` condicionado por JS — evita
          divergência de SSR/hidratação). 2 das 3 métricas originalmente
          cogitadas: "Próxima rodada" foi excluída do escopo (TASK.md Parte
          II Seção 6.1-R item 1 — ausência de conceito de "rodada agendada"
          no modelo de dados, escalado ao Software Architect/BA/PM). */}
      <aside
        role="complementary"
        className={styles.summaryPanel}
        aria-label="Resumo da temporada"
      >
        <h2 className={styles.summaryTitle}>Resumo da temporada</h2>
        <dl className={styles.summaryList}>
          <div className={styles.summaryRow}>
            <dt>Rodadas jogadas</dt>
            <dd className={styles.summaryValue}>{rodadasJogadas}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Média de presença</dt>
            <dd className={styles.summaryValue}>{formatMediaPresenca(mediaPresenca)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
