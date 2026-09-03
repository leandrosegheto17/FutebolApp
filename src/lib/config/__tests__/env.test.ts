// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getPublicEnv, getServerOnlyEnv } from "@/lib/config/env";

const validPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
  NEXT_PUBLIC_APP_BASE_URL: "http://localhost:3000",
};

const validServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-value",
  SESSION_COOKIE_SECRET: "session-secret-value",
};

describe("getPublicEnv", () => {
  it("retorna as variáveis públicas quando todas estão presentes e válidas", () => {
    const env = getPublicEnv(validPublicEnv);
    expect(env).toEqual(validPublicEnv);
  });

  it("lança erro quando NEXT_PUBLIC_SUPABASE_URL está ausente", () => {
    const { NEXT_PUBLIC_SUPABASE_URL: _omit, ...rest } = validPublicEnv;
    expect(() => getPublicEnv(rest)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("lança erro quando NEXT_PUBLIC_SUPABASE_URL não é uma URL válida", () => {
    expect(() =>
      getPublicEnv({ ...validPublicEnv, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

describe("getServerOnlyEnv", () => {
  it("retorna as variáveis de servidor quando todas estão presentes e válidas", () => {
    const env = getServerOnlyEnv(validServerEnv);
    expect(env).toEqual(validServerEnv);
  });

  it("lança erro quando SUPABASE_SERVICE_ROLE_KEY está ausente", () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omit, ...rest } = validServerEnv;
    expect(() => getServerOnlyEnv(rest)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("lança erro quando SESSION_COOKIE_SECRET está ausente", () => {
    const { SESSION_COOKIE_SECRET: _omit, ...rest } = validServerEnv;
    expect(() => getServerOnlyEnv(rest)).toThrow(/SESSION_COOKIE_SECRET/);
  });
});
