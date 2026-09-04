/**
 * Orquestração do script de migração do legado (BE-15, RF-08, ADR-008) —
 * lê a schema legada (`LegadoReader`), transforma (`transformar.ts`) e grava
 * na schema `app` (`AppWriter`), registrando cada mapeamento origem→destino
 * em `app.legado_migracao_registro` (`RegistroMigracaoStore`) e devolvendo o
 * relatório de conferência (RF-08.5).
 *
 * Pura em termos de I/O: toda leitura/escrita passa pelas interfaces de
 * `tipos.ts` (`MigracaoDeps`), nunca por um cliente Supabase concreto —
 * testável inteiramente com fixtures em memória (`__tests__/fixtures.ts`),
 * sem depender de rede nem de um banco real (mesmo racional de
 * `src/modules/times/montar.ts` separar orquestração de `repository.ts`,
 * levado ao limite aqui porque a schema legada real não pode ser tocada
 * nesta fase — GUARDRAILS.md regra 35/BLOCKER-003). A implementação real das
 * interfaces (Supabase legado + Supabase `app`) fica em `deps-supabase.ts`,
 * usada exclusivamente por `scripts/migrar-legado.ts`.
 *
 * Idempotência (ADR-008, TASK.md Seção 1.2): antes de processar qualquer
 * linha, cada função `migrarX` consulta o estado atual de
 * `app.legado_migracao_registro` para aquela tabela de origem — uma linha já
 * `migrado` NUNCA é reprocessada (evita duplicar `app.atleta`/`app.rodada`/
 * `app.lancamento_pontos`, este último especialmente crítico: é ledger
 * append-only, reprocessar dobraria pontos). Uma linha já `divergencia`/
 * `erro` também não é reprocessada, mas continua aparecendo no relatório a
 * cada execução (nunca "some" do relatório só porque já foi visto antes).
 *
 * RN-13 (preservação exata da pontuação histórica): `pontos_ganhos` da linha
 * legada é gravado em `app.lancamento_pontos.pontos_delta` sem NENHUMA
 * transformação aritmética — nunca lido `app.configuracao_pontuacao`, nunca
 * recalculado pela tabela RN-05 vigente. Ver teste dedicado em
 * `__tests__/migrar.test.ts`.
 */
import {
  type DivergenciaRegistro,
  type GoleiroLegado,
  type JogadorLegado,
  type MigracaoDeps,
  type PresencaRodadaLegada,
  type RegistroMigracaoExistente,
  type RelatorioConferencia,
  type ResumoTabela,
  type RodadaLegada,
  type SubstituicaoRodadaLegada,
  type TipoAtletaLegado,
  type ValidacaoSaldoAtleta,
} from "./tipos";
import {
  DECISOES_DE_DETALHE,
  DIVERGENCIAS_ESTRUTURAIS,
  chaveAtletaLegado,
  mapearAtletaLegado,
  mapearRodadaLegada,
} from "./transformar";

const TABELA_GOLEIROS = "goleiros";
const TABELA_JOGADORES = "jogadores";
const TABELA_RODADAS = "rodadas";
const TABELA_PRESENCAS = "presencas_rodada";
const TABELA_SUBSTITUICOES = "substituicoes_rodada";

function indexarPorIdOrigem(
  registros: RegistroMigracaoExistente[],
): Map<string, RegistroMigracaoExistente> {
  const mapa = new Map<string, RegistroMigracaoExistente>();
  for (const registro of registros) {
    mapa.set(registro.id_origem, registro);
  }
  return mapa;
}

function calcularResumo(
  tabelaOrigem: string,
  totalOrigem: number,
  registrosFinais: RegistroMigracaoExistente[],
  migradosNestaExecucao: number,
  jaMigradosAnteriormente: number,
): ResumoTabela {
  let migradosTotal = 0;
  let divergenciasTotal = 0;
  let errosTotal = 0;
  for (const registro of registrosFinais) {
    if (registro.status === "migrado") migradosTotal++;
    else if (registro.status === "divergencia") divergenciasTotal++;
    else if (registro.status === "erro") errosTotal++;
  }
  return {
    tabelaOrigem,
    totalOrigem,
    migradosTotal,
    migradosNestaExecucao,
    jaMigradosAnteriormente,
    divergenciasTotal,
    errosTotal,
  };
}

