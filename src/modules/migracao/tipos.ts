/**
 * Tipos do Serviço de Migração do Legado (BE-15, RF-08, ADR-008) — schema
 * legada real documentada em `LEGADO-SCHEMA.md` (SPK-01) e schema `app`
 * destino documentada em `SDD.md` Seção 5 / migrations de BE-02.
 *
 * Nomes de campo em português, mesmos literais das colunas reais das duas
 * schemas (facilita rastrear cada linha de código até a linha correspondente
 * de `LEGADO-SCHEMA.md`).
 */

// ---------------------------------------------------------------------------
// Linhas da schema legada (`public`, projeto Supabase legado — LEGADO-SCHEMA.md
// Seção 2). Tipos de leitura apenas — este módulo nunca escreve na schema
// legada (GUARDRAILS.md regra 11, ADR-008: só leitura).
// ---------------------------------------------------------------------------

export type GoleiroLegado = {
  id: number;
  nome: string;
  telefone: string;
  pontuacao_inicial: number;
  pontuacao_atual: number;
  criado_em: string;
  data_nascimento: string | null;
};

export type JogadorLegado = {
  id: number;
  nome: string;
  telefone: string;
  pontuacao_inicial: number;
  pontuacao_atual: number;
  criado_em: string;
  visao_jogo: number | null;
  passe: number | null;
  preparo_fisico: number | null;
  drible: number | null;
  chute: number | null;
  desarme: number | null;
  idade: number | null;
  posicoes_preferidas: string[] | null;
  data_nascimento: string;
};

export type RodadaLegada = {
  id: number;
  data_rodada: string;
  nome_time_a: string | null;
  nome_time_b: string | null;
  formacao: string | null;
  criado_em: string;
};

export type TipoAtletaLegado = "Linha" | "Goleiro";

export type PresencaRodadaLegada = {
  id: number;
  data_rodada: string;
  atleta_id: number;
  tipo_atleta: TipoAtletaLegado;
  presente: boolean;
  gols_marcados: number;
  cartao_amarelo: number;
  cartao_vermelho: boolean;
  pontos_ganhos: number;
  // `status` é `nullable` na schema legada real — LEGADO-SCHEMA.md Seção 2.4
  // confirma empiricamente que TODA linha com `status = null` é uma das 184
  // linhas órfãs de `rodadas` (Divergência D1); tratado como tal por este
  // módulo, nunca como um quarto valor de enum válido.
  status: "presente" | "ausente" | "lesionado" | null;
  posicao: string | null;
  time: string | null;
};

export type SubstituicaoRodadaLegada = {
  id: number;
  data_rodada: string;
  time: string | null;
  atleta_saindo_id: number;
  tipo_atleta_saindo: TipoAtletaLegado;
  atleta_entrando_id: number;
  tipo_atleta_entrando: TipoAtletaLegado;
};

// ---------------------------------------------------------------------------
// Leitura da schema legada (interface — implementação real em
// `deps-supabase.ts`; fixtures de teste implementam a mesma interface).
// ---------------------------------------------------------------------------

export interface LegadoReader {
  lerGoleiros(): Promise<GoleiroLegado[]>;
  lerJogadores(): Promise<JogadorLegado[]>;
  lerRodadas(): Promise<RodadaLegada[]>;
  lerPresencasRodada(): Promise<PresencaRodadaLegada[]>;
  lerSubstituicoesRodada(): Promise<SubstituicaoRodadaLegada[]>;
}

// ---------------------------------------------------------------------------
// `app.legado_migracao_registro` (SDD.md Seção 5; migration BE-02) — chave de
// idempotência: UNIQUE(tabela_origem, id_origem).
// ---------------------------------------------------------------------------

export type StatusRegistroMigracao = "pendente" | "migrado" | "divergencia" | "erro";

export type RegistroMigracaoExistente = {
  tabela_origem: string;
  id_origem: string;
  tabela_destino: string;
  id_destino: string | null;
  status: StatusRegistroMigracao;
  observacao: string | null;
};

