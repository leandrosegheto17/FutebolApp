/**
 * GET /api/atletas/:id, PUT /api/atletas/:id (BE-06, RF-01.6).
 *
 * `GET` protegido pelo mesmo mecanismo de `GET /api/atletas` (ver
 * `middleware.ts`/comentário em `../route.ts`). `PUT` é escrita — já coberto
 * pelo middleware de sessão padrão (`WRITE_METHODS`, BE-04).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  atletaBodySchema,
  atualizarAtletaComDuplicidade,
  buscarAtletaPorId,
  buscarNivelTecnicoPorId,
  paraAtletaResponse,
} from "@/modules/atletas";

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

function atletaNaoEncontrado(): NextResponse {
  return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const atleta = await buscarAtletaPorId(client, params.id);
  if (!atleta) {
    return atletaNaoEncontrado();
  }
  const nivelTecnico = await buscarNivelTecnicoPorId(client, params.id);
  return NextResponse.json(paraAtletaResponse(atleta, nivelTecnico ?? undefined), {
    status: 200,
  });
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

  const parsed = atletaBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await atualizarAtletaComDuplicidade(client, params.id, parsed.data);

  if (resultado.tipo === "nao_encontrado") {
    return atletaNaoEncontrado();
  }
  if (resultado.tipo === "duplicidade") {
    return NextResponse.json(
      { error: "duplicidade", atletas_duplicados: resultado.duplicatas },
      { status: 409 },
    );
  }

  const nivelTecnico = await buscarNivelTecnicoPorId(client, params.id);
  return NextResponse.json(
    paraAtletaResponse(resultado.atleta, nivelTecnico ?? undefined),
    {
      status: 200,
    },
  );
}
