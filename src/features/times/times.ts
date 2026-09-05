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
 * "Colete" = índice 0, "Sem Colete" = índice 1 — UX-SPEC.md Parte II Seção
 * 2.6, correção 1 ("convenção real de pelada/jogo amador com coletes/times
 * sem coletes... não 'Time A'/'Time B' genéricos"); reforça a suposição já
 * registrada de exatamente 2 times por rodada (`QUANTIDADE_TIMES`). Este
 * valor é o mesmo enviado como `label` a `POST /api/rodadas/{id}/times`
 * (`buildConfirmarTimesInput` abaixo) — a renomeação real citada pela nota de
 * conclusão de `BE-R02` ("renomeação real é escopo de FE-R09/T09") acontece
 * aqui: a partir desta tarefa, `app.time.label` passa a ser persistido como
 * "Colete"/"Sem Colete" para toda nova divisão confirmada (rodadas antigas já
 * persistidas com "Time A"/"Time B" não são migradas — fora de escopo, sem
 * requisito de retrocompatibilidade aqui, mesmo padrão de "substituição
 * atômica daqui para frente" já usado pelos tokens visuais, `ADR-013`).
 * Ordenação alfabética de `label` (convenção posicional de `BE-R02`,
 * `repository.ts`) permanece compatível sem mudança no Backend: "Colete" (C)
 * ainda ordena antes de "Sem Colete" (S), preservando `times[0]` = primeiro
 * time = mesmo índice 0 de antes.
 *
 * Índices ≥ 2 mantêm o esquema alfabético antigo como fallback (decisão de
 * detalhe, documentada, não escalada) — o Backend (`BE-11`) já é paramétrico
 * em N, mas a convenção "Colete"/"Sem Colete" é especificamente binária
 * (UX-SPEC.md Parte II Seção 2.6); nenhuma tela desta release usa N > 2
 * (`QUANTIDADE_TIMES` é fixo em 2), então este ramo nunca é exercitado em
 * produção — preservado só para não regredir o comportamento paramétrico já
 * testado do Backend caso uma release futura mude `QUANTIDADE_TIMES`.
 */
const NOMES_TIME_BINARIO = ["Colete", "Sem Colete"] as const;

export function labelParaIndice(indice: number): string {
  return NOMES_TIME_BINARIO[indice] ?? `Time ${String.fromCharCode(65 + indice)}`;
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

/**
 * Soma (não média) de `nivel_tecnico` de um time — painel de equilíbrio
 * reformulado (UX-SPEC.md Parte II Seção 2.6, correção 2: cabeçalho de cada
 * time mostra "62 pts"/"59 pts", uma ordem de grandeza incompatível com a
 * média já existente, ~6-7). Decisão de detalhe (documentada, não escalada):
 * ambos os valores (soma aqui, média em `recomputeTeamStats`) derivam do
 * mesmo dado por atleta já existente (`nivel_tecnico`, RN-03) — nenhum dado
 * novo, nenhuma mudança de contrato de API/heurística (`ADR-007` inalterado);
 * é só uma forma diferente de agregar/exibir o mesmo número, mesmo racional
 * já usado pela correção 2 para "diferença" vs. "duas médias". Segue a mesma
 * regra de `recomputeTeamStats`: nunca inventa um valor — `null` quando
 * nenhum atleta do time tem `nivel_tecnico` conhecido (fallback de "Gerar
 * mesmo assim"), exclui (não zera) atletas com valor desconhecido.
 */
export function sumNivelTecnico(atletas: AtletaMontado[]): number | null {
  const niveis = atletas
    .map((atleta) => atleta.nivel_tecnico)
    .filter((valor): valor is number => valor !== null);
  if (niveis.length === 0) return null;
  return round(
    niveis.reduce((soma, valor) => soma + valor, 0),
    0,
  );
}

/**
 * "Dif. pontos"/"Dif. idade" (UX-SPEC.md Parte II Seção 2.6, correção 2) —
 * diferença absoluta entre os dois valores agregados, formatada em pt-BR
 * (vírgula decimal, ex. "1,4a" no wireframe) com sufixo opcional ("a" de
 * "anos"). `"—"` (nunca um número inventado) quando qualquer um dos dois
 * lados é `null` — mesma regra de `formatNumero`/`recomputeTeamStats` já
 * usada no restante de T09.
 */
export function formatDiferenca(
  valorA: number | null,
  valorB: number | null,
  casas: number,
  sufixo = "",
): string {
  if (valorA === null || valorB === null) return "—";
  const diferenca = round(Math.abs(valorA - valorB), casas);
  return `${diferenca.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}${sufixo}`;
}

/** "Titulares 11×11" (UX-SPEC.md Parte II Seção 2.6) — contagem de atletas por time, nunca `null` (sempre conhecida). */
export function formatTitulares(times: TimeMontado[]): string {
  return times.map((time) => time.atletas.length).join("×");
}

/**
 * Rótulos de posição tática decorativos (ATA/MEI/VOL/LAT/ZAG) — UX-SPEC.md
 * Parte II Seção 2.6/7.2 item 8: "decisão direta do organizador... os
 * rótulos de posição/formação são puramente decorativos e não-interativos —
 * texto fixo de apresentação, sem novo campo de dado, sem controle que
 * permita ao organizador atribuir/alterar a posição de um jogador". Ciclo
 * fixo determinístico por posição do atleta dentro do time (não por
 * `atleta_id`/nenhum dado real) — reproduz aproximadamente a sequência
 * observada no mockup (Seção 2.6: ATA, ATA, MEI, VOL, VOL, LAT, ZAG...), sem
 * nenhuma lógica de posicionamento tático real (`ADR-014`/RF-D01.2).
 */
const POSICOES_DECORATIVAS = [
  "ATA",
  "ATA",
  "MEI",
  "VOL",
  "VOL",
  "LAT",
  "ZAG",
  "LAT",
  "ZAG",
  "MEI",
  "ATA",
] as const;

export function posicaoDecorativa(indiceNoTime: number): string {
  return POSICOES_DECORATIVAS[indiceNoTime % POSICOES_DECORATIVAS.length]!;
}

/**
 * Subconjunto estrutural de `Restricao` (`@/features/restricoes/types`) —
 * evita import cruzado de módulo de tipos entre features só por causa desta
 * checagem local (mesma fronteira de "cada feature define seus próprios
 * tipos de UI" já usada por `src/features/atletas`/`src/features/times`).
 */
export interface RestricaoAtivaConsulta {
  ativo: boolean;
  atleta_a_id: string;
  atleta_a_nome: string;
  atleta_b_id: string;
  atleta_b_nome: string;
}

export interface RestricaoRespeitada {
  atletaANome: string;
  atletaBNome: string;
}

/**
 * Banner "✓ Restrição respeitada" (UX-SPEC.md Parte II Seção 2.6, correção
 * 4) — decisão de detalhe (documentada, não escalada): `SugestaoTimesOk`
 * (BE-11) não devolve informação sobre QUAIS restrições existem/foram
 * satisfeitas (só a resposta de conflito, `ADR-010`, tem esse detalhe) — sem
 * mudar o contrato de `POST /api/times/sugestao` (exigência desta tarefa),
 * a única fonte real e não-inventada dessa informação é reconciliar,
 * inteiramente no cliente, a lista de restrições ativas já existente
 * (`GET /api/restricoes`, BE-12, endpoint já publicado e usado por T10) com
 * a divisão atual de times: uma restrição está "respeitada" quando os dois
 * atletas dela estão presentes na divisão atual E em times diferentes.
 * Restrições cujos atletas não estão nesta divisão (não presentes na rodada,
 * ou id desconhecido) são ignoradas, não relatadas como violadas nem como
 * respeitadas — nenhuma reprovação implícita fora do escopo desta tela.
 */
export function restricoesRespeitadas(
  times: TimeMontado[],
  restricoes: RestricaoAtivaConsulta[],
): RestricaoRespeitada[] {
  const indicePorAtleta = new Map<string, number>();
  times.forEach((time) => {
    time.atletas.forEach((atleta) => indicePorAtleta.set(atleta.atleta_id, time.indice));
  });

  return restricoes
    .filter((restricao) => restricao.ativo)
    .filter((restricao) => {
      const indiceA = indicePorAtleta.get(restricao.atleta_a_id);
      const indiceB = indicePorAtleta.get(restricao.atleta_b_id);
      return indiceA !== undefined && indiceB !== undefined && indiceA !== indiceB;
    })
    .map((restricao) => ({
      atletaANome: restricao.atleta_a_nome,
      atletaBNome: restricao.atleta_b_nome,
    }));
}
