/**
 * Fixtures de teste do BE-15 — reproduzem fielmente a ESTRUTURA da schema
 * legada real documentada em `LEGADO-SCHEMA.md` (sem nenhum dado pessoal
 * real, nomes/telefones fictícios) e incluem pelo menos um caso de cada
 * divergência D1-D7 (Seção 6 de `LEGADO-SCHEMA.md`), com ênfase em D1
 * (presenças órfãs de rodada, 24% dos dados reais).
 *
 * Restrição de governança (GUARDRAILS.md regra 35/BLOCKER-003, TASK.md Seção
 * 3.1/BE-15): este arquivo é a ÚNICA fonte de dado usada pelos testes deste
 * módulo — nenhum teste deste projeto conecta à schema legada real
 * (`ipnbdrejlikrmqyxggsp`) nem usa `LEGACY_SUPABASE_*`.
 *
 * Também expõe um ambiente fake em memória (`criarAmbienteFake`) que
 * implementa `LegadoReader`/`RegistroMigracaoStore`/`AppWriter` — permite
 * testar `migrarLegado` (incluindo idempotência entre duas chamadas
 * sucessivas, reusando o MESMO estado) sem nenhum I/O real.
 */
import type {
  AppWriter,
  GoleiroLegado,
  JogadorLegado,
  LegadoReader,
  MigracaoDeps,
  NovoAtletaMigrado,
  NovoEventoJogoMigrado,
  NovoLancamentoMigrado,
  NovoRegistroMigracao,
  NovaParticipacaoMigrada,
  NovaRodadaMigrada,
  PresencaRodadaLegada,
  RegistroMigracaoExistente,
  RodadaLegada,
  SubstituicaoRodadaLegada,
} from "../tipos";

/**
 * Conjunto de dados fixo reproduzindo a estrutura real (LEGADO-SCHEMA.md
 * Seção 2), com as seguintes divergências propositalmente presentes:
 *
 * - **D1**: presenças `id=200`/`id=201`, `data_rodada` sem rodada
 *   correspondente, `status=null` (mesmo padrão real: 100% das órfãs têm
 *   status nulo).
 * - **D2**: `goleiros`/`jogadores` são tabelas separadas (discriminador
 *   implícito por tabela de origem) — inerente à própria fixture, sem campo
 *   extra necessário.
 * - **D3**: nenhuma linha tem `consentimento_responsavel_obtido` (a coluna
 *   nem existe no legado) — inerente à ausência do campo nos tipos legados.
 * - **D4**: `jogador 10`/`11` têm `visao_jogo`/`passe`/etc. e
 *   `posicoes_preferidas` preenchidos.
 * - **D5**: `rodadas` têm `formacao = "4-3-3"`.
 * - **D6**: todas as presenças têm `posicao = null` (padrão real).
 * - **D7**: presença `id=103` tem `time = "Colete"` preenchido (cobertura
 *   baixa nos dados reais, ~2,9%).
 *
 * Também inclui casos que NÃO existem nos dados reais (0 ocorrências reais,
 * mas exigidos pela estrutura): `gols_marcados > 0` (`id=104`) e
 * `cartao_amarelo > 0` (`id=104`), para exercitar a criação de
 * `app.evento_jogo` mesmo sem exemplo real disponível.
 */
