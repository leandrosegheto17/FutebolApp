"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertBanner,
  Button,
  EmptyState,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import type { Atleta } from "@/features/atletas/types";
import { formatDataDesativacao } from "./format";
import { RestricaoFormModal } from "./RestricaoFormModal";
import {
  CARREGAR_RESTRICOES_ERROR_MESSAGE,
  RestricaoNaoEncontradaError,
  desativarRestricao,
  listarRestricoes,
  reativarRestricao,
} from "./restricoesApi";
import type { Restricao } from "./types";
import styles from "./RestricoesList.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; restricoes: Restricao[]; atletas: Atleta[] };

type FormModalState = { mode: "create" } | { mode: "edit"; restricao: Restricao } | null;

const SKELETON_ROW_COUNT = 3;

/** Texto literal do wireframe (`UX-SPEC.md` Seção 2, T10). */
const PAIR_EXPLICACAO_TEXTO = "(não podem ficar no mesmo time)";

const DESATIVAR_ERROR_MESSAGE =
  "Não foi possível desativar a restrição agora. Tente novamente.";
const REATIVAR_ERROR_MESSAGE =
  "Não foi possível reativar a restrição agora. Tente novamente.";

/**
 * T10 — Gestão de Restrições Obrigatórias (`UX-SPEC.md` Seção 2/4/5.1;
 * TASK.md FE-10) — integração contra a API **real** (`GET/POST
 * /api/restricoes`, `PUT /api/restricoes/{id}`, `POST
 * /api/restricoes/{id}/desativar`, `POST /api/restricoes/{id}/reativar`,
 * BE-12, já `Concluída`/aprovada pelo QA; nenhuma pendência de mock a fechar
 * depois).
 *
 * Carrega restrições (`listarRestricoes`) e o universo de atletas ativos
 * (`fetchAtletas`, BE-06, já `Concluída`) juntos na montagem — mesmo padrão
 * já usado por `SubstituicoesModal` (FE-11, `Promise.all`) — os atletas só
 * alimentam os dois seletores de autocomplete do formulário de
 * criação/edição.
 *
 * CRUD completo (RF-05.5, "cadastrar, editar, desativar" + `POST
 * .../reativar`, já adicionado por `BE-12`): "+ Nova restrição" e "Editar"
 * abrem `RestricaoFormModal`; "Desativar"/"Reativar" chamam os dois
 * endpoints de toggle diretamente desta tela, sem modal de confirmação —
 * decisão de detalhe documentada, não escalada: o próprio wireframe de T10
 * desenha as duas ações como um único clique (sem etapa de confirmação
 * intermediária, diferente da anonimização de atleta em FE-04, que É
 * irreversível por desenho/ADR-011), e RN-11 trata a desativação como
 * reversível via "Reativar" — soft-delete nunca remove a linha da lista
 * (histórico sempre visível, com a data da primeira desativação).
 * "Editar" (RF-05.5) é uma adição desta tarefa não desenhada literalmente no
 * wireframe (que só mostra "Desativar"/"Reativar" por item) — decisão de
 * detalhe documentada, não escalada: o critério de aceite literal desta
 * tarefa ("CRUD de pares...") e o próprio `PUT /api/restricoes/{id}`
 * publicado por `BE-12` exigem a operação; disponível só para restrições
 * ainda ativas (editar um par já desativado não tem paralelo no wireframe
 * nem necessidade funcional clara — o organizador reativa primeiro se
 * quiser ajustar o par).
 */
export function RestricoesList() {
  const { showToast } = useToast();
  const handleSessionExpired = useHandleSessionExpired();

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [formModal, setFormModal] = useState<FormModalState>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([listarRestricoes(), fetchAtletas()])
      .then(([restricoes, atletas]) =>
        setState({ status: "success", restricoes, atletas }),
      )
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setState({ status: "error", message: CARREGAR_RESTRICOES_ERROR_MESSAGE });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(salva: Restricao) {
    setState((current) => {
      if (current.status !== "success") return current;
      const existe = current.restricoes.some((item) => item.id === salva.id);
      const restricoes = existe
        ? current.restricoes.map((item) => (item.id === salva.id ? salva : item))
        : [salva, ...current.restricoes];
      return { ...current, restricoes };
    });
    setFormModal(null);
    showToast({
      variant: "success",
      message: formModal?.mode === "edit" ? "Restrição atualizada." : "Restrição criada.",
    });
  }

  function updateRestricaoNaLista(atualizada: Restricao) {
    setState((current) =>
      current.status === "success"
        ? {
            ...current,
            restricoes: current.restricoes.map((item) =>
              item.id === atualizada.id ? atualizada : item,
            ),
          }
        : current,
    );
  }

  async function handleDesativar(restricao: Restricao) {
    setActionLoadingId(restricao.id);
    try {
      const atualizada = await desativarRestricao(restricao.id);
      updateRestricaoNaLista(atualizada);
      showToast({ variant: "success", message: "Restrição desativada." });
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      showToast({
        variant: "danger",
        message:
          err instanceof RestricaoNaoEncontradaError
            ? err.message
            : DESATIVAR_ERROR_MESSAGE,
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReativar(restricao: Restricao) {
    setActionLoadingId(restricao.id);
    try {
      const atualizada = await reativarRestricao(restricao.id);
      updateRestricaoNaLista(atualizada);
      showToast({ variant: "success", message: "Restrição reativada." });
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      showToast({
        variant: "danger",
        message:
          err instanceof RestricaoNaoEncontradaError
            ? err.message
            : REATIVAR_ERROR_MESSAGE,
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Restrições</h1>
        <Button type="button" onClick={() => setFormModal({ mode: "create" })}>
          + Nova restrição
        </Button>
      </div>

      {state.status === "loading" && (
        <SkeletonGroup label="Carregando restrições">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} height={72} />
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

      {state.status === "success" && state.restricoes.length === 0 && (
        <EmptyState title="Nenhuma restrição obrigatória cadastrada" />
      )}

      {state.status === "success" && state.restricoes.length > 0 && (
        <ul className={styles.list}>
          {state.restricoes.map((restricao) => (
            <li key={restricao.id} className={styles.item}>
              <p className={styles.pairNames}>
                {restricao.atleta_a_nome} <span aria-hidden="true">⚡</span>{" "}
                {restricao.atleta_b_nome}
              </p>
              <p className={styles.pairExplicacao}>{PAIR_EXPLICACAO_TEXTO}</p>
              <div className={styles.statusRow}>
                {restricao.ativo ? (
                  <span className={styles.statusLabel}>Ativa</span>
                ) : (
                  <span className={styles.statusLabel}>
                    {restricao.desativado_em
                      ? `Desativada em ${formatDataDesativacao(restricao.desativado_em)}`
                      : "Desativada"}
                  </span>
                )}
                <div className={styles.actions}>
                  {restricao.ativo && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setFormModal({ mode: "edit", restricao })}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        loading={actionLoadingId === restricao.id}
                        onClick={() => handleDesativar(restricao)}
                      >
                        Desativar
                      </Button>
                    </>
                  )}
                  {!restricao.ativo && (
                    <Button
                      variant="secondary"
                      loading={actionLoadingId === restricao.id}
                      onClick={() => handleReativar(restricao)}
                    >
                      Reativar
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RestricaoFormModal
        open={formModal !== null}
        restricao={formModal?.mode === "edit" ? formModal.restricao : undefined}
        atletas={state.status === "success" ? state.atletas : []}
        onClose={() => setFormModal(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
