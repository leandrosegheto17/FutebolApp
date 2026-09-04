/**
 * Orquestração de leitura — detalhe de uma rodada (BE-16, T07 do
 * `UX-SPEC.md`/FE-07: tela de Correção/Estorno consome este detalhe para
 * montar o formulário de campo único por atleta, com preview inline via
 * `POST .../simular-correcao`, BE-10). Leitura pura, sem função PL/pgSQL
 * nova (não altera nenhuma tabela) — combina `buscarRodadaPorId` +
 * `listarParticipacoesComEventos` + `listarLancamentosPorRodada` +
 * `buscarApelidosAtletas` (todas já existentes em `repository.ts`, BE-08/
 * BE-09/BE-16). Separado do Route Handler
 * (`app/api/rodadas/[id]/route.ts`) — mesmo racional de testabilidade sem
 * `Request`/`NextResponse` já usado por `lancar.ts`/`excluir.ts`/`corrigir.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buscarApelidosAtletas,
  buscarRodadaPorId,
  listarLancamentosPorRodada,
  listarParticipacoesComEventos,
  type EventoJogoRow,
  type ParticipacaoRodadaRow,
  type RodadaRow,
} from "./repository";

export type ParticipacaoDetalheResultado = {
  atleta_id: string;
  apelido_exibicao: string;
  status: string;
  eventos: Array<{ tipo: string; quantidade: number }>;
  /**
   * Soma líquida de TODOS os lançamentos já gravados para este
   * `(atleta_id, rodada_id)` — mesma semântica de "total líquido já
   * refletido" já documentada em `ParticipacaoCorrigidaResponse`
   * (`corrigir.ts`, BE-09): cobre tanto uma rodada nunca corrigida (um só
   * lançamento, `origem: "lancamento"`) quanto uma já corrigida/estornada
   * (soma de todos os lançamentos, nunca só o mais recente).
   */
  pontos_delta: number;
};

export type ResultadoDetalheRodada =
  | { tipo: "sucesso"; rodada: RodadaRow; participacoes: ParticipacaoDetalheResultado[] }
  | { tipo: "nao_encontrada" };

/**
 * Fallback defensivo — nunca deveria faltar (todo `atleta_id` referenciado
 * por `participacao_rodada` existe em `app.atleta`, FK `on delete
 * restrict`, BE-02): mesmo racional/mesma mensagem de
 * `NOME_ATLETA_DESCONHECIDO` em `src/modules/times/restricoes/presenter.ts`
 * (BE-12) — nunca uma lacuna silenciosa nem um 500 por um problema
 * puramente de exibição.
 */
const NOME_ATLETA_DESCONHECIDO = "Atleta desconhecido";

function somarPontosPorAtleta(
  lancamentos: ReadonlyArray<{ atleta_id: string; pontos_delta: number }>,
): Map<string, number> {
  const soma = new Map<string, number>();
  for (const lancamento of lancamentos) {
    soma.set(
      lancamento.atleta_id,
      (soma.get(lancamento.atleta_id) ?? 0) + Number(lancamento.pontos_delta),
    );
  }
  return soma;
}

/**
 * Detalhe completo de uma rodada (BE-16): participações por atleta (status
 * presente/ausente/lesionado), eventos de jogo (gol/cartão) por atleta, e o
 * `pontos_delta` líquido já gravado por atleta nesta rodada — `null` (via
 * `{ tipo: "nao_encontrada" }`) se o `id` não corresponder a nenhuma
 * `app.rodada`. Nunca recusa uma rodada `status: "excluida"` (decisão de
 * detalhe documentada em `repository.ts`, `listarRodadasResumo`) — o
 * detalhe de uma rodada excluída continua consultável (ex.: FE-08 log de
 * auditoria referencia `rodada_id`, e a própria tela T07 precisa poder
 * mostrar o estado histórico mesmo de uma rodada já revertida).
 */
export async function detalharRodada(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<ResultadoDetalheRodada> {
  const rodada = await buscarRodadaPorId(client, rodadaId);
  if (!rodada) {
    return { tipo: "nao_encontrada" };
  }

  const [participacoesComEventos, lancamentos] = await Promise.all([
    listarParticipacoesComEventos(client, rodadaId),
    listarLancamentosPorRodada(client, rodadaId),
  ]);

  const apelidos = await buscarApelidosAtletas(
    client,
    participacoesComEventos.map((participacao) => participacao.atleta_id),
  );
  const pontosPorAtleta = somarPontosPorAtleta(lancamentos);

  const participacoes: ParticipacaoDetalheResultado[] = participacoesComEventos.map(
    (participacao) => paraParticipacaoDetalhe(participacao, apelidos, pontosPorAtleta),
  );

  return { tipo: "sucesso", rodada, participacoes };
}

function paraParticipacaoDetalhe(
  participacao: ParticipacaoRodadaRow & { eventos: EventoJogoRow[] },
  apelidos: ReadonlyMap<string, string>,
  pontosPorAtleta: ReadonlyMap<string, number>,
): ParticipacaoDetalheResultado {
  return {
    atleta_id: participacao.atleta_id,
    apelido_exibicao: apelidos.get(participacao.atleta_id) ?? NOME_ATLETA_DESCONHECIDO,
    status: participacao.status,
    eventos: participacao.eventos.map((evento) => ({
      tipo: evento.tipo,
      quantidade: evento.quantidade,
    })),
    // Sempre presente — `app.lancar_rodada` grava exatamente um lançamento
    // por atleta participante (ver migration BE-08); correções/estornos só
    // adicionam mais lançamentos, nunca removem o original. Fallback
    // defensivo a 0 caso essa garantia seja quebrada no futuro, nunca
    // deveria ser exercitado.
    pontos_delta: pontosPorAtleta.get(participacao.atleta_id) ?? 0,
  };
}
