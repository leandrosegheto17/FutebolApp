"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertBanner, Badge, Button, Skeleton, SkeletonGroup } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { formatDataExibicao } from "@/features/rodadas/format";
import { STATUS_PARTICIPACAO_LABEL } from "@/features/rodadas/statusParticipacao";
import type { StatusParticipacao } from "@/features/rodadas/types";
import { ExcluirRodadaModal } from "@/features/historico/ExcluirRodadaModal";
import { RodadaNaoEncontradaError, detalharRodada } from "./correcaoApi";
import { ParticipacaoCorrecaoRow } from "./ParticipacaoCorrecaoRow";
import type { RodadaDetalhe } from "./types";
import styles from "./CorrecaoRodadaDetalhe.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; rodada: RodadaDetalhe };

/**
 * Texto exigido pelo `UX-SPEC.md` Seção 4 (linha "T06 Histórico", coluna
 * Erro) — reaproveitado aqui para o carregamento do detalhe: a Seção 4 não
 * tem um texto próprio de erro de CARREGAMENTO para T07 ("N/A — sempre
 * parte de uma rodada existente selecionada em T06", coluna Erro documenta
 * só a falha de SALVAMENTO — "Não foi possível aplicar a correção..."),
 * então esta tela reaproveita o texto de T06 para o único cenário que a
 * Seção 4 de fato não cobriu (falha ao buscar o detalhe), mesmo racional já
 * usado por `ExcluirRodadaModal`/FE-06 ao reaproveitar o texto de erro de
 * T07 para a exclusão disparada a partir de T06.
 */
const LOAD_ERROR_MESSAGE = "Não foi possível carregar o histórico";

const STATUS_BADGE_VARIANT: Record<StatusParticipacao, BadgeVariant> = {
  presente: "success",
  ausente: "danger",
  lesionado: "warning",
};

export interface CorrecaoRodadaDetalheProps {
  rodadaId: string;
}

/**
 * T07 — Correção/Estorno (detalhe de uma rodada), `UX-SPEC.md` Seção 2/4/
 * 5.2; TASK.md FE-07 — integração contra a API **real** (BE-16/BE-09/BE-10,
 * todas `Concluída`; nenhuma é mock a substituir depois).
 *
 * Duas ações distintas nesta tela, cada uma com o padrão de confirmação
 * exigido pelo critério de aceite:
 * 1. Correção de campo único (`ParticipacaoCorrecaoRow`, uma por atleta) —
 *    preview **inline** via `POST .../simular-correcao` (BE-10), nunca
 *    modal; só grava ao clicar "Confirmar Correção" (`PATCH`, BE-09).
 * 2. Exclusão da rodada inteira ("Zona de risco", mesmo padrão visual já
 *    usado por `AnonimizacaoZona`/T04) — reaproveita o `ExcluirRodadaModal`
 *    já criado por FE-06 (`src/features/historico/ExcluirRodadaModal.tsx`)
 *    sem nenhuma variação paralela: modal bloqueante, foco inicial em
 *    "Cancelar", mesmo texto de efeito em cascata (RN-04).
 *
 * Rodada `status: "excluida"` (BE-16 devolve o detalhe normalmente mesmo
 * nesse caso): decisão de detalhe documentada, não escalada — como
 * `PATCH .../participacoes/{atletaId}` e `POST .../simular-correcao`
 * recusam com `409` para uma rodada já excluída (`API-CONTRACT.yaml`), esta
 * tela mostra a lista de participações em modo somente-leitura (sem
 * `ParticipacaoCorrecaoRow`) em vez de deixar o organizador iniciar uma
 * correção que o Backend garantidamente vai recusar — e some com a "Zona de
 * risco" (nada a excluir de novo).
 *
 * **Constatação de auditoria (`FE-R07`, 2026-09-05, mesmo padrão "repintura
 * sem esforço" já registrado por `FE-R03`/`FE-R11`)**: `CorrecaoRodadaDetalhe
 * .module.css`/`ParticipacaoCorrecaoRow.module.css`/`DiffViewer.module.css`
 * (design system) só referenciam custom properties (`var(--color-...)`/
 * `var(--spacing-...)`/`var(--font-...)`), nenhum hex hardcoded — confirmado
 * por busca isolada nos 3 arquivos — então a substituição atômica de tokens
 * já aplicada por `FE-R00` em `tokens.css` propaga-se automaticamente para
 * esta tela e para o `DiffViewer` usado no preview inline abaixo; nenhuma
 * mudança de composição foi necessária no `DiffViewer` em si (conforme a
 * própria premissa da reestimativa desta linha). **Ícone "⋮"/menu**: esta
 * tela (T07) não possui hoje nenhuma ação secundária representada por um
 * ícone de menu/"⋮" — a única ação secundária real de T07 é o botão de texto
 * completo "Excluir rodada" na "Zona de risco" abaixo (`<Button
 * variant="danger">`, nunca ícone isolado). O menu contextual "⋮"
 * (`RodadaActionMenu`, `src/features/historico/RodadaActionMenu.tsx`) existe
 * hoje em T06 (lista de histórico), não em T07 — `UX-SPEC.md` Parte II Seção
 * 2.5 registra que esse menu "pode ser mantido" como ação secundária dentro
 * do detalhe (T07) em vez da lista, mas isso é uma opção de relocação
 * arquitetural de um componente de outra tela/tarefa (`FE-R06`, já
 * `Concluída`), não uma mudança pedida pelo critério de aceite desta linha
 * (que só cita `Icon name="more-vertical"` "se ação secundária mantida") —
 * fora do escopo estrito desta tarefa (arquivos de `src/features/historico/`
 * não tocados), não decidido unilateralmente. Nenhum `Icon` novo introduzido
 * nesta tarefa.
 */
