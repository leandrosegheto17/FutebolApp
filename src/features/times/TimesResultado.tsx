"use client";

import { useState } from "react";
import {
  AlertBanner,
  Button,
  PitchBackground,
  PitchPlayerList,
  PitchTeamHeader,
  PlayerChip,
} from "@/components/ui";
import {
  formatDiferenca,
  formatTitulares,
  labelParaIndice,
  posicaoDecorativa,
  restricoesRespeitadas,
  sumNivelTecnico,
  type RestricaoAtivaConsulta,
} from "./times";
import { TrocarJogadorModal, type TrocarJogadorCandidato } from "./TrocarJogadorModal";
import { SubstituicoesModal } from "./SubstituicoesModal";
import type { TimeConfirmado, TimeMontado, TimesConfirmados } from "./types";
import styles from "./TimesResultado.module.css";

export interface TimesResultadoProps {
  times: TimeMontado[];
  onSwap: (atletaIdA: string, atletaIdB: string) => void;
  onConfirmar: () => void;
  confirmando: boolean;
  /** `true` quando a divisão atual veio do fallback local de "Gerar mesmo assim" (`times.ts`). */
  origemFallback: boolean;
  /**
   * `id` da rodada atual — necessário só para abrir T11 (`POST/GET
   * /api/rodadas/{id}/substituicoes`, BE-13).
   */
  rodadaId: string;
  /**
   * Divisão já persistida (`POST /api/rodadas/{id}/times`, BE-13) — `null`
   * antes da primeira confirmação. T11 só fica acessível depois de existir
   * (UX-SPEC.md Seção 2, "Acessível a partir de T09, quando a rodada está em
   * andamento (times já definidos)"): antes da confirmação nenhum `time_id`
   * real existe para `SubstituicaoBody.time_id` referenciar.
   */
  confirmados: TimesConfirmados | null;
  /**
   * Restrições ativas do grupo (`GET /api/restricoes`, BE-12, já publicado
   * para T10) — usadas só para o banner "✓ Restrição respeitada"
   * (`restricoesRespeitadas`, `times.ts`); `[]` é um valor válido (nenhum
   * banner aparece, nunca um erro).
   */
  restricoes: RestricaoAtivaConsulta[];
  /** "🔄 Novo sorteio" (UX-SPEC.md Parte II Seção 2.6, correção 5) — regenera a divisão sem sair desta tela. */
  onNovoSorteio: () => void;
  novoSorteioCarregando: boolean;
}

const FORMACAO_DECORATIVA = "4-3-3";

function formatPontos(soma: number | null): string {
  return soma === null ? "— pts" : `${soma} pts`;
}

/**
 * Resultado de T09 — "Times exibidos lado a lado + indicadores de
 * equilíbrio" (UX-SPEC.md Seção 4, coluna Sucesso; Parte II Seção 2.6 —
 * "reescrito... mudança mais profunda desta iniciativa"). Composição via
 * `PitchBackground`/`PlayerChip` (CSS Grid/Flexbox, `ADR-014`) — nenhuma
 * mudança de contrato de API/heurística (`ADR-007`/`ADR-010` inalterados,
 * `times`/`onSwap` continuam a mesma forma de dado e a mesma função de troca
 * já existentes).
 *
 * Empilhado em `base` (Colete acima, Sem Colete abaixo) e lado a lado a
 * partir de `lg` (`PitchBackground.module.css`, UX-SPEC.md Parte II Seção
 * 6.2). "Trocar jogador" (RF-05.4) continua sendo o seletor modal — clique/
 * toque em qualquer `PlayerChip` abre o mesmo `TrocarJogadorModal` de antes,
 * em qualquer viewport (RF-D01/RN-D03, interação não reaberta); em `lg`, o
 * HTML5 DnD nativo de `PlayerChip` é só um atalho adicional para o mesmo
 * efeito (`onSwap`), nunca a única forma de trocar.
 */
