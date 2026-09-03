/**
 * Emissão/verificação do token de sessão (BE-04, ADR-004): cookie assinado
 * ("token opaco" — uma das duas opções que o próprio ADR-004 aceita, ao
 * lado de JWT; optamos por um esquema mínimo próprio em vez de trazer uma
 * biblioteca JWT inteira para um payload que carrega uma única claim de
 * expiração, TASK.md Secao 1.0 — "preferir a solução mais simples que
 * satisfaça o critério de aceite").
 *
 * Implementado inteiramente com a Web Crypto API (`crypto.subtle`), NÃO com
 * `node:crypto` — decisão estrutural, não de estilo: o middleware de sessão
 * (`middleware.ts`) roda em Edge Runtime no Next.js 14 App Router (a única
 * opção de runtime disponível para middleware nesta versão), onde o módulo
 * `node:crypto` (`createHmac`/`timingSafeEqual`) não está disponível — mas a
 * Web Crypto API está, tanto em Edge Runtime quanto em Node.js 20+ (usado
 * pelos Route Handlers de login/logout). Um único módulo funciona nos dois
 * runtimes sem duplicação.
 *
 * Payload contém exclusivamente `exp` (timestamp de expiração) — nenhuma
 * outra claim, porque não há identidade individual para carregar (RN-12: um
 * único papel, sem conta) e a autorização é binária (sessão válida = acesso
 * total, SDD.md Secao 7.2).
 */
import { SESSION_TTL_MS } from "./constants";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSessionCookieSecret(): string {
  // Leitura direta de `process.env` (não via `getServerOnlyEnv()` de
  // `src/lib/config/env.ts`) de propósito: aquele helper valida também
  // `SUPABASE_SERVICE_ROLE_KEY`, que o middleware (Edge Runtime) não precisa
  // e cujo acesso condicionaria o bundling de uma variável adicional dentro
  // do middleware sem necessidade — este módulo só depende de
  // `SESSION_COOKIE_SECRET`, referenciada aqui de forma estática para que o
  // bundler do Next.js consiga incluí-la no runtime de Edge.
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_COOKIE_SECRET não configurada — obrigatória para emitir/validar sessão (ADR-004).",
    );
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface SessionToken {
  /** Valor a gravar no cookie (`payload.assinatura`, ambos base64url). */
  token: string;
  expiresAt: Date;
  /** `Max-Age` do cookie, em segundos (TASK.md Secao 1.3 — TTL 8-12h). */
  maxAgeSeconds: number;
}

/**
 * Emite um novo token de sessão válido por `SESSION_TTL_MS` a partir de
 * `now` (parametrizado para ser testável de forma determinística).
 */
export async function createSessionToken(now: Date = new Date()): Promise<SessionToken> {
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const payloadJson = JSON.stringify({ exp: expiresAt.getTime() });
  const payloadEncoded = base64UrlEncode(encoder.encode(payloadJson));
  const key = await getHmacKey(getSessionCookieSecret());
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadEncoded));
  const signatureEncoded = base64UrlEncode(new Uint8Array(signature));
  return {
    token: `${payloadEncoded}.${signatureEncoded}`,
    expiresAt,
    maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/**
 * Verifica um token de sessão. Retorna `true` somente se a assinatura bate
 * (comparação em tempo constante — TASK.md Secao 1.3, "comparação em tempo
 * constante" aplicada aqui à assinatura de sessão, além do hash de senha via
 * argon2 em `password.ts`) e o token ainda não expirou.
 *
 * Nunca lança: qualquer token malformado (assinatura truncada, payload que
 * não é JSON válido, `exp` ausente/não-numérico) é tratado como sessão
 * inválida, nunca como erro de sistema — consistente com "toda rota de
 * escrita retorna 401 sem sessão válida" (TASK.md BE-04), nunca 500.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  if (!token) return false;
  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) return false;
  const payloadEncoded = token.slice(0, separatorIndex);
  const signatureEncoded = token.slice(separatorIndex + 1);

  let expectedSignature: Uint8Array;
  let providedSignature: Uint8Array;
  try {
    const key = await getHmacKey(getSessionCookieSecret());
    const computed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payloadEncoded),
    );
    expectedSignature = new Uint8Array(computed);
    providedSignature = base64UrlDecode(signatureEncoded);
  } catch {
    return false;
  }

  if (expectedSignature.length !== providedSignature.length) return false;

  // Comparação em tempo constante manual: a Web Crypto API não expõe um
  // equivalente a `crypto.timingSafeEqual` do `node:crypto` — acumula XOR
  // byte a byte sem `break`/curto-circuito, para que o tempo de execução
  // não vaze quantos bytes iniciais coincidiram.
  let diff = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    diff |= expectedSignature[i]! ^ providedSignature[i]!;
  }
  if (diff !== 0) return false;

  try {
    const payloadJson = decoder.decode(base64UrlDecode(payloadEncoded));
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== "number" || Number.isNaN(payload.exp)) return false;
    return payload.exp > now.getTime();
  } catch {
    return false;
  }
}
