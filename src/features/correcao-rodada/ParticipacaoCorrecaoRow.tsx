"use client";

import { useEffect, useState } from "react";
import {
  AlertBanner,
  Button,
  DiffViewer,
  SegmentedControl,
  StepperCounter,
  useToast,
} from "@/components/ui";
import type { DiffViewerItem } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import {
  STATUS_PARTICIPACAO_LABEL,
  STATUS_PARTICIPACAO_OPTIONS,
  isStatusParticipacao,
} from "@/features/rodadas/statusParticipacao";
import type { StatusParticipacao, TipoEvento } from "@/features/rodadas/types";
import {
  CORRECAO_ERROR_MESSAGE,
  corrigirParticipacao,
  simularCorrecao,
} from "./correcaoApi";
import type {
  EventoJogoBody,
  ParticipacaoDetalheItem,
  PreviewCorrecaoParticipacao,
} from "./types";
import styles from "./ParticipacaoCorrecaoRow.module.css";

const TIPOS_EVENTO: TipoEvento[] = ["gol", "cartao_amarelo", "cartao_vermelho"];

const EVENTO_LABEL: Record<TipoEvento, string> = {
  gol: "Gols",
  cartao_amarelo: "Cartões amarelos",
  cartao_vermelho: "Cartões vermelhos",
};

type EventosContagem = Record<TipoEvento, number>;

function eventosParaContagem(eventos: EventoJogoBody[]): EventosContagem {
  const contagem: EventosContagem = { gol: 0, cartao_amarelo: 0, cartao_vermelho: 0 };
  for (const evento of eventos) {
    contagem[evento.tipo] = evento.quantidade;
  }
  return contagem;
}

function contagemParaEventos(contagem: EventosContagem): EventoJogoBody[] {
  return TIPOS_EVENTO.filter((tipo) => contagem[tipo] > 0).map((tipo) => ({
    tipo,
    quantidade: contagem[tipo],
  }));
}

/** Itens do `DiffViewer` a partir do preview — só os campos de fato alterados (mesmo recorte do wireframe T07). */
function montarDiffItems(preview: PreviewCorrecaoParticipacao): DiffViewerItem[] {
  const items: DiffViewerItem[] = [];
  if (preview.status_atual !== preview.novo_status) {
    items.push({
      label: "Presença",
      before: STATUS_PARTICIPACAO_LABEL[preview.status_atual],
      after: STATUS_PARTICIPACAO_LABEL[preview.novo_status],
    });
  }
  const antes = eventosParaContagem(preview.eventos_atuais);
  const depois = eventosParaContagem(preview.novos_eventos);
  for (const tipo of TIPOS_EVENTO) {
    if (antes[tipo] !== depois[tipo]) {
      items.push({
        label: EVENTO_LABEL[tipo],
        before: String(antes[tipo]),
        after: String(depois[tipo]),
      });
    }
  }
  return items;
}

export interface ParticipacaoCorrecaoRowProps {
  rodadaId: string;
  participacao: ParticipacaoDetalheItem;
  /** Chamado após `PATCH` bem-sucedido — a tela-mãe decide o retorno a T06. */
  onCorrigida: () => void;
  /** Chamado em 401 — a tela-mãe decide o fluxo de redirecionamento (FE-12). */
  onSessionExpired: () => void;
}

/**
 * Uma linha de correção de campo único (UX-SPEC.md Seção 2, T07 —
 * "Carlinhos / Presença: Presente → [Ausente ▾] / Gols: 1 → [2] /
 * Pré-visualização do impacto / [Cancelar] [Confirmar Correção]").
 *
 * Preview **inline** (nunca em modal, critério de aceite literal de FE-07):
 * assim que `status`/`eventos` divergem da participação original, dispara
 * `POST .../simular-correcao` (BE-10, read-only) automaticamente — sem
 * debounce (decisão de detalhe, não escalada: volume de correções é baixo,
 * uma rodada tem no máximo algumas dezenas de atletas, e testes determinísticos
 * pesam mais aqui do que economizar uma chamada de rede read-only). Só ao
 * clicar "Confirmar Correção" o `PATCH` real (BE-09) é disparado — a mudança
 * de campo em si NUNCA grava nada.
 */
