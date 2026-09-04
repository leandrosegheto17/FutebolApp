/**
 * Orquestração do Serviço de Times (BE-11, RF-05.1 a RF-05.3, ADR-007/
 * ADR-010) — combina a checagem de existência dos atletas informados
 * (`repository.ts`) com as duas fases do algoritmo (`grafo.ts` +
 * `backtracking.ts` para a Fase 1; `busca-local.ts` para a Fase 2),
 * aplicando o guard de timeout (`timeout.ts`, TASK.md Seção 6.2 item 3).
 * Separado do Route Handler (`app/api/times/sugestao/route.ts`) para ser
 * testável sem montar um `Request`/`NextResponse` — mesmo racional de
 * `src/modules/times/restricoes/mutate.ts`.
 *
 * Puramente de LEITURA: não grava nada em `app.time`/`app.time_atleta`. O
 * critério de aceite literal de BE-11 (`TASK.md` Seção 3.1) cobre apenas
 * "gerar a divisão" (e o caso de conflito) — não menciona persistir a
 * divisão confirmada pelo organizador (RF-05.4). Nenhuma outra tarefa desta
 * decomposição (`BE-12`, `BE-13`) cobre essa persistência literalmente
 * também, então isso fica registrado aqui como um GAP explícito da
 * decomposição (TASK.md Seção 1.0 — "nunca lacuna silenciosa"), não uma
 * omissão desta tarefa: a resposta desta função é sempre uma SUGESTÃO
 * (somando-se ao "antes de confirmar" de RF-05.4), consumível por
 * `FE-09`/T09 para exibição e ajuste manual no cliente.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularIdade } from "@/modules/atletas";
import { colorirGrafo } from "./backtracking";
import {
  calcularCapacidades,
  otimizarEquilibrio,
  rebalancearTamanhos,
  type AtletaParaMontagem,
} from "./busca-local";
import { TIMEOUT_MONTAGEM_MS } from "./constants";
import {
  calcularComponentesConexos,
  type ArestaConflito,
  type Componente,
} from "./grafo";
import {
  buscarAtletasParaMontagem,
  listarRestricoesAtivasEntre,
  type AtletaParaMontagemRow,
} from "./repository";
import { Deadline, TimeoutError } from "./timeout";
import type { SugestaoTimesBody } from "./validation";

export type ResultadoMontagem =
  | { tipo: "atleta_nao_encontrado"; atletaId: string }
  | { tipo: "ok"; times: AtletaParaMontagem[][]; quantidadeTimes: number }
  | {
      tipo: "conflito";
      quantidadeTimes: number;
      grupos: Componente[];
      apelidos: Map<string, string>;
    }
  | { tipo: "falha_tecnica"; mensagem: string };

function construirAdjacenciaGlobal(
  atletasIds: readonly string[],
  arestas: readonly ArestaConflito[],
): Map<string, Set<string>> {
  const adjacencia = new Map<string, Set<string>>();
  for (const id of atletasIds) {
    adjacencia.set(id, new Set());
  }
  for (const aresta of arestas) {
    adjacencia.get(aresta.atletaAId)!.add(aresta.atletaBId);
    adjacencia.get(aresta.atletaBId)!.add(aresta.atletaAId);
  }
  return adjacencia;
}

function paraAtletaParaMontagem(linha: AtletaParaMontagemRow): AtletaParaMontagem {
  return {
    atletaId: linha.id,
    apelidoExibicao: linha.apelido_exibicao,
    nivelTecnico: linha.nivel_tecnico,
    // RF-05.3 usa idade como soft constraint; registro migrado do legado
    // pode não ter `data_nascimento` (BE-15/RF-08.3, coluna nullable) —
    // tratado como "sem dado de idade" em vez de erro, mesmo racional já
    // aplicado a `idade_media: null` quando nenhum atleta do time tem
    // `data_nascimento` (`busca-local.ts`).
    idade: linha.data_nascimento ? calcularIdade(linha.data_nascimento) : null,
  };
}

export type OpcoesMontagem = {
  /**
   * Sobrescreve `TIMEOUT_MONTAGEM_MS` — uso EXCLUSIVO de teste
   * (`src/modules/times/__tests__/montar.integration.test.ts`), nunca
   * repassado pelo Route Handler (`app/api/times/sugestao/route.ts`), que
   * sempre usa o orçamento real. Existe para poder exercitar o caminho de
   * "falha técnica real" por timeout (critério de aceite literal de BE-11)
   * de forma determinística e rápida contra um Supabase real, sem esperar
   * `TIMEOUT_MONTAGEM_MS` de verdade nem simular uma entrada adversária
   * artificialmente densa só para forçar o backtracking a estourar o tempo
   * — mesmo espírito do parâmetro `now`/`agora` já injetável em
   * `evaluateLoginRateLimit` (`src/modules/autenticacao/rate-limit.ts`) e no
   * próprio `Deadline` (`timeout.ts`).
   */
  orcamentoMsOverride?: number;
};

