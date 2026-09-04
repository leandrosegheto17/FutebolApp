/**
 * DELETE /api/rodadas/:id (BE-09, RF-04.1) e GET /api/rodadas/:id (BE-16,
 * T07 do `UX-SPEC.md` — detalhe consumido pela tela de Correção/Estorno).
 *
 * `DELETE` é escrita — já coberta pelo middleware de sessão padrão
 * (`WRITE_METHODS`/`middleware.ts`, BE-04): não precisava entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` (esse array só afeta `GET`). `GET`,
 * introduzido nesta tarefa, já está coberto por
 * `INTERNAL_READ_PROTECTED_PREFIXES` (`/api/rodadas` entrou nessa lista em
 * BE-13) — nenhuma mudança em `middleware.ts` necessária.
 *
 * `DELETE` aciona `app.excluir_rodada` (RPC): reverte automaticamente 100%
 * dos pontos daquela rodada para todos os atletas afetados via novos
 * lançamentos de estorno (ledger append-only, nunca UPDATE/DELETE em
 * `lancamento_pontos` já gravado), marca `rodada.status = 'excluida'`
 * (soft-delete) e grava uma entrada em `log_auditoria` — tudo em uma única
 * transação Postgres (TASK.md Seção 1.2).
 *
 * `GET` devolve participações (status presente/ausente/lesionado), eventos
 * de jogo (gol/cartão) e `pontos_delta` líquido já gravado, por atleta —
 * leitura pura, sem função PL/pgSQL nova. Rodada `status: "excluida"` é
 * consultável normalmente (decisão de detalhe documentada em
 * `src/modules/rodadas/repository.ts`) — só `id` inexistente retorna `404`.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  detalharRodada,
  excluirRodada,
  paraRodadaDetalheResponse,
  paraRodadaExcluidaResponse,
} from "@/modules/rodadas";

type RouteParams = { params: { id: string } };

function rodadaNaoEncontrada(): NextResponse {
  return NextResponse.json({ error: "Rodada não encontrada." }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const resultado = await detalharRodada(client, params.id);

  if (resultado.tipo === "nao_encontrada") {
    return rodadaNaoEncontrada();
  }

  return NextResponse.json(
    paraRodadaDetalheResponse(resultado.rodada, resultado.participacoes),
    { status: 200 },
  );
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const resultado = await excluirRodada(client, params.id);

  if (resultado.tipo === "nao_encontrada") {
    return rodadaNaoEncontrada();
  }
  if (resultado.tipo === "ja_excluida") {
    return NextResponse.json(
      { error: "Esta rodada já foi excluída anteriormente." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    paraRodadaExcluidaResponse(resultado.rodada, resultado.atletasAfetados),
    { status: 200 },
  );
}
