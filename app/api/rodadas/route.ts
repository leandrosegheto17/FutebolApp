/**
 * POST /api/rodadas (BE-08, RF-02) e GET /api/rodadas (BE-16, T06 do
 * `UX-SPEC.md` — lista cronológica decrescente; `confronto`/
 * `status_correcao` acrescentados por BE-R02, TASK.md Parte II Seção 3.1 —
 * Iniciativa de Redesenho Visual, consumidos por `FE-R06`/T06 redesenhado).
 *
 * `POST` é escrita — já coberta pelo middleware de sessão padrão
 * (`WRITE_METHODS`/`middleware.ts`, BE-04): não precisava entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` (esse array só afeta `GET`, e BE-08 não
 * introduziu nenhuma rota `GET` — ver decisão de escopo registrada na nota
 * de status de BE-08 no `TASK.md`, origem da lacuna fechada só agora por
 * BE-16). `GET`, introduzido nesta tarefa, JÁ está coberto por
 * `INTERNAL_READ_PROTECTED_PREFIXES` (`/api/rodadas` entrou nessa lista em
 * BE-13, para `GET .../substituicoes` — nenhuma mudança em `middleware.ts`
 * necessária aqui).
 *
 * Corpo malformado/inválido de `POST` (inclui RF-02.6 — evento de jogo para
 * atleta ausente, via `lancarRodadaBodySchema.superRefine`) → `400`, mesmo
 * padrão de `POST /api/atletas` (BE-06); escrita bem-sucedida → `201`;
 * alerta de rodada duplicada (RF-02.8) → `409`. `?limit=` inválido de `GET`
 * (não numérico, ≤ 0, ou acima do teto — `listarRodadasQuerySchema`) → `400`.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  lancarRodadaBodySchema,
  lancarRodadaComDuplicidade,
  listarRodadas,
  listarRodadasQuerySchema,
  paraRodadaResponse,
  paraRodadasResumoResponse,
} from "@/modules/rodadas";

function corpoRequisicaoInvalida(issues: { path: PropertyKey[]; message: string }[]) {
  return NextResponse.json(
    {
      error: "Requisição inválida.",
      detalhes: issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    { status: 400 },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = listarRodadasQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const rodadas = await listarRodadas(client, parsed.data.limit);

  return NextResponse.json(paraRodadasResumoResponse(rodadas), { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = lancarRodadaBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await lancarRodadaComDuplicidade(client, parsed.data);

  if (resultado.tipo === "duplicidade") {
    // RF-02.8: alerta, não bloqueio definitivo — o Frontend reenvia com
    // `confirmar_duplicidade: true` depois que o organizador confirmar.
    return NextResponse.json(
      { error: "duplicidade", rodadas_duplicadas: resultado.duplicatas },
      { status: 409 },
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
    // de app.configuracao_pontuacao vigentes — condição defensiva, o seed
    // desta mesma tarefa garante que isso não ocorra em uso normal.
    return NextResponse.json(
      { error: "configuracao_pontuacao_ausente", message: resultado.mensagem },
      { status: 500 },
    );
  }

  return NextResponse.json(
    paraRodadaResponse(resultado.rodada, resultado.participacoes),
    { status: 201 },
  );
}
