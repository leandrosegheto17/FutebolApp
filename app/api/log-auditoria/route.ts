/**
 * GET /api/log-auditoria (BE-09, RF-04.5).
 *
 * Leitura interna — feature exclusiva da área interna (RF-07.1: "histórico/
 * correção" exige senha interna), protegida pelo middleware de sessão
 * (`middleware.ts`, `INTERNAL_READ_PROTECTED_PREFIXES`) mesmo sendo `GET`,
 * mesmo padrão já usado por `GET /api/atletas` (BE-06).
 *
 * Lista `app.log_auditoria` ordenado do mais recente ao mais antigo
 * (RF-04.5) — nunca inclui campo de autor individual (RN-12, coluna nem
 * existe no schema). Aceita `?limit=` opcional (decisão de detalhe
 * documentada em `src/modules/auditoria/validation.ts`, não exigida
 * literalmente pelo critério de aceite).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  listarLogAuditoria,
  logAuditoriaQuerySchema,
  paraLogAuditoriaResponse,
} from "@/modules/auditoria";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = logAuditoriaQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Requisição inválida.",
        detalhes: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const client = getServiceRoleClient();
  const linhas = await listarLogAuditoria(client, parsed.data.limit);

  return NextResponse.json(paraLogAuditoriaResponse(linhas), { status: 200 });
}
