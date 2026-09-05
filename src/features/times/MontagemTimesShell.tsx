"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertBanner,
  Button,
  ConflictList,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { formatDataExibicao } from "@/features/rodadas/format";
import { listarRestricoes } from "@/features/restricoes/restricoesApi";
import type { Restricao } from "@/features/restricoes/types";
import { PresencaSelecao } from "./PresencaSelecao";
import { TimesResultado } from "./TimesResultado";
import {
  QUANTIDADE_TIMES,
  buildConfirmarTimesInput,
  buildRoundRobinTimes,
  swapAtletas,
} from "./times";
import {
  CONFIRMAR_TIMES_ERROR_MESSAGE,
  GERAR_SUGESTAO_ERROR_MESSAGE,
  RODADA_ATUAL_ERROR_MESSAGE,
  buscarPresentesDaRodada,
  buscarRodadaAtual,
  confirmarTimes,
  gerarSugestao,
} from "./timesApi";
import type {
  ParticipacaoPresente,
  RodadaResumo,
  SugestaoTimesConflito,
  TimeMontado,
  TimesConfirmados,
} from "./types";
import styles from "./MontagemTimesShell.module.css";

type CarregamentoState =
  { status: "carregando" } | { status: "erro"; message: string } | { status: "pronto" };

type Fase = "selecao" | "conflito" | "resultado";

const SEM_RODADA_MESSAGE = "Lance uma rodada antes de montar os times.";

/**
 * T09 — Montagem de Times (`UX-SPEC.md` Seção 2/4; TASK.md FE-09) —
 * integração contra as APIs **reais** (`BE-11`/`BE-13`/`BE-16`, todas
 * `Concluída`; nenhuma pendência de mock).
 *
 * **Escolha da "rodada atual" (decisão de detalhe, documentada, não
 * escalada)**: nem o `UX-SPEC.md` (wireframe mostra só um cabeçalho fixo
 * "Times — Rodada 05/09/2026") nem o `TASK.md` definem como T09 escolhe a
 * rodada quando o organizador chega pelo item de navegação "Times" (destino
 * de primeiro nível, não uma rota `/rodadas/{id}/...`). `POST
 * /api/times/sugestao` (BE-11) é deliberadamente desacoplado de
 * `rodada_id` ("evita acoplar a montagem de times à existência de uma
 * rodada já lançada", nota de status de BE-11), mas `POST
 * /api/rodadas/{id}/times` (BE-13, "Confirmar Times") exige um `rodada_id`.
 * Resolução: a rodada `status: "lancada"` mais recente (`buscarRodadaAtual`,
 * `timesApi.ts`) fornece tanto o contexto de cabeçalho quanto o
 * pré-preenchimento de presentes (via `GET /api/rodadas/{id}`, BE-16) — se
 * nenhuma rodada lançada existir, mesmo padrão de dependência já usado por
 * `FE-05` para "nenhum atleta ativo": toast de aviso + redireciona para T05.
 */
