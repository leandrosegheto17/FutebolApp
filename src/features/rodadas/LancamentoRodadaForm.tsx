"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertBanner,
  Button,
  DateInput,
  Modal,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import { AtletaParticipacaoRow } from "./AtletaParticipacaoRow";
import { formatDataExibicao } from "./format";
import {
  buildLancarRodadaBody,
  initParticipacoes,
  resumirParticipacoes,
  type ParticipacaoState,
} from "./participacaoState";
import { RodadaStatTiles } from "./RodadaStatTiles";
import {
  lancarRodada,
  RodadaDuplicidadeError,
  RODADA_SUBMIT_ERROR_MESSAGE,
} from "./rodadasApi";
import { RevisaoStep } from "./RevisaoStep";
import type { RodadaDuplicada, StatusParticipacao } from "./types";
import styles from "./LancamentoRodadaForm.module.css";

type LoadState =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

/**
 * Estado dos dois modais desta tela — mutuamente exclusivos (nunca os dois
 * abertos ao mesmo tempo): o de confirmação final (RNF-10) e o de
 * duplicidade de data (RF-02.8, só surge depois de uma tentativa real de
 * envio devolver `409`).
 */
type ModalState =
  | { kind: "fechado" }
  | { kind: "confirmar" }
  | { kind: "duplicidade"; rodadas: RodadaDuplicada[] };

const LOAD_ERROR_MESSAGE = "Não foi possível carregar os atletas agora. Tente novamente.";
const EMPTY_ATLETAS_MESSAGE =
  "Cadastre ao menos um atleta ativo antes de lançar uma rodada.";
const SKELETON_ROW_COUNT = 5;

/**
 * T05 — Lançamento de Rodada (`UX-SPEC.md` Parte II Seção 2.4; TASK.md
 * `FE-R05`, reestimativa de `FE-05`).
 *
 * **Reescrita estrutural desta revisão**: de `Stepper` de 3 etapas (Parte I)
 * para uma **lista contínua única** — stat-tiles agregados no topo
 * (`RodadaStatTiles`) + um cartão por atleta (`AtletaParticipacaoRow`, com
 * `SegmentedControl` de presença e eventos revelados progressivamente) — sem
 * paginação, fechada por um único botão "Salvar rodada". Isto é uma mudança
 * de **composição/apresentação**, não de regra de negócio (RN-D06): a mesma
 * API real (`app.lancar_rodada` via `BE-08`, `Concluída`; ver
 * `app/api/rodadas/route.ts`) continua sendo chamada com um único `POST`, e
 * toda validação já existente (RF-02.6, RF-02.8, cálculo automático de
 * pontos) continua idêntica — só a forma de coletar/apresentar os dados
 * muda.
 *
 * **Ponto de não-retorno preservado (RNF-10)**: a Parte I reservava uma
 * "Etapa 3/3: Revisão e Confirmação" só para isso; o mockup real colapsa
 * tudo numa lista única com um só botão "Salvar rodada". A reconciliação do
 * próprio `UX-SPEC.md` (Seção 2.4) — decisão de composição do UX/UI, não
 * escalada — preserva a intenção de RNF-10 através de um **modal de
 * confirmação** (reaproveita `RevisaoStep`, Guardrail 31) com o mesmo resumo
 * que a antiga Etapa 3 mostrava, aberto pelo botão "Salvar rodada" e
 * disparando o `POST` real só quando o organizador confirma dentro dele.
 * Enquanto a submissão está em curso, o modal (`aria-modal`, focus trap)
 * bloqueia a edição da lista por trás dele e o botão "Cancelar" fica
 * desabilitado — equivalente funcional ao antigo "etapas anteriores
 * bloqueadas para edição durante o envio" do `Stepper`.
 */
