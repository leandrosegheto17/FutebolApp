"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertBanner,
  Button,
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { buildLookupMaps } from "./enrichment";
import { buildEntryViewModel } from "./entryPresenter";
import type { LogAuditoriaEntryViewModel } from "./entryPresenter";
import { LOG_AUDITORIA_ERROR_MESSAGE, fetchLogAuditoria } from "./logAuditoriaApi";
import { LogAuditoriaEntry } from "./LogAuditoriaEntry";
import type { LogAuditoriaItem } from "./types";
import styles from "./LogAuditoriaList.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; entries: LogAuditoriaEntryViewModel[] };

/** Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha "T08 Log de Auditoria", coluna Vazio). */
const EMPTY_TITLE = "Nenhuma correção registrada até agora";

const SKELETON_ROW_COUNT = 3;

/**
 * Critério de aceite literal de FE-08: "mais recente → mais antigo".
 * `GET /api/log-auditoria` já devolve `ocorrido_em desc` (BE-09) — este
 * reordenamento no cliente é defesa em profundidade (mesmo padrão já usado
 * por `rankingApi.ts`/FE-02 e `historicoApi.ts`/FE-06, não desconfiança de
 * GAP): `ocorrido_em` é timestamp ISO 8601, ordenável lexicograficamente.
 */
function ordenarDecrescente(items: LogAuditoriaItem[]): LogAuditoriaItem[] {
  return [...items].sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em));
}

/**
 * T08 — Log de Auditoria (lista, somente leitura), TASK.md FE-08/
 * `UX-SPEC.md` Seção 2/4.
 *
 * Integração contra a API **real** (BE-09, `Concluída`; não é mock a
 * substituir depois): `fetchLogAuditoria()` consome `GET
 * /api/log-auditoria` conforme `API-CONTRACT.yaml`. Nenhuma ação de escrita
 * nesta tela (critério de aceite literal) — `LogAuditoriaEntry` não recebe
 * nenhum callback de mutação.
 *
 * Enriquecimento de rótulos de rodada/atleta (`buildLookupMaps`,
 * `enrichment.ts`) é melhor esforço e nunca bloqueia a lista principal —
 * pulado inteiramente quando não há nenhuma entrada (`items.length === 0`),
 * evitando duas chamadas de rede sem necessidade nesse caso.
 */
export function LogAuditoriaList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const handleSessionExpired = useHandleSessionExpired();

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchLogAuditoria()
      .then(async (items) => {
        const ordenados = ordenarDecrescente(items);
        const lookups =
          ordenados.length > 0
            ? await buildLookupMaps()
            : {
                rodadaData: new Map<string, string>(),
                atletaNome: new Map<string, string>(),
              };
        const entries = ordenados.map((item) => buildEntryViewModel(item, lookups));
        setState({ status: "success", entries });
      })
      .catch((err: unknown) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setState({ status: "error", message: LOG_AUDITORIA_ERROR_MESSAGE });
      });
  }, [handleSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Log de Auditoria</h1>

      {state.status === "loading" && (
        <SkeletonGroup label="Carregando log de auditoria">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} height={96} />
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

      {state.status === "success" && state.entries.length === 0 && (
        <EmptyState title={EMPTY_TITLE} />
      )}

      {state.status === "success" && state.entries.length > 0 && (
        <ul className={styles.list}>
          {state.entries.map((entry) => (
            <LogAuditoriaEntry key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
