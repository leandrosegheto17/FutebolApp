"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertBanner,
  Button,
  Modal,
  Skeleton,
  SkeletonGroup,
  Stepper,
  useToast,
} from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import { EventosStep } from "./EventosStep";
import { formatDataExibicao } from "./format";
import {
  buildLancarRodadaBody,
  initParticipacoes,
  resumirParticipacoes,
  type ParticipacaoState,
} from "./participacaoState";
import { PresencaStep } from "./PresencaStep";
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

const LOAD_ERROR_MESSAGE = "Não foi possível carregar os atletas agora. Tente novamente.";
const EMPTY_ATLETAS_MESSAGE =
  "Cadastre ao menos um atleta ativo antes de lançar uma rodada.";
const SKELETON_ROW_COUNT = 5;
const STEP_LABELS = ["Presença", "Eventos", "Revisão e Confirmação"];

/**
 * T05 — Lançamento de Rodada (stepper de 3 etapas, `UX-SPEC.md` T05; TASK.md
 * FE-05) — integração contra a API **real** (BE-08, `Concluída`; não é mock
 * a substituir depois — ver `app/api/rodadas/route.ts`).
 *
 * Um único `POST /api/rodadas` na confirmação da Etapa 3 (TASK.md Seção
 * 1.2) — a operação de backend (`app.lancar_rodada`) já é atômica numa
 * única transação Postgres; o cliente nunca fragmenta isso em chamadas
 * incrementais por etapa. Etapas 1/2 só editam estado local em memória.
 */
export function LancamentoRodadaForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const handleSessionExpired = useHandleSessionExpired();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [participacoes, setParticipacoes] = useState<ParticipacaoState[]>([]);
  const [data, setData] = useState("");
  const [dataError, setDataError] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicidade, setDuplicidade] = useState<RodadaDuplicada[] | null>(null);
  const duplicidadeCancelRef = useRef<HTMLButtonElement>(null);

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

  function goNext() {
    if (currentStep === 0) {
      if (!dataValida) {
        setDataError("Informe a data da rodada.");
        return;
      }
      setDataError(undefined);
    }
    setCurrentStep((step) => Math.min(STEP_LABELS.length - 1, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  async function submit(confirmarDuplicidade: boolean) {
    setFormError(null);
    setSubmitting(true);
    const body = buildLancarRodadaBody(data, participacoes, confirmarDuplicidade);
    try {
      await lancarRodada(body);
      setDuplicidade(null);
      showToast({ variant: "success", message: "Rodada lançada com sucesso" });
      router.push(ROUTES.historico);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired({ unsavedData: body });
        return;
      }
      if (err instanceof RodadaDuplicidadeError) {
        setDuplicidade(err.rodadasDuplicadas);
        setSubmitting(false);
        return;
      }
      // Validação (400, defesa em profundidade — já barrado localmente) e
      // falha genérica de transação: mesma mensagem literal do
      // `UX-SPEC.md` — nunca sugere salvamento parcial (RNF-10).
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
  const isLastStep = currentStep === STEP_LABELS.length - 1;

  return (
    <>
      <Stepper
        className={styles.page}
        steps={STEP_LABELS}
        currentStep={currentStep}
        // Etapa 3 em envio: navegação para etapas anteriores fica
        // bloqueada (UX-SPEC.md Seção 4, T05: "etapas anteriores
        // bloqueadas para edição durante o envio").
        onBack={submitting ? undefined : goBack}
        onNext={isLastStep ? handleConfirmar : goNext}
        nextLabel={isLastStep ? "Confirmar Lançamento" : "Continuar →"}
        nextDisabled={currentStep === 0 && !dataValida}
        nextLoading={isLastStep && submitting}
      >
        {currentStep === 0 && (
          <PresencaStep
            data={data}
            onDataChange={(value) => {
              setData(value);
              if (value.trim().length > 0) setDataError(undefined);
            }}
            dataError={dataError}
            participacoes={participacoes}
            onStatusChange={handleStatusChange}
          />
        )}
        {currentStep === 1 && (
          <EventosStep
            participacoes={participacoes}
            onChangeEvento={handleChangeEvento}
          />
        )}
        {currentStep === 2 && (
          <RevisaoStep data={data} resumo={resumo} formError={formError} />
        )}
      </Stepper>

      {/* Modal de duplicidade (RF-02.8) — mesmo padrão já usado por
          `AtletaForm` (RF-01.5/BE-06): confirmação explícita do usuário
          antes de reenviar com `confirmar_duplicidade: true`. */}
      <Modal
        open={duplicidade !== null}
        title="Já existe rodada nesta data"
        onClose={() => setDuplicidade(null)}
        initialFocusRef={duplicidadeCancelRef as React.RefObject<HTMLElement>}
        actions={
          <>
            <Button
              ref={duplicidadeCancelRef}
              type="button"
              variant="secondary"
              onClick={() => setDuplicidade(null)}
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
          {duplicidade?.map((item) => (
            <li key={item.id}>{formatDataExibicao(item.data)}</li>
          ))}
        </ul>
        <p>Deseja lançar mesmo assim?</p>
      </Modal>
    </>
  );
}
