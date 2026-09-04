/**
 * Orquestração de PREVIEW de correção de uma participação (BE-10, TASK.md
 * Seção 6.2 item 2) — aciona a função PL/pgSQL `app.simular_correcao_rodada`
 * (via RPC), estritamente read-only: nenhuma escrita acontece em nenhuma
 * tabela, mesmo hipoteticamente (a função no banco não contém nenhum
 * INSERT/UPDATE/DELETE — ver
 * `supabase/migrations/20260903140100_create_simular_correcao_rodada_function.sql`).
 * Reaproveita o mesmo helper de cálculo (`app.calcular_correcao_participacao_rodada`)
 * que `app.corrigir_participacao_rodada` (BE-09) usa para gravar, então o
 * `pontos_delta` retornado aqui é exatamente o que a correção real
 * (`corrigirParticipacao`, `corrigir.ts`) aplicaria para o mesmo cenário.
 * Separado do Route Handler para ser testável sem montar um
 * `Request`/`NextResponse` — mesmo racional de `corrigir.ts`/`excluir.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ERRCODE_CONFIGURACAO_PONTUACAO_AUSENTE,
  ERRCODE_EVENTO_PARA_AUSENTE,
  ERRCODE_PARTICIPACAO_NAO_ENCONTRADA,
  ERRCODE_RODADA_JA_EXCLUIDA,
  ERRCODE_RODADA_NAO_ENCONTRADA,
} from "./constants";
import {
  simularCorrecaoParticipacaoViaRpc,
  type PreviewCorrecaoParticipacaoRpc,
} from "./repository";
import type { CorrigirParticipacaoBody } from "./validation";

export type PreviewCorrecaoParticipacao = {
  atleta_id: string;
  status_atual: string;
  eventos_atuais: Array<{ tipo: string; quantidade: number }>;
  novo_status: string;
  novos_eventos: Array<{ tipo: string; quantidade: number }>;
  pontos_antes: number;
  pontos_depois: number;
  pontos_delta: number;
};

export type ResultadoPreviewCorrecaoParticipacao =
  | { tipo: "sucesso"; preview: PreviewCorrecaoParticipacao }
  | { tipo: "rodada_nao_encontrada" }
  | { tipo: "rodada_ja_excluida" }
  | { tipo: "participacao_nao_encontrada" }
  | { tipo: "evento_para_ausente"; mensagem: string }
  | { tipo: "configuracao_pontuacao_ausente"; mensagem: string };

/**
 * Simula a correção da participação de um atleta numa rodada já lançada
 * (preview de RF-04.2, T07 do UX-SPEC.md): calcula o delta de pontos que
 * `corrigirParticipacao` aplicaria para o mesmo `(status, eventos)`
 * hipotético — sem gravar nenhuma linha nova em nenhuma tabela. Usa o
 * mesmo `errcode` de validação/estado que a correção real usaria (RF-02.6,
 * rodada/participação inexistente, rodada já excluída), porque ambas
 * delegam ao mesmo helper PL/pgSQL.
 */
export async function simularCorrecaoParticipacao(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  atletaId: string,
  body: CorrigirParticipacaoBody,
): Promise<ResultadoPreviewCorrecaoParticipacao> {
  const resultado = await simularCorrecaoParticipacaoViaRpc(
    client,
    rodadaId,
    atletaId,
    body.status,
    body.eventos.map((evento) => ({ tipo: evento.tipo, quantidade: evento.quantidade })),
  );

  if ("erro" in resultado) {
    const { code, message } = resultado.erro;
    if (code === ERRCODE_RODADA_NAO_ENCONTRADA) {
      return { tipo: "rodada_nao_encontrada" };
    }
    if (code === ERRCODE_RODADA_JA_EXCLUIDA) {
      return { tipo: "rodada_ja_excluida" };
    }
    if (code === ERRCODE_PARTICIPACAO_NAO_ENCONTRADA) {
      return { tipo: "participacao_nao_encontrada" };
    }
    // Defesa em profundidade (RF-02.6/RN-05): a validação zod da camada de
    // API já recusa a maioria destes casos com 400 antes de chegar aqui —
    // estes ramos só são alcançáveis se a RPC for chamada contornando a API.
    if (code === ERRCODE_EVENTO_PARA_AUSENTE) {
      return { tipo: "evento_para_ausente", mensagem: message };
    }
    if (code === ERRCODE_CONFIGURACAO_PONTUACAO_AUSENTE) {
      return { tipo: "configuracao_pontuacao_ausente", mensagem: message };
    }
    throw new Error(
      `Falha ao simular correção (app.simular_correcao_rodada): ${message}`,
    );
  }

  return {
    tipo: "sucesso",
    preview: paraPreviewCorrecaoParticipacao(resultado.preview),
  };
}

function paraPreviewCorrecaoParticipacao(
  preview: PreviewCorrecaoParticipacaoRpc,
): PreviewCorrecaoParticipacao {
  return {
    atleta_id: preview.atleta_id,
    status_atual: preview.status_atual,
    eventos_atuais: preview.eventos_atuais.map((evento) => ({
      tipo: evento.tipo,
      quantidade: evento.quantidade,
    })),
    novo_status: preview.novo_status,
    novos_eventos: preview.novos_eventos.map((evento) => ({
      tipo: evento.tipo,
      quantidade: evento.quantidade,
    })),
    pontos_antes: Number(preview.pontos_antes),
    pontos_depois: Number(preview.pontos_depois),
    pontos_delta: Number(preview.pontos_delta),
  };
}
