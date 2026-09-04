/**
 * GET /api/atletas, POST /api/atletas (BE-06, RF-01).
 *
 * `GET` exige sessão válida mesmo sendo leitura — cada linha de `app.atleta`
 * carrega `contato`/`data_nascimento` (sensíveis, RN-01/GUARDRAILS.md regra
 * 19: nunca expostos sem sessão válida), então esta é a primeira rota de
 * LEITURA interna do projeto a precisar do middleware de sessão também em
 * `GET` — o próprio `middleware.ts` (BE-04) já antecipava esse caso ("se uma
 * tarefa futura introduzir uma rota de leitura interna nova, cabe a ela
 * também exigir sessão"); ver `middleware.ts`
 * (`INTERNAL_READ_PROTECTED_PREFIXES`, adicionado nesta tarefa).
 *
 * `POST` segue o mesmo padrão de validação de `POST /api/auth/login` (BE-04):
 * corpo malformado/inválido → `400`; escrita bem-sucedida → `201`. Alerta de
 * duplicidade de nome (RF-01.5) → `409` (ver `mutate.ts`).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  atletaBodySchema,
  criarAtletaComDuplicidade,
  listarAtletas,
  listarNiveisTecnicos,
  paraAtletaResponse,
} from "@/modules/atletas";

function corpoRequisicaoInvalida(issues: { path: PropertyKey[]; message: string }[]) {
  return NextResponse.json(
    {
      error: "Requisição inválida.",
      detalhes: issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    { status: 400 },
  );
}

export async function GET(): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const [atletas, niveisTecnicos] = await Promise.all([
    listarAtletas(client),
    listarNiveisTecnicos(client),
  ]);
  const resposta = atletas.map((atleta) =>
    paraAtletaResponse(atleta, niveisTecnicos.get(atleta.id)),
  );
  return NextResponse.json(resposta, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
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
  const resultado = await criarAtletaComDuplicidade(client, parsed.data);

  if (resultado.tipo === "duplicidade") {
    // RF-01.5: alerta, não bloqueio definitivo — o Frontend reenvia com
    // `confirmar_duplicidade: true` depois que o organizador confirmar.
    return NextResponse.json(
      { error: "duplicidade", atletas_duplicados: resultado.duplicatas },
      { status: 409 },
    );
  }

  // Atleta recém-criado nunca tem presença registrada ainda — nível técnico
  // é sempre o fallback de `pontuacao_inicial` (RN-03), sem precisar
  // consultar `app.atleta_nivel_tecnico` de novo logo após o INSERT.
  return NextResponse.json(paraAtletaResponse(resultado.atleta, undefined), {
    status: 201,
  });
}