export function LancamentoRodadaForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const handleSessionExpired = useHandleSessionExpired();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [participacoes, setParticipacoes] = useState<ParticipacaoState[]>([]);
  const [data, setData] = useState("");
  const [dataError, setDataError] = useState<string | undefined>(undefined);
  const [modalState, setModalState] = useState<ModalState>({ kind: "fechado" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const duplicidadeCancelRef = useRef<HTMLButtonElement>(null);
  const confirmarCancelRef = useRef<HTMLButtonElement>(null);

  const loadAtletas = useCallback(() => {
    setLoadState({ status: "loading" });
    fetchAtletas()
      .then((items) => {
        const ativos = items.filter((atleta) => atleta.ativo);
        if (ativos.length === 0) {
          // UX-SPEC.md Seção 4 (T05, coluna Vazio): "se não houver nenhum
          // atleta cadastrado, a tela redireciona para T04 com aviso,
          // tratado como dependência, não como 'vazio' desta tela".
          showToast({ variant: "warning", message: EMPTY_ATLETAS_MESSAGE });
          router.replace(ROUTES.novoAtleta);
          return;
        }
        setParticipacoes(initParticipacoes(ativos));
        setLoadState({ status: "ready" });
      })
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setLoadState({ status: "error", message: LOAD_ERROR_MESSAGE });
      });
  }, [handleSessionExpired, router, showToast]);

  useEffect(() => {
    loadAtletas();
    // Só deve rodar na montagem — mesmo racional de `AtletaForm`/`AtletasList`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStatusChange(atletaId: string, status: StatusParticipacao) {
    setParticipacoes((current) =>
      current.map((participacao) =>
        participacao.atletaId === atletaId
          ? {
              ...participacao,
              status,
              // RF-02.6: nunca deixa contadores não-zerados "pendurados" para
              // um atleta que acabou de virar ausente (evita reenviar
              // eventos implícitos se o organizador voltar o status depois).
              ...(status === "ausente"
                ? { gols: 0, cartoesAmarelos: 0, cartoesVermelhos: 0 }
                : {}),
            }
          : participacao,
      ),
    );
  }

  function handleChangeEvento(
    atletaId: string,
    campo: "gols" | "cartoesAmarelos" | "cartoesVermelhos",
    valor: number,
  ) {
    setParticipacoes((current) =>
      current.map((participacao) =>
        participacao.atletaId === atletaId
          ? { ...participacao, [campo]: valor }
          : participacao,
      ),
    );
  }

  const dataValida = data.trim().length > 0;

  function handleAbrirConfirmacao() {
    if (!dataValida) {
      setDataError("Informe a data da rodada.");
      return;
    }
    setDataError(undefined);
    setFormError(null);
    setModalState({ kind: "confirmar" });
  }

  function fecharModal() {
    if (submitting) return;
    setModalState({ kind: "fechado" });
  }

  async function submit(confirmarDuplicidade: boolean) {
    setFormError(null);
    setSubmitting(true);
    const body = buildLancarRodadaBody(data, participacoes, confirmarDuplicidade);
    try {
      await lancarRodada(body);
      setModalState({ kind: "fechado" });
      showToast({ variant: "success", message: "Rodada lançada com sucesso" });
      router.push(ROUTES.historico);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired({ unsavedData: body });
        return;
      }
      if (err instanceof RodadaDuplicidadeError) {
        setModalState({ kind: "duplicidade", rodadas: err.rodadasDuplicadas });
        setSubmitting(false);
        return;
      }
      // Validação (400, defesa em profundidade — já barrado localmente) e
      // falha genérica de transação: mesma mensagem literal do
      // `UX-SPEC.md` — nunca sugere salvamento parcial (RNF-10). O modal de
      // confirmação permanece aberto (nada foi perdido) para o organizador
      // tentar de novo sem reabrir a lista inteira.
      setFormError(RODADA_SUBMIT_ERROR_MESSAGE);
      setSubmitting(false);
    }
  }

  function handleConfirmar() {
    submit(false);
  }

  function handleConfirmarDuplicidade() {
    submit(true);
  }

  if (loadState.status === "loading") {
    return (
      <SkeletonGroup label="Carregando atletas" className={styles.page}>
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} height={44} />
        ))}
      </SkeletonGroup>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className={styles.errorWrapper}>
        <AlertBanner variant="danger">{loadState.message}</AlertBanner>
        <Button variant="secondary" onClick={loadAtletas}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const resumo = resumirParticipacoes(participacoes);

  return (
    <>
      <div className={styles.page}>
        <h1 className={styles.titulo}>Registro de presença</h1>

        <DateInput
          label="Data da rodada"
          required
          value={data}
          onChange={(event) => {
            setData(event.target.value);
            if (event.target.value.trim().length > 0) setDataError(undefined);
          }}
          error={dataError}
          disabled={submitting}
        />

        <RodadaStatTiles resumo={resumo} total={participacoes.length} />

        {participacoes.length === 0 ? (
          <AlertBanner variant="warning">
            Nenhum atleta ativo disponível para marcar presença.
          </AlertBanner>
        ) : (
          <ul className={styles.atletaList}>
            {participacoes.map((participacao) => (
              <AtletaParticipacaoRow
                key={participacao.atletaId}
                participacao={participacao}
                onStatusChange={handleStatusChange}
                onChangeEvento={handleChangeEvento}
              />
            ))}
          </ul>
        )}

        <Button
          fullWidth
          onClick={handleAbrirConfirmacao}
          disabled={participacoes.length === 0}
        >
          Salvar rodada
        </Button>
      </div>

      {/* Modal de confirmação final — reconciliação do próprio UX-SPEC.md
          (Seção 2.4) para preservar a intenção de RNF-10 sem reintroduzir o
          `Stepper` de 3 etapas removido por esta tarefa. */}
      <Modal
        open={modalState.kind === "confirmar"}
        title="Confirmar lançamento da rodada"
        onClose={fecharModal}
        closeOnBackdropClick={!submitting}
        initialFocusRef={confirmarCancelRef as React.RefObject<HTMLElement>}
        actions={
          <>
            <Button
              ref={confirmarCancelRef}
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={fecharModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={handleConfirmar}
            >
              Confirmar lançamento
            </Button>
          </>
        }
      >
        <RevisaoStep data={data} resumo={resumo} formError={formError} />
      </Modal>

      {/* Modal de duplicidade (RF-02.8) — mesmo padrão já usado por
          `AtletaForm` (RF-01.5/BE-06): confirmação explícita do usuário
          antes de reenviar com `confirmar_duplicidade: true`. Nunca aberto
          ao mesmo tempo que o modal de confirmação acima (`ModalState`). */}
      <Modal
        open={modalState.kind === "duplicidade"}
        title="Já existe rodada nesta data"
        onClose={fecharModal}
        initialFocusRef={duplicidadeCancelRef as React.RefObject<HTMLElement>}
        actions={
          <>
            <Button
              ref={duplicidadeCancelRef}
              type="button"
              variant="secondary"
              onClick={fecharModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={handleConfirmarDuplicidade}
            >
              Lançar mesmo assim
            </Button>
          </>
        }
      >
        <p>Já existe pelo menos uma rodada lançada com esta data:</p>
        <ul>
          {modalState.kind === "duplicidade" &&
            modalState.rodadas.map((item) => (
              <li key={item.id}>{formatDataExibicao(item.data)}</li>
            ))}
        </ul>
        <p>Deseja lançar mesmo assim?</p>
      </Modal>
    </>
  );
}