async function migrarAtletas(
  deps: MigracaoDeps,
  tabelaOrigem: "goleiros" | "jogadores",
  tipoLegado: TipoAtletaLegado,
  linhas: readonly (GoleiroLegado | JogadorLegado)[],
  atletaIdPorChave: Map<string, string>,
  pontuacaoAtualPorAtletaId: Map<
    string,
    { tabelaOrigem: "goleiros" | "jogadores"; idOrigem: string; pontuacaoAtual: number }
  >,
  pontuacaoInicialPorAtletaId: Map<string, number>,
): Promise<ResumoTabela> {
  const existentes = indexarPorIdOrigem(
    await deps.registro.listarPorTabela(tabelaOrigem),
  );
  let migradosNestaExecucao = 0;
  let jaMigradosAnteriormente = 0;

  for (const linha of linhas) {
    const idOrigem = String(linha.id);
    const chave = chaveAtletaLegado(tipoLegado, linha.id);
    const existente = existentes.get(idOrigem);

    let atletaIdDestino: string;
    if (existente && existente.status === "migrado" && existente.id_destino) {
      atletaIdDestino = existente.id_destino;
      jaMigradosAnteriormente++;
    } else {
      atletaIdDestino = await deps.app.inserirAtleta(mapearAtletaLegado(linha));
      await deps.registro.gravar({
        tabela_origem: tabelaOrigem,
        id_origem: idOrigem,
        tabela_destino: "app.atleta",
        id_destino: atletaIdDestino,
        status: "migrado",
        observacao: null,
      });
      migradosNestaExecucao++;
    }

    atletaIdPorChave.set(chave, atletaIdDestino);
    pontuacaoAtualPorAtletaId.set(atletaIdDestino, {
      tabelaOrigem,
      idOrigem,
      pontuacaoAtual: linha.pontuacao_atual,
    });
    pontuacaoInicialPorAtletaId.set(atletaIdDestino, linha.pontuacao_inicial);
  }

  const registrosFinais = await deps.registro.listarPorTabela(tabelaOrigem);
  return calcularResumo(
    tabelaOrigem,
    linhas.length,
    registrosFinais,
    migradosNestaExecucao,
    jaMigradosAnteriormente,
  );
}

async function migrarRodadas(
  deps: MigracaoDeps,
  linhas: readonly RodadaLegada[],
  rodadaIdPorData: Map<string, string>,
): Promise<ResumoTabela> {
  const existentes = indexarPorIdOrigem(
    await deps.registro.listarPorTabela(TABELA_RODADAS),
  );
  let migradosNestaExecucao = 0;
  let jaMigradosAnteriormente = 0;

  for (const linha of linhas) {
    const idOrigem = String(linha.id);
    const existente = existentes.get(idOrigem);

    let rodadaIdDestino: string;
    if (existente && existente.status === "migrado" && existente.id_destino) {
      rodadaIdDestino = existente.id_destino;
      jaMigradosAnteriormente++;
    } else {
      rodadaIdDestino = await deps.app.inserirRodada(mapearRodadaLegada(linha));
      await deps.registro.gravar({
        tabela_origem: TABELA_RODADAS,
        id_origem: idOrigem,
        tabela_destino: "app.rodada",
        id_destino: rodadaIdDestino,
        status: "migrado",
        observacao: null,
      });
      migradosNestaExecucao++;
    }

    rodadaIdPorData.set(linha.data_rodada, rodadaIdDestino);
  }

  const registrosFinais = await deps.registro.listarPorTabela(TABELA_RODADAS);
  return calcularResumo(
    TABELA_RODADAS,
    linhas.length,
    registrosFinais,
    migradosNestaExecucao,
    jaMigradosAnteriormente,
  );
}

type ClassificacaoDivergenciaPresenca = {
  codigo: DivergenciaRegistro["codigo"];
  status: "divergencia" | "erro";
  motivo: string;
};

/**
 * Decide se uma presença legada pode ser migrada ou precisa virar
 * divergência/erro — nunca descarta silenciosamente (RF-08.3). Ordem de
 * checagem importa: `rodadaId` ausente é o caso real documentado (D1,
 * 24% dos dados reais); os demais são defensivos, não esperados nos dados
 * reais (LEGADO-SCHEMA.md Seção 2.4), mas tratados do mesmo jeito não
 * silencioso caso apareçam.
 */
