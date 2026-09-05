"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertBanner,
  Button,
  EmptyState,
  Modal,
  Select,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import { labelDoTime, rosterAtualDoTime } from "./substituicoes";
import {
  CARREGAR_SUBSTITUICOES_ERROR_MESSAGE,
  REGISTRAR_SUBSTITUICAO_ERROR_MESSAGE,
  SubstituicaoApiError,
  listarSubstituicoes,
  registrarSubstituicao,
} from "./substituicoesApi";
import type { Substituicao, TimeConfirmado } from "./types";
import styles from "./SubstituicoesModal.module.css";

export interface SubstituicoesModalProps {
  open: boolean;
  rodadaId: string;
  /** Time em cujo contexto o organizador abriu esta tela ("← Substituições — Time A") — origem dos candidatos de "Sai". */
  timeAtual: TimeConfirmado;
  /**
   * Todos os times confirmados da rodada — usado só para resolver o rótulo
   * de cada substituição na lista "Substituições registradas" (ver
   * `labelDoTime`, `substituicoes.ts`), que mostra o histórico completo da
   * rodada (todos os times), não só do `timeAtual`.
   */
  times: TimeConfirmado[];
  onClose: () => void;
}

type CarregamentoState =
  { status: "carregando" } | { status: "erro" } | { status: "pronto" };

const EMPTY_MESSAGE = "Nenhuma substituição registrada nesta rodada";

/**
 * T11 — Substituição no Intervalo (`UX-SPEC.md` Seção 2/4/5.2/7.1; TASK.md
 * FE-11) — integração contra a API **real** (`BE-13`, `Concluída`/aprovada
 * pelo QA; nenhuma pendência de mock). Implementada como `Modal` (design
 * system, `UX-SPEC.md` Seção 3.2) aberto a partir de T09
 * (`TimesResultado.tsx`) — "sub-tela/modal de T09" é a redação literal da
 * própria Seção 1.1 do `UX-SPEC.md` para T11, então o `onClose` do `Modal`
 * cumpre o papel do "←" do wireframe (volta para o resultado de T09), sem
 * precisar de uma rota própria nem de um novo endpoint de leitura (decisão
 * de detalhe documentada, não escalada — ver nota completa em
 * `TimesResultado.tsx`).
 *
 * **Auditoria de redesenho (`FE-R11`, reestimativa "leve" — `TASK.md` Parte
 * II Seção 3.2)**: confirmado que nenhuma mudança de código era necessária
 * aqui. `SubstituicoesModal.module.css` só referencia custom properties
 * (`var(--color-...)`/`var(--spacing-...)`/`var(--font-...)`), nenhum hex
 * hardcoded — a substituição atômica de tokens já aplicada por `FE-R00` em
 * `tokens.css` (`--color-primary`, tipografia `Public Sans`/`Bebas Neue`/
 * `JetBrains Mono` via `next/font/google`, etc.) já se propaga
 * automaticamente para esta tela, mesmo padrão de "repintura sem esforço"
 * já registrado por `FE-R03`. `Modal`/`Select`/`Button`/`AlertBanner`/
 * `EmptyState`/`Skeleton`/`SkeletonGroup` (todos usados aqui) já passaram
 * pelo `accessibility-review` obrigatório de `FE-R00` (Seção 1.2-R) contra
 * os novos tokens — nenhum deles expõe cor própria fora de `tokens.css`.
 * `TopNav`/`BottomTabBar` (repintura para `--color-brand-navy`, `UX-SPEC.md`
 * Seção 6.2-R) ainda não foi implementada por nenhuma tarefa `FE-R0x` até
 * esta data (mesma constatação já registrada pela nota de fechamento de
 * `FE-R12`) — quando isso acontecer, esta tela herdará o chrome novo sem
 * mudança própria, por não compor `TopNav`/`BottomTabBar` diretamente (só o
 * `Modal` do design system). Nenhum emoji é usado neste componente (fora do
 * escopo de substituição por `Icon` da Seção 1.4-R) e nenhum texto cita
 * "Time A"/"Time B" hardcoded — `timeAtual.label`/`labelDoTime(times, ...)`
 * já eram genéricos antes desta tarefa (confirmado pela nota de fechamento
 * de `FE-R09`), continuam corretos com os rótulos reais "Colete"/"Sem
 * Colete" persistidos a partir daquela tarefa.
 *
 * **Decisão de composição em aberto, resolvida (não escalada)**: avaliado
 * reaproveitar `PlayerChip` (design system, introduzido por `FE-R09`) no
 * lugar dos `Select` de "Sai"/"Entra" — descartado. `PlayerChip` modela um
 * jogador posicionado dentro do `PitchBackground` (pin+nome+posição,
 * `aria-label` de "trocar"), não uma lista de opções selecionáveis por
 * teclado/rótulo nativo de formulário; adaptá-lo aqui exigiria uma
 * composição de lista de seleção própria (roving tabindex, estado
 * selecionado/geral, teste de acessibilidade dedicado) — exatamente o tipo
 * de "composição própria adicional" que a própria linha de `FE-R11` no
 * `TASK.md` explicitamente exclui do escopo ("aplicação leve... nenhuma
 * composição própria adicional"). O `Select` nativo já cobre o critério de
 * aceite literal (bloqueio acessível de "mesmo atleta em sai/entra") sem
 * essa composição nova, então foi mantido — mudança de composição fica em
 * aberto para uma iniciativa futura caso o organizador queira reabrir esse
 * escopo.
 */
