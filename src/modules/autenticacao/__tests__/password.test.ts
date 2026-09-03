// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from "../password";

describe("hashPassword / verifyPassword (BE-04, ADR-004, RNF-03)", () => {
  it("produz um hash no formato argon2id (PHC string $argon2id$...)", async () => {
    const hash = await hashPassword("senha-correta-de-teste");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifica com sucesso a senha correta contra o próprio hash", async () => {
    const hash = await hashPassword("senha-correta-de-teste");
    expect(await verifyPassword(hash, "senha-correta-de-teste")).toBe(true);
  });

  it("rejeita uma senha incorreta contra o hash", async () => {
    const hash = await hashPassword("senha-correta-de-teste");
    expect(await verifyPassword(hash, "senha-errada")).toBe(false);
  });

  it("nunca lança exceção para um hash malformado — trata como não confere", async () => {
    await expect(
      verifyPassword("isto-nao-e-um-hash-argon2", "qualquer-senha"),
    ).resolves.toBe(false);
  });

  it("dois hashes da mesma senha são diferentes (salt aleatório por chamada)", async () => {
    const hashA = await hashPassword("mesma-senha");
    const hashB = await hashPassword("mesma-senha");
    expect(hashA).not.toBe(hashB);
    expect(await verifyPassword(hashA, "mesma-senha")).toBe(true);
    expect(await verifyPassword(hashB, "mesma-senha")).toBe(true);
  });
});

describe("verifyPasswordOrDummy (timing consistente sem senha configurada)", () => {
  it("retorna false quando o hash vigente é null (auth_interno sem linha)", async () => {
    expect(await verifyPasswordOrDummy(null, "qualquer-senha")).toBe(false);
  });

  it("nunca lança, mesmo chamada repetidamente com hash null", async () => {
    await expect(verifyPasswordOrDummy(null, "a")).resolves.toBe(false);
    await expect(verifyPasswordOrDummy(null, "b")).resolves.toBe(false);
  });

  it("com hash real, comporta-se igual a verifyPassword", async () => {
    const hash = await hashPassword("senha-correta-de-teste");
    expect(await verifyPasswordOrDummy(hash, "senha-correta-de-teste")).toBe(true);
    expect(await verifyPasswordOrDummy(hash, "senha-errada")).toBe(false);
  });
});
