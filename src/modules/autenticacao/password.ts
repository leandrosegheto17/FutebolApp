/**
 * Hash/verificação da senha única compartilhada (BE-04, ADR-004, RNF-03,
 * TASK.md Secao 1.3 — "hash de senha com argon2id, comparação em tempo
 * constante (nunca `===` direto sobre o hash)").
 *
 * Biblioteca: `@node-rs/argon2` (napi-rs, binário pré-compilado — sem
 * necessidade de toolchain de compilação nativa no build da Vercel nem no
 * ambiente local). Decisão de detalhe documentada (não escalada — nenhuma
 * biblioteca de hash está definida em TASK.md/SDD.md além do algoritmo
 * exigido): `argon2` (pacote `node-argon2`, mais popular) também serviria,
 * mas depende de compilação nativa via `node-gyp` em alguns ambientes;
 * `@node-rs/argon2` publica binário pré-compilado para as plataformas
 * relevantes deste projeto (Vercel = `linux-x64-gnu`, dev local Windows =
 * `win32-x64-msvc`), reduzindo risco de falha de build sem custo de
 * segurança (mesmo algoritmo RFC 9106, mesma biblioteca de referência em
 * Rust). Requer Node.js runtime (não funciona em Edge Runtime) — por isso
 * nunca é importado por `middleware.ts` (Edge), somente pelos Route
 * Handlers de login (Node.js runtime, o padrão do App Router quando
 * `export const runtime` não é declarado).
 *
 * `verify()` da biblioteca já faz a comparação em tempo constante
 * internamente (é assim que toda biblioteca de verificação de hash de senha
 * madura funciona) — nenhum código deste módulo faz `===`/`Buffer.compare`
 * manual sobre o hash, satisfazendo o requisito literal do TASK.md.
 */
import {
  hash as argon2Hash,
  verify as argon2Verify,
  type Algorithm,
} from "@node-rs/argon2";

// Argon2id = 2 (node_modules/@node-rs/argon2/index.d.ts) — TASK.md Secao 1.3
// exige explicitamente argon2id (a biblioteca já usa isso como valor
// default, mas fixamos de forma explícita mesmo assim, em vez de confiar no
// default de uma dependência de terceiro). Valor literal em vez de
// `Algorithm.Argon2id`: o TypeScript, com `isolatedModules` (tsconfig deste
// projeto, exigido pelo compilador do Next.js/SWC), não permite acessar o
// valor de um `const enum` importado de outro módulo — a inlining de
// constante não é segura em compilação arquivo-a-arquivo. `Algorithm` é
// usado aqui só como TIPO (`import type`), nunca como valor.
const ARGON2ID_ALGORITHM = 2 as Algorithm;

const ARGON2ID_OPTIONS = { algorithm: ARGON2ID_ALGORITHM } as const;

/** Gera o hash argon2id de uma senha em texto puro. */
export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2ID_OPTIONS);
}

/**
 * Verifica uma senha em texto puro contra um hash argon2id já gravado.
 * Nunca lança por hash malformado — trata como "não confere" (`false`),
 * nunca como erro 500, para que o chamador sempre caia no mesmo caminho de
 * resposta genérica (RF-07.3).
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify(hash, password, ARGON2ID_OPTIONS);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * Hash argon2id "descartável", gerado uma vez por instância de servidor
 * (lazy, cacheado em memória do módulo) e usado para comparar contra ele
 * quando `app.auth_interno` não tem nenhuma linha configurada (ambiente sem
 * senha definida ainda). Mantém o tempo de resposta do endpoint de login
 * equivalente ao caso de senha incorreta normal, em vez de responder mais
 * rápido (o que vazaria, por diferença de tempo, que o sistema "não tem
 * senha configurada" — mesmo espírito de RF-07.3: nunca diferenciar motivo
 * de falha, nem por conteúdo da resposta nem por timing).
 */
async function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(`dummy-${crypto.randomUUID()}`);
  }
  return dummyHashPromise;
}

/**
 * Verifica a senha submetida contra o hash vigente, ou (quando `hash` é
 * `null` — nenhuma linha em `app.auth_interno` ainda) contra um hash
 * descartável só para manter o tempo de resposta consistente. Sempre
 * retorna `false` neste segundo caso, nunca `true` por acidente.
 */
export async function verifyPasswordOrDummy(
  hash: string | null,
  password: string,
): Promise<boolean> {
  if (hash === null) {
    await verifyPassword(await getDummyHash(), password);
    return false;
  }
  return verifyPassword(hash, password);
}