export function criarDadosLegadosFixture(): {
  goleiros: GoleiroLegado[];
  jogadores: JogadorLegado[];
  rodadas: RodadaLegada[];
  presencas: PresencaRodadaLegada[];
  substituicoes: SubstituicaoRodadaLegada[];
} {
  const goleiros: GoleiroLegado[] = [
    {
      id: 1,
      nome: "Goleiro Fixture Um",
      telefone: "11900000001",
      pontuacao_inicial: 0,
      pontuacao_atual: 0, // sem presenças migradas -> saldo calculado = 0 (bate)
      criado_em: "2026-01-01T00:00:00Z",
      data_nascimento: null, // padrão real: 100% dos goleiros com data_nascimento nula
    },
    {
      id: 2,
      nome: "Goleiro Fixture Dois",
      telefone: "11900000002",
      pontuacao_inicial: 0,
      pontuacao_atual: 2, // 1 presença migrada com pontos_ganhos=2 -> bate
      criado_em: "2026-01-01T00:00:00Z",
      data_nascimento: null,
    },
  ];

  const jogadores: JogadorLegado[] = [
    {
      id: 10,
      nome: "Jogador Fixture Dez",
      telefone: "11900000010",
      pontuacao_inicial: 100,
      pontuacao_atual: 103, // 100 + (3 presente + 0 ausente) -- órfã (id=200) não conta
      criado_em: "2026-01-01T00:00:00Z",
      visao_jogo: 7,
      passe: 6,
      preparo_fisico: 8,
      drible: 5,
      chute: 6,
      desarme: 7,
      idade: 30,
      posicoes_preferidas: ["ZAG", "LAT"],
      data_nascimento: "1994-05-10",
    },
    {
      id: 11,
      nome: "Jogador Fixture Onze",
      telefone: "11900000011",
      pontuacao_inicial: 50,
      pontuacao_atual: 55, // 50 + (3 lesionado + 2 presente/vermelho)
      criado_em: "2026-01-01T00:00:00Z",
      visao_jogo: 9,
      passe: 8,
      preparo_fisico: 6,
      drible: 9,
      chute: 7,
      desarme: 3,
      idade: 25,
      posicoes_preferidas: ["MEI", "ATA"],
      data_nascimento: "1999-02-20",
    },
    {
      id: 12,
      nome: "Jogador Fixture Doze (orfao)",
      telefone: "11900000012",
      pontuacao_inicial: 20,
      // Legado real registra 23 (inclui os pontos de uma presença cuja
      // rodada foi deletada, D1) — saldo calculado pós-migração fica em 20
      // (a presença órfã nunca é migrada), então este atleta é o caso de
      // teste de `validacaoSaldoAtletas` com `ok: false`, consequência
      // ESPERADA e documentada de D1, nunca escondida do relatório.
      pontuacao_atual: 23,
      criado_em: "2026-01-01T00:00:00Z",
      visao_jogo: 4,
      passe: 4,
      preparo_fisico: 5,
      drible: 4,
      chute: 3,
      desarme: 6,
      idade: 22,
      posicoes_preferidas: null,
      data_nascimento: "2002-11-01",
    },
  ];

  const rodadas: RodadaLegada[] = [
    {
      id: 5,
      data_rodada: "2026-06-07",
      nome_time_a: "",
      nome_time_b: "",
      formacao: "4-3-3",
      criado_em: "2026-06-01T00:00:00Z",
    },
    {
      id: 6,
      data_rodada: "2026-06-14",
      nome_time_a: "Colete",
      nome_time_b: "Sem Colete",
      formacao: "4-3-3",
      criado_em: "2026-06-08T00:00:00Z",
    },
  ];

  const presencas: PresencaRodadaLegada[] = [
    // Jogador 10, rodada 5 (2026-06-07): presente, sem eventos.
    {
      id: 100,
      data_rodada: "2026-06-07",
      atleta_id: 10,
      tipo_atleta: "Linha",
      presente: true,
      gols_marcados: 0,
      cartao_amarelo: 0,
      cartao_vermelho: false,
      pontos_ganhos: 3, // fórmula legada: presente = 3
      status: "presente",
      posicao: null,
      time: null,
    },
    // Jogador 10, rodada 6 (2026-06-14): ausente.
    {
      id: 101,
      data_rodada: "2026-06-14",
      atleta_id: 10,
      tipo_atleta: "Linha",
      presente: false,
      gols_marcados: 0,
      cartao_amarelo: 0,
      cartao_vermelho: false,
      pontos_ganhos: 0,
      status: "ausente",
      posicao: null,
      time: null,
    },
    // Jogador 11, rodada 5: lesionado — RN-13: preserva pontos_ganhos=3
    // (fórmula legada trata lesionado igual a presente), NUNCA recalculado
    // para o valor RN-05 vigente (presença = 2).
    {
      id: 102,
      data_rodada: "2026-06-07",
      atleta_id: 11,
      tipo_atleta: "Linha",
      presente: true,
      gols_marcados: 0,
      cartao_amarelo: 0,
      cartao_vermelho: false,
      pontos_ganhos: 3,
      status: "lesionado",
      posicao: null,
      time: null,
    },
    // Jogador 11, rodada 6: presente + cartão vermelho — fórmula legada
    // reduz de 3 para 2 (penalidade de 1); RN-05 vigente daria -1
    // (2 de presença - 3 de vermelho) — valor bem diferente, ótimo para
    // provar que não houve recálculo. `time` preenchido (Divergência D7).
    {
      id: 103,
      data_rodada: "2026-06-14",
      atleta_id: 11,
      tipo_atleta: "Linha",
      presente: true,
      gols_marcados: 0,
      cartao_amarelo: 0,
      cartao_vermelho: true,
      pontos_ganhos: 2,
      status: "presente",
      posicao: null,
      time: "Colete",
    },
    // Goleiro 2, rodada 5: presente + gol + cartão amarelo (0 ocorrências
    // reais para esses dois eventos, mas a estrutura precisa ser validada).
    {
      id: 104,
      data_rodada: "2026-06-07",
      atleta_id: 2,
      tipo_atleta: "Goleiro",
      presente: true,
      gols_marcados: 1,
      cartao_amarelo: 1,
      cartao_vermelho: false,
      pontos_ganhos: 2,
      status: "presente",
      posicao: null,
      time: null,
    },
    // --- Divergência D1: presenças órfãs (data_rodada sem rodada
    // correspondente), status nulo — mesmo padrão empírico 100% dos dados
    // reais (LEGADO-SCHEMA.md Seção 3).
    {
      id: 200,
      data_rodada: "2026-05-03",
      atleta_id: 10,
      tipo_atleta: "Linha",
      presente: false,
      gols_marcados: 0,
      cartao_amarelo: 0,
      cartao_vermelho: false,
      pontos_ganhos: 0,
      status: null,
      posicao: null,
      time: null,
    },
    {
      id: 201,
      data_rodada: "2026-05-10",
      atleta_id: 12,
      tipo_atleta: "Linha",
      presente: false,
      gols_marcados: 0,
      cartao_amarelo: 0,
      cartao_vermelho: false,
      pontos_ganhos: 0,
      status: null,
      posicao: null,
      time: null,
    },
  ];

  // Tabela sempre vazia nos dados reais (LEGADO-SCHEMA.md Seção 2.5) — uma
  // linha aqui só para provar que o script NÃO a descarta silenciosamente
  // caso apareça (defensivo, não um cenário real esperado).
  const substituicoes: SubstituicaoRodadaLegada[] = [
    {
      id: 1,
      data_rodada: "2026-06-07",
      time: "Colete",
      atleta_saindo_id: 10,
      tipo_atleta_saindo: "Linha",
      atleta_entrando_id: 11,
      tipo_atleta_entrando: "Linha",
    },
  ];

  return { goleiros, jogadores, rodadas, presencas, substituicoes };
}

