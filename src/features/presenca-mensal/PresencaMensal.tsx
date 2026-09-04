"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AlertBanner,
  Button,
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import { fetchPresencaMensal } from "./presencaMensalApi";
import type { MesCivil, PresencaMensalPublicaItem } from "./types";
import { formatMesCivil, formatRodadaDiaMes, shiftMesCivil } from "./format";
import styles from "./PresencaMensal.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: PresencaMensalPublicaItem[] };

const ERROR_MESSAGE =
  "Não foi possível carregar a presença mensal agora. Tente novamente.";
const SKELETON_ROW_COUNT = 3;

/**
 * T03 — Presença Mensal (público) — UX-SPEC.md Seção 2/4/5/6.2; TASK.md
 * FE-03. Integração contra a API **real** — `presenca_mensal_publica`
 * (BE-03, já `Concluída`/aprovada pelo QA), consumida via chave `anon` direto
 * pelo Frontend (mesmo padrão de `fetchRankingPublico`/FE-02, T02/T03 não
 * passam pela camada de API própria, `SDD.md` Seção 7.5) — não é mock.
 *
 * Mês inicial: o mês civil corrente (RN-09), calculado só depois do
 * primeiro efeito (nunca no render inicial) — mesma decisão de
 * "SSR/primeira renderização sempre mostra o estado de carregamento antes de
 * qualquer dado dependente de `new Date()`" já documentada em
 * `RankingList.tsx` (FE-02), aqui reforçada porque a própria data corrente
 * (não só o resultado de um fetch) é derivada do relógio do cliente.
 */
export function PresencaMensal() {
  const [mesCivil, setMesCivil] = useState<MesCivil | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback((target: MesCivil) => {
    setState({ status: "loading" });
    fetchPresencaMensal(target.ano, target.mes)
      .then((items) => {
        setState({ status: "success", items });
      })
      .catch(() => {
        // Mensagem sempre genérica (não vaza detalhe técnico do erro real ao
        // público) — mesmo critério de RankingList.tsx.
        setState({ status: "error", message: ERROR_MESSAGE });
      });
  }, []);

  useEffect(() => {
    setMesCivil({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 });
  }, []);

  useEffect(() => {
    if (mesCivil) load(mesCivil);
  }, [mesCivil, load]);

  function goToPreviousMonth() {
    setMesCivil((current) => (current ? shiftMesCivil(current, -1) : current));
  }

  function goToNextMonth() {
    setMesCivil((current) => (current ? shiftMesCivil(current, 1) : current));
  }

  function retry() {
    if (mesCivil) load(mesCivil);
  }

  if (!mesCivil) {
    return (
      <SkeletonGroup label="Carregando presença mensal">
        <Skeleton height={44} />
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} height={56} />
        ))}
      </SkeletonGroup>
    );
  }

  return (
    <div>
      <div className={styles.navigator}>
        <Button variant="ghost" aria-label="Mês anterior" onClick={goToPreviousMonth}>
          <ChevronIcon direction="left" aria-hidden="true" />
        </Button>
        <p className={styles.monthLabel}>{formatMesCivil(mesCivil)}</p>
        <Button variant="ghost" aria-label="Próximo mês" onClick={goToNextMonth}>
          <ChevronIcon direction="right" aria-hidden="true" />
        </Button>
      </div>

      {/* Região viva: anuncia a troca de conteúdo (carregando -> resultado)
          disparada pela navegação de mês, sem exigir que o usuário de leitor
          de tela precise procurar o novo conteúdo manualmente (WCAG 4.1.3,
          requisito transversal da Seção 5.1 do UX-SPEC.md). */}
      <div aria-live="polite" className={styles.body}>
        {state.status === "loading" && (
          <SkeletonGroup label="Carregando presença mensal">
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <Skeleton key={index} height={56} />
            ))}
          </SkeletonGroup>
        )}

        {state.status === "error" && (
          <div className={styles.errorWrapper}>
            <AlertBanner variant="danger">{state.message}</AlertBanner>
            <Button variant="secondary" onClick={retry}>
              Tentar novamente
            </Button>
          </div>
        )}

        {state.status === "success" && state.items.length === 0 && (
          <EmptyState title="Nenhuma rodada lançada neste mês" />
        )}

        {state.status === "success" && state.items.length > 0 && (
          <Accordion
            items={state.items.map((item) => ({
              value: item.rodada_id,
              title: `${formatRodadaDiaMes(item.rodada_data)} · Presentes: ${item.total_presentes}`,
              content:
                item.nomes_presentes.length > 0 ? (
                  <ul className={styles.presentesList}>
                    {item.nomes_presentes.map((nome, index) => (
                      <li key={`${item.rodada_id}-${index}`}>{nome}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyPresentes}>
                    Nenhum presente registrado nesta rodada.
                  </p>
                ),
            }))}
          />
        )}
      </div>
    </div>
  );
}

function ChevronIcon({
  direction,
  ...rest
}: { direction: "left" | "right" } & React.SVGProps<SVGSVGElement>) {
  const d = direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="20"
      height="20"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
