"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertBanner,
  Button,
  DateInput,
  Modal,
  NumberInput,
  Skeleton,
  SkeletonGroup,
  TextInput,
  useToast,
} from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { AnonimizacaoZona } from "./AnonimizacaoZona";
import {
  AtletaDuplicidadeError,
  AtletaNaoEncontradoError,
  AtletaValidationError,
  createAtleta,
  fetchAtletaPorId,
  updateAtleta,
} from "./atletasApi";
import { calcularIdade, exigeConsentimentoResponsavel, idadeValida } from "./idade";
import { formatDataAnonimizacao, formatNivelTecnico } from "./format";
import type { Atleta, AtletaBody, AtletaDuplicado } from "./types";
import styles from "./AtletaForm.module.css";

export interface AtletaFormProps {
  /** Ausente = criação (RF-01.1); presente = edição de um atleta existente (RF-01.6). */
  atletaId?: string;
}

type LoadState =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

const LOAD_ERROR_MESSAGE = "Não foi possível carregar o atleta agora. Tente novamente.";
const SAVE_ERROR_MESSAGE = "Não foi possível salvar o atleta. Tente novamente.";
const CONSENTIMENTO_OBRIGATORIO_MENSAGEM =
  "Consentimento do responsável legal é obrigatório para atletas menores de 18 anos (RF-01.3/RN-02).";

/**
 * T04 — Cadastro/Edição de Atleta (núcleo, UX-SPEC.md Seção 2/4/5.2; TASK.md
 * FE-04) — integração contra a API **real** (BE-06/BE-07, ambas `Concluída`;
 * não é mock a substituir depois).
 *
 * Mesmo componente para criação e edição (UX-SPEC.md: "o UX-SPEC.md usa o
 * mesmo formulário para as duas operações") — diferenciado por `atletaId`
 * estar presente ou não. Três modos de exibição, mutuamente exclusivos:
 * 1. Carregando/erro ao buscar o atleta (só quando `atletaId` presente).
 * 2. Atleta já anonimizado (`atleta.anonimizado_em` preenchido) — todos os
 *    campos pessoais em modo somente-leitura, sem "Zona de risco" (nada
 *    mais a anonimizar) nem botão de salvar (nada editável).
 * 3. Formulário normal (criação ou edição de atleta ainda não anonimizado).
 */
