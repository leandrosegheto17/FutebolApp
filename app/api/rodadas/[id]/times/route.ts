/**
 * POST /api/rodadas/:id/times — confirma/persiste a divisão de times de uma
 * rodada (RF-05.4).
 *
 * Escopo AMPLIADO desta execução de BE-13 por decisão EXPLÍCITA do usuário
 * (ver TASK.md, nota de status de BE-13): resolve o GAP estrutural
 * sinalizado por BE-11 (`POST /api/times/sugestao` nunca persiste
 * `app.time`/`app.time_atleta` — só devolve a sugestão, RF-05.4) — este
 * endpoint é pré-requisito para BE-13 (Substituições, RF-06.1) ter um
 * `time_id` já persistido para vincular.
 *
 * Escrita — já coberta pelo middleware de sessão padrão (`WRITE_METHODS`/
 * `middleware.ts`, BE-04): não precisa entrar em
 * `INTERNAL_READ_PROTECTED_PREFIXES` (esse array só afeta `GET`).
 *
 * Aciona `app.confirmar_times_rodada` (RPC): grava N `app.time` + M
 * `app.time_atleta` em uma única transação Postgres (ver a migration
 * `20260903160000_create_confirmar_times_rodada_function.sql` para a
 * justificativa completa de usar uma função PL/pgSQL aqui, mesmo esta
 * operação não alterar saldo). Reconfirmar (chamar de novo para a mesma
 * rodada) SUBSTITUI a divisão anterior por completo, salvo se já existir
 * `app.substituicao` registrada contra os times atuais — nesse caso, `409`
 * (fidelidade histórica, RF-06.1; decisão de detalhe documentada na própria
 * migration).
 *
 * Mapeamento de resultado:
 * - corpo malformado/inválido → `400`;
 * - algum id de `times[].atletas_ids` não existe em `app.atleta` → `404`;
 * - rodada (`id` da URL) não encontrada → `404`;
 * - rodada já excluída (soft-delete) → `409`;
 * - já existe substituição registrada contra a divisão atual → `409`;
 * - sucesso → `200` (nunca `201` puro — reconfirmar é uma operação válida
 *   e esperada, não só uma criação única).
 */
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import {
  confirmarTimes,
  confirmarTimesBodySchema,
  paraTimesConfirmadosResponse,
} from "@/modules/times/confirmacao";

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

  const parsed = confirmarTimesBodySchema.safeParse(corpo);
  if (!parsed.success) {
    return corpoRequisicaoInvalida(parsed.error.issues);
  }

  const client = getServiceRoleClient();
  const resultado = await confirmarTimes(client, params.id, parsed.data);

  if (resultado.tipo === "atleta_nao_encontrado") {
    return NextResponse.json(
      { error: "Atleta não encontrado.", atleta_id: resultado.atletaId },
      { status: 404 },
    );
  }
  if (resultado.tipo === "rodada_nao_encontrada") {
    return NextResponse.json({ error: "Rodada não encontrada." }, { status: 404 });
  }
  if (resultado.tipo === "rodada_excluida") {
    // Mesmo formato/mensagem de `ErroRodadaJaExcluida` (BE-09, já publicado
    // em API-CONTRACT.yaml) — mesma condição de fundo (errcode PL/pgSQL
    // RD001), reaproveitada aqui em vez de um schema novo paralelo.
    return NextResponse.json(
      { error: "Esta rodada já foi excluída anteriormente." },
      { status: 409 },
    );
  }
  if (resultado.tipo === "substituicao_existente") {
    return NextResponse.json(
      { error: "substituicao_existente", message: resultado.mensagem },
      { status: 409 },
    );
  }

  return NextResponse.json(
    paraTimesConfirmadosResponse(resultado.rodadaId, resultado.times),
    { status: 200 },
  );
}
