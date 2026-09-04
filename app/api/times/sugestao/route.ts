/**
 * POST /api/times/sugestao (BE-11, RF-05.1 a RF-05.3, ADR-007/ADR-010).
 *
 * Escrita (POST) — já coberta pelo middleware de sessão padrão
 * (`WRITE_METHODS`/`middleware.ts`, BE-04): montagem de times é feature
 * exclusiva da área interna (T09 do `UX-SPEC.md`), mas como o método é
 * sempre `POST` (nunca `GET`), não precisa entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` — mesmo racional já documentado em
 * `app/api/rodadas/route.ts` (BE-08)/`app/api/restricoes/route.ts` (BE-12)
 * para as próprias rotas de escrita.
 *
 * Não persiste nada em `app.time`/`app.time_atleta` — devolve só a
 * SUGESTÃO (RF-05.1/RF-05.4: "o organizador pode ajustar manualmente antes
 * de confirmar"). Persistir a divisão confirmada não está coberto pelo
 * critério de aceite literal de BE-11 (`TASK.md` Seção 3.1) nem por
 * nenhuma outra tarefa desta decomposição — GAP sinalizado explicitamente
 * na nota de status desta tarefa no `TASK.md`, não uma lacuna silenciosa.
 *
 * Mapeamento de resultado (`src/modules/times/montar.ts`) para HTTP:
 * - corpo malformado/inválido → `400` (mesmo padrão de `POST /api/atletas`/
 *   `POST /api/restricoes`);
 * - algum id de `atletas_ids` não existe em `app.atleta` → `404` (mesmo
 *   padrão de `POST /api/restricoes`, BE-12);
 * - geração concluída dentro do tempo, `status: "ok"` OU `status:
 *   "conflito"` → `200` — os dois são resultados VÁLIDOS do algoritmo
 *   (RF-05.2 trata "conflito" como informação, não como erro técnico);
 * - timeout (`TASK.md` Seção 6.2 item 3) → `500`, corpo `{ error:
 *   "falha_tecnica" }` — reaproveitado pelo estado genérico "falha técnica
 *   real" já previsto pelo `UX-SPEC.md` para T09 (Seção 4), sem tela nova.
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  montarSugestaoTimes,
  paraSugestaoConflitoResponse,
  paraSugestaoOkResponse,
  sugestaoTimesBodySchema,
} from "@/modules/times";

function corpoRequisicaoInvalida(issues: { path: PropertyKey[]; message: string }[]) {
  return NextResponse.json(
    {
      error: "Requisição inválida.",
      detalhes: issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    { status: 400 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sugestaoTimesBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await montarSugestaoTimes(client, parsed.data);

  if (resultado.tipo === "atleta_nao_encontrado") {
    return NextResponse.json(
      { error: "Atleta não encontrado.", atleta_id: resultado.atletaId },
      { status: 404 },
    );
  }

  if (resultado.tipo === "falha_tecnica") {
    // TASK.md Seção 6.2 item 3 — timeout nunca trava a função serverless:
    // resposta de erro controlada, nunca o processo abortado sem resposta.
    return NextResponse.json(
      { error: "falha_tecnica", message: resultado.mensagem },
      { status: 500 },
    );
  }

  if (resultado.tipo === "conflito") {
    return NextResponse.json(
      paraSugestaoConflitoResponse(
        resultado.grupos,
        resultado.quantidadeTimes,
        resultado.apelidos,
      ),
      { status: 200 },
    );
  }

  return NextResponse.json(
    paraSugestaoOkResponse(resultado.times, resultado.quantidadeTimes),
    {
      status: 200,
    },
  );
}