export function AtletaForm({ atletaId }: AtletaFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const handleSessionExpired = useHandleSessionExpired();

  const [loadState, setLoadState] = useState<LoadState>(
    atletaId ? { status: "loading" } : { status: "ready" },
  );
  const [atleta, setAtleta] = useState<Atleta | null>(null);

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [apelidoExibicao, setApelidoExibicao] = useState("");
  const [contato, setContato] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [pontuacaoInicial, setPontuacaoInicial] = useState("0");
  const [consentimento, setConsentimento] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicidade, setDuplicidade] = useState<AtletaDuplicado[] | null>(null);
  const duplicidadeCancelRef = useRef<HTMLButtonElement>(null);

  const loadAtleta = useCallback(
    async (id: string) => {
      setLoadState({ status: "loading" });
      try {
        const found = await fetchAtletaPorId(id);
        setAtleta(found);
        setNomeCompleto(found.nome_completo);
        setApelidoExibicao(found.apelido_exibicao);
        setContato(found.contato ?? "");
        setDataNascimento(found.data_nascimento ?? "");
        setPontuacaoInicial(String(found.pontuacao_inicial));
        setConsentimento(found.consentimento_responsavel_obtido);
        setLoadState({ status: "ready" });
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        if (err instanceof AtletaNaoEncontradoError) {
          setLoadState({ status: "error", message: "Atleta não encontrado." });
          return;
        }
        setLoadState({ status: "error", message: LOAD_ERROR_MESSAGE });
      }
    },
    [handleSessionExpired],
  );

  useEffect(() => {
    if (atletaId) {
      loadAtleta(atletaId);
    }
    // Só deve rodar quando `atletaId` muda (montagem) — `loadAtleta` é
    // estável o bastante via `useCallback`, incluí-la geraria refetch a
    // cada re-render por causa de `handleSessionExpired` mudar de
    // identidade entre renders do App Router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atletaId]);

  const idade = idadeValida(dataNascimento) ? calcularIdade(dataNascimento) : null;
  const showConsentBlock =
    idade !== null && idade >= 0 && exigeConsentimentoResponsavel(idade);

  function buildBody(confirmarDuplicidade: boolean): AtletaBody {
    return {
      nome_completo: nomeCompleto.trim(),
      apelido_exibicao: apelidoExibicao.trim() || undefined,
      contato: contato.trim() || undefined,
      data_nascimento: dataNascimento,
      consentimento_responsavel_obtido: consentimento,
      pontuacao_inicial: Number(pontuacaoInicial),
      confirmar_duplicidade: confirmarDuplicidade,
    };
  }

  function validateLocal(): boolean {
    const errors: Record<string, string> = {};
    if (nomeCompleto.trim().length === 0) {
      errors.nome_completo = "Nome completo é obrigatório.";
    }
    if (!idadeValida(dataNascimento)) {
      errors.data_nascimento = "Informe uma data de nascimento válida.";
    } else if (idade !== null && idade < 0) {
      errors.data_nascimento = "Data de nascimento não pode ser no futuro.";
    }
    const pontuacao = Number(pontuacaoInicial);
    if (Number.isNaN(pontuacao) || pontuacao < 0) {
      errors.pontuacao_inicial = "Pontuação inicial não pode ser negativa.";
    }
    if (showConsentBlock && !consentimento) {
      errors.consentimento_responsavel_obtido = CONSENTIMENTO_OBRIGATORIO_MENSAGEM;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(confirmarDuplicidade: boolean) {
    setFormError(null);
    setSubmitting(true);
    const body = buildBody(confirmarDuplicidade);
    try {
      await (atletaId ? updateAtleta(atletaId, body) : createAtleta(body));
      setDuplicidade(null);
      showToast({ variant: "success", message: "Atleta salvo com sucesso" });
      router.push(ROUTES.atletas);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired({ unsavedData: body });
        return;
      }
      if (err instanceof AtletaDuplicidadeError) {
        setDuplicidade(err.atletasDuplicados);
        setSubmitting(false);
        return;
      }
      if (err instanceof AtletaValidationError) {
        const errors: Record<string, string> = {};
        for (const item of err.detalhes) {
          const key = String(item.path[0] ?? "");
          if (key) errors[key] = item.message;
        }
        setFieldErrors((current) => ({ ...current, ...errors }));
        if (Object.keys(errors).length === 0) {
          setFormError(SAVE_ERROR_MESSAGE);
        }
        setSubmitting(false);
        return;
      }
      setFormError(SAVE_ERROR_MESSAGE);
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateLocal()) return;
    submit(false);
  }

  function handleConfirmDuplicidade() {
    submit(true);
  }

  function handleAnonimizado(atualizado: Atleta) {
    setAtleta(atualizado);
  }

  if (loadState.status === "loading") {
    return (
      <SkeletonGroup label="Carregando atleta">
        <Skeleton height={44} />
        <Skeleton height={44} />
        <Skeleton height={44} />
      </SkeletonGroup>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className={styles.errorWrapper}>
        <AlertBanner variant="danger">{loadState.message}</AlertBanner>
        {atletaId && (
          <Button variant="secondary" onClick={() => loadAtleta(atletaId)}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  // Estado de resultado pós-anonimização (UX-SPEC.md Seção 2/4, ADR-011):
  // campos pessoais somente-leitura, refletindo exatamente o que a API já
  // devolveu (nunca reconstruído/reinterpretado no cliente) — nenhum
  // formulário de edição aceita entrada nesses campos.
  if (atleta?.anonimizado_em) {
    return (
      <div className={styles.form}>
        <AlertBanner variant="warning">
          Este atleta foi anonimizado em {formatDataAnonimizacao(atleta.anonimizado_em)} e
          está inativo. Dados pessoais não podem mais ser editados ou recuperados.
        </AlertBanner>

        <TextInput
          label="Nome completo"
          value={atleta.nome_completo}
          readOnly
          aria-readonly="true"
        />
        <TextInput
          label="Apelido de exibição"
          value={atleta.apelido_exibicao}
          readOnly
          aria-readonly="true"
        />
        <TextInput
          label="Contato"
          value={atleta.contato ?? "—"}
          readOnly
          aria-readonly="true"
        />
        <TextInput
          label="Data de nascimento"
          value={atleta.data_nascimento ?? "—"}
          readOnly
          aria-readonly="true"
        />

        <p className={styles.preservedNote}>
          Pontuação/histórico: preservados (ver ranking e histórico de rodadas)
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Aviso de privacidade fixo no topo (LGPD, transparência no ato do
          cadastro — SDD.md Seção 7.6). Texto congelado: revisado em 2026-09-04
          contra a Seção 7.6 corrigida (duas bases legais distintas — Art. 7º
          IX para adulto, Art. 14 §1º/consentimento do responsável para menor,
          ver SDD.md Anexo B) e considerado consistente, sem necessidade de
          ajuste de copy. Texto abaixo é literal do wireframe do UX-SPEC.md,
          Seção 2. */}
      <AlertBanner variant="info">
        <span aria-hidden="true">🔒</span> Aviso de privacidade: Contato e data de
        nascimento são usados apenas internamente e nunca aparecem no ranking público.
      </AlertBanner>

      <div className={styles.pairRow}>
        <TextInput
          label="Nome completo"
          required
          value={nomeCompleto}
          onChange={(event) => setNomeCompleto(event.target.value)}
          error={fieldErrors.nome_completo}
          disabled={submitting}
        />
        <TextInput
          label="Apelido de exibição"
          helpText="Se em branco, usa o 1º nome"
          value={apelidoExibicao}
          onChange={(event) => setApelidoExibicao(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.pairRow}>
        <TextInput
          label="Contato"
          value={contato}
          onChange={(event) => setContato(event.target.value)}
          disabled={submitting}
        />
        <DateInput
          label="Data de nascimento"
          required
          value={dataNascimento}
          onChange={(event) => setDataNascimento(event.target.value)}
          error={fieldErrors.data_nascimento}
          disabled={submitting}
        />
      </div>

      <NumberInput
        label="Pontuação inicial"
        required
        min={0}
        helpText="Mínimo 0"
        value={pontuacaoInicial}
        onChange={(event) => setPontuacaoInicial(event.target.value)}
        error={fieldErrors.pontuacao_inicial}
        disabled={submitting}
      />

      {/* Região viva permanente — anuncia o aparecimento/desaparecimento do
          bloco de consentimento (RN-02) por leitor de tela, nunca um mero
          display:none silencioso (UX-SPEC.md Seção 5.2). Também aparece se o
          servidor devolver o erro de RF-01.3 mesmo quando o cálculo local
          não sinalizou menor de idade (ex.: relógio do cliente levemente
          divergente do servidor perto da virada do dia do aniversário) —
          nunca deixa um erro de campo "orfão", sem o controle necessário
          para o usuário resolvê-lo (TASK.md Seção 1.0, nunca lacuna
          silenciosa). */}
      <div aria-live="polite">
        {(showConsentBlock || Boolean(fieldErrors.consentimento_responsavel_obtido)) && (
          <div className={styles.consentBlock}>
            <AlertBanner variant="warning">⚠ Menor de 18 anos detectado</AlertBanner>
            <label className={styles.checkboxRow} htmlFor="consentimento-checkbox">
              <input
                id="consentimento-checkbox"
                type="checkbox"
                checked={consentimento}
                onChange={(event) => setConsentimento(event.target.checked)}
                aria-describedby={
                  fieldErrors.consentimento_responsavel_obtido
                    ? "consentimento-erro"
                    : undefined
                }
                aria-invalid={Boolean(fieldErrors.consentimento_responsavel_obtido)}
                disabled={submitting}
              />
              <span>Confirmo que o consentimento do responsável legal foi obtido</span>
            </label>
            {fieldErrors.consentimento_responsavel_obtido && (
              <p id="consentimento-erro" role="alert" className={styles.fieldError}>
                {fieldErrors.consentimento_responsavel_obtido}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Nível técnico (RF-01.4) — nunca um campo de entrada; exibido
          somente-leitura só na edição (a criação ainda não tem id/histórico). */}
      {atletaId && atleta && (
        <p className={styles.nivelTecnico}>
          Nível técnico: <strong>{formatNivelTecnico(atleta.nivel_tecnico)}</strong>{" "}
          <span className={styles.readOnlyTag}>(somente leitura)</span>
        </p>
      )}

      {formError && <AlertBanner variant="danger">{formError}</AlertBanner>}

      <Button type="submit" loading={submitting} fullWidth>
        Salvar Atleta
      </Button>

      {/* "Zona de risco" — só na edição de um atleta já existente (nunca no
          formulário de criação, UX-SPEC.md Seção 2). */}
      {atletaId && atleta && (
        <AnonimizacaoZona
          atleta={atleta}
          onAnonimizado={handleAnonimizado}
          onSessionExpired={handleSessionExpired}
        />
      )}

      {/* Modal de duplicidade (RF-01.5) — aparece antes de permitir salvar
          quando `nome_completo` coincide com o de outro atleta ativo. */}
      <Modal
        open={duplicidade !== null}
        title="Nome já cadastrado"
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
              onClick={handleConfirmDuplicidade}
            >
              Salvar mesmo assim
            </Button>
          </>
        }
      >
        <p>Já existe pelo menos um atleta cadastrado com esse nome:</p>
        <ul>
          {duplicidade?.map((item) => (
            <li key={item.id}>{item.nome_completo}</li>
          ))}
        </ul>
        <p>Deseja salvar mesmo assim?</p>
      </Modal>
    </form>
  );
}
