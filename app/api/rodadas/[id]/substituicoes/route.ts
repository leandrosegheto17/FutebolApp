/**
 * GET/POST /api/rodadas/:id/substituicoes (BE-13, RF-06).
 *
 * `GET` exige sessão válida mesmo sendo leitura — não devolve dado pessoal
 * sensível, mas é feature exclusiva da área interna (T11 do `UX-SPEC.md`,
 * "Substituições registradas"), mesmo racional já usado para
 * `GET /api/restricoes` (BE-12)/`GET /api/log-auditoria` (BE-09) —
 * `middleware.ts` (`INTERNAL_READ_PROTECTED_PREFIXES`, `/api/rodadas`
 * adicionado nesta tarefa: primeiro caso de leitura interna protegida sob
 * este prefixo — as demais rotas de `/api/rodadas` já existentes só têm
 * escrita, coberta por `WRITE_METHODS`, então nunca precisaram entrar
 * nesta lista antes).
 *
 * `POST` — corpo malformado/inválido ou mesmo atleta em "sai"/"entra" →
 * `400` (critério de aceite literal de BE-13: "tentar usar o mesmo atleta
 * em 'sai' e 'entra' é bloqueado com mensagem clara"); `time_id` não
 * pertence a esta rodada → `404`; `atleta_sai_id`/`atleta_entra_id` não
 * corresponde a atleta existente → `404`; sucesso → `201`. Sem limite de
 * quantidade por rodada (RF-06.2) — nenhuma checagem de teto neste
 * endpoint. Nunca altera `app.lancamento_pontos` (RF-06.3, critério de
 * aceite literal: "registrar substituição não altera saldo de nenhum
 * atleta") — a única escrita é `INSERT` em `app.substituicao`
 * (`src/modules/times/substituicoes/repository.ts`).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  listarSubstituicoesComApelidos,
  paraSubstituicaoResponse,
  paraSubstituicoesResponse,
  registrarSubstituicao,
  substituicaoBodySchema,
} from "@/modules/times/substituicoes";

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

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const { substituicoes, apelidos } = await listarSubstituicoesComApelidos(
    client,
    params.id,
  );
  return NextResponse.json(paraSubstituicoesResponse(substituicoes, apelidos), {
    status: 200,
  });
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

  const parsed = substituicaoBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await registrarSubstituicao(client, params.id, parsed.data);

  if (resultado.tipo === "time_nao_encontrado") {
    return NextResponse.json(
      { error: "Time não encontrado nesta rodada." },
      { status: 404 },
    );
  }
  if (resultado.tipo === "atleta_nao_encontrado") {
    return NextResponse.json(
      { error: "Atleta não encontrado.", atleta_id: resultado.atletaId },
      { status: 404 },
    );
  }

  return NextResponse.json(
    paraSubstituicaoResponse(resultado.substituicao, resultado.apelidos),
    { status: 201 },
  );
}
