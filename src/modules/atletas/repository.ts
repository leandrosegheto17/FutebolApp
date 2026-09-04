/**
 * Acesso a `app.atleta`/`app.atleta_nivel_tecnico` (BE-06) — sempre via
 * `getServiceRoleClient()` (TASK.md Seção 1.2/GUARDRAILS.md regra 6: `anon`
 * nunca escreve nem lê a tabela base; toda leitura/escrita passa pela
 * `service role` no servidor, atrás do middleware de sessão).
 *
 * Mesmo padrão de `src/modules/autenticacao/repository.ts` (BE-04): funções
 * finas, uma responsabilidade cada, recebendo o client Supabase já
 * construído (facilita teste de integração reutilizando o mesmo client de
 * seed).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type AtletaRow = {
  id: string;
  nome_completo: string;
  apelido_exibicao: string;
  contato: string | null;
  data_nascimento: string | null;
  consentimento_responsavel_obtido: boolean;
  pontuacao_inicial: number;
  ativo: boolean;
  anonimizado_em: string | null;
  criado_em: string;
};

export type NovoAtleta = {
  nome_completo: string;
  apelido_exibicao: string;
  contato: string | null;
  data_nascimento: string;
  consentimento_responsavel_obtido: boolean;
  pontuacao_inicial: number;
};

const ATLETA_COLUNAS =
  "id, nome_completo, apelido_exibicao, contato, data_nascimento, " +
  "consentimento_responsavel_obtido, pontuacao_inicial, ativo, anonimizado_em, criado_em";

/** Lista todos os atletas (área interna — inclui campos sensíveis), ordenados por nome. */
export async function listarAtletas(
  client: SupabaseClient<any, any, any>,
): Promise<AtletaRow[]> {
  const { data, error } = await client
    .from("atleta")
    .select(ATLETA_COLUNAS)
    .order("nome_completo", { ascending: true });
  if (error) {
    throw new Error(`Falha ao listar app.atleta: ${error.message}`);
  }
  return (data ?? []) as unknown as AtletaRow[];
}

/** Busca um atleta por id. `null` se não existir. */
export async function buscarAtletaPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<AtletaRow | null> {
  const { data, error } = await client
    .from("atleta")
    .select(ATLETA_COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao buscar app.atleta ${id}: ${error.message}`);
  }
  return (data as unknown as AtletaRow | null) ?? null;
}

/**
 * `id`/`nome_completo` de todos os atletas ativos — usado para a checagem de
 * duplicidade (RF-01.5, `encontrarDuplicatasDeNome` em `validation.ts`).
 * Busca todas as linhas em vez de filtrar por igualdade no banco porque a
 * comparação é normalizada (trim/espaço/caixa, `normalizarNomeCompleto`) —
 * grupo amador de porte pequeno (dezenas de atletas, não milhares), então
 * trazer a lista completa para comparar em memória é a solução mais simples
 * que satisfaz o critério de aceite (TASK.md Seção 1.0), sem exigir função
 * SQL de normalização dedicada.
 */
export async function listarNomesAtivos(
  client: SupabaseClient<any, any, any>,
): Promise<Array<{ id: string; nome_completo: string }>> {
  const { data, error } = await client
    .from("atleta")
    .select("id, nome_completo")
    .eq("ativo", true);
  if (error) {
    throw new Error(`Falha ao listar nomes de app.atleta: ${error.message}`);
  }
  return (data ?? []) as unknown as Array<{ id: string; nome_completo: string }>;
}

/** Insere um novo atleta. `pontuacao_inicial` inicializa o saldo acumulado (RF-01.1/RN-10). */
export async function inserirAtleta(
  client: SupabaseClient<any, any, any>,
  dados: NovoAtleta,
): Promise<AtletaRow> {
  const { data, error } = await client
    .from("atleta")
    .insert({
      nome_completo: dados.nome_completo,
      apelido_exibicao: dados.apelido_exibicao,
      contato: dados.contato,
      data_nascimento: dados.data_nascimento,
      consentimento_responsavel_obtido: dados.consentimento_responsavel_obtido,
      pontuacao_inicial: dados.pontuacao_inicial,
    })
    .select(ATLETA_COLUNAS)
    .single();
  if (error) {
    throw new Error(`Falha ao inserir app.atleta: ${error.message}`);
  }
  return data as unknown as AtletaRow;
}

/**
 * Atualiza os campos editáveis de um atleta (RF-01.6 — "editar qualquer
 * campo de um atleta já cadastrado"). Nunca altera `ativo`/`anonimizado_em`
 * (mecanismo próprio de BE-07, `anonimizar_atleta`, ADR-011, fora do escopo
 * desta tarefa). `null` se o id não existir (0 linhas afetadas).
 */
export async function atualizarAtletaPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
  dados: NovoAtleta,
): Promise<AtletaRow | null> {
  const { data, error } = await client
    .from("atleta")
    .update({
      nome_completo: dados.nome_completo,
      apelido_exibicao: dados.apelido_exibicao,
      contato: dados.contato,
      data_nascimento: dados.data_nascimento,
      consentimento_responsavel_obtido: dados.consentimento_responsavel_obtido,
      pontuacao_inicial: dados.pontuacao_inicial,
    })
    .eq("id", id)
    .select(ATLETA_COLUNAS)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao atualizar app.atleta ${id}: ${error.message}`);
  }
  return (data as unknown as AtletaRow | null) ?? null;
}

export type NivelTecnicoRow = {
  atleta_id: string;
  rodadas_presentes: number;
  nivel_tecnico: number;
};

/** Nível técnico (RN-03) de um único atleta via `app.atleta_nivel_tecnico` (migration BE-06). */
export async function buscarNivelTecnicoPorId(
  client: SupabaseClient<any, any, any>,
  atletaId: string,
): Promise<NivelTecnicoRow | null> {
  const { data, error } = await client
    .from("atleta_nivel_tecnico")
    .select("atleta_id, rodadas_presentes, nivel_tecnico")
    .eq("atleta_id", atletaId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Falha ao buscar app.atleta_nivel_tecnico ${atletaId}: ${error.message}`,
    );
  }
  return (data as unknown as NivelTecnicoRow | null) ?? null;
}

/** Nível técnico (RN-03) de todos os atletas, indexado por `atleta_id` — usado pela listagem. */
export async function listarNiveisTecnicos(
  client: SupabaseClient<any, any, any>,
): Promise<Map<string, NivelTecnicoRow>> {
  const { data, error } = await client
    .from("atleta_nivel_tecnico")
    .select("atleta_id, rodadas_presentes, nivel_tecnico");
  if (error) {
    throw new Error(`Falha ao listar app.atleta_nivel_tecnico: ${error.message}`);
  }
  const linhas = (data ?? []) as unknown as NivelTecnicoRow[];
  return new Map(linhas.map((linha) => [linha.atleta_id, linha]));
}
