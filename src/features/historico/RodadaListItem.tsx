"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { formatDataExibicao } from "@/features/rodadas/format";
import { ExcluirRodadaModal } from "./ExcluirRodadaModal";
import { RodadaActionMenu } from "./RodadaActionMenu";
import type { RodadaHistoricoItem } from "./types";
import styles from "./RodadaListItem.module.css";

export interface RodadaListItemProps {
  rodada: RodadaHistoricoItem;
  onExcluida: (result: { id: string; atletasAfetados: number }) => void;
  /** Chamado em 401 — a tela-mãe decide o fluxo de redirecionamento (FE-12). */
  onSessionExpired: () => void;
}

/**
 * Uma linha da lista de T06 (UX-SPEC.md Seção 2 — "19/09/2026  18 presentes  ⋮").
 * `Card` (design system, "lista responsiva" — Seção 3.2) como `<li>`, sem
 * `onClick` próprio (o item não é clicável como um todo — só o menu "⋮" e
 * seus itens são interativos, mesmo racional de não sobrepor alvos de
 * toque).
 *
 * `rodada.status === "excluida"` (BE-16, `RodadaResumoItem`): decisão de
 * detalhe deste agente, explicitamente delegada pelo contrato ("quem decide
 * o que fazer com uma rodada excluída na tela é o Frontend, não uma omissão
 * do Backend") — nunca escondida da lista nem indistinguível de uma rodada
 * ativa. Sinalizada com `Badge variant="neutral"` textual "Excluída" (nunca
 * só cor, WCAG 1.4.1), mesmo padrão já usado por `AtletasList.tsx`/FE-04
 * para "Inativo"/"Anonimizado". As ações do menu "⋮" permanecem visíveis
 * (não desabilitadas) para uma rodada excluída: reexcluir já é tratado pelo
 * fluxo de idempotência existente (`RodadaJaExcluidaError`, 409, RD001) com
 * o mesmo toast de erro (`ExcluirRodadaModal`); corrigir uma rodada
 * excluída (`409`, `RodadaDetalheResponse`/BE-16) é tratado por T07 (FE-07,
 * fora do escopo desta tarefa).
 */
export function RodadaListItem({
  rodada,
  onExcluida,
  onSessionExpired,
}: RodadaListItemProps) {
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const dataExibida = formatDataExibicao(rodada.data);

  return (
    <Card as="li" className={styles.item}>
      <div className={styles.info}>
        <span className={styles.data}>
          {dataExibida}
          {rodada.status === "excluida" && (
            <Badge variant="neutral" className={styles.badge}>
              Excluída
            </Badge>
          )}
        </span>
        <span className={styles.presentes}>{rodada.presentes} presentes</span>
      </div>

      <RodadaActionMenu
        rodadaLabel={`rodada de ${dataExibida}`}
        corrigirHref={ROUTES.corrigirRodada(rodada.id)}
        onExcluir={() => setExcluirModalOpen(true)}
      />

      <ExcluirRodadaModal
        open={excluirModalOpen}
        rodadaId={rodada.id}
        rodadaDataExibida={dataExibida}
        onClose={() => setExcluirModalOpen(false)}
        onExcluida={(result) => {
          setExcluirModalOpen(false);
          onExcluida(result);
        }}
        onSessionExpired={onSessionExpired}
      />
    </Card>
  );
}