export function MontagemTimesShell() {
  const router = useRouter();
  const { showToast } = useToast();
  const handleSessionExpired = useHandleSessionExpired();

  const [carregamento, setCarregamento] = useState<CarregamentoState>({
    status: "carregando",
  });
  const [rodada, setRodada] = useState<RodadaResumo | null>(null);
  const [presentes, setPresentes] = useState<ParticipacaoPresente[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const [fase, setFase] = useState<Fase>("selecao");
  const [gerando, setGerando] = useState(false);
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const [conflito, setConflito] = useState<SugestaoTimesConflito | null>(null);
  const [times, setTimes] = useState<TimeMontado[] | null>(null);
  const [origemFallback, setOrigemFallback] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  /**
   * Divisão já persistida (`POST /api/rodadas/{id}/times`, BE-13) — só
   * existe depois de "Confirmar Times" ter tido sucesso ao menos uma vez.
   * Necessária para T11 (FE-11): `SubstituicaoBody.time_id` referencia um
   * `app.time` real, que só existe a partir daqui (`TrocarJogadorModal`/
   * "Trocar" continuam operando sobre `times`, em memória, mesmo depois da
   * confirmação — se o organizador trocar de novo sem reconfirmar, T11
   * continua servindo a última divisão de fato persistida, nunca a troca
   * ainda não confirmada, que o servidor desconhece).
   */
  const [confirmados, setConfirmados] = useState<TimesConfirmados | null>(null);
  /**
   * Restrições ativas do grupo (`GET /api/restricoes`, BE-12) — só
   * alimentam o banner "✓ Restrição respeitada" (`TimesResultado.tsx`,
   * UX-SPEC.md Parte II Seção 2.6, correção 4), nunca a heurística de
   * montagem em si (`ADR-007`/`ADR-010` inalterados). Decisão de detalhe
   * (documentada, não escalada): carregada junto com a rodada/presentes,
   * mas com tratamento de erro isolado — uma falha aqui não deve impedir o
   * fluxo principal de T09 (gerar/confirmar times), só faz o banner nunca
   * aparecer (`[]`), degradação aceitável para um dado auxiliar/explicativo.
   */
  const [restricoes, setRestricoes] = useState<Restricao[]>([]);

  const carregar = useCallback(() => {
    setCarregamento({ status: "carregando" });
    buscarRodadaAtual()
      .then(async (rodadaAtual) => {
        if (!rodadaAtual) {
          showToast({ variant: "warning", message: SEM_RODADA_MESSAGE });
          router.replace(ROUTES.lancamentoRodada);
          return;
        }
        const presentesRodada = await buscarPresentesDaRodada(rodadaAtual.id);
        setRodada(rodadaAtual);
        setPresentes(presentesRodada);
        setSelecionados(new Set(presentesRodada.map((item) => item.atleta_id)));
        setCarregamento({ status: "pronto" });
      })
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setCarregamento({
          status: "erro",
          message: err instanceof Error ? err.message : RODADA_ATUAL_ERROR_MESSAGE,
        });
      });
    listarRestricoes()
      .then(setRestricoes)
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        // Degradação silenciosa deliberada — ver comentário do estado `restricoes` acima.
        setRestricoes([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSessionExpired, router, showToast]);

  useEffect(() => {
    carregar();
    // Só deve rodar na montagem — mesmo racional de `AtletaForm`/`LancamentoRodadaForm`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggle(atletaId: string, selecionado: boolean) {
    setSelecionados((current) => {
      const proximo = new Set(current);
      if (selecionado) proximo.add(atletaId);
      else proximo.delete(atletaId);
      return proximo;
    });
  }

  async function handleGerar() {
    setGerando(true);
    setErroGeracao(null);
    try {
      const resultado = await gerarSugestao(Array.from(selecionados), QUANTIDADE_TIMES);
      setGerando(false);
      if (resultado.status === "conflito") {
        setConflito(resultado);
        setFase("conflito");
        return;
      }
      setTimes(resultado.times);
      setOrigemFallback(false);
      // Uma nova sugestão gerada torna qualquer confirmação anterior obsoleta
      // (FE-11 — "Substituições" só deve referenciar a divisão de fato
      // persistida mais recente; sem isso, o botão continuaria visível
      // apontando para `time_id`s de uma divisão que talvez nem exista mais
      // na tela atual).
      setConfirmados(null);
      setFase("resultado");
    } catch (err) {
      setGerando(false);
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      setErroGeracao(err instanceof Error ? err.message : GERAR_SUGESTAO_ERROR_MESSAGE);
    }
  }

  function handleAjustarPresentes() {
    setConflito(null);
    setFase("selecao");
  }

  function handleGerarMesmoAssim() {
    const presentesSelecionados = presentes.filter((item) =>
      selecionados.has(item.atleta_id),
    );
    setTimes(buildRoundRobinTimes(presentesSelecionados, QUANTIDADE_TIMES));
    setOrigemFallback(true);
    setConfirmados(null);
    setConflito(null);
    setFase("resultado");
  }

  function handleSwap(atletaIdA: string, atletaIdB: string) {
    setTimes((current) =>
      current ? swapAtletas(current, atletaIdA, atletaIdB) : current,
    );
  }

  async function handleConfirmar() {
    if (!rodada || !times) return;
    setConfirmando(true);
    try {
      const resultado = await confirmarTimes(rodada.id, buildConfirmarTimesInput(times));
      setConfirmados(resultado);
      setConfirmando(false);
      showToast({ variant: "success", message: "Divisão de times confirmada." });
    } catch (err) {
      setConfirmando(false);
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      showToast({
        variant: "danger",
        message: err instanceof Error ? err.message : CONFIRMAR_TIMES_ERROR_MESSAGE,
      });
    }
  }

  if (carregamento.status === "carregando") {
    return (
      <SkeletonGroup label="Carregando rodada atual" className={styles.page}>
        <Skeleton height={32} width={240} />
        <Skeleton height={44} />
        <Skeleton height={44} />
        <Skeleton height={44} />
      </SkeletonGroup>
    );
  }

  if (carregamento.status === "erro") {
    return (
      <div className={styles.errorWrapper}>
        <AlertBanner variant="danger">{carregamento.message}</AlertBanner>
        <Button variant="secondary" onClick={carregar}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!rodada) return null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Times — Rodada {formatDataExibicao(rodada.data)}</h1>

      {fase === "selecao" && (
        <PresencaSelecao
          rodadaDataExibida={formatDataExibicao(rodada.data)}
          presentes={presentes}
          selecionados={selecionados}
          onToggle={handleToggle}
          onGerar={handleGerar}
          gerando={gerando}
          erroGeracao={erroGeracao}
        />
      )}

      {fase === "conflito" && conflito && (
        <div className={styles.conflitoWrapper}>
          <p className={styles.conflitoIntro}>
            <span aria-hidden="true">⚠ </span>
            Não foi possível gerar uma divisão que satisfaça todas as restrições
            obrigatórias.
          </p>
          <ConflictList
            pares={conflito.restricoes_conflitantes.map((par) => ({
              id: par.restricao_id,
              atletaANome: par.atleta_a_nome,
              atletaBNome: par.atleta_b_nome,
              grupoConflito: par.grupo_conflito,
            }))}
            grupos={conflito.grupos_conflito.map((grupo) => ({
              grupoConflito: grupo.grupo_conflito,
              mensagem: grupo.mensagem,
            }))}
          />
          <div className={styles.conflitoAcoes}>
            <Button variant="secondary" onClick={handleAjustarPresentes}>
              Ajustar lista de presentes
            </Button>
            <Button variant="danger" onClick={handleGerarMesmoAssim}>
              Gerar mesmo assim, ciente do conflito
            </Button>
          </div>
        </div>
      )}

      {fase === "resultado" && times && (
        <>
          {/* "Novo sorteio" (correção 5, Seção 2.6) reusa `handleGerar` — uma
              falha aqui (ex.: timeout do backtracking) precisa de feedback
              visível também nesta fase, não só na fase "selecao" (onde
              `PresencaSelecao` já mostra `erroGeracao` internamente). */}
          {erroGeracao && <AlertBanner variant="danger">{erroGeracao}</AlertBanner>}
          <TimesResultado
            times={times}
            onSwap={handleSwap}
            onConfirmar={handleConfirmar}
            confirmando={confirmando}
            origemFallback={origemFallback}
            rodadaId={rodada.id}
            confirmados={confirmados}
            restricoes={restricoes}
            onNovoSorteio={handleGerar}
            novoSorteioCarregando={gerando}
          />
        </>
      )}
    </div>
  );
}
