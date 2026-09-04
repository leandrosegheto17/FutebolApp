/**
 * Orquestração de escrita do Serviço de Rodadas/Eventos (BE-08) — combina o
 * alerta de duplicidade de data (RF-02.8, `repository.ts`) com o
 * acionamento da função PL/pgSQL `app.lancar_rodada` (via RPC) e a releitura
 * do resultado para montar a resposta da API. Separado do Route Handler
 * (`app/api/rodadas/route.ts`) para ser testável sem montar um
 * `Request`/`NextResponse` — mesmo racional de `src/modules/atletas/mutate.ts`
 * e `src/modules/atletas/anonimizar.ts`.
 *
 * Fluxo de duplicidade (RF-02.8, mesmo contrato de RF-01.5/BE-06): se já
 * existir uma rodada `lancada` com a mesma `data` e o corpo da requisição
 * não trouxer `confirmar_duplicidade: true`, a escrita é recusada (o Route
 * Handler traduz isso em `409`) — o Frontend reenvia a mesma requisição com
 * `confirmar_duplicidade: true` depois da confirmação do organizador. Nunca
 * um bloqueio definitivo (não há `UNIQUE(data)` em `app.rodada`, BE-02).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ERRCODE_CONFIGURACAO_PONTUACAO_AUSENTE,
  ERRCODE_EVENTO_PARA_AUSENTE,
} from "./constants";
import {
  buscarRodadaPorId,
  lancarRodadaViaRpc,
  listarLancamentosPorRodada,
  listarParticipacoesComEventos,
  listarRodadasLancadasPorData,
  type ParticipacaoRpcInput,
  type RodadaRow,
} from "./repository";
import type { LancarRodadaBody } from "./validation";

export type DuplicataRodada = { id: string; data: string; status: string };

export type ParticipacaoResultado = {
  atleta_id: string;
  status: string;
  eventos: Array<{ tipo: string; quantidade: number }>;
  pontos_delta: number;
};

export type ResultadoLancamentoRodada =
  | { tipo: "sucesso"; rodada: RodadaRow; participacoes: ParticipacaoResultado[] }
  | { tipo: "duplicidade"; duplicatas: DuplicataRodada[] }
  | { tipo: "evento_para_ausente"; mensagem: string }
  | { tipo: "configuracao_pontuacao_ausente"; mensagem: string };

function paraParticipacaoRpcInput(body: LancarRodadaBody): ParticipacaoRpcInput[] {
  return body.participacoes.map((participacao) => ({
    atleta_id: participacao.atleta_id,
    status: participacao.status,
    eventos: participacao.eventos.map((evento) => ({
      tipo: evento.tipo,
      quantidade: evento.quantidade,
    })),
  }));
}

/**
 * Lança uma rodada inteira (RF-02): presença + eventos de jogo + cálculo
 * automático de pontos (RN-05), aplicando o alerta de duplicidade de data
 * (RF-02.8) antes de acionar a transação atômica em si.
 */
export async function lancarRodadaComDuplicidade(
  client: SupabaseClient<any, any, any>,
  body: LancarRodadaBody,
): Promise<ResultadoLancamentoRodada> {
  const duplicatas = await listarRodadasLancadasPorData(client, body.data);
  if (duplicatas.length > 0 && !body.confirmar_duplicidade) {
    return { tipo: "duplicidade", duplicatas };
  }

  const resultadoRpc = await lancarRodadaViaRpc(
    client,
    body.data,
    paraParticipacaoRpcInput(body),
  );

  if ("erro" in resultadoRpc) {
    const { code, message } = resultadoRpc.erro;
    // Defesa em profundidade (RF-02.6): a validação zod da camada de API já
    // recusa este payload com 400 antes de chegar aqui — este ramo só é
    // alcançável se alguém chamar a RPC diretamente, contornando a API.
    if (code === ERRCODE_EVENTO_PARA_AUSENTE) {
      return { tipo: "evento_para_ausente", mensagem: message };
    }
    if (code === ERRCODE_CONFIGURACAO_PONTUACAO_AUSENTE) {
      return { tipo: "configuracao_pontuacao_ausente", mensagem: message };
    }
    throw new Error(`Falha ao lançar rodada (app.lancar_rodada): ${message}`);
  }

  const { rodadaId } = resultadoRpc;
  const [rodada, participacoesComEventos, lancamentos] = await Promise.all([
    buscarRodadaPorId(client, rodadaId),
    listarParticipacoesComEventos(client, rodadaId),
    listarLancamentosPorRodada(client, rodadaId),
  ]);

  if (!rodada) {
    // Nunca deveria acontecer — a função PL/pgSQL acabou de confirmar o
    // INSERT antes de retornar o id, sem levantar exceção. Defensivo, não
    // uma lacuna silenciosa (TASK.md Seção 1.0).
    throw new Error(
      `app.rodada ${rodadaId} não encontrada logo após lançamento bem-sucedido (inconsistência inesperada).`,
    );
  }

  const pontosPorAtleta = new Map(
    lancamentos.map((lancamento) => [lancamento.atleta_id, lancamento.pontos_delta]),
  );

  const participacoes: ParticipacaoResultado[] = participacoesComEventos.map(
    (participacao) => ({
      atleta_id: participacao.atleta_id,
      status: participacao.status,
      eventos: participacao.eventos.map((evento) => ({
        tipo: evento.tipo,
        quantidade: evento.quantidade,
      })),
      // Sempre presente — `app.lancar_rodada` grava exatamente um lançamento
      // por atleta participante nesta rodada (ver migration). Fallback
      // defensivo a 0 caso essa garantia seja quebrada no futuro, nunca deveria
      // ser exercitado.
      pontos_delta: pontosPorAtleta.get(participacao.atleta_id) ?? 0,
    }),
  );

  return { tipo: "sucesso", rodada, participacoes };
}
