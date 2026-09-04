/**
 * POST /api/auth/login (BE-04, ADR-004, RF-07).
 *
 * Runtime Node.js (padrão do App Router — nenhum `export const runtime`
 * declarado): necessário porque `verifyPasswordOrDummy`/`hashPassword`
 * (`@node-rs/argon2`) são um addon nativo, incompatível com Edge Runtime.
 * Único endpoint isento do middleware de sessão (`middleware.ts`) — é
 * exatamente por aqui que uma sessão é obtida pela primeira vez.
 *
 * Critério de aceite literal (TASK.md BE-04):
 * - Senha correta emite cookie httpOnly/Secure/SameSite=Strict, TTL 8-12h.
 * - 5 tentativas erradas em 15 min bloqueiam com backoff.
 * - Mensagem de erro idêntica em ambos os casos (RF-07.3).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceRoleClient } from "@/lib/supabase/server-client";
import { getClientIp } from "@/modules/autenticacao/client-ip";
import { LOGIN_GENERIC_ERROR_MESSAGE } from "@/modules/autenticacao/constants";
import { verifyPasswordOrDummy } from "@/modules/autenticacao/password";
import { evaluateLoginRateLimit } from "@/modules/autenticacao/rate-limit";
import {
  getHashSenhaVigente,
  getTentativasRecentes,
  registrarTentativaLogin,
} from "@/modules/autenticacao/repository";
import { setSessionCookie } from "@/modules/autenticacao/session-cookie";

const loginBodySchema = z.object({
  senha: z.string().min(1, { message: "senha é obrigatória." }),
});

function genericAuthFailureResponse(): NextResponse {
  // RF-07.3 / GUARDRAILS.md regra 15: mesma resposta (status + corpo),
  // byte a byte, esteja a falha por senha incorreta OU por rate limiting —
  // nenhum campo adicional (ex.: "retryAfter") que permita ao cliente
  // distinguir os dois casos.
  //
  // DEBT-05 (SECURITY-REVIEW.md Secao 12, resolvido — ver nota de resolução
  // na própria entrada): o caminho `rateLimit.bloqueado === true` também
  // chama `verifyPasswordOrDummy` antes de responder (ver `POST` abaixo),
  // equalizando o custo de CPU/tempo entre os dois caminhos — o
  // side-channel de timing que permitia inferir o estado do rate limit sem
  // conhecer a senha foi fechado. Esta função continua responsável apenas
  // pelo CONTEÚDO idêntico da resposta.
  return NextResponse.json({ error: LOGIN_GENERIC_ERROR_MESSAGE }, { status: 401 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let senha: string;
  try {
    const json: unknown = await request.json();
    const parsed = loginBodySchema.safeParse(json);
    if (!parsed.success) {
      // Corpo malformado é uma classe de erro diferente de "senha
      // incorreta"/"bloqueado" (RF-07.3 trata só desses dois) — validação
      // de input básica (security-implementation-check), não vaza estado
      // de rate limiting nem de configuração da senha.
      return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
    }
    senha = parsed.data.senha;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const client = getServiceRoleClient();

  const tentativasRecentes = await getTentativasRecentes(client, ip);
  const rateLimit = evaluateLoginRateLimit(tentativasRecentes);

  if (rateLimit.bloqueado) {
    // DEBT-05 (SECURITY-REVIEW.md Secao 12): chama `verifyPasswordOrDummy`
    // mesmo aqui, com o mesmo custo de CPU do caminho normal (argon2id.verify
    // contra o hash vigente, ou contra o hash descartável quando ainda não há
    // senha configurada), e descarta o resultado — bloqueado nunca autentica,
    // não importa se a senha estaria correta. O único propósito desta chamada
    // é equalizar o TEMPO de resposta entre "bloqueado" e "senha incorreta,
    // não bloqueado", fechando o side-channel de timing que permitia inferir
    // o estado do rate limit para um IP sem nunca saber a senha.
    const hashVigenteBloqueado = await getHashSenhaVigente(client);
    await verifyPasswordOrDummy(hashVigenteBloqueado, senha);
    await registrarTentativaLogin(client, { ip, sucesso: false });
    return genericAuthFailureResponse();
  }

  const hashVigente = await getHashSenhaVigente(client);
  const senhaCorreta = await verifyPasswordOrDummy(hashVigente, senha);

  await registrarTentativaLogin(client, { ip, sucesso: senhaCorreta });

  if (!senhaCorreta) {
    return genericAuthFailureResponse();
  }

  const response = NextResponse.json({ status: "ok" }, { status: 200 });
  await setSessionCookie(response, request);
  return response;
}