export async function montarSugestaoTimes(
  client: SupabaseClient<any, any, any>,
  body: SugestaoTimesBody,
  opcoes: OpcoesMontagem = {},
): Promise<ResultadoMontagem> {
  const atletasPorId = await buscarAtletasParaMontagem(client, body.atletas_ids);
  const idAusente = body.atletas_ids.find((id) => !atletasPorId.has(id));
  if (idAusente) {
    return { tipo: "atleta_nao_encontrado", atletaId: idAusente };
  }

  const restricoesAtivas = await listarRestricoesAtivasEntre(client, body.atletas_ids);
  const arestas: ArestaConflito[] = restricoesAtivas.map((restricao) => ({
    restricaoId: restricao.id,
    atletaAId: restricao.atleta_a_id,
    atletaBId: restricao.atleta_b_id,
  }));

  const deadline = new Deadline(opcoes.orcamentoMsOverride ?? TIMEOUT_MONTAGEM_MS);

  try {
    // ---- Fase 1 (ADR-007 + ADR-010): backtracking com poda, por componente conexo.
    const componentes = calcularComponentesConexos(body.atletas_ids, arestas);
    const coloracao = colorirGrafo(componentes, body.quantidade_times, deadline);

    if (!coloracao.sucesso) {
      const apelidos = new Map<string, string>();
      for (const [id, linha] of atletasPorId) {
        apelidos.set(id, linha.apelido_exibicao);
      }
      return {
        tipo: "conflito",
        quantidadeTimes: body.quantidade_times,
        grupos: coloracao.componentesFalhos,
        apelidos,
      };
    }

    // ---- Fase 2 (ADR-007): busca local — rebalanceio de tamanho + swap de equilíbrio.
    const times: string[][] = Array.from({ length: body.quantidade_times }, () => []);
    for (const [atletaId, cor] of coloracao.cores) {
      times[cor]!.push(atletaId);
    }

    const atletasParaBuscaLocal = new Map<string, AtletaParaMontagem>();
    for (const linha of atletasPorId.values()) {
      atletasParaBuscaLocal.set(linha.id, paraAtletaParaMontagem(linha));
    }
    const adjacenciaGlobal = construirAdjacenciaGlobal(body.atletas_ids, arestas);
    const capacidades = calcularCapacidades(
      body.atletas_ids.length,
      body.quantidade_times,
    );

    rebalancearTamanhos(times, capacidades, adjacenciaGlobal, deadline);
    otimizarEquilibrio(times, atletasParaBuscaLocal, adjacenciaGlobal, deadline);

    const timesResultado = times.map((time) =>
      [...time]
        .map((atletaId) => atletasParaBuscaLocal.get(atletaId)!)
        .sort((a, b) => a.apelidoExibicao.localeCompare(b.apelidoExibicao, "pt-BR")),
    );

    return { tipo: "ok", times: timesResultado, quantidadeTimes: body.quantidade_times };
  } catch (erro) {
    if (erro instanceof TimeoutError) {
      return { tipo: "falha_tecnica", mensagem: erro.message };
    }
    throw erro;
  }
}