export function TimesResultado({
  times,
  onSwap,
  onConfirmar,
  confirmando,
  origemFallback,
  rodadaId,
  confirmados,
  restricoes,
  onNovoSorteio,
  novoSorteioCarregando,
}: TimesResultadoProps) {
  const [trocaOrigem, setTrocaOrigem] = useState<{
    atletaId: string;
    apelido: string;
    indiceTime: number;
  } | null>(null);
  const [substituicaoTime, setSubstituicaoTime] = useState<TimeConfirmado | null>(null);

  const timeColete = times.find((time) => time.indice === 0) ?? null;
  const timeSemColete = times.find((time) => time.indice === 1) ?? null;

  const atletaEmTroca = trocaOrigem
    ? (times
        .find((time) => time.indice === trocaOrigem.indiceTime)
        ?.atletas.find((atleta) => atleta.atleta_id === trocaOrigem.atletaId) ?? null)
    : null;

  const candidatos: TrocarJogadorCandidato[] = trocaOrigem
    ? times
        .filter((time) => time.indice !== trocaOrigem.indiceTime)
        .flatMap((time) =>
          time.atletas.map((atleta) => ({ atleta, indiceTime: time.indice })),
        )
    : [];

  function handleSelect(candidatoId: string) {
    if (trocaOrigem) {
      onSwap(trocaOrigem.atletaId, candidatoId);
    }
    setTrocaOrigem(null);
  }

  function handleAbrirTroca(atletaId: string, apelido: string, indiceTime: number) {
    setTrocaOrigem({ atletaId, apelido, indiceTime });
  }

  const respeitadas = restricoesRespeitadas(times, restricoes);

  return (
    <div className={styles.wrapper}>
      {origemFallback && (
        <AlertBanner variant="warning">
          Esta divisão foi gerada ignorando as restrições obrigatórias em conflito —
          revise os times manualmente antes de confirmar.
        </AlertBanner>
      )}

      <PitchBackground
        formacao={FORMACAO_DECORATIVA}
        colete={
          <>
            <PitchTeamHeader
              nome={labelParaIndice(0)}
              pontos={formatPontos(sumNivelTecnico(timeColete?.atletas ?? []))}
            />
            <PitchPlayerList>
              {(timeColete?.atletas ?? []).map((atleta, indice) => (
                <PlayerChip
                  key={atleta.atleta_id}
                  atletaId={atleta.atleta_id}
                  nome={atleta.apelido_exibicao}
                  nivelTecnico={atleta.nivel_tecnico}
                  posicao={posicaoDecorativa(indice)}
                  onClick={() =>
                    handleAbrirTroca(atleta.atleta_id, atleta.apelido_exibicao, 0)
                  }
                  onDropAtleta={(idArrastado) => onSwap(idArrastado, atleta.atleta_id)}
                />
              ))}
            </PitchPlayerList>
          </>
        }
        semColete={
          <>
            <PitchTeamHeader
              nome={labelParaIndice(1)}
              pontos={formatPontos(sumNivelTecnico(timeSemColete?.atletas ?? []))}
            />
            <PitchPlayerList>
              {(timeSemColete?.atletas ?? []).map((atleta, indice) => (
                <PlayerChip
                  key={atleta.atleta_id}
                  atletaId={atleta.atleta_id}
                  nome={atleta.apelido_exibicao}
                  nivelTecnico={atleta.nivel_tecnico}
                  posicao={posicaoDecorativa(indice)}
                  onClick={() =>
                    handleAbrirTroca(atleta.atleta_id, atleta.apelido_exibicao, 1)
                  }
                  onDropAtleta={(idArrastado) => onSwap(idArrastado, atleta.atleta_id)}
                />
              ))}
            </PitchPlayerList>
          </>
        }
      />

      {/* Painel de equilíbrio reformulado — "diferença" entre os times, não
          mais duas médias lado a lado (UX-SPEC.md Parte II Seção 2.6,
          correção 2). Continua satisfazendo RF-05.3 (mesmo dado agregado por
          time, só exibido como diferença/soma em vez de duas médias). */}
      <div className={styles.balanceStrip}>
        <div className={styles.balanceTile}>
          <span className={styles.balanceLabel}>Dif. pontos</span>
          <span className={styles.balanceValue}>
            {formatDiferenca(
              sumNivelTecnico(timeColete?.atletas ?? []),
              sumNivelTecnico(timeSemColete?.atletas ?? []),
              0,
            )}
          </span>
        </div>
        <div className={styles.balanceTile}>
          <span className={styles.balanceLabel}>Dif. idade</span>
          <span className={styles.balanceValue}>
            {formatDiferenca(
              timeColete?.idade_media ?? null,
              timeSemColete?.idade_media ?? null,
              1,
              "a",
            )}
          </span>
        </div>
        <div className={styles.balanceTile}>
          <span className={styles.balanceLabel}>Titulares</span>
          <span className={styles.balanceValue}>{formatTitulares(times)}</span>
        </div>
      </div>

      {respeitadas.length > 0 && (
        <AlertBanner variant="success">
          <ul className={styles.respeitadaList}>
            {respeitadas.map((par) => (
              <li key={`${par.atletaANome}-${par.atletaBNome}`}>
                <span aria-hidden="true">✓ </span>
                Restrição respeitada: {par.atletaANome} e {par.atletaBNome} não jogam no
                mesmo time.
              </li>
            ))}
          </ul>
        </AlertBanner>
      )}

      <div className={styles.acoes}>
        <Button loading={confirmando} onClick={onConfirmar}>
          Confirmar Times
        </Button>
        <Button variant="secondary" loading={novoSorteioCarregando} onClick={onNovoSorteio}>
          <span aria-hidden="true">🔄 </span>
          Novo sorteio
        </Button>
      </div>

      {confirmados && confirmados.times.length > 0 && (
        <div className={styles.substituicoesAcoes}>
          {confirmados.times.map((timeConfirmado) => (
            <Button
              key={timeConfirmado.time_id}
              variant="secondary"
              onClick={() => setSubstituicaoTime(timeConfirmado)}
            >
              Substituições — {timeConfirmado.label}
            </Button>
          ))}
        </div>
      )}

      <TrocarJogadorModal
        open={trocaOrigem !== null}
        atleta={atletaEmTroca}
        candidatos={candidatos}
        onClose={() => setTrocaOrigem(null)}
        onSelect={handleSelect}
      />

      {confirmados && substituicaoTime && (
        <SubstituicoesModal
          open={substituicaoTime !== null}
          rodadaId={rodadaId}
          timeAtual={substituicaoTime}
          times={confirmados.times}
          onClose={() => setSubstituicaoTime(null)}
        />
      )}
    </div>
  );
}