export function SubstituicoesModal({
  open,
  rodadaId,
  timeAtual,
  times,
  onClose,
}: SubstituicoesModalProps) {
  const { showToast } = useToast();
  const handleSessionExpired = useHandleSessionExpired();

  const [carregamento, setCarregamento] = useState<CarregamentoState>({
    status: "carregando",
  });
  const [substituicoes, setSubstituicoes] = useState<Substituicao[]>([]);
  const [candidatosAtivos, setCandidatosAtivos] = useState<
    { id: string; nome: string }[]
  >([]);
  const [saiId, setSaiId] = useState("");
  const [entraId, setEntraId] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [erroRegistro, setErroRegistro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregamento({ status: "carregando" });
    Promise.all([listarSubstituicoes(rodadaId), fetchAtletas()])
      .then(([listaSubstituicoes, atletas]) => {
        setSubstituicoes(listaSubstituicoes);
        setCandidatosAtivos(
          atletas
            .filter((atleta) => atleta.ativo)
            .map((atleta) => ({ id: atleta.id, nome: atleta.apelido_exibicao })),
        );
        setCarregamento({ status: "pronto" });
      })
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setCarregamento({ status: "erro" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodadaId]);

  useEffect(() => {
    if (!open) return;
    setSaiId("");
    setEntraId("");
    setErroRegistro(null);
    carregar();
    // Recarrega sempre que a modal reabre (possivelmente para outro time) —
    // mesmo racional de `MontagemTimesShell`/`AtletasList` (carrega na
    // montagem, não a cada re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timeAtual.time_id]);

  const roster = useMemo(
    () => rosterAtualDoTime(timeAtual, substituicoes),
    [timeAtual, substituicoes],
  );

  /**
   * "Entra" lista TODO atleta ativo (inclui o "banco" do wireframe, mas
   * também, deliberadamente, quem já está no roster deste time) —
   * `API-CONTRACT.yaml`/BE-13 não restringe a origem de `atleta_entra_id` a
   * nenhum grupo específico, e o critério de aceite literal de FE-11 exige
   * um bloqueio ACESSÍVEL (mensagem clara) ao selecionar o mesmo atleta em
   * "sai"/"entra" — isso só é alcançável pela UI se os dois seletores
   * puderem, de fato, apresentar o mesmo atleta como opção (decisão de
   * detalhe documentada, não escalada: filtrar "Entra" para excluir o
   * roster tornaria esse cenário irreproduzível pela interface, escondendo
   * a validação em vez de expô-la).
   */
  const mesmoAtleta = saiId !== "" && saiId === entraId;

  async function handleRegistrar() {
    if (!saiId || !entraId || mesmoAtleta) return;
    setRegistrando(true);
    setErroRegistro(null);
    try {
      const nova = await registrarSubstituicao(rodadaId, {
        time_id: timeAtual.time_id,
        atleta_sai_id: saiId,
        atleta_entra_id: entraId,
      });
      setSubstituicoes((current) => [...current, nova]);
      setSaiId("");
      setEntraId("");
      setRegistrando(false);
      showToast({ variant: "success", message: "Substituição registrada." });
    } catch (err) {
      setRegistrando(false);
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      setErroRegistro(
        err instanceof SubstituicaoApiError
          ? err.message
          : REGISTRAR_SUBSTITUICAO_ERROR_MESSAGE,
      );
    }
  }

  /**
   * "+ Registrar outra" (critério de aceite literal de FE-11: "sempre
   * disponível", RF-06.2 — sem limite de quantidade). Decisão de detalhe
   * documentada (não escalada): o formulário "Sai"/"Entra" já permanece
   * sempre visível/utilizável (nunca se esconde após um registro bem
   * sucedido, que só limpa os dois campos) — este botão existe como
   * afordance explícita adicional pedida pelo wireframe, reposicionando o
   * foco de volta ao campo "Sai" para o próximo registro (garante que o
   * controle "sempre disponível" tenha um efeito perceptível mesmo quando os
   * campos já estão vazios).
   */
  function handleRegistrarOutra() {
    setSaiId("");
    setEntraId("");
    setErroRegistro(null);
    document.getElementById(`substituicoes-sai-${timeAtual.time_id}`)?.focus();
  }

  return (
    <Modal open={open} title={`Substituições — ${timeAtual.label}`} onClose={onClose}>
      <div className={styles.wrapper}>
        <p className={styles.aviso}>
          Substituição não altera pontos, apenas registro histórico.
        </p>

        {carregamento.status === "carregando" && (
          <SkeletonGroup label="Carregando substituições">
            <Skeleton height={44} />
            <Skeleton height={44} />
          </SkeletonGroup>
        )}

        {carregamento.status === "erro" && (
          <div className={styles.errorWrapper}>
            <AlertBanner variant="danger">
              {CARREGAR_SUBSTITUICOES_ERROR_MESSAGE}
            </AlertBanner>
            <Button variant="secondary" onClick={carregar}>
              Tentar novamente
            </Button>
          </div>
        )}

        {carregamento.status === "pronto" && (
          <>
            <div className={styles.form}>
              <Select
                id={`substituicoes-sai-${timeAtual.time_id}`}
                label="Sai"
                placeholder="Selecione quem sai"
                value={saiId}
                onChange={(event) => setSaiId(event.target.value)}
                options={roster.map((atleta) => ({
                  value: atleta.atleta_id,
                  label: atleta.apelido_exibicao,
                }))}
              />
              <Select
                label="Entra"
                placeholder="Selecione quem entra"
                value={entraId}
                onChange={(event) => setEntraId(event.target.value)}
                error={
                  mesmoAtleta
                    ? "Escolha um atleta diferente do que já está saindo."
                    : undefined
                }
                options={candidatosAtivos.map((atleta) => ({
                  value: atleta.id,
                  label: atleta.nome,
                }))}
              />
              {erroRegistro && <AlertBanner variant="danger">{erroRegistro}</AlertBanner>}
              <Button
                loading={registrando}
                disabled={!saiId || !entraId || mesmoAtleta}
                onClick={handleRegistrar}
              >
                Registrar Substituição
              </Button>
            </div>

            <div className={styles.lista}>
              <h3 className={styles.listaTitulo}>Substituições registradas</h3>
              {substituicoes.length === 0 ? (
                <EmptyState title={EMPTY_MESSAGE} />
              ) : (
                <ul className={styles.substituicaoList}>
                  {substituicoes.map((sub) => (
                    <li key={sub.id} className={styles.substituicaoItem}>
                      {sub.atleta_sai_nome} ↔ {sub.atleta_entra_nome} (
                      {labelDoTime(times, sub.time_id)})
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="secondary" onClick={handleRegistrarOutra}>
                + Registrar outra
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
