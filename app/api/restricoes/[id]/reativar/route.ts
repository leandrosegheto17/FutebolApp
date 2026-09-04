/**
 * POST /api/restricoes/:id/reativar (BE-12) — inverso operacional de
 * `POST /api/restricoes/:id/desativar`, ver decisão de detalhe documentada
 * em `src/modules/times/restricoes/repository.ts#reativarRestricaoPorId`
 * (suporte ao botão "Reativar" já desenhado em `UX-SPEC.md` T10 para toda
 * restrição desativada).
 *
 * Escrita — já coberta pelo middleware de sessão padrão (`WRITE_METHODS`,
 * BE-04). Idempotente pelo mesmo motivo de `desativar/route.ts`.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  buscarApelidosAtletas,
  paraRestricaoResponse,
  reativarRestricao,
} from "@/modules/times/restricoes";

type RouteParams = { params: { id: string } };

export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const resultado = await reativarRestricao(client, params.id);

  if (resultado.tipo === "nao_encontrada") {
    return NextResponse.json(
      { error: "Restrição obrigatória não encontrada." },
      { status: 404 },
    );
  }

  const apelidos = await buscarApelidosAtletas(client, [
    resultado.restricao.atleta_a_id,
    resultado.restricao.atleta_b_id,
  ]);
  return NextResponse.json(paraRestricaoResponse(resultado.restricao, apelidos), {
    status: 200,
  });
}