export function CorrecaoRodadaDetalhe({ rodadaId }: CorrecaoRodadaDetalheProps) {
  const router = useRouter();
  const handleSessionExpired = useHandleSessionExpired();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);

  const load = useCallback(() => {
    setState({ status: "loading" });
    detalharRodada(rodadaId)
      .then((rodada) => setState({ status: "success", rodada }))
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        if (err instanceof RodadaNaoEncontradaError) {
          setState({ status: "error", message: "Rodada não encontrada." });
          return;
        }
        setState({ status: "error", message: LOAD_ERROR_MESSAGE });
      });
  }, [rodadaId, handleSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  // Texto literal do UX-SPEC.md Seção 4 (linha T07, coluna Sucesso): "...+
  // retorno a T06" — toda correção bem-sucedida devolve o organizador ao
  // histórico, mesmo que a rodada tenha outros atletas ainda por corrigir
  // (basta reabrir "Corrigir" no menu de T06 de novo).
  function handleCorrigida() {
    router.push(ROUTES.historico);
  }

  function handleExcluida() {
    setExcluirModalOpen(false);
    router.push(ROUTES.historico);
  }

  return (
    <div className={styles.page}>
      <Link href={ROUTES.historico} className={styles.backLink}>
        ← Voltar ao histórico
      </Link>

      {state.status === "loading" && (
        <SkeletonGroup label="Carregando rodada">
          <Skeleton height={44} />
          <Skeleton height={120} />
          <Skeleton height={120} />
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

      {state.status === "success" && (
        <>
          <h1 className={styles.title}>
            Corrigir rodada {formatDataExibicao(state.rodada.data)}
          </h1>

          {state.rodada.status === "excluida" && (
            <AlertBanner variant="warning">
              Esta rodada já foi excluída — os pontos já foram revertidos e a correção de
              campo único não está mais disponível.
            </AlertBanner>
          )}

          {state.rodada.status === "excluida" ? (
            <ul className={styles.readOnlyList}>
              {state.rodada.participacoes.map((participacao) => (
                <li key={participacao.atleta_id} className={styles.readOnlyItem}>
                  <span className={styles.readOnlyNome}>
                    {participacao.apelido_exibicao}
                  </span>
                  <Badge variant={STATUS_BADGE_VARIANT[participacao.status]}>
                    {STATUS_PARTICIPACAO_LABEL[participacao.status]}
                  </Badge>
                  <span className={styles.readOnlyPontos}>
                    {participacao.pontos_delta} pts
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.list}>
              {state.rodada.participacoes.map((participacao) => (
                <ParticipacaoCorrecaoRow
                  key={participacao.atleta_id}
                  rodadaId={state.rodada.id}
                  participacao={participacao}
                  onCorrigida={handleCorrigida}
                  onSessionExpired={handleSessionExpired}
                />
              ))}
            </ul>
          )}

          {state.rodada.status !== "excluida" && (
            <section className={styles.zone} aria-labelledby="zona-risco-heading">
              <h2 id="zona-risco-heading" className={styles.zoneHeading}>
                Zona de risco
              </h2>
              <p className={styles.zoneDescription}>
                Excluir esta rodada reverte automaticamente todos os pontos lançados.
              </p>
              <Button
                type="button"
                variant="danger"
                onClick={() => setExcluirModalOpen(true)}
              >
                Excluir rodada
              </Button>
            </section>
          )}

          <ExcluirRodadaModal
            open={excluirModalOpen}
            rodadaId={state.rodada.id}
            rodadaDataExibida={formatDataExibicao(state.rodada.data)}
            onClose={() => setExcluirModalOpen(false)}
            onExcluida={handleExcluida}
            onSessionExpired={handleSessionExpired}
          />
        </>
      )}
    </div>
  );
}
