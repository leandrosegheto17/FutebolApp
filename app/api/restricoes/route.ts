/**
 * GET /api/restricoes, POST /api/restricoes (BE-12, RF-05.5).
 *
 * `GET` exige sessão válida mesmo sendo leitura — não devolve dado pessoal
 * sensível (`contato`/`data_nascimento`, RN-01), mas é feature exclusiva da
 * área interna (T10 do `UX-SPEC.md`, um dos 5 destinos da barra de
 * navegação interna), mesmo racional já usado para `GET /api/log-auditoria`
 * (BE-09) — ver `middleware.ts` (`INTERNAL_READ_PROTECTED_PREFIXES`,
 * atualizado nesta tarefa).
 *
 * `POST` segue o mesmo padrão de validação de `POST /api/atletas` (BE-06):
 * corpo malformado/inválido → `400`; `atleta_a_id`/`atleta_b_id`
 * referenciando um atleta inexistente → `404`; escrita bem-sucedida →
 * `201`.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  buscarApelidosAtletas,
  criarRestricao,
  listarRestricoes,
  paraRestricaoResponse,
  paraRestricoesResponse,
  restricaoBodySchema,
} from "@/modules/times/restricoes";

function corpoRequisicaoInvalida(issues: { path: PropertyKey[]; message: string }[]) {
  return NextResponse.json(
    {
      error: "Requisição inválida.",
      detalhes: issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    { status: 400 },
  );
}

function atletaNaoEncontrado(atletaId: string): NextResponse {
  return NextResponse.json(
    { error: "Atleta não encontrado.", atleta_id: atletaId },
    { status: 404 },
  );
}

export async function GET(): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const restricoes = await listarRestricoes(client);
  const idsAtletas = restricoes.flatMap((restricao) => [
    restricao.atleta_a_id,
    restricao.atleta_b_id,
  ]);
  const apelidos = await buscarApelidosAtletas(client, idsAtletas);
  return NextResponse.json(paraRestricoesResponse(restricoes, apelidos), { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
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
  const resultado = await criarRestricao(client, parsed.data);

  if (resultado.tipo === "atleta_nao_encontrado") {
    return atletaNaoEncontrado(resultado.atletaId);
  }

  const apelidos = await buscarApelidosAtletas(client, [
    resultado.restricao.atleta_a_id,
    resultado.restricao.atleta_b_id,
  ]);
  return NextResponse.json(paraRestricaoResponse(resultado.restricao, apelidos), {
    status: 201,
  });
}
