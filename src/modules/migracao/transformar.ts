/**
 * Funções puras de transformação legado→`app` e catálogo fixo de divergências
 * estruturais/decisões de detalhe (BE-15, RF-08.3/RF-08.5).
 *
 * Nenhuma função aqui faz I/O — todas recebem uma linha legada já lida e
 * devolvem o payload pronto para `AppWriter`, ou `null` quando a linha não
 * pode ser mapeada sem informação adicional (resolvida pelo orquestrador,
 * `migrar.ts`).
 *
 * Mapeamento campo a campo conforme `LEGADO-SCHEMA.md` Seção 5.
 */
import type {
  DivergenciaEstrutural,
  GoleiroLegado,
  JogadorLegado,
  NovoAtletaMigrado,
  NovaRodadaMigrada,
  RodadaLegada,
  TipoAtletaLegado,
} from "./tipos";

/**
 * D3 (`LEGADO-SCHEMA.md`): `consentimento_responsavel_obtido` não existe no
 * legado. Decisão conservadora desta execução — nasce `false`/pendente
 * (exige confirmação manual pós-migração), nunca `true` assumido em bloco,
 * porque afirmar consentimento sem evidência real seria "inventar dado"
 * (proibido pelo critério de aceite literal de BE-15) — mesmo quando a
 * ausência de dado é o próprio problema. Reversível: o organizador confirma
 * um a um depois, sem precisar reexecutar a migração.
 */
export const CONSENTIMENTO_RESPONSAVEL_PADRAO = false;

/**
 * Sem correspondência no legado (nenhuma tabela tem flag de ativo/inativo) —
 * decisão sugerida em `LEGADO-SCHEMA.md` Seção 5.1, sujeita a confirmação do
 * organizador: todo atleta migrado nasce `ativo = true`.
 */
export const ATIVO_PADRAO = true;

/** Sem correspondência no legado — toda rodada migrada nasce com status final. */
export const STATUS_RODADA_PADRAO: NovaRodadaMigrada["status"] = "lancada";

export function mapearAtletaLegado(
  linha: GoleiroLegado | JogadorLegado,
): NovoAtletaMigrado {
  return {
    nome_completo: linha.nome,
    // `apelido_exibicao` é `NOT NULL` em `app.atleta` (BE-02) mas não existe
    // no legado (`LEGADO-SCHEMA.md` 5.1: "campo novo... fica vazio/null até
    // o organizador preencher"). Como a coluna física não aceita `null`,
    // decisão de detalhe (documentada, não escalada — reaproveita dado real
    // já existente, não inventa conteúdo novo): usa o próprio `nome` como
    // valor inicial, editável depois pelo organizador (RF-01/T04).
    apelido_exibicao: linha.nome,
    contato: linha.telefone,
    data_nascimento: linha.data_nascimento,
    consentimento_responsavel_obtido: CONSENTIMENTO_RESPONSAVEL_PADRAO,
    pontuacao_inicial: linha.pontuacao_inicial,
    ativo: ATIVO_PADRAO,
  };
}

export function mapearRodadaLegada(linha: RodadaLegada): NovaRodadaMigrada {
  return {
    data: linha.data_rodada,
    status: STATUS_RODADA_PADRAO,
  };
}

export function chaveAtletaLegado(tipo: TipoAtletaLegado, idLegado: number): string {
  return `${tipo}:${idLegado}`;
}

/**
 * Catálogo fixo das divergências D2, D3, D4, D5, D6, D7 (`LEGADO-SCHEMA.md`
 * Seção 6) — sempre presente no relatório de conferência (RF-08.5),
 * independente dos dados de uma execução específica, porque são divergências
 * de MAPEAMENTO DE CAMPO (estruturais), não de linha individual (só D1 varia
 * por execução — ver `migrar.ts`). Nenhuma foi decidida unilateralmente por
 * este módulo; continuam pendentes de confirmação explícita do organizador
 * (RF-08.3), exceto onde note explicitamente uma decisão de detalhe já
 * tomada por este módulo (D3).
 */
