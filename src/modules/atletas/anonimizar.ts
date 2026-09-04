/**
 * Anonimização de dado pessoal do atleta a pedido do titular (LGPD Art. 18,
 * ADR-011, BE-07). A operação inteira — sobrescrita de
 * `nome_completo`/`apelido_exibicao`/`contato`/`data_nascimento`, marcação
 * `ativo=false`/`anonimizado_em`, desativação de `restricao_obrigatoria`
 * associada e gravação de `log_auditoria` (`valores_antes` só com
 * marcadores redigidos) — roda dentro da função PL/pgSQL
 * `app.anonimizar_atleta` (migration
 * `20260903110000_create_anonimizar_atleta_function.sql`), nunca aqui
 * (TASK.md Seção 1.2: nenhuma operação multi-tabela que altera
 * histórico/dado do atleta é orquestrada como sequência de chamadas
 * TypeScript separadas).
 *
 * Este módulo só chama a RPC e traduz o resultado/erro para os três casos
 * consumidos pelo endpoint (`app/api/atletas/[id]/anonimizar/route.ts`):
 * sucesso, atleta não encontrado, atleta já anonimizado anteriormente —
 * nenhuma lógica de negócio mora aqui.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buscarAtletaPorId,
  buscarNivelTecnicoPorId,
  type AtletaRow,
  type NivelTecnicoRow,
} from "./repository";

export type ResultadoAnonimizacao =
  | { tipo: "sucesso"; atleta: AtletaRow; nivelTecnico: NivelTecnicoRow | undefined }
  | { tipo: "nao_encontrado" }
  | { tipo: "ja_anonimizado" };

/**
 * `errcode` levantado pela função PL/pgSQL (ver migration) — `P0002`
 * reaproveita o código convencional de "no_data_found" do próprio PL/pgSQL;
 * `AN001` é um código de aplicação próprio para "já anonimizado
 * anteriormente" (irreversibilidade por desenho, ADR-011).
 */
const ERRCODE_NAO_ENCONTRADO = "P0002";
const ERRCODE_JA_ANONIMIZADO = "AN001";

/**
 * Aciona `app.anonimizar_atleta` via RPC (sempre com `service role`,
 * TASK.md Seção 1.2/GUARDRAILS.md regra 6) e, em caso de sucesso, relê o
 * atleta já anonimizado via `repository.ts` (mesmos caminhos de leitura já
 * cobertos pelos testes de BE-06) — decisão de detalhe (simplicidade,
 * TASK.md Seção 1.0): evita duplicar em SQL a forma de `RETURNING` da
 * função só para devolver o mesmo formato que `buscarAtletaPorId` já
 * produz.
 */
export async function anonimizarAtleta(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<ResultadoAnonimizacao> {
  const { error } = await client.rpc("anonimizar_atleta", { p_atleta_id: id });

  if (error) {
    if (error.code === ERRCODE_NAO_ENCONTRADO) {
      return { tipo: "nao_encontrado" };
    }
    if (error.code === ERRCODE_JA_ANONIMIZADO) {
      return { tipo: "ja_anonimizado" };
    }
    throw new Error(`Falha ao anonimizar app.atleta ${id}: ${error.message}`);
  }

  const atleta = await buscarAtletaPorId(client, id);
  if (!atleta) {
    // Nunca deveria acontecer — a função PL/pgSQL acabou de confirmar (via
    // `FOR UPDATE`) que a linha existe antes de retornar sem erro.
    // Defensivo, não uma lacuna silenciosa (TASK.md Seção 1.0).
    throw new Error(
      `app.atleta ${id} não encontrado logo após anonimização bem-sucedida (inconsistência inesperada).`,
    );
  }
  const nivelTecnico = await buscarNivelTecnicoPorId(client, id);
  return { tipo: "sucesso", atleta, nivelTecnico: nivelTecnico ?? undefined };
}
