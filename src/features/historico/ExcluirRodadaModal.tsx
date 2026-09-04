"use client";

import { useRef, useState } from "react";
import { Button, Modal, useToast } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { RODADA_EXCLUSAO_ERROR_MESSAGE, excluirRodada } from "./historicoApi";

export interface ExcluirRodadaModalProps {
  open: boolean;
  rodadaId: string;
  /** Já formatada para exibição (`"DD/MM/AAAA"`) — ver `formatDataExibicao`. */
  rodadaDataExibida: string;
  onClose: () => void;
  onExcluida: (result: { id: string; atletasAfetados: number }) => void;
  /** Chamado em 401 — a tela-mãe decide o fluxo de redirecionamento (FE-12). */
  onSessionExpired: () => void;
}

/**
 * Fluxo de exclusão de rodada (UX-SPEC.md Seção 2, wireframe "Excluir rodada
 * {data}?", parte de T07 mas acionada a partir do menu "⋮" de T06 —
 * TASK.md FE-06, "'Excluir' no menu deve mapear para
 * DELETE /api/rodadas/{id}"). Modal bloqueante (ação destrutiva e em
 * cascata, RN-04) — foco inicial em "Cancelar" (ação segura por padrão,
 * mesmo critério de T04/UX-SPEC.md Seção 5.2 "T07 Correção/Estorno").
 *
 * **Decisão de detalhe documentada** (TASK.md Seção 1.0, não escalada): o
 * wireframe original mostra a contagem exata de atletas afetados já no
 * texto de confirmação ("...para 20 atletas"), obtida ali de uma tela de
 * detalhe de rodada (T07) que já teria carregado a participação completa.
 * T06 (lista) não tem esse dado disponível: `RodadaResumoItem`
 * (`GET /api/rodadas`, BE-16) só expõe `presentes`
 * (`participacao_rodada.status = "presente"`), não o total de participantes
 * da rodada (presentes + ausentes + lesionados) que `atletas_afetados`
 * realmente representa — usar `presentes` aqui subestimaria a contagem real
 * e seria uma informação incorreta, pior que nenhum número. Por isso o
 * aviso pré-confirmação continua com linguagem simples sem número exato
 * (ainda satisfaz RN-04 — "nunca some pontos silenciosamente", o efeito de
 * cascata é explicado antes de confirmar); a contagem real
 * (`atletas_afetados`, devolvida por `DELETE /api/rodadas/{id}`, BE-09)
 * aparece depois, no toast de sucesso.
 */
export function ExcluirRodadaModal({
  open,
  rodadaId,
  rodadaDataExibida,
  onClose,
  onExcluida,
  onSessionExpired,
}: ExcluirRodadaModalProps) {
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();

  async function handleConfirm() {
    setLoading(true);
    try {
      const resultado = await excluirRodada(rodadaId);
      setLoading(false);
      showToast({
        variant: "success",
        message: `Rodada excluída — pontos revertidos para ${resultado.atletas_afetados} atleta(s).`,
      });
      onExcluida({ id: resultado.id, atletasAfetados: resultado.atletas_afetados });
    } catch (err) {
      setLoading(false);
      if (err instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      // Mesma mensagem literal para 404/409/falha técnica (UX-SPEC.md Seção
      // 4, linha T07): do ponto de vista do organizador, em todos os casos
      // "nenhuma alteração foi salva" é verdade — mesmo critério já usado
      // por `AnonimizacaoZona` (FE-04).
      showToast({ variant: "danger", message: RODADA_EXCLUSAO_ERROR_MESSAGE });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      title={`Excluir rodada ${rodadaDataExibida}?`}
      onClose={onClose}
      initialFocusRef={cancelRef as React.RefObject<HTMLElement>}
      actions={
        <>
          <Button ref={cancelRef} type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={loading}
            onClick={handleConfirm}
          >
            Sim, excluir e estornar
          </Button>
        </>
      }
    >
      <p>
        Isso reverte automaticamente TODOS os pontos desta rodada (presença, gols,
        cartões, substituições vinculadas) para os atletas participantes.
      </p>
      <p>
        <strong>
          Esta ação gera registro no log de auditoria e não pode ser desfeita.
        </strong>
      </p>
    </Modal>
  );
}