export function ParticipacaoCorrecaoRow({
  rodadaId,
  participacao,
  onCorrigida,
  onSessionExpired,
}: ParticipacaoCorrecaoRowProps) {
  const baselineStatus = participacao.status;
  const baselineEventos = eventosParaContagem(participacao.eventos);

  const [status, setStatus] = useState<StatusParticipacao>(baselineStatus);
  const [eventos, setEventos] = useState<EventosContagem>(baselineEventos);
  const [preview, setPreview] = useState<PreviewCorrecaoParticipacao | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { showToast } = useToast();

  const alterado =
    status !== baselineStatus ||
    TIPOS_EVENTO.some((tipo) => eventos[tipo] !== baselineEventos[tipo]);

  useEffect(() => {
    if (!alterado) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelado = false;
    setPreviewLoading(true);
    setPreviewError(null);

    simularCorrecao(rodadaId, participacao.atleta_id, {
      status,
      eventos: status === "ausente" ? [] : contagemParaEventos(eventos),
    })
      .then((resultado) => {
        if (cancelado) return;
        setPreview(resultado);
        setPreviewLoading(false);
      })
      .catch((err) => {
        if (cancelado) return;
        setPreviewLoading(false);
        setPreview(null);
        if (err instanceof SessionExpiredError) {
          onSessionExpired();
          return;
        }
        setPreviewError("Não foi possível calcular a pré-visualização do impacto.");
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, eventos.gol, eventos.cartao_amarelo, eventos.cartao_vermelho]);

  function handleCancelar() {
    setStatus(baselineStatus);
    setEventos(baselineEventos);
    setPreview(null);
    setPreviewError(null);
  }

  async function handleConfirmar() {
    setConfirmLoading(true);
    try {
      await corrigirParticipacao(rodadaId, participacao.atleta_id, {
        status,
        eventos: status === "ausente" ? [] : contagemParaEventos(eventos),
      });
      setConfirmLoading(false);
      // Texto literal do UX-SPEC.md Seção 4 (linha T07, coluna Sucesso).
      showToast({
        variant: "success",
        message: "Correção aplicada, log de auditoria atualizado",
      });
      onCorrigida();
    } catch (err) {
      setConfirmLoading(false);
      if (err instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      // RNF-10/TASK.md Seção 1.0 — nunca sugere salvamento parcial: mesma
      // mensagem genérica para 404/409/falha técnica, "nada foi salvo" é
      // verdade em todos os casos.
      showToast({ variant: "danger", message: CORRECAO_ERROR_MESSAGE });
    }
  }

  const bloqueadoEventos = status === "ausente";
  const diffItems = preview ? montarDiffItems(preview) : [];

  return (
    <li className={styles.row}>
      <p className={styles.nome}>{participacao.apelido_exibicao}</p>
      <p className={styles.pontosAtuais}>
        Pontos atuais nesta rodada: {participacao.pontos_delta}
      </p>

      <SegmentedControl
        label={`Presença de ${participacao.apelido_exibicao}`}
        options={STATUS_PARTICIPACAO_OPTIONS}
        value={status}
        onChange={(value) => {
          if (!isStatusParticipacao(value)) return;
          setStatus(value);
          if (value === "ausente") {
            setEventos({ gol: 0, cartao_amarelo: 0, cartao_vermelho: 0 });
          }
        }}
      />

      {bloqueadoEventos && (
        <p role="note" className={styles.bloqueioTexto}>
          Eventos bloqueados — atleta ausente (RF-02.6)
        </p>
      )}

      <div className={styles.contadores}>
        <StepperCounter
          label={`Gols de ${participacao.apelido_exibicao}`}
          value={eventos.gol}
          min={0}
          disabled={bloqueadoEventos}
          onChange={(valor) => setEventos((atual) => ({ ...atual, gol: valor }))}
        />
        <StepperCounter
          label={`Cartões amarelos de ${participacao.apelido_exibicao}`}
          value={eventos.cartao_amarelo}
          min={0}
          disabled={bloqueadoEventos}
          onChange={(valor) =>
            setEventos((atual) => ({ ...atual, cartao_amarelo: valor }))
          }
        />
        <StepperCounter
          label={`Cartões vermelhos de ${participacao.apelido_exibicao}`}
          value={eventos.cartao_vermelho}
          min={0}
          disabled={bloqueadoEventos}
          onChange={(valor) =>
            setEventos((atual) => ({ ...atual, cartao_vermelho: valor }))
          }
        />
      </div>

      {/* Preview inline (nunca modal) — região viva para leitor de tela
          perceber o cálculo assíncrono sem precisar de foco manual
          (WCAG 4.1.3). */}
      <div aria-live="polite" className={styles.preview}>
        {alterado && previewLoading && (
          <p className={styles.previewLoading}>Calculando pré-visualização…</p>
        )}
        {alterado && previewError && (
          <AlertBanner variant="danger">{previewError}</AlertBanner>
        )}
        {alterado && preview && (
          <div className={styles.previewResult}>
            <p className={styles.previewTitle}>Pré-visualização do impacto:</p>
            {diffItems.length > 0 && <DiffViewer items={diffItems} />}
            <p className={styles.previewTotal}>
              {preview.pontos_delta >= 0 ? "+" : ""}
              {preview.pontos_delta} pts líquido
            </p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancelar}
          disabled={!alterado || confirmLoading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={confirmLoading}
          onClick={handleConfirmar}
          disabled={!alterado || !preview || previewLoading}
        >
          Confirmar Correção
        </Button>
      </div>
    </li>
  );
}
