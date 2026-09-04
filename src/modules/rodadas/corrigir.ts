/**
 * Orquestração de correção de uma participação (BE-09, RF-04.2) — aciona a
 * função PL/pgSQL `app.corrigir_participacao_rodada` (via RPC) e relê o
 * resultado para montar a resposta da API. Toda a correção multi-tabela
 * (atualização de `participacao_rodada`/`evento_jogo` + cálculo/gravação do
 * lançamento de AJUSTE — nunca substituição do lançamento original,
 * ledger append-only — + `log_auditoria`) vive inteira na função (TASK.md
 * Seção 1.2) — este módulo nunca orquestra os UPDATEs/INSERTs em separado.
 * Separado do Route Handler
 * (`app/api/rodadas/[id]/participacoes/[atletaId]/route.ts`) para ser
 * testável sem montar um `Request`/`NextResponse` — mesmo racional de
 * `lancar.ts`/`excluir.ts`/`src/modules/atletas/anonimizar.ts`.
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
  buscarParticipacaoComEventos,
  corrigirParticipacaoViaRpc,
  somaPontosPorAtletaRodada,
  type EventoJogoRow,
  type ParticipacaoRodadaRow,
} from "./repository";
import type { CorrigirParticipacaoBody } from "./validation";

export type ParticipacaoCorrigidaResultado = {
  atleta_id: string;
  status: string;
  eventos: Array<{ tipo: string; quantidade: number }>;
  pontos_delta: number;
};

export type ResultadoCorrecaoParticipacao =
  | { tipo: "sucesso"; participacao: ParticipacaoCorrigidaResultado }
  | { tipo: "rodada_nao_encontrada" }
  | { tipo: "rodada_ja_excluida" }
  | { tipo: "participacao_nao_encontrada" }
  | { tipo: "evento_para_ausente"; mensagem: string }
  | { tipo: "configuracao_pontuacao_ausente"; mensagem: string };

/**
 * Corrige a participação de um atleta numa rodada já lançada (RF-04.2):
 * calcula e aplica somente a diferença de pontos entre o total já gravado
 * e o novo total (nunca substitui o lançamento original) — atomicidade
 * garantida pela função PL/pgSQL, nunca por esta orquestração.
 */
export async function corrigirParticipacao(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  atletaId: string,
  body: CorrigirParticipacaoBody,
): Promise<ResultadoCorrecaoParticipacao> {
  const resultado = await corrigirParticipacaoViaRpc(
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
      `Falha ao corrigir participação (app.corrigir_participacao_rodada): ${message}`,
    );
  }

  const [participacao, pontosDelta] = await Promise.all([
    buscarParticipacaoComEventos(client, rodadaId, atletaId),
    somaPontosPorAtletaRodada(client, atletaId, rodadaId),
  ]);

  if (!participacao) {
    // Nunca deveria acontecer — a função PL/pgSQL acabou de confirmar (via
    // FOR UPDATE) que a participação existe antes de retornar sem erro.
    // Defensivo, não uma lacuna silenciosa (TASK.md Seção 1.0).
    throw new Error(
      `app.participacao_rodada ${rodadaId}/${atletaId} não encontrada logo após correção bem-sucedida (inconsistência inesperada).`,
    );
  }

  return {
    tipo: "sucesso",
    participacao: paraParticipacaoCorrigidaResultado(participacao, pontosDelta),
  };
}

function paraParticipacaoCorrigidaResultado(
  participacao: ParticipacaoRodadaRow & { eventos: EventoJogoRow[] },
  pontosDelta: number,
): ParticipacaoCorrigidaResultado {
  return {
    atleta_id: participacao.atleta_id,
    status: participacao.status,
    eventos: participacao.eventos.map((evento) => ({
      tipo: evento.tipo,
      quantidade: evento.quantidade,
    })),
    pontos_delta: pontosDelta,
  };
}