function classificarDivergenciaPresenca(
  linha: PresencaRodadaLegada,
  atletaId: string | undefined,
  rodadaId: string | undefined,
): ClassificacaoDivergenciaPresenca | null {
  if (!rodadaId) {
    return {
      codigo: "D1",
      status: "divergencia",
      motivo:
        `Divergência D1 (LEGADO-SCHEMA.md Seção 6): data_rodada '${linha.data_rodada}' ` +
        "não corresponde a nenhuma rodada migrada (rodada provavelmente deletada no " +
        "legado sem cascata sobre as presenças associadas). Decisão desta execução: " +
        "NÃO migrada — reconstituir uma rodada nova só a partir da data exigiria " +
        "inventar nome_time_a/nome_time_b/formacao (também ausentes para essa data), " +
        "o que o critério de aceite de BE-15 proíbe. Listada para confirmação " +
        "explícita do organizador (RF-08.3): migrar mesmo sem rodada correspondente, " +
        "criar rodada placeholder, ou manter como pulada — nenhuma opção foi decidida " +
        "unilateralmente aqui.",
    };
  }
  if (linha.status === null) {
    return {
      codigo: "D0",
      status: "divergencia",
      motivo:
        "status nulo, mas com rodada correspondente encontrada — combinação fora do " +
        "padrão de Divergência D1 documentado em LEGADO-SCHEMA.md (lá, status nulo " +
        "sempre coincide com rodada ausente). Não migrada; listada para investigação " +
        "manual antes de decidir tratamento.",
    };
  }
  if (!atletaId) {
    return {
      codigo: "D0",
      status: "erro",
      motivo:
        `atleta_id ${linha.atleta_id} (tipo_atleta='${linha.tipo_atleta}') não ` +
        "corresponde a nenhum atleta migrado — não relatado nos dados reais do " +
        "spike (LEGADO-SCHEMA.md); registrado como erro para investigação manual, " +
        "nunca descartado silenciosamente.",
    };
  }
  return null;
}

async function migrarPresencas(
  deps: MigracaoDeps,
  linhas: readonly PresencaRodadaLegada[],
  atletaIdPorChave: ReadonlyMap<string, string>,
  rodadaIdPorData: ReadonlyMap<string, string>,
  divergenciasRegistro: DivergenciaRegistro[],
  pontosPorAtletaId: Map<string, number>,
): Promise<ResumoTabela> {
  const existentes = indexarPorIdOrigem(
    await deps.registro.listarPorTabela(TABELA_PRESENCAS),
  );
  let migradosNestaExecucao = 0;
  let jaMigradosAnteriormente = 0;

  for (const linha of linhas) {
    const idOrigem = String(linha.id);
    const existente = existentes.get(idOrigem);
    const atletaId = atletaIdPorChave.get(
      chaveAtletaLegado(linha.tipo_atleta, linha.atleta_id),
    );
    const rodadaId = rodadaIdPorData.get(linha.data_rodada);

    // Soma para a validação de saldo (RN-13): a partir do dado de ORIGEM,
    // sempre que a linha é resolvível — independe de já ter sido gravada em
    // execução anterior (o valor não muda entre execuções, é leitura pura).
    if (atletaId && rodadaId && linha.status !== null) {
      pontosPorAtletaId.set(
        atletaId,
        (pontosPorAtletaId.get(atletaId) ?? 0) + linha.pontos_ganhos,
      );
    }

    if (
      existente &&
      (existente.status === "migrado" ||
        existente.status === "divergencia" ||
        existente.status === "erro")
    ) {
      if (existente.status !== "migrado") {
        divergenciasRegistro.push({
          codigo: existente.observacao?.includes("Divergência D1") ? "D1" : "D0",
          tabelaOrigem: TABELA_PRESENCAS,
          idOrigem,
          motivo: existente.observacao ?? "Divergência registrada em execução anterior.",
        });
      }
      jaMigradosAnteriormente++;
      continue;
    }

    const classificacao = classificarDivergenciaPresenca(linha, atletaId, rodadaId);
    if (classificacao) {
      await deps.registro.gravar({
        tabela_origem: TABELA_PRESENCAS,
        id_origem: idOrigem,
        tabela_destino: "app.participacao_rodada",
        id_destino: null,
        status: classificacao.status,
        observacao: classificacao.motivo,
      });
      divergenciasRegistro.push({
        codigo: classificacao.codigo,
        tabelaOrigem: TABELA_PRESENCAS,
        idOrigem,
        motivo: classificacao.motivo,
      });
      continue;
    }

    // A partir daqui: atletaId e rodadaId resolvidos, status !== null.
    const participacaoId = await deps.app.inserirParticipacaoRodada({
      rodada_id: rodadaId as string,
      atleta_id: atletaId as string,
      status: linha.status as "presente" | "ausente" | "lesionado",
    });

    if (linha.gols_marcados > 0) {
      await deps.app.inserirEventoJogo({
        participacao_id: participacaoId,
        tipo: "gol",
        quantidade: linha.gols_marcados,
      });
    }
    if (linha.cartao_amarelo > 0) {
      await deps.app.inserirEventoJogo({
        participacao_id: participacaoId,
        tipo: "cartao_amarelo",
        quantidade: linha.cartao_amarelo,
      });
    }
    if (linha.cartao_vermelho) {
      await deps.app.inserirEventoJogo({
        participacao_id: participacaoId,
        tipo: "cartao_vermelho",
        quantidade: 1,
      });
    }

    // RN-13 — preservação exata: `pontos_delta` é o `pontos_ganhos` legado
    // literal, nenhuma leitura de `app.configuracao_pontuacao` acontece
    // neste módulo.
    await deps.app.inserirLancamentoPontos({
      atleta_id: atletaId as string,
      rodada_id: rodadaId as string,
      origem: "migracao_legado",
      pontos_delta: linha.pontos_ganhos,
    });

    await deps.registro.gravar({
      tabela_origem: TABELA_PRESENCAS,
      id_origem: idOrigem,
      tabela_destino: "app.participacao_rodada",
      id_destino: participacaoId,
      status: "migrado",
      observacao: null,
    });
    migradosNestaExecucao++;
  }

  const registrosFinais = await deps.registro.listarPorTabela(TABELA_PRESENCAS);
  return calcularResumo(
    TABELA_PRESENCAS,
    linhas.length,
    registrosFinais,
    migradosNestaExecucao,
    jaMigradosAnteriormente,
  );
}

