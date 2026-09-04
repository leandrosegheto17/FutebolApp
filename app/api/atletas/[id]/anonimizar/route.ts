/**
 * POST /api/atletas/:id/anonimizar (BE-07, ADR-011, LGPD Art. 18).
 *
 * Escrita — já coberta pelo middleware de sessão padrão
 * (`WRITE_METHODS`/`middleware.ts`, BE-04): não precisa entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` (esse array só afeta `GET`).
 *
 * Sem corpo de requisição exigido: a confirmação de dupla etapa ("digite
 * ANONIMIZAR", `TypedConfirmationModal`) é responsabilidade de fluxo do
 * Frontend (UX-SPEC.md T04) — o critério de aceite literal de BE-07 não
 * define nenhum contrato de confirmação no payload da API, então nenhum
 * campo adicional é exigido aqui (TASK.md Seção 1.0 — solução mais simples
 * que satisfaz o critério de aceite). A irreversibilidade em si é garantida
 * pela própria função PL/pgSQL (`app.anonimizar_atleta`), que recusa
 * reprocessar um atleta já anonimizado (ver `anonimizar.ts`).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import { anonimizarAtleta, paraAtletaResponse } from "@/modules/atletas";

type RouteParams = { params: { id: string } };

export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const client = getServiceRoleClient();
  const resultado = await anonimizarAtleta(client, params.id);

  if (resultado.tipo === "nao_encontrado") {
    return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 });
  }
  if (resultado.tipo === "ja_anonimizado") {
    return NextResponse.json(
      { error: "Este atleta já foi anonimizado anteriormente." },
      { status: 409 },
    );
  }

  return NextResponse.json(paraAtletaResponse(resultado.atleta, resultado.nivelTecnico), {
    status: 200,
  });
}