export type NovoRegistroMigracao = {
  tabela_origem: string;
  id_origem: string;
  tabela_destino: string;
  id_destino: string | null;
  status: StatusRegistroMigracao;
  observacao: string | null;
};

export interface RegistroMigracaoStore {
  /** Estado atual de todos os registros já gravados para uma tabela de origem. */
  listarPorTabela(tabelaOrigem: string): Promise<RegistroMigracaoExistente[]>;
  /**
   * Grava (via `UPSERT` em `(tabela_origem, id_origem)`, nunca `INSERT` puro)
   * o mapeamento origem→destino de uma linha — chamada tanto para migração
   * bem-sucedida quanto para divergência/erro, nunca omitida (RF-08.3: nada
   * descartado silenciosamente).
   */
  gravar(registro: NovoRegistroMigracao): Promise<void>;
}

// ---------------------------------------------------------------------------
// Escrita na schema `app` (destino) — interface; implementação real em
// `deps-supabase.ts` via `getServiceRoleClient()`.
// ---------------------------------------------------------------------------

export type NovoAtletaMigrado = {
  nome_completo: string;
  apelido_exibicao: string;
  contato: string | null;
  data_nascimento: string | null;
  consentimento_responsavel_obtido: boolean;
  pontuacao_inicial: number;
  ativo: boolean;
};

export type NovaRodadaMigrada = {
  data: string;
  status: "lancada";
};

export type NovaParticipacaoMigrada = {
  rodada_id: string;
  atleta_id: string;
  status: "presente" | "ausente" | "lesionado";
};

export type NovoEventoJogoMigrado = {
  participacao_id: string;
  tipo: "gol" | "cartao_amarelo" | "cartao_vermelho";
  quantidade: number;
};

export type NovoLancamentoMigrado = {
  atleta_id: string;
  rodada_id: string;
  origem: "migracao_legado";
  pontos_delta: number;
};

export interface AppWriter {
  inserirAtleta(dados: NovoAtletaMigrado): Promise<string>;
  inserirRodada(dados: NovaRodadaMigrada): Promise<string>;
  inserirParticipacaoRodada(dados: NovaParticipacaoMigrada): Promise<string>;
  inserirEventoJogo(dados: NovoEventoJogoMigrado): Promise<void>;
  inserirLancamentoPontos(dados: NovoLancamentoMigrado): Promise<void>;
}

export interface MigracaoDeps {
  legado: LegadoReader;
  registro: RegistroMigracaoStore;
  app: AppWriter;
}

// ---------------------------------------------------------------------------
// Relatório de conferência (RF-08.5).
// ---------------------------------------------------------------------------

export type ResumoTabela = {
  tabelaOrigem: string;
  totalOrigem: number;
  migradosTotal: number;
  migradosNestaExecucao: number;
  jaMigradosAnteriormente: number;
  divergenciasTotal: number;
  errosTotal: number;
};

export type DivergenciaRegistro = {
  /** "D1" quando corresponde a uma divergência catalogada em LEGADO-SCHEMA.md; "D0" para achado defensivo não catalogado (não esperado nos dados reais). */
  codigo: "D1" | "D0";
  tabelaOrigem: string;
  idOrigem: string;
  motivo: string;
};

export type DivergenciaEstrutural = {
  codigo: "D2" | "D3" | "D4" | "D5" | "D6" | "D7";
  descricao: string;
};

export type ValidacaoSaldoAtleta = {
  tabelaOrigem: "goleiros" | "jogadores";
  idOrigem: string;
  atletaIdDestino: string;
  pontuacaoAtualLegado: number;
  saldoCalculadoPosMigracao: number;
  ok: boolean;
};

export type RelatorioConferencia = {
  geradoEm: string;
  resumoPorTabela: ResumoTabela[];
  divergenciasRegistro: DivergenciaRegistro[];
  divergenciasEstruturais: DivergenciaEstrutural[];
  decisoesDeDetalhe: string[];
  validacaoSaldoAtletas: ValidacaoSaldoAtleta[];
};