// ---------------------------------------------------------------------------
// Ambiente fake em memória — implementa as três interfaces de `MigracaoDeps`
// sem nenhum I/O real. `armazem` é intencionalmente exposto para os testes
// inspecionarem o estado final (contagens, valores exatos de
// `pontos_delta`, etc.).
// ---------------------------------------------------------------------------

export type ArmazemFake = {
  atletas: (NovoAtletaMigrado & { id: string })[];
  rodadas: (NovaRodadaMigrada & { id: string })[];
  participacoes: (NovaParticipacaoMigrada & { id: string })[];
  eventos: NovoEventoJogoMigrado[];
  lancamentos: NovoLancamentoMigrado[];
  registros: RegistroMigracaoExistente[];
};

function criarArmazemVazio(): ArmazemFake {
  return {
    atletas: [],
    rodadas: [],
    participacoes: [],
    eventos: [],
    lancamentos: [],
    registros: [],
  };
}

let contador = 0;
function proximoId(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${contador}`;
}

function criarLegadoReaderFake(
  dados: ReturnType<typeof criarDadosLegadosFixture>,
): LegadoReader {
  return {
    async lerGoleiros() {
      return dados.goleiros;
    },
    async lerJogadores() {
      return dados.jogadores;
    },
    async lerRodadas() {
      return dados.rodadas;
    },
    async lerPresencasRodada() {
      return dados.presencas;
    },
    async lerSubstituicoesRodada() {
      return dados.substituicoes;
    },
  };
}

function criarRegistroStoreFake(armazem: ArmazemFake) {
  const store: import("../tipos").RegistroMigracaoStore = {
    async listarPorTabela(tabelaOrigem: string) {
      return armazem.registros.filter((r) => r.tabela_origem === tabelaOrigem);
    },
    async gravar(registro: NovoRegistroMigracao) {
      const indice = armazem.registros.findIndex(
        (r) =>
          r.tabela_origem === registro.tabela_origem &&
          r.id_origem === registro.id_origem,
      );
      if (indice === -1) {
        armazem.registros.push({ ...registro });
      } else {
        armazem.registros[indice] = { ...registro };
      }
    },
  };
  return store;
}

function criarAppWriterFake(armazem: ArmazemFake): AppWriter {
  return {
    async inserirAtleta(dadosAtleta) {
      const id = proximoId("atleta");
      armazem.atletas.push({ ...dadosAtleta, id });
      return id;
    },
    async inserirRodada(dadosRodada) {
      const id = proximoId("rodada");
      armazem.rodadas.push({ ...dadosRodada, id });
      return id;
    },
    async inserirParticipacaoRodada(dadosParticipacao) {
      const id = proximoId("participacao");
      armazem.participacoes.push({ ...dadosParticipacao, id });
      return id;
    },
    async inserirEventoJogo(dadosEvento) {
      armazem.eventos.push({ ...dadosEvento });
    },
    async inserirLancamentoPontos(dadosLancamento) {
      armazem.lancamentos.push({ ...dadosLancamento });
    },
  };
}

/**
 * Cria um ambiente fake completo, com estado (`armazem`) que PERSISTE entre
 * chamadas — condição necessária para o teste de idempotência (reexecutar
 * `migrarLegado` com o MESMO `deps`/`armazem` e comprovar que nada duplica).
 */
export function criarAmbienteFake(
  dados: ReturnType<typeof criarDadosLegadosFixture> = criarDadosLegadosFixture(),
): { deps: MigracaoDeps; armazem: ArmazemFake } {
  const armazem = criarArmazemVazio();
  const deps: MigracaoDeps = {
    legado: criarLegadoReaderFake(dados),
    registro: criarRegistroStoreFake(armazem),
    app: criarAppWriterFake(armazem),
  };
  return { deps, armazem };
}