/**
 * `substituicoes_rodada` está vazia em 100% dos dados reais (LEGADO-SCHEMA.md
 * Seção 2.5) — tratada como no-op idempotente nesse caso. Se alguma linha
 * existir mesmo assim (fixture de teste, ou legado real divergente do que o
 * spike observou), nunca é migrada automaticamente (depende de `app.time`,
 * fora de escopo desta versão — Divergência D7) — é sempre listada como
 * divergência, nunca descartada silenciosamente.
 */
async function migrarSubstituicoes(
  deps: MigracaoDeps,
  linhas: readonly SubstituicaoRodadaLegada[],
  divergenciasRegistro: DivergenciaRegistro[],
): Promise<ResumoTabela> {
  const existentes = indexarPorIdOrigem(
    await deps.registro.listarPorTabela(TABELA_SUBSTITUICOES),
  );
  const migradosNestaExecucao = 0; // nunca migra de fato — ver comentário acima
  let jaMigradosAnteriormente = 0;

  for (const linha of linhas) {
    const idOrigem = String(linha.id);
    const existente = existentes.get(idOrigem);
    if (existente) {
      divergenciasRegistro.push({
        codigo: "D0",
        tabelaOrigem: TABELA_SUBSTITUICOES,
        idOrigem,
        motivo: existente.observacao ?? "Divergência registrada em execução anterior.",
      });
      jaMigradosAnteriormente++;
      continue;
    }

    const motivo =
      "substituicoes_rodada depende de app.time (não migrado nesta versão do " +
      "script, Divergência D7) — não é possível migrar automaticamente sem " +
      "inventar dado de time. Listada para decisão manual do organizador.";
    await deps.registro.gravar({
      tabela_origem: TABELA_SUBSTITUICOES,
      id_origem: idOrigem,
      tabela_destino: "app.substituicao",
      id_destino: null,
      status: "divergencia",
      observacao: motivo,
    });
    divergenciasRegistro.push({
      codigo: "D0",
      tabelaOrigem: TABELA_SUBSTITUICOES,
      idOrigem,
      motivo,
    });
  }

  const registrosFinais = await deps.registro.listarPorTabela(TABELA_SUBSTITUICOES);
  return calcularResumo(
    TABELA_SUBSTITUICOES,
    linhas.length,
    registrosFinais,
    migradosNestaExecucao,
    jaMigradosAnteriormente,
  );
}

