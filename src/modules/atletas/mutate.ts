/**
 * Orquestração de escrita do Serviço de Atletas (BE-06) — combina a checagem
 * de duplicidade (RF-01.5, `validation.ts`) com a gravação em `app.atleta`
 * (`repository.ts`). Separado dos Route Handlers (`app/api/atletas/*`) para
 * ser testável sem montar um `Request`/`NextResponse` — mesmo racional de
 * `src/modules/autenticacao/redefinir-senha.ts`.
 *
 * Fluxo de duplicidade (UX-SPEC.md T04 — "modal de confirmação aparece antes
 * de permitir salvar"): se houver `nome_completo` duplicado entre os
 * atletas ativos e o corpo da requisição não trouxer
 * `confirmar_duplicidade: true`, a escrita é recusada com `tipo:
 * "duplicidade"` (o Route Handler traduz isso em `409`) — o Frontend exibe o
 * modal e reenvia a mesma requisição com `confirmar_duplicidade: true`
 * depois da confirmação do organizador. Nunca um bloqueio definitivo (RF-01.5
 * é um alerta, não uma regra de unicidade — não há `UNIQUE` em
 * `nome_completo` no schema, BE-02).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  atualizarAtletaPorId,
  inserirAtleta,
  listarNomesAtivos,
  type AtletaRow,
} from "./repository";
import {
  derivarApelidoExibicao,
  encontrarDuplicatasDeNome,
  type AtletaBody,
} from "./validation";

export type DuplicataAtleta = { id: string; nome_completo: string };

/**
 * Dois union types distintos (em vez de um único com os três casos e a
 * chamadora ignorando o que não se aplica): `criarAtletaComDuplicidade`
 * nunca retorna `"nao_encontrado"` (criação não busca por id) — manter isso
 * explícito no tipo permite ao Route Handler de `POST` tratar só os dois
 * casos que podem de fato acontecer, sem `switch` morto nem `as`.
 */
export type ResultadoCriacaoAtleta =
  | { tipo: "sucesso"; atleta: AtletaRow }
  | { tipo: "duplicidade"; duplicatas: DuplicataAtleta[] };

export type ResultadoAtualizacaoAtleta =
  | { tipo: "sucesso"; atleta: AtletaRow }
  | { tipo: "duplicidade"; duplicatas: DuplicataAtleta[] }
  | { tipo: "nao_encontrado" };

function paraNovoAtleta(dados: AtletaBody) {
  return {
    nome_completo: dados.nome_completo,
    // RF-01.2/RN-06: apelido em branco usa o primeiro nome de `nome_completo`.
    apelido_exibicao:
      dados.apelido_exibicao ?? derivarApelidoExibicao(dados.nome_completo),
    contato: dados.contato ?? null,
    data_nascimento: dados.data_nascimento,
    consentimento_responsavel_obtido: dados.consentimento_responsavel_obtido,
    pontuacao_inicial: dados.pontuacao_inicial,
  };
}

/** Cria um atleta (RF-01.1), aplicando o alerta de duplicidade (RF-01.5). */
export async function criarAtletaComDuplicidade(
  client: SupabaseClient<any, any, any>,
  dados: AtletaBody,
): Promise<ResultadoCriacaoAtleta> {
  const nomesAtivos = await listarNomesAtivos(client);
  const duplicatas = encontrarDuplicatasDeNome(dados.nome_completo, nomesAtivos);
  if (duplicatas.length > 0 && !dados.confirmar_duplicidade) {
    return { tipo: "duplicidade", duplicatas };
  }
  const atleta = await inserirAtleta(client, paraNovoAtleta(dados));
  return { tipo: "sucesso", atleta };
}

/**
 * Atualiza um atleta já cadastrado (RF-01.6), reaplicando a mesma checagem de
 * duplicidade e de idade/consentimento (`atletaBodySchema`) usadas na
 * criação — RF-01.3/RF-01.5 não dizem "só no cadastro inicial", e o
 * UX-SPEC.md (T04) usa o mesmo formulário para as duas operações.
 */
export async function atualizarAtletaComDuplicidade(
  client: SupabaseClient<any, any, any>,
  id: string,
  dados: AtletaBody,
): Promise<ResultadoAtualizacaoAtleta> {
  const nomesAtivos = await listarNomesAtivos(client);
  const duplicatas = encontrarDuplicatasDeNome(dados.nome_completo, nomesAtivos, id);
  if (duplicatas.length > 0 && !dados.confirmar_duplicidade) {
    return { tipo: "duplicidade", duplicatas };
  }
  const atleta = await atualizarAtletaPorId(client, id, paraNovoAtleta(dados));
  if (!atleta) {
    return { tipo: "nao_encontrado" };
  }
  return { tipo: "sucesso", atleta };
}
