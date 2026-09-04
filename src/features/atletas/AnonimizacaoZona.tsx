"use client";

import { useState } from "react";
import { Button, TypedConfirmationModal, useToast } from "@/components/ui";
import { SessionExpiredError } from "@/features/sessao";
import { anonimizarAtleta } from "./atletasApi";
import type { Atleta } from "./types";
import styles from "./AnonimizacaoZona.module.css";

const CONFIRMATION_WORD = "ANONIMIZAR";

/** Texto literal da Seção 4 do UX-SPEC.md — nenhuma tela deve reformular. */
const ANONIMIZACAO_ERRO_MENSAGEM =
  "Não foi possível anonimizar. Nenhuma alteração foi salva.";
/** Texto literal da Seção 4 do UX-SPEC.md. */
const ANONIMIZACAO_SUCESSO_MENSAGEM = "Dados pessoais anonimizados";

export interface AnonimizacaoZonaProps {
  atleta: Atleta;
  onAnonimizado: (atualizado: Atleta) => void;
  /** Chamado em 401 — a tela-mãe decide o fluxo de redirecionamento (FE-12). */
  onSessionExpired: () => void;
}

/**
 * "Zona de risco" de T04 (UX-SPEC.md Seção 2, revisão 2026-09-02, ADR-011) —
 * ação secundária destrutiva, disponível só na edição de um atleta já
 * existente (nunca no formulário de criação — decisão do próprio
 * `AtletaForm`, que só renderiza este componente quando há um `atleta`
 * carregado). Usa `TypedConfirmationModal` (design system) — nenhuma lógica
 * de "digite para confirmar" duplicada aqui.
 */
export function AnonimizacaoZona({
  atleta,
  onAnonimizado,
  onSessionExpired,
}: AnonimizacaoZonaProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const nomeExibido = atleta.apelido_exibicao || atleta.nome_completo;

  async function handleConfirm() {
    setLoading(true);
    try {
      const atualizado = await anonimizarAtleta(atleta.id);
      setLoading(false);
      setOpen(false);
      showToast({ variant: "success", message: ANONIMIZACAO_SUCESSO_MENSAGEM });
      onAnonimizado(atualizado);
    } catch (err) {
      setLoading(false);
      setOpen(false);
      if (err instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      // Toast de erro dedicado (critério de aceite de FE-04) — mesma
      // mensagem literal para 404/409/falha técnica: do ponto de vista do
      // organizador, em todos os casos "nenhuma alteração foi salva" é
      // verdade e nenhum deles é acionável de forma diferente por ele.
      showToast({ variant: "danger", message: ANONIMIZACAO_ERRO_MENSAGEM });
    }
  }

  return (
    <section className={styles.zone} aria-labelledby="zona-risco-heading">
      <h2 id="zona-risco-heading" className={styles.heading}>
        Zona de risco
      </h2>
      <p className={styles.description}>
        Solicitar exclusão/anonimização de dados pessoais
      </p>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Solicitar anonimização
      </Button>

      <TypedConfirmationModal
        open={open}
        title={`Anonimizar dados de ${nomeExibido}?`}
        confirmationWord={CONFIRMATION_WORD}
        confirmLabel="Confirmar anonimização"
        loading={loading}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
        description={
          <>
            <p>
              Esta ação substitui nome completo, apelido de exibição, contato e data de
              nascimento por valores não identificáveis, e marca o atleta como inativo.
            </p>
            <p>
              O histórico de pontuação (ranking, presenças, gols, cartões) é preservado —
              não é apagado nem recalculado.
            </p>
            <p>
              <strong>
                Esta ação NÃO PODE SER DESFEITA. Não há como recuperar o nome ou contato
                originais depois de confirmar.
              </strong>
            </p>
          </>
        }
      />
    </section>
  );
}
