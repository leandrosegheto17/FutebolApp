/**
 * Teste de integração de BE-05 (TASK.md Secao 3.1) — critério de aceite:
 * "permite trocar a senha sem depender de fluxo de e-mail". Cobre a função
 * `redefinirSenhaInterna` (a mesma usada pelo script/CLI
 * `scripts/redefinir-senha-interna.ts`) de ponta a ponta contra o Supabase
 * local real, incluindo o caso de uso real do runbook (login com a senha
 * antiga deixa de funcionar, login com a nova passa a funcionar).
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02/BE-03/BE-04 (ver `app/api/auth/__tests__/auth.integration.test.ts`):
 *
 *   supabase start
 *   supabase status -o env --override-name auth.anon_key=TEST_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=TEST_SUPABASE_SERVICE_ROLE_KEY \
 *     --override-name api.url=TEST_SUPABASE_URL \
 *     --override-name db.url=TEST_SUPABASE_DB_URL >> .env.test.local
 *   npm run test:integration
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getHashSenhaVigente } from "../repository";
import { verifyPassword } from "../password";
import { redefinirSenhaInterna } from "../redefinir-senha";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

describe.skipIf(!podeRodar)("redefinirSenhaInterna (BE-05)", () => {
  let service: SupabaseClient<any, any, any>;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    // Deixa `auth_interno` num estado neutro e conhecido para não vazar uma
    // senha de teste "vencedora" para outras suítes que rodem depois desta
    // no mesmo Supabase local (ex.: `auth.integration.test.ts`, que sempre
    // faz `upsert` da própria senha antes de cada execução, então não
    // depende do valor deixado aqui — mas fica documentado por clareza).
    await redefinirSenhaInterna(service, "senha-final-neutra-pos-teste-be05");
  });

  it("substitui o hash vigente por um novo hash argon2id válido", async () => {
    await redefinirSenhaInterna(service, "senha-antes-do-teste-be05");
    const hashAntes = await getHashSenhaVigente(service);
    expect(hashAntes).not.toBeNull();
    expect(hashAntes!.startsWith("$argon2id$")).toBe(true);

    await redefinirSenhaInterna(service, "senha-depois-do-teste-be05");
    const hashDepois = await getHashSenhaVigente(service);
    expect(hashDepois).not.toBeNull();
    expect(hashDepois!.startsWith("$argon2id$")).toBe(true);
    expect(hashDepois).not.toBe(hashAntes);
  });

  it("a senha antiga deixa de validar e a nova senha passa a validar (cenário real do runbook)", async () => {
    await redefinirSenhaInterna(service, "senha-velha-be05-cenario-real");
    const hashVelho = await getHashSenhaVigente(service);
    expect(await verifyPassword(hashVelho!, "senha-velha-be05-cenario-real")).toBe(true);

    await redefinirSenhaInterna(service, "senha-nova-be05-cenario-real");
    const hashNovo = await getHashSenhaVigente(service);

    expect(await verifyPassword(hashNovo!, "senha-nova-be05-cenario-real")).toBe(true);
    expect(await verifyPassword(hashNovo!, "senha-velha-be05-cenario-real")).toBe(false);
  });

  it("é seguro rodar mais de uma vez seguida (upsert, nunca DELETE — trigger de BE-04 bloquearia)", async () => {
    await redefinirSenhaInterna(service, "primeira-execucao-be05");
    await redefinirSenhaInterna(service, "segunda-execucao-be05");
    await redefinirSenhaInterna(service, "terceira-execucao-be05");

    const hashFinal = await getHashSenhaVigente(service);
    expect(await verifyPassword(hashFinal!, "terceira-execucao-be05")).toBe(true);

    const { count, error } = await service
      .from("auth_interno")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    // Continua singleton (uma única linha, id=1) — nunca cria segunda linha.
    expect(count).toBe(1);
  });

  it("atualiza `atualizado_em` para o instante informado, sempre que a senha é trocada", async () => {
    const instante = new Date("2026-09-05T12:00:00.000Z");
    await redefinirSenhaInterna(service, "senha-com-instante-fixo-be05", instante);

    const { data, error } = await service
      .from("auth_interno")
      .select("atualizado_em")
      .eq("id", 1)
      .single();
    if (error) throw error;
    expect(new Date(data!.atualizado_em as string).toISOString()).toBe(
      instante.toISOString(),
    );
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("redefinirSenhaInterna (BE-05, integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
