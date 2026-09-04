"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertBanner, Button, Combobox, Modal } from "@/components/ui";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import type { Atleta } from "@/features/atletas/types";
import {
  RestricaoApiError,
  RestricaoAtletaNaoEncontradoError,
  RestricaoNaoEncontradaError,
  RestricaoValidationError,
  atualizarRestricao,
  criarRestricao,
} from "./restricoesApi";
import type { Restricao, RestricaoBody } from "./types";
import styles from "./RestricaoFormModal.module.css";

export interface RestricaoFormModalProps {
  open: boolean;
  /** Presente = edição de um par já cadastrado; ausente = criação (RF-05.5). */
  restricao?: Restricao;
  /** Universo de atletas para os dois seletores (autocomplete). */
  atletas: Atleta[];
  onClose: () => void;
  onSaved: (restricao: Restricao) => void;
}

/**
 * Texto literal do `UX-SPEC.md` Seção 4 (linha "T10 Restrições", coluna
 * Erro) — usado como fallback genérico de falha de `criar`/`atualizar`
 * quando o servidor não devolve um erro específico de campo.
 */
export const SALVAR_RESTRICAO_ERROR_MESSAGE = "Não foi possível salvar a restrição";

const ATLETAS_DISTINTOS_MENSAGEM = "Selecione dois atletas diferentes.";

/**
 * T10 — formulário "+ Nova restrição" (criação e edição, `UX-SPEC.md` Seção
 * 2/3.1 — "CRUD simples de pares... dois seletores de atleta (autocomplete
 * por nome)") — integração contra a API **real** (`POST`/`PUT
 * /api/restricoes*`, BE-12, já `Concluída`/aprovada pelo QA; nenhuma
 * pendência de mock).
 *
 * Implementado como `Modal` (design system) — decisão de detalhe
 * documentada, não escalada: `ROUTES.restricoes` reserva só uma única rota
 * (`/restricoes`, sem uma sub-rota "novo" equivalente a
 * `ROUTES.novoAtleta`), e o próprio wireframe de T10 mostra o botão
 * "+ Nova restrição" abrindo um formulário simples de dois campos sobre a
 * mesma tela — mesmo padrão já usado pelo modal de duplicidade de
 * `AtletaForm` (FE-04) e por `SubstituicoesModal` (FE-11) para formulários
 * curtos que não justificam uma rota própria.
 *
 * Mesmo componente para criação e edição (`restricao` presente = edição,
 * RF-05.5 "editar" — nunca altera `ativo`/`desativado_em`, mecanismo
 * exclusivo de `POST .../desativar`/`.../reativar` em `RestricoesList`).
 *
 * **Decisão de detalhe documentada, não escalada**: os dois seletores usam
 * só atletas `ativo` como opções de busca — mas, ao editar um par cujo
 * `atleta_a_id`/`atleta_b_id` aponte para um atleta que tenha se tornado
 * inativo/anonimizado depois que a restrição foi criada, aquele nome
 * (`atleta_a_nome`/`atleta_b_nome`, já resolvido pelo próprio
 * `RestricaoObrigatoriaResponse`) continua aparecendo como opção só para
 * aquele campo específico do par em edição — nunca um campo em branco
 * escondendo silenciosamente qual atleta estava de fato selecionado
 * (TASK.md Seção 1.0, nunca lacuna silenciosa). Um atleta inativo não é
 * oferecido como opção nova para nenhum outro campo/nova restrição.
 */
export function RestricaoFormModal({
  open,
  restricao,
  atletas,
  onClose,
  onSaved,
}: RestricaoFormModalProps) {
  const handleSessionExpired = useHandleSessionExpired();

  const [atletaAId, setAtletaAId] = useState("");
  const [atletaBId, setAtletaBId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setAtletaAId(restricao?.atleta_a_id ?? "");
    setAtletaBId(restricao?.atleta_b_id ?? "");
    setFormError(null);
    setFieldErrors({});
    setSubmitting(false);
    // Só deve reinicializar quando a modal abre (ou troca de alvo) — nunca a
    // cada re-render por causa de `atletas`/`restricao` mudarem de
    // identidade entre renders do componente pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restricao?.id]);

  const baseOptions = useMemo(
    () =>
      atletas
        .filter((atleta) => atleta.ativo)
        .map((atleta) => ({ value: atleta.id, label: atleta.apelido_exibicao }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [atletas],
  );

  function optionsIncluindoAtual(currentId?: string, currentNome?: string) {
    if (!currentId || baseOptions.some((option) => option.value === currentId)) {
      return baseOptions;
    }
    return [...baseOptions, { value: currentId, label: currentNome ?? currentId }];
  }

  const opcoesAtletaA = optionsIncluindoAtual(
    restricao?.atleta_a_id,
    restricao?.atleta_a_nome,
  );
  const opcoesAtletaB = optionsIncluindoAtual(
    restricao?.atleta_b_id,
    restricao?.atleta_b_nome,
  );

  const mesmoAtleta = atletaAId !== "" && atletaAId === atletaBId;

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    if (!atletaAId) errors.atleta_a_id = "Selecione um atleta.";
    if (!atletaBId) errors.atleta_b_id = "Selecione um atleta.";
    if (mesmoAtleta) errors.atleta_b_id = ATLETAS_DISTINTOS_MENSAGEM;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const body: RestricaoBody = { atleta_a_id: atletaAId, atleta_b_id: atletaBId };
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const salva = restricao
        ? await atualizarRestricao(restricao.id, body)
        : await criarRestricao(body);
      onSaved(salva);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof SessionExpiredError) {
        handleSessionExpired({ unsavedData: body });
        return;
      }
      if (err instanceof RestricaoValidationError) {
        const novosErros: Record<string, string> = {};
        for (const item of err.detalhes) {
          const key = String(item.path[0] ?? "");
          if (key) novosErros[key] = item.message;
        }
        setFieldErrors(novosErros);
        if (Object.keys(novosErros).length === 0) {
          setFormError(SALVAR_RESTRICAO_ERROR_MESSAGE);
        }
        return;
      }
      if (
        err instanceof RestricaoAtletaNaoEncontradoError ||
        err instanceof RestricaoNaoEncontradaError ||
        err instanceof RestricaoApiError
      ) {
        setFormError(SALVAR_RESTRICAO_ERROR_MESSAGE);
        return;
      }
      setFormError(SALVAR_RESTRICAO_ERROR_MESSAGE);
    }
  }

  return (
    <Modal
      open={open}
      title={restricao ? "Editar restrição" : "Nova restrição"}
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="button" loading={submitting} onClick={handleSubmit}>
            Salvar
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Combobox
          label="Atleta A"
          required
          placeholder="Digite o nome do atleta"
          options={opcoesAtletaA}
          value={atletaAId}
          onChange={setAtletaAId}
          error={fieldErrors.atleta_a_id}
          disabled={submitting}
        />
        <Combobox
          label="Atleta B"
          required
          placeholder="Digite o nome do atleta"
          options={opcoesAtletaB}
          value={atletaBId}
          onChange={setAtletaBId}
          error={fieldErrors.atleta_b_id}
          disabled={submitting}
        />
        {formError && <AlertBanner variant="danger">{formError}</AlertBanner>}
      </div>
    </Modal>
  );
}
