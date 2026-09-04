"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertBanner,
  Button,
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { fetchRankingPublico } from "./rankingApi";
import type { RankingPublicoItem } from "./types";
import { formatOrdinal, formatPontos, formatUpdatedAt } from "./format";
import styles from "./RankingList.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: RankingPublicoItem[]; updatedAt: Date };

const ERROR_MESSAGE = "Não foi possível carregar o ranking agora. Tente novamente.";

// Medalha decorativa (aria-hidden) — o reforço textual obrigatório do
// UX-SPEC.md ("Top 3 com indicador visual... reforçado por texto 1º, 2º,
// 3º, nunca só cor/ícone") é o ordinal renderizado ao lado (formatOrdinal),
// não este emoji.
const MEDAL_BY_POSITION: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const SKELETON_ROW_COUNT = 5;

/**
 * T02 — Ranking Público (UX-SPEC.md Seção 2/4/5/6.2; TASK.md FE-02).
 *
 * Busca client-side (fetch no `useEffect`, não Server Component) — decisão
 * de detalhe: simplifica o estado de "erro com retry sem recarregar a
 * página inteira" exigido pela Seção 4 do UX-SPEC.md, sem precisar de um
 * segundo componente cliente aninhado só para isso. Custo aceito: o SSR
 * inicial sempre mostra o Skeleton antes da hidratação — comportamento
 * consistente com o próprio estado "carregando" já especificado.
 */
export function RankingList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchRankingPublico()
      .then((items) => {
        setState({ status: "success", items, updatedAt: new Date() });
      })
      .catch(() => {
        // Mensagem sempre genérica (não vaza detalhe de erro de infra ao
        // público) — consistente com o texto exato da Seção 4 do UX-SPEC.md.
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

  if (state.items.length === 0) {
    return <EmptyState title="Nenhum atleta cadastrado ainda" />;
  }

  return (
    <div>
      <table role="table" aria-label="Ranking de atletas" className={styles.table}>
        <thead role="rowgroup" className={styles.thead}>
          <tr role="row">
            <th
              role="columnheader"
              scope="col"
              className={cn(styles.cell, styles.headerCell)}
            >
              Posição
            </th>
            <th
              role="columnheader"
              scope="col"
              className={cn(styles.cell, styles.headerCell)}
            >
              Atleta
            </th>
            <th
              role="columnheader"
              scope="col"
              className={cn(styles.cell, styles.headerCell)}
            >
              Pontos
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup" className={styles.tbody}>
          {state.items.map((item, index) => {
            const position = index + 1;
            const isTop3 = position <= 3;
            return (
              <tr
                role="row"
                key={item.atleta_id}
                className={cn(styles.row, isTop3 && styles.rowTop3)}
              >
                <td role="cell" className={cn(styles.cell, styles.positionCell)}>
                  {isTop3 && (
                    <span aria-hidden="true" className={styles.medal}>
                      {MEDAL_BY_POSITION[position]}
                    </span>
                  )}
                  <span>{formatOrdinal(position)}</span>
                </td>
                <td role="cell" className={cn(styles.cell, styles.nameCell)}>
                  {item.nome_exibicao}
                </td>
                <td role="cell" className={cn(styles.cell, styles.pointsCell)}>
                  {formatPontos(item.pontuacao_acumulada)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.updatedAt}>
        Atualizado em: {formatUpdatedAt(state.updatedAt)}
      </p>
    </div>
  );
}
