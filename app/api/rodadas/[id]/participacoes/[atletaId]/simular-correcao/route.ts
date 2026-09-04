/**
 * POST /api/rodadas/:id/participacoes/:atletaId/simular-correcao (BE-10,
 * TASK.md Seção 6.2 item 2 — decisão de detalhe: "endpoint dedicado, RPC
 * read-only `simular_correcao_rodada` (BE-10), não cálculo no cliente").
 *
 * Escrita (método `POST`) — já coberta pelo middleware de sessão padrão
 * (`WRITE_METHODS`/`middleware.ts`, BE-04): não precisa entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` (esse array só afeta `GET`), nem exige
 * nenhuma mudança em `middleware.ts`. `POST` (em vez de `GET`) porque o
 * "valor hipotético novo" (status + eventos) é um corpo estruturado — mesmo
 * contrato de `PATCH .../participacoes/:atletaId` (BE-09), reaproveitado
 * aqui via `corrigirParticipacaoBodySchema` (mesma forma, decisão de
 * detalhe: nenhuma duplicação de schema de validação para o mesmo formato
 * de dado).
 *
 * ESTRITAMENTE READ-ONLY: aciona `app.simular_correcao_rodada`, que não
 * contém nenhum INSERT/UPDATE/DELETE em nenhum ponto — nenhuma linha nova é
 * gravada em nenhuma tabela por esta rota, mesmo quando o cenário simulado
 * seria aceito por uma correção real.
 *
 * Corpo malformado/inválido (inclui RF-02.6 — evento de jogo para atleta
 * ausente) → `400`, mesmo padrão de `PATCH .../participacoes/:atletaId`;
 * rodada ou participação inexistente → `404`; rodada já excluída → `409`.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  corrigirParticipacaoBodySchema,
  simularCorrecaoParticipacao,
} from "@/modules/rodadas";

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

export async function POST(
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
  const resultado = await simularCorrecaoParticipacao(
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
      {
        error:
          "Esta rodada já foi excluída — não é possível simular uma correção sobre ela.",
      },
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

  return NextResponse.json(resultado.preview, { status: 200 });
}
