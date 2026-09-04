/**
 * PUT /api/restricoes/:id (BE-12, RF-05.5 — "editar").
 *
 * Escrita — já coberta pelo middleware de sessão padrão (`WRITE_METHODS`,
 * BE-04). Sem `GET /api/restricoes/:id` dedicado nesta tarefa (decisão de
 * escopo, não escalada): `GET /api/restricoes` já devolve a lista completa
 * (ativas e desativadas) com o mesmo formato de item, suficiente para T10
 * (FE-10) — nenhum consumidor previsto precisa buscar uma restrição
 * isolada por id.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  buscarApelidosAtletas,
  editarRestricao,
  paraRestricaoResponse,
  restricaoBodySchema,
} from "@/modules/times/restricoes";

type RouteParams = { params: { id: string } };

function corpoRequisicaoInvalida(issues: { path: PropertyKey[]; message: string }[]) {
  return NextResponse.json(
    {
      error: "Requisição inválida.",
      detalhes: issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    { status: 400 },
  );
}

function restricaoNaoEncontrada(): NextResponse {
  return NextResponse.json(
    { error: "Restrição obrigatória não encontrada." },
    { status: 404 },
  );
}

function atletaNaoEncontrado(atletaId: string): NextResponse {
  return NextResponse.json(
    { error: "Atleta não encontrado.", atleta_id: atletaId },
    { status: 404 },
  );
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = restricaoBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await editarRestricao(client, params.id, parsed.data);

  if (resultado.tipo === "nao_encontrada") {
    return restricaoNaoEncontrada();
  }
  if (resultado.tipo === "atleta_nao_encontrado") {
    return atletaNaoEncontrado(resultado.atletaId);
  }

  const apelidos = await buscarApelidosAtletas(client, [
    resultado.restricao.atleta_a_id,
    resultado.restricao.atleta_b_id,
  ]);
  return NextResponse.json(paraRestricaoResponse(resultado.restricao, apelidos), {
    status: 200,
  });
}