export const DIVERGENCIAS_ESTRUTURAIS: readonly DivergenciaEstrutural[] = [
  {
    codigo: "D2",
    descricao:
      "Discriminador tipo_atleta ('Linha'/'Goleiro') não tem campo equivalente " +
      "em app.atleta — 56 atletas reais afetados (goleiros). Informação de " +
      "origem preservada apenas via legado_migracao_registro.tabela_origem " +
      "('goleiros'/'jogadores'), não como coluna de app.atleta. Pendente " +
      "confirmação do organizador (LEGADO-SCHEMA.md D2, RF-01).",
  },
  {
    codigo: "D3",
    descricao:
      "consentimento_responsavel_obtido (RN-02) não existe no legado. " +
      `Decisão desta execução: todo atleta migrado nasce com o valor ` +
      `${CONSENTIMENTO_RESPONSAVEL_PADRAO} (pendente), nunca assumido true em ` +
      "bloco — exige confirmação manual pós-migração, um a um, pelo " +
      "organizador (LEGADO-SCHEMA.md D3).",
  },
  {
    codigo: "D4",
    descricao:
      "Atributos de habilidade (visao_jogo, passe, preparo_fisico, drible, " +
      "chute, desarme) e posicoes_preferidas não têm campo em app.atleta — " +
      "não migrados nesta versão do script (RN-03 já deriva nível técnico de " +
      "pontos por presença, não de nota manual). Risco residual: esse " +
      "histórico de avaliação de 42 jogadores some definitivamente quando a " +
      "schema legada for arquivada (RF-08.6) se não for exportado à parte — " +
      "sinalizado ao organizador (LEGADO-SCHEMA.md D4).",
  },
  {
    codigo: "D5",
    descricao:
      "rodadas.formacao ('4-3-3' em 100% das linhas reais) não tem campo em " +
      "app.rodada/app.time — não migrado (LEGADO-SCHEMA.md D5).",
  },
  {
    codigo: "D6",
    descricao:
      "presencas_rodada.posicao (sempre null nos dados reais) não tem campo " +
      "em app.participacao_rodada — não migrado, impacto real nulo " +
      "(LEGADO-SCHEMA.md D6).",
  },
  {
    codigo: "D7",
    descricao:
      "presencas_rodada.time (qual time o atleta jogou, ~2,9% de cobertura, " +
      "texto livre não confiável) e a composição de times " +
      "(rodadas.nome_time_a/nome_time_b) NÃO são migrados nesta versão do " +
      "script — decisão desta execução, dado não confiável demais para " +
      "gerar app.time/app.time_atleta automaticamente. app.time/" +
      "app.time_atleta/app.substituicao nascem vazios para toda rodada " +
      "migrada do legado; times precisam ser remontados pelo organizador na " +
      "área nova quando necessário (LEGADO-SCHEMA.md D7). Consequência " +
      "direta: nenhuma linha de substituicoes_rodada pode ser migrada " +
      "automaticamente (dependeria de app.time_id), mesmo que a tabela " +
      "legada não esteja vazia — qualquer linha encontrada é listada como " +
      "divergência, nunca descartada silenciosamente.",
  },
];

/**
 * Decisões de detalhe já tomadas por este módulo (documentadas, não
 * escaladas ao Tech Lead — TASK.md Seção 1.0/BE-15 guardrails: desvio
 * pequeno, não muda o resultado de forma ambígua) — distintas das
 * divergências acima porque NÃO exigem confirmação do organizador para o
 * script rodar (mas continuam visíveis no relatório, nunca uma lacuna
 * silenciosa).
 */
export const DECISOES_DE_DETALHE: readonly string[] = [
  "app.atleta.apelido_exibicao (NOT NULL, sem correspondência no legado) " +
    "nasce igual a nome_completo — editável depois pelo organizador (T04).",
  `app.atleta.ativo (sem correspondência no legado) nasce ${ATIVO_PADRAO} para ` +
    "todo atleta migrado.",
  `app.rodada.status (sem correspondência no legado) nasce '${STATUS_RODADA_PADRAO}' ` +
    "para toda rodada migrada (RF-04 trata como rodada já encerrada).",
  "jogadores.idade não é migrado como coluna própria — é redundante com " +
    "data_nascimento (app deriva idade em tempo de leitura, RF-05.3).",
  "presencas_rodada.presente (boolean) não é migrado como campo próprio — " +
    "redundante com status ('presente'/'lesionado' já cobrem a informação).",
  "migrations (tabela de controle do framework legado, 8 linhas) não é " +
    "migrada — não é dado de domínio (LEGADO-SCHEMA.md Seção 1).",
];
