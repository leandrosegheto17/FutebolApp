"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertBanner,
  Button,
  EmptyState,
  PresenceDot,
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
 * T03 — Presença Mensal (público), redesenho visual — `UX-SPEC.md` Parte II
 * Seção 2.3 (delta); `TASK.md` Parte II Seção 3.2, `FE-R03`. Integração
 * contra a API **real** — `presenca_mensal_publica` (BE-03, já `Concluída`/
 * aprovada pelo QA), consumida via chave `anon` direto pelo Frontend (mesmo
 * padrão de `fetchRankingPublico`/FE-02, T02/T03 não passam pela camada de
 * API própria, `SDD.md` Seção 7.5) — não é mock. Nenhuma mudança de fonte de
 * dado/lógica nesta tarefa, só de apresentação (ver nota de divergência
 * abaixo).
 *
 * Mês inicial: o mês civil corrente (RN-09), calculado só depois do
 * primeiro efeito (nunca no render inicial) — mesma decisão de
 * "SSR/primeira renderização sempre mostra o estado de carregamento antes de
 * qualquer dado dependente de `new Date()`" já documentada em
 * `RankingList.tsx` (FE-02), aqui reforçada porque a própria data corrente
 * (não só o resultado de um fetch) é derivada do relógio do cliente.
 *
 * **`Accordion` removido desta composição** (`UX-SPEC.md` Parte II Seção
 * 2.3, confirmado na "Nota de verificação de fidelidade" item 8): o mockup
 * real não colapsa/expande a lista de presentes por rodada — mostra-a
 * diretamente. O componente `Accordion` continua disponível no design
 * system (guia de estilo `app/dev/design-system/page.tsx`), só deixa de ser
 * usado por esta tela.
 *
 * **Divergência documentada, não escondida (`BLOCKER-010`, `BLOCKERS.md`,
 * escalado a `ux-ui`/`software-architect`, mesmo padrão de precedente já
 * aberto por `BLOCKER-004`/`BLOCKER-005` para a T02)**: `UX-SPEC.md` Parte II
 * Seção 2.3 descreve "uma matriz atleta × data do mês inteiro (dots
 * `P`/`A`/`L`, mesmo componente/estilo confirmado em T02) com legenda
 * 'Presente/Ausente/Lesionado'" — uma grade com uma LINHA POR ATLETA. A view
 * pública `app.presenca_mensal_publica` (`API-CONTRACT.yaml`,
 * `PresencaMensalPublicaItem`) não suporta essa estrutura: ela expõe uma
 * linha POR RODADA com `total_presentes`/`nomes_presentes` (só os nomes de
 * quem esteve presente), sem o universo de atletas ativos do período e sem
 * distinguir `ausente` de `lesionado` — o mesmo tipo de lacuna já
 * identificado e documentado para a T02 antiga (`BLOCKER-004`/`BLOCKER-005`,
 * "esta última só lista quem esteve presente por rodada, não o universo de
 * quem deveria estar"). Construir a grade literal exigiria um novo endpoint
 * público (por atleta ativo × rodada do mês, com status de 3 valores), fora
 * do escopo desta tarefa (`TASK.md` FE-R03 depende só de `FE-R00`, nenhuma
 * tarefa de Backend nesta iniciativa provê esse dado). Implementação real
 * desta tarefa: mantém a estrutura por rodada já disponível (uma seção por
 * rodada do mês, sem accordion — atende o critério de aceite literal do
 * `TASK.md`, "mostra a matriz do mês diretamente"), com cada nome presente
 * marcado com o mesmo `PresenceDot`/estilo confirmado em T02 (reuso literal
 * do componente, só não como grade atleta×data por não haver dado para as
 * demais 2 categorias) — legenda mostra apenas "Presente" (não
 * "Presente/Ausente/Lesionado", que induziria a existência de uma
 * distinção que os dados não sustentam).
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
          <>
            <ul className={styles.roundList}>
              {state.items.map((item) => (
                <li key={item.rodada_id} className={styles.roundCard}>
                  <div className={styles.roundHeader}>
                    <span className={styles.roundDate}>
                      {formatRodadaDiaMes(item.rodada_data)}
                    </span>
                    <span className={styles.roundCount}>
                      Presentes: {item.total_presentes}
                    </span>
                  </div>
                  {item.nomes_presentes.length > 0 ? (
                    <ul className={styles.presentesList}>
                      {item.nomes_presentes.map((nome, index) => (
                        <li
                          key={`${item.rodada_id}-${index}`}
                          className={styles.presenteItem}
                        >
                          <PresenceDot
                            status="presente"
                            decorative
                            className={styles.presenteDot}
                          />
                          <span>{nome}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyPresentes}>
                      Nenhum presente registrado nesta rodada.
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {/* Legenda com apenas "Presente" — divergência documentada da
                legenda de 3 itens do UX-SPEC.md (ver nota de topo do
                arquivo/`BLOCKER-010`): a fonte de dado desta tela não
                distingue "ausente" de "lesionado", então incluir esses dois
                itens na legenda anunciaria uma distinção inexistente. */}
            <ul className={styles.legend}>
              <li className={styles.legendItem}>
                <PresenceDot status="presente" decorative className={styles.legendDot} />
                Presente
              </li>
            </ul>
          </>
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
