"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertBanner,
  Button,
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { listarRodadas } from "./historicoApi";
import { RodadaListItem } from "./RodadaListItem";
import type { RodadaHistoricoItem } from "./types";
import styles from "./HistoricoRodadasList.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: RodadaHistoricoItem[] };

/** Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha "T06 Histórico", coluna Erro). */
const ERROR_MESSAGE = "Não foi possível carregar o histórico";

const SKELETON_ROW_COUNT = 3;

/**
 * Critério de aceite literal de FE-06: "lista cronológica decrescente".
 * `GET /api/rodadas` (BE-16) já devolve `data desc, criado_em desc` — este
 * reordenamento no cliente é defesa em profundidade (mesmo padrão já usado
 * por `rankingApi.ts`/FE-02 para RN-08), não uma desconfiança de GAP: ordena
 * por `data` (string civil `"AAAA-MM-DD"`, ordenável lexicograficamente sem
 * passar por `Date`, mesmo racional de `formatDataExibicao`) e, em empate de
 * data civil (`confirmar_duplicidade`, RF-02.8), por `criado_em` (ISO 8601,
 * também ordenável lexicograficamente) — mesmo critério de desempate
 * documentado pelo contrato real.
 */
function ordenarDecrescente(items: RodadaHistoricoItem[]): RodadaHistoricoItem[] {
  return [...items].sort((a, b) => {
    const porData = b.data.localeCompare(a.data);
    if (porData !== 0) return porData;
    return b.criado_em.localeCompare(a.criado_em);
  });
}

/**
 * T06 — Histórico de Rodadas (lista), TASK.md FE-06/UX-SPEC.md Seção 2.
 *
 * Integração contra a API **real** (BE-16, `Concluída`; não é mock a
 * substituir depois): `listarRodadas()` consome `GET /api/rodadas`
 * conforme `API-CONTRACT.yaml`.
 */
export function HistoricoRodadasList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const handleSessionExpired = useHandleSessionExpired();

  const load = useCallback(() => {
    setState({ status: "loading" });
    listarRodadas()
      .then((items) => setState({ status: "success", items: ordenarDecrescente(items) }))
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setState({ status: "error", message: ERROR_MESSAGE });
      });
  }, [handleSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  function handleExcluida(id: string) {
    setState((current) =>
      current.status === "success"
        ? { status: "success", items: current.items.filter((item) => item.id !== id) }
        : current,
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Histórico</h1>

      {state.status === "loading" && (
        <SkeletonGroup label="Carregando histórico">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} height={64} />
          ))}
        </SkeletonGroup>
      )}

      {state.status === "error" && (
        <div className={styles.errorWrapper}>
          <AlertBanner variant="danger">{state.message}</AlertBanner>
          <Button variant="secondary" onClick={load}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === "success" && state.items.length === 0 && (
        <EmptyState title="Nenhuma rodada lançada ainda" />
      )}

      {state.status === "success" && state.items.length > 0 && (
        <ul className={styles.list}>
          {state.items.map((rodada) => (
            <RodadaListItem
              key={rodada.id}
              rodada={rodada}
              onExcluida={(result) => handleExcluida(result.id)}
              onSessionExpired={handleSessionExpired}
            />
          ))}
        </ul>
      )}

      {/* Link para T08 (UX-SPEC.md Seção 2 — "sempre visível no rodapé da
          lista") — permanente, independente do estado de carregamento acima
          (não é parte da listagem de rodadas em si). */}
      <Link href={ROUTES.logAuditoria} className={styles.auditLink}>
        Ver log de auditoria
      </Link>
    </div>
  );
}
