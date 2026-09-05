/**
 * Cálculo puro de "Confronto" (BE-R02, TASK.md Parte II Seção 3.1 —
 * Iniciativa de Redesenho Visual) — placar agregado de pontos de gol por
 * time de uma rodada, via `app.time_atleta` + eventos de gol do atleta
 * naquela rodada (`UX-SPEC.md` Parte II Seção 2.5: "não é um placar de
 * partida jogada, é o total de pontuação agregada de cada time na divisão
 * daquela rodada"). Função pura, separada da orquestração de I/O
 * (`listar.ts`/`repository.ts`) — mesmo racional de separação já usado por
 * `src/modules/times/busca-local.ts`.
 *
 * **Decisão de detalhe (não escalada) — mapeamento posicional `colete`/
 * `sem_colete`**: `app.time.label` é texto livre (hoje gravado como "Time
 * A"/"Time B" por `src/modules/times/confirmacao/mutate.ts`, não
 * "Colete"/"Sem Colete" — essa renomeação é escopo de `FE-R09`/T09, ainda
 * não implementada). O critério de aceite literal de `BE-R02` exige a forma
 * `{ colete, sem_colete }`, então o mapeamento usado aqui é POSICIONAL:
 * `times[0]` mapeia para `colete`, `times[1]` para `sem_colete`, na ordem
 * já resolvida por `listarTimesComAtletasPorRodadas` (`repository.ts`) —
 * `label asc, id asc` (não `criado_em`, que é idêntico para todos os times
 * de uma mesma confirmação — ver comentário dedicado em `repository.ts`).
 * Split determinístico e reproduzível entre chamadas, não necessariamente
 * "o time que o organizador informou primeiro". Consistente com a suposição
 * já registrada em `UX-SPEC.md` Parte II Seção 2.6 item 1 ("há sempre
 * exatamente 2 times por rodada", reforçada por `ADR-007`/`ADR-010` e pela
 * própria função `app.confirmar_times_rodada`, que exige
 * `jsonb_array_length(p_times) >= 2`).
 *
 * **Decisão de detalhe (não escalada) — rodada com contagem de times
 * diferente de exatamente 2**: retorna `null` (mesmo fallback do caso
 * "nenhum time persistido", nunca erro) — `app.confirmar_times_rodada`
 * bloqueia estruturalmente menos de 2 times (`p_times` precisa ter
 * `jsonb_array_length >= 2`), mas nada no schema impede mais de 2 (feature
 * não usada por nenhum fluxo real desta release); a forma fixa `{ colete,
 * sem_colete }` do contrato não comporta N times, então mais de 2 vira
 * `null` em vez de escolher arbitrariamente 2 dos N.
 */

export type TimeComAtletas = {
  id: string;
  atletaIds: readonly string[];
};

export type ConfiguracaoPontosVigencia = {
  pontos: number;
  /** Data civil `"AAAA-MM-DD"` a partir da qual este valor passa a valer (mesma semântica de `app.configuracao_pontuacao.vigente_desde`). */
  vigente_desde: string;
};

export type Confronto = {
  colete: number;
  sem_colete: number;
};

/**
 * Valor de pontos vigente de um evento (`app.configuracao_pontuacao`) na
 * data de uma rodada — mesma regra de vigência de `app.lancar_rodada`
 * (migration BE-08): a linha com a maior `vigente_desde` que ainda seja
 * `<= data` da rodada. `configuracao` não precisa vir ordenada — esta
 * função ordena internamente. Retorna `0` (nunca lança) quando nenhuma
 * linha é vigente para a data informada — decisão defensiva de leitura
 * (este é um endpoint de LEITURA agregada para exibição, TASK.md Seção 1.0:
 * "nunca esconder incerteza" não significa "derrubar a listagem inteira"
 * quando um único dado auxiliar de exibição está ausente); na prática, o
 * seed de `app.configuracao_pontuacao` (`vigente_desde = '2000-01-01'`)
 * garante que isso nunca ocorre para nenhuma rodada real desta release.
 */
export function valorPontosVigente(
  configuracao: readonly ConfiguracaoPontosVigencia[],
  dataRodada: string,
): number {
  let valor = 0;
  let vigenciaEscolhida: string | null = null;
  for (const linha of configuracao) {
    if (linha.vigente_desde > dataRodada) {
      continue;
    }
    if (vigenciaEscolhida === null || linha.vigente_desde > vigenciaEscolhida) {
      vigenciaEscolhida = linha.vigente_desde;
      valor = linha.pontos;
    }
  }
  return valor;
}

/**
 * "Confronto" de uma rodada — `null` quando a rodada não tem exatamente 2
 * times persistidos em `app.time` (caso **padrão e esperado** para toda
 * rodada de origem legado, confirmado por `SPK-02`: `BE-15` decidiu não
 * migrar `app.time`/`app.time_atleta` por cobertura de dado insuficiente no
 * legado — nunca um erro, sempre `null`). Quando há exatamente 2 times,
 * soma por time `quantidadeGolsDoAtleta × valorPontosPorGol` para cada
 * atleta do time (`golsPorAtletaId`, ausência de entrada = 0 gols).
 */
export function calcularConfronto(
  times: readonly TimeComAtletas[] | undefined,
  golsPorAtletaId: ReadonlyMap<string, number> | undefined,
  valorPontosPorGol: number,
): Confronto | null {
  if (!times || times.length !== 2) {
    return null;
  }
  const [timeColete, timeSemColete] = times;
  if (!timeColete || !timeSemColete) {
    return null;
  }

  const somarPontosDoTime = (time: TimeComAtletas): number =>
    time.atletaIds.reduce(
      (total, atletaId) => total + (golsPorAtletaId?.get(atletaId) ?? 0) * valorPontosPorGol,
      0,
    );

  return {
    colete: somarPontosDoTime(timeColete),
    sem_colete: somarPontosDoTime(timeSemColete),
  };
}
