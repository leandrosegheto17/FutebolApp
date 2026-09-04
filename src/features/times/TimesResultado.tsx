"use client";

import { useState } from "react";
import { AlertBanner, Button, Card, CardHeader } from "@/components/ui";
import { labelParaIndice } from "./times";
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
}

function formatNumero(valor: number | null, casas: number): string {
  return valor === null ? "—" : valor.toFixed(casas);
}

/**
 * Resultado de T09 — "Times exibidos lado a lado + indicadores de
 * equilíbrio" (UX-SPEC.md Seção 4, coluna Sucesso). Layout fixo em 2 colunas
 * nesta release (TASK.md Seção 6.2 item 1): empilhado em `base`
 * (`TimesResultado.module.css`), lado a lado a partir de `lg` (UX-SPEC.md
 * Seção 6.2, "T09 Montagem de Times").
 */
export function TimesResultado({
  times,
  onSwap,
  onConfirmar,
  confirmando,
  origemFallback,
  rodadaId,
  confirmados,
}: TimesResultadoProps) {
  const [trocaOrigem, setTrocaOrigem] = useState<{
    atletaId: string;
    apelido: string;
    indiceTime: number;
  } | null>(null);
  const [substituicaoTime, setSubstituicaoTime] = useState<TimeConfirmado | null>(null);

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

  return (
    <div className={styles.wrapper}>
      {origemFallback && (
        <AlertBanner variant="warning">
          Esta divisão foi gerada ignorando as restrições obrigatórias em conflito —
          revise os times manualmente antes de confirmar.
        </AlertBanner>
      )}

      <div className={styles.timesGrid}>
        {times.map((time) => {
          const timeConfirmado = confirmados?.times.find(
            (candidato) => candidato.label === labelParaIndice(time.indice),
          );
          return (
            <Card key={time.indice} className={styles.timeCard}>
              <CardHeader>
                <h2 className={styles.timeTitle}>{labelParaIndice(time.indice)}</h2>
                <p className={styles.timeStats}>
                  Nível técnico médio: {formatNumero(time.nivel_tecnico_medio, 2)} · Idade
                  média: {formatNumero(time.idade_media, 1)}
                </p>
              </CardHeader>
              <ul className={styles.atletaList}>
                {time.atletas.map((atleta) => (
                  <li key={atleta.atleta_id} className={styles.atletaRow}>
                    <span>{atleta.apelido_exibicao}</span>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setTrocaOrigem({
                          atletaId: atleta.atleta_id,
                          apelido: atleta.apelido_exibicao,
                          indiceTime: time.indice,
                        })
                      }
                    >
                      Trocar
                    </Button>
                  </li>
                ))}
              </ul>
              {timeConfirmado && (
                <Button
                  variant="secondary"
                  onClick={() => setSubstituicaoTime(timeConfirmado)}
                >
                  Substituições
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <div className={styles.acoes}>
        <Button loading={confirmando} onClick={onConfirmar}>
          Confirmar Times
        </Button>
      </div>

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
