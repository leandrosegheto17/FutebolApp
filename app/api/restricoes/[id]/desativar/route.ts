/**
 * POST /api/restricoes/:id/desativar (BE-12, RF-05.5/RN-11 — soft-delete,
 * nunca `DELETE` físico).
 *
 * Escrita — já coberta pelo middleware de sessão padrão (`WRITE_METHODS`,
 * BE-04). Idempotente: chamar de novo para uma restrição já desativada
 * devolve `200` com a mesma linha, sem sobrescrever `desativado_em` (ver
 * `src/modules/times/restricoes/repository.ts#desativarRestricaoPorId`).
 * Sem corpo de requisição exigido — RF-05.5 não define nenhum contrato de
 * confirmação no payload (diferente de `POST /api/atletas/{id}/anonimizar`,
 * que também não exige corpo pelo mesmo motivo).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  buscarApelidosAtletas,
  desativarRestricao,
  paraRestricaoResponse,
} from "@/modules/times/restricoes";

type RouteParams = { params: { id: string } };

export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const resultado = await desativarRestricao(client, params.id);

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
