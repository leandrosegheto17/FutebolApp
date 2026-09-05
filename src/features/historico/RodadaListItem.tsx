"use client";

import { useState } from "react";
import type { BadgeVariant } from "@/components/ui";
import { Badge, Card } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { formatDataExibicao } from "@/features/rodadas/format";
import { ExcluirRodadaModal } from "./ExcluirRodadaModal";
import { formatConfronto } from "./format";
import { RodadaActionMenu } from "./RodadaActionMenu";
import type { RodadaHistoricoItem } from "./types";
import styles from "./RodadaListItem.module.css";

/**
 * "Status" (`FE-R06`/`BE-R02`, `UX-SPEC.md` Parte II Seção 2.5) — pill
 * "Encerrada" (verde/`--pitch`) ou "Corrigida" (âmbar/`--warn`). Reaproveita
 * `Badge` (design system, Guardrail 31 — nunca criar variação paralela de um
 * controle que já existe): `variant="success"` já resolve para
 * `--color-success`/`-bg`, alias de `--color-primary`/`--color-pitch-bg`
 * desde `FE-R00` (mesmo verde `--pitch` do mockup); `variant="warning"` já
 * usa o tom âmbar refinado (`--color-warning`/`-bg`, `--warn`/`--warn-bg` do
 * mockup) — nenhuma cor nova precisou ser declarada.
 */
const STATUS_CORRECAO_LABEL: Record<RodadaHistoricoItem["status_correcao"], string> = {
  encerrada: "Encerrada",
  corrigida: "Corrigida",
};
const STATUS_CORRECAO_VARIANT: Record<
  RodadaHistoricoItem["status_correcao"],
  BadgeVariant
> = {
  encerrada: "success",
  corrigida: "warning",
};

export interface RodadaListItemProps {
  rodada: RodadaHistoricoItem;
  onExcluida: (result: { id: string; atletasAfetados: number }) => void;
  /** Chamado em 401 — a tela-mãe decide o fluxo de redirecionamento (FE-12). */
  onSessionExpired: () => void;
}

/**
 * Uma linha da lista de T06 (`UX-SPEC.md` Parte II Seção 2.5 — "[22] Colete
 * 62 × 59 Sem Colete / 17 presentes · ›"; `FE-R06`). `Card` (design system,
 * "lista responsiva" — Seção 3.2) como `<li>`, sem `onClick` próprio (o item
 * não é clicável como um todo — só o menu "⋮" e seus itens são interativos,
 * mesmo racional de não sobrepor alvos de toque).
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
 *
 * **"Confronto" (`FE-R06`/`BE-R02`)**: `rodada.confronto` é `null` como
 * comportamento padrão e esperado para rodada de origem legado ou cujos
 * times ainda não foram confirmados via T09 (`SPK-02`) — não desenhado
 * explicitamente no mockup (`UX-SPEC.md` Parte II Seção 2.5 só mostra o caso
 * "com confronto"). Decisão de detalhe deste agente (pequena, não escalada,
 * mesmo racional já usado por `RankingList.tsx`/FE-R02 para "Sem registro
 * nesta rodada"): placeholder textual "—" com `role="img"`/`aria-label`
 * explicando a ausência, nunca uma célula vazia sem explicação (WCAG 1.4.1).
 *
 * **"Status" (`FE-R06`/`BE-R02`)**: pill sempre visível (`Encerrada`/
 * `Corrigida`), refletindo `rodada.status_correcao` literalmente — ver
 * `STATUS_CORRECAO_LABEL`/`STATUS_CORRECAO_VARIANT` acima.
 *
 * **Decisão de escopo documentada, não escalada**: o mockup da Seção 2.5
 * desenha, além de "Confronto"/"Status" (as duas colunas explicitamente
 * previstas pela reestimativa de `FE-R06`, `TASK.md` Parte II Seção 3.2), (a)
 * uma segunda linha por item com contagem de "lesionados"/"ausentes" — dado
 * sem suporte em `RodadaResumoItem` (`API-CONTRACT.yaml`, único campo de
 * contagem publicado continua sendo `presentes`) e inconsistente dentro do
 * próprio mockup (duas linhas citam "lesionados", uma cita "ausentes"); e (b)
 * tipografia de data em destaque (dia grande `--font-family-display` + mês
 * abreviado mono) e uma tabela `<table>` real em desktop, em vez do `Card`
 * responsivo já em produção. Nenhum dos dois é mencionado pela "Correção
 * sobre a revisão 1" da própria Seção 2.5 (que lista literalmente só
 * "Confronto" e "Status" como o delta desta revisão) nem pela reestimativa
 * formal de `FE-R06` ("Repintura + duas colunas novas", esforço adicional
 * fixado em M/3 PD sob a premissa explícita de repintura ~zero-esforço) —
 * tratados como estilização ilustrativa do wireframe fora do escopo desta
 * reestimativa específica, não uma lacuna que impeça a implementação das
 * duas colunas pedidas. Estrutura `Card` responsiva mantida (nenhuma
 * variação paralela de layout introduzida, Guardrail 31).
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

        <div className={styles.confrontoRow}>
          {rodada.confronto ? (
            <span className={styles.confronto}>{formatConfronto(rodada.confronto)}</span>
          ) : (
            <span
              role="img"
              aria-label="Confronto não disponível para esta rodada"
              className={styles.confrontoIndisponivel}
            >
              —
            </span>
          )}
          <Badge
            variant={STATUS_CORRECAO_VARIANT[rodada.status_correcao]}
            className={styles.statusBadge}
          >
            {STATUS_CORRECAO_LABEL[rodada.status_correcao]}
          </Badge>
        </div>

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
