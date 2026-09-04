/**
 * Orquestração de escrita do CRUD de Restrições Obrigatórias (BE-12,
 * RF-05.5) — combina a checagem de existência dos dois atletas do par com a
 * gravação em `app.restricao_obrigatoria` (`repository.ts`). Separado dos
 * Route Handlers (`app/api/restricoes/*`) para ser testável sem montar um
 * `Request`/`NextResponse` — mesmo racional de `src/modules/atletas/mutate.ts`.
 *
 * RN-12 (sem hierarquia/permissão diferenciada — "qualquer sessão válida
 * pode criar/editar/desativar"): nenhuma função aqui recebe ou verifica
 * identidade de quem chama — a única verificação de autorização de toda a
 * área interna é "sessão válida ou não", já resolvida pelo middleware
 * (`middleware.ts`, BE-04) antes mesmo do Route Handler ser alcançado; este
 * módulo não teria como diferenciar um "organizador" de outro mesmo se
 * quisesse (RN-12/GUARDRAILS.md regra 18 — nenhum campo de autor
 * individual em nenhum lugar do sistema).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  atualizarRestricaoPorId,
  buscarApelidosAtletas,
  desativarRestricaoPorId,
  inserirRestricao,
  reativarRestricaoPorId,
  type RestricaoObrigatoriaRow,
} from "./repository";
import type { RestricaoBody } from "./validation";

/**
 * Dois union types distintos (em vez de um único com os três casos e a
 * chamadora ignorando o que não se aplica) — mesmo racional de
 * `ResultadoCriacaoAtleta`/`ResultadoAtualizacaoAtleta` em
 * `src/modules/atletas/mutate.ts` (BE-06): `criarRestricao` nunca retorna
 * `"nao_encontrada"` (criação não busca por id), então mantê-lo fora do
 * tipo permite ao Route Handler de `POST` tratar só os dois casos que
 * podem de fato acontecer, sem `switch` morto nem `as`.
 */
export type ResultadoCriacaoRestricao =
  | { tipo: "sucesso"; restricao: RestricaoObrigatoriaRow }
  | { tipo: "atleta_nao_encontrado"; atletaId: string };

export type ResultadoEdicaoRestricao =
  | { tipo: "sucesso"; restricao: RestricaoObrigatoriaRow }
  | { tipo: "atleta_nao_encontrado"; atletaId: string }
  | { tipo: "nao_encontrada" };

export type ResultadoAlternarAtivoRestricao =
  { tipo: "sucesso"; restricao: RestricaoObrigatoriaRow } | { tipo: "nao_encontrada" };

/**
 * Devolve o primeiro id de `dados` que NÃO existe em `app.atleta`, ou
 * `null` se os dois existirem — usado por `criarRestricao`/`editarRestricao`
 * para recusar com uma mensagem clara em vez de deixar a `FK` do banco
 * (`references app.atleta (id)`, BE-02) estourar como erro genérico
 * `23503`.
 */
async function encontrarAtletaInexistente(
  client: SupabaseClient<any, any, any>,
  dados: RestricaoBody,
): Promise<string | null> {
  const apelidos = await buscarApelidosAtletas(client, [
    dados.atleta_a_id,
    dados.atleta_b_id,
  ]);
  if (!apelidos.has(dados.atleta_a_id)) {
    return dados.atleta_a_id;
  }
  if (!apelidos.has(dados.atleta_b_id)) {
    return dados.atleta_b_id;
  }
  return null;
}

/**
 * Cria uma restrição obrigatória (RF-05.5 — "cadastrar"). Não verifica
 * duplicidade de par já existente (ao contrário de RF-01.5 para
 * `nome_completo` de atleta) — decisão de detalhe, não escalada: nem
 * RF-05.5 nem RN-11 pedem esse alerta, e um par duplicado no grafo de
 * conflito do ADR-010 é inofensivo por construção (aresta repetida não
 * muda o resultado da checagem de coloração por componente conexo).
 */
export async function criarRestricao(
  client: SupabaseClient<any, any, any>,
  dados: RestricaoBody,
): Promise<ResultadoCriacaoRestricao> {
  const atletaInexistente = await encontrarAtletaInexistente(client, dados);
  if (atletaInexistente) {
    return { tipo: "atleta_nao_encontrado", atletaId: atletaInexistente };
  }
  const restricao = await inserirRestricao(client, dados);
  return { tipo: "sucesso", restricao };
}

/** Edita o par `(atleta_a_id, atleta_b_id)` de uma restrição já cadastrada (RF-05.5 — "editar"). */
export async function editarRestricao(
  client: SupabaseClient<any, any, any>,
  id: string,
  dados: RestricaoBody,
): Promise<ResultadoEdicaoRestricao> {
  const atletaInexistente = await encontrarAtletaInexistente(client, dados);
  if (atletaInexistente) {
    return { tipo: "atleta_nao_encontrado", atletaId: atletaInexistente };
  }
  const restricao = await atualizarRestricaoPorId(client, id, dados);
  if (!restricao) {
    return { tipo: "nao_encontrada" };
  }
  return { tipo: "sucesso", restricao };
}

/** Desativa uma restrição (RF-05.5/RN-11 — soft-delete, nunca exclusão física). */
export async function desativarRestricao(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<ResultadoAlternarAtivoRestricao> {
  const restricao = await desativarRestricaoPorId(client, id);
  if (!restricao) {
    return { tipo: "nao_encontrada" };
  }
  return { tipo: "sucesso", restricao };
}

/** Reativa uma restrição desativada (ver nota de decisão em `repository.ts#reativarRestricaoPorId`). */
export async function reativarRestricao(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<ResultadoAlternarAtivoRestricao> {
  const restricao = await reativarRestricaoPorId(client, id);
  if (!restricao) {
    return { tipo: "nao_encontrada" };
  }
  return { tipo: "sucesso", restricao };
}
