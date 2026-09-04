import type {
  AtletaMontado,
  ParticipacaoPresente,
  TimeConfirmadoInput,
  TimeMontado,
} from "./types";

/** `N` fixo nesta release (TASK.md Seção 6.2 item 1 — layout de 2 colunas do
 * `UX-SPEC.md` T09, "Time A"/"Time B"). O algoritmo do Backend (`BE-11`) já é
 * paramétrico em `N` — só a interface desta release fixa o valor. */
export const QUANTIDADE_TIMES = 2;

function round(value: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(value * fator) / fator;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

/**
 * "Time A" = índice 0, "Time B" = índice 1, ... — mesmo texto default gerado
 * pelo Backend (`TimeConfirmadoInput.label`, BE-13) quando `label` está
 * ausente, replicado aqui para rotular a UI antes da confirmação.
 */
export function labelParaIndice(indice: number): string {
  return `Time ${String.fromCharCode(65 + indice)}`;
}

/**
 * Recalcula `nivel_tecnico_medio`/`idade_media` a partir dos atletas atuais
 * do time — usado depois de todo "Trocar jogador" (RF-05.4), inteiramente no
 * cliente (a sugestão já é local, nenhuma chamada de rede nova é necessária
 * para um reposicionamento manual). Mesma fórmula documentada por `BE-11`
 * (`TimeMontadoResponse`): idade exclui atletas com `idade: null` do
 * cálculo, nunca trata como `0`; `nivel_tecnico` segue a mesma regra por
 * simetria (relevante só no fallback de "Gerar mesmo assim", onde nenhum
 * atleta tem `nivel_tecnico` conhecido no cliente — ver `buildRoundRobinTimes`).
 */
export function recomputeTeamStats(
  atletas: AtletaMontado[],
): Pick<TimeMontado, "nivel_tecnico_medio" | "idade_media"> {
  const niveis = atletas
    .map((atleta) => atleta.nivel_tecnico)
    .filter((valor): valor is number => valor !== null);
  const idades = atletas
    .map((atleta) => atleta.idade)
    .filter((valor): valor is number => valor !== null);

  const nivelMedio = media(niveis);
  const idadeMedia = media(idades);

  return {
    nivel_tecnico_medio: nivelMedio === null ? null : round(nivelMedio, 2),
    idade_media: idadeMedia === null ? null : round(idadeMedia, 1),
  };
}

/**
 * Fallback client-side de "Gerar mesmo assim, ciente do conflito"
 * (UX-SPEC.md Seção 2, T09 — segunda opção do estado de conflito). Não há
 * endpoint no `API-CONTRACT.yaml` para "ignorar restrições e gerar mesmo
 * assim" — `SugestaoTimesConflitoResponse` nunca devolve uma divisão (ADR-010
 * só prova que nenhuma existe), e nenhum ADR define um mecanismo de bypass no
 * Backend. Decisão de detalhe documentada aqui (TASK.md Seção 1.0, não
 * escalada): divide os mesmos presentes selecionados em `N` times por
 * round-robin determinístico (posição no array `% N`), inteiramente no
 * cliente, como PONTO DE PARTIDA para o organizador ajustar manualmente via
 * "Trocar jogador" — RF-05.4 já permite ajuste manual mesmo sobre a sugestão
 * do algoritmo, e o Frontend nunca revalida restrições sobre uma troca manual
 * de qualquer forma (nenhum endpoint para isso). `nivel_tecnico`/`idade` de
 * cada atleta ficam `null` neste fallback (dado só calculado pelo algoritmo
 * do Backend, indisponível ao ignorá-lo) — `recomputeTeamStats` já trata
 * `null` corretamente (exclui do cálculo em vez de tratar como `0`), então os
 * indicadores de equilíbrio aparecem como "—", nunca um número inventado.
 */
export function buildRoundRobinTimes(
  presentes: ParticipacaoPresente[],
  quantidadeTimes: number,
): TimeMontado[] {
  const times: TimeMontado[] = Array.from({ length: quantidadeTimes }, (_, indice) => ({
    indice,
    atletas: [],
    nivel_tecnico_medio: null,
    idade_media: null,
  }));

  presentes.forEach((presente, posicao) => {
    const time = times[posicao % quantidadeTimes];
    if (!time) return;
    time.atletas.push({
      atleta_id: presente.atleta_id,
      apelido_exibicao: presente.apelido_exibicao,
      nivel_tecnico: null,
      idade: null,
    });
  });

  return times.map((time) => ({ ...time, ...recomputeTeamStats(time.atletas) }));
}

/**
 * "Trocar jogador" (RF-05.4, UX-SPEC.md Seção 2) — troca a posição de dois
 * atletas entre times (nunca move um atleta sozinho, o que desbalancearia o
 * tamanho dos times sem necessidade). Recalcula os indicadores de equilíbrio
 * dos dois times afetados; devolve o array original sem alteração (nenhum
 * lançamento) se algum dos dois ids não for encontrado em nenhum time —
 * defesa em profundidade, nunca deveria acontecer pela UI (`TrocarJogadorModal`
 * só lista candidatos de fato presentes num time).
 */
export function swapAtletas(
  times: TimeMontado[],
  atletaIdA: string,
  atletaIdB: string,
): TimeMontado[] {
  const posicaoA = localizarAtleta(times, atletaIdA);
  const posicaoB = localizarAtleta(times, atletaIdB);
  if (!posicaoA || !posicaoB || posicaoA.indiceTime === posicaoB.indiceTime) {
    return times;
  }

  const proximo = times.map((time) => ({ ...time, atletas: [...time.atletas] }));
  const timeA = proximo[posicaoA.indiceTime]!;
  const timeB = proximo[posicaoB.indiceTime]!;
  const atletaA = timeA.atletas[posicaoA.indiceAtleta]!;
  const atletaB = timeB.atletas[posicaoB.indiceAtleta]!;

  timeA.atletas[posicaoA.indiceAtleta] = atletaB;
  timeB.atletas[posicaoB.indiceAtleta] = atletaA;

  proximo[posicaoA.indiceTime] = { ...timeA, ...recomputeTeamStats(timeA.atletas) };
  proximo[posicaoB.indiceTime] = { ...timeB, ...recomputeTeamStats(timeB.atletas) };

  return proximo;
}

function localizarAtleta(
  times: TimeMontado[],
  atletaId: string,
): { indiceTime: number; indiceAtleta: number } | null {
  for (const time of times) {
    const indiceAtleta = time.atletas.findIndex(
      (atleta) => atleta.atleta_id === atletaId,
    );
    if (indiceAtleta !== -1) {
      return { indiceTime: time.indice, indiceAtleta };
    }
  }
  return null;
}

/** Monta o corpo de `POST /api/rodadas/{id}/times` (`ConfirmarTimesBody`, BE-13) a partir do estado local. */
export function buildConfirmarTimesInput(times: TimeMontado[]): TimeConfirmadoInput[] {
  return times.map((time) => ({
    label: labelParaIndice(time.indice),
    atletas_ids: time.atletas.map((atleta) => atleta.atleta_id),
  }));
}
