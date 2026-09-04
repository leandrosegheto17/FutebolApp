/**
 * PATCH /api/rodadas/:id/participacoes/:atletaId (BE-09, RF-04.2).
 *
 * Escrita — já coberta pelo middleware de sessão padrão (`WRITE_METHODS`/
 * `middleware.ts`, BE-04): não precisa entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` (esse array só afeta `GET`).
 *
 * Corrige a participação (status + eventos, RF-04.2) de UM atleta numa
 * rodada já lançada, aplicando somente a DIFERENÇA de pontos entre o total
 * já gravado e o novo total (nunca substitui o lançamento original —
 * ledger append-only, ADR-006). `eventos` no corpo SUBSTITUI por completo a
 * lista atual (mesmo contrato de `p_novos_eventos` da função PL/pgSQL
 * `app.corrigir_participacao_rodada`).
 *
 * Corpo malformado/inválido (inclui RF-02.6 — evento de jogo para atleta
 * ausente) → `400`, mesmo padrão de `POST /api/rodadas` (BE-08); rodada ou
 * participação inexistente → `404`; rodada já excluída → `409`.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import { corrigirParticipacao, corrigirParticipacaoBodySchema } from "@/modules/rodadas";

type RouteParams = { params: { id: string; atletaId: string } };

function corpoRequisicaoInvalida(issues: { path: PropertyKey[]; message: string }[]) {
  return NextResponse.json(
    {
      error: "Requisição inválida.",
      detalhes: issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    { status: 400 },
  );
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = corrigirParticipacaoBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await corrigirParticipacao(
    client,
    params.id,
    params.atletaId,
    parsed.data,
  );

  if (resultado.tipo === "rodada_nao_encontrada") {
    return NextResponse.json({ error: "Rodada não encontrada." }, { status: 404 });
  }
  if (resultado.tipo === "rodada_ja_excluida") {
    return NextResponse.json(
      { error: "Esta rodada já foi excluída — não é possível corrigi-la." },
      { status: 409 },
    );
  }
  if (resultado.tipo === "participacao_nao_encontrada") {
    return NextResponse.json(
      { error: "Este atleta não participou desta rodada." },
      { status: 404 },
    );
  }
  if (resultado.tipo === "evento_para_ausente") {
    // Defesa em profundidade (RF-02.6) — normalmente já barrado pelo `400`
    // de validação acima; só alcançável se a RPC for chamada contornando
    // esta API.
    return NextResponse.json(
      { error: "evento_para_ausente", message: resultado.mensagem },
      { status: 400 },
    );
  }
  if (resultado.tipo === "configuracao_pontuacao_ausente") {
    // RN-05: cálculo automático de pontos não pode ocorrer sem os valores
    // de app.configuracao_pontuacao vigentes — condição defensiva.
    return NextResponse.json(
      { error: "configuracao_pontuacao_ausente", message: resultado.mensagem },
      { status: 500 },
    );
  }

  return NextResponse.json(resultado.participacao, { status: 200 });
}