function calcularValidacaoSaldo(
  pontuacaoAtualPorAtletaId: ReadonlyMap<
    string,
    { tabelaOrigem: "goleiros" | "jogadores"; idOrigem: string; pontuacaoAtual: number }
  >,
  pontuacaoInicialPorAtletaId: ReadonlyMap<string, number>,
  pontosPorAtletaId: ReadonlyMap<string, number>,
): ValidacaoSaldoAtleta[] {
  const resultado: ValidacaoSaldoAtleta[] = [];
  for (const [atletaId, info] of pontuacaoAtualPorAtletaId) {
    const inicial = pontuacaoInicialPorAtletaId.get(atletaId) ?? 0;
    const somaPontosMigrados = pontosPorAtletaId.get(atletaId) ?? 0;
    const saldoCalculadoPosMigracao = inicial + somaPontosMigrados;
    resultado.push({
      tabelaOrigem: info.tabelaOrigem,
      idOrigem: info.idOrigem,
      atletaIdDestino: atletaId,
      pontuacaoAtualLegado: info.pontuacaoAtual,
      saldoCalculadoPosMigracao,
      ok: saldoCalculadoPosMigracao === info.pontuacaoAtual,
    });
  }
  return resultado;
}

/**
 * Ponto de entrada único do serviço de migração (RF-08). Lê a schema legada
 * inteira (5 tabelas de domínio — `migrations`, tabela de framework, nunca é
 * lida), migra na ordem que respeita as dependências físicas da schema `app`
 * (atletas e rodadas antes de presenças, que referenciam ambos), e devolve o
 * relatório de conferência (RF-08.5) — nunca lança para uma divergência de
 * dado (isso é esperado e vira entrada do relatório); só lança se uma
 * chamada de I/O (`deps.legado`/`deps.registro`/`deps.app`) falhar de fato.
 */
export async function migrarLegado(deps: MigracaoDeps): Promise<RelatorioConferencia> {
  const [goleiros, jogadores, rodadas, presencas, substituicoes] = await Promise.all([
    deps.legado.lerGoleiros(),
    deps.legado.lerJogadores(),
    deps.legado.lerRodadas(),
    deps.legado.lerPresencasRodada(),
    deps.legado.lerSubstituicoesRodada(),
  ]);

  const atletaIdPorChave = new Map<string, string>();
  const pontuacaoAtualPorAtletaId = new Map<
    string,
    { tabelaOrigem: "goleiros" | "jogadores"; idOrigem: string; pontuacaoAtual: number }
  >();
  const pontuacaoInicialPorAtletaId = new Map<string, number>();

  const resumoGoleiros = await migrarAtletas(
    deps,
    TABELA_GOLEIROS,
    "Goleiro",
    goleiros,
    atletaIdPorChave,
    pontuacaoAtualPorAtletaId,
    pontuacaoInicialPorAtletaId,
  );
  const resumoJogadores = await migrarAtletas(
    deps,
    TABELA_JOGADORES,
    "Linha",
    jogadores,
    atletaIdPorChave,
    pontuacaoAtualPorAtletaId,
    pontuacaoInicialPorAtletaId,
  );

  const rodadaIdPorData = new Map<string, string>();
  const resumoRodadas = await migrarRodadas(deps, rodadas, rodadaIdPorData);

  const divergenciasRegistro: DivergenciaRegistro[] = [];
  const pontosPorAtletaId = new Map<string, number>();
  const resumoPresencas = await migrarPresencas(
    deps,
    presencas,
    atletaIdPorChave,
    rodadaIdPorData,
    divergenciasRegistro,
    pontosPorAtletaId,
  );

  const resumoSubstituicoes = await migrarSubstituicoes(
    deps,
    substituicoes,
    divergenciasRegistro,
  );

  const validacaoSaldoAtletas = calcularValidacaoSaldo(
    pontuacaoAtualPorAtletaId,
    pontuacaoInicialPorAtletaId,
    pontosPorAtletaId,
  );

  return {
    geradoEm: new Date().toISOString(),
    resumoPorTabela: [
      resumoGoleiros,
      resumoJogadores,
      resumoRodadas,
      resumoPresencas,
      resumoSubstituicoes,
    ],
    divergenciasRegistro,
    divergenciasEstruturais: [...DIVERGENCIAS_ESTRUTURAIS],
    decisoesDeDetalhe: [...DECISOES_DE_DETALHE],
    validacaoSaldoAtletas,
  };
}
