// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "../session-token";
import { SESSION_TTL_MS } from "../constants";

const ORIGINAL_SECRET = process.env.SESSION_COOKIE_SECRET;

beforeAll(() => {
  process.env.SESSION_COOKIE_SECRET = "segredo-de-teste-nao-e-real-para-session-token";
});

afterAll(() => {
  process.env.SESSION_COOKIE_SECRET = ORIGINAL_SECRET;
});

describe("createSessionToken / verifySessionToken (BE-04, ADR-004)", () => {
  it("gera um token que verifica como válido logo após ser emitido", async () => {
    const now = new Date("2026-09-03T10:00:00.000Z");
    const session = await createSessionToken(now);
    expect(await verifySessionToken(session.token, now)).toBe(true);
  });

  it("TTL fica dentro da faixa de 8-12h exigida (TASK.md Secao 1.3/ADR-004)", async () => {
    const now = new Date("2026-09-03T10:00:00.000Z");
    const session = await createSessionToken(now);
    expect(session.maxAgeSeconds).toBeGreaterThanOrEqual(8 * 60 * 60);
    expect(session.maxAgeSeconds).toBeLessThanOrEqual(12 * 60 * 60);
    expect(session.expiresAt.getTime() - now.getTime()).toBe(SESSION_TTL_MS);
  });

  it("token expira exatamente no limite do TTL (nunca renovável sem novo login)", async () => {
    const now = new Date("2026-09-03T10:00:00.000Z");
    const session = await createSessionToken(now);
    const justBeforeExpiry = new Date(session.expiresAt.getTime() - 1);
    const justAfterExpiry = new Date(session.expiresAt.getTime() + 1);
    expect(await verifySessionToken(session.token, justBeforeExpiry)).toBe(true);
    expect(await verifySessionToken(session.token, justAfterExpiry)).toBe(false);
  });

  it("rejeita token com assinatura adulterada", async () => {
    const session = await createSessionToken();
    const [payload, signature] = session.token.split(".");
    const tamperedSignature = signature === "AA" ? "BB" : "AA" + signature!.slice(2);
    const tampered = `${payload}.${tamperedSignature}`;
    expect(await verifySessionToken(tampered)).toBe(false);
  });

  it("rejeita token com payload adulterado (mesmo mantendo a assinatura original)", async () => {
    const session = await createSessionToken();
    const [, signature] = session.token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ exp: Date.now() + 999_999_999 }),
    ).toString("base64url");
    const tampered = `${forgedPayload}.${signature}`;
    expect(await verifySessionToken(tampered)).toBe(false);
  });

  it("rejeita valores nulos/vazios/malformados sem lançar exceção", async () => {
    expect(await verifySessionToken(null)).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
    expect(await verifySessionToken("sem-ponto-separador")).toBe(false);
    expect(await verifySessionToken(".semPayload")).toBe(false);
    expect(await verifySessionToken("semAssinatura.")).toBe(false);
    expect(await verifySessionToken("!!!invalido!!!.assinatura")).toBe(false);
  });

  it("lança erro claro se SESSION_COOKIE_SECRET não estiver configurada", async () => {
    const backup = process.env.SESSION_COOKIE_SECRET;
    delete process.env.SESSION_COOKIE_SECRET;
    await expect(createSessionToken()).rejects.toThrow(/SESSION_COOKIE_SECRET/);
    process.env.SESSION_COOKIE_SECRET = backup;
  });
});
