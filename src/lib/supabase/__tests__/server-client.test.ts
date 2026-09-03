// @vitest-environment jsdom
//
// Este teste roda em ambiente `jsdom` de propósito (ao contrário dos demais
// testes de backend, que usam `node`): precisamos que `window` exista, para
// provar que `getServiceRoleClient()` recusa rodar em contexto de navegador
// (GUARDRAILS.md regra 7 — chave de serviço nunca exposta ao cliente).
import { describe, expect, it } from "vitest";
import { getServiceRoleClient } from "@/lib/supabase/server-client";

describe("getServiceRoleClient", () => {
  it("lança erro ao ser chamada em contexto com `window` definido (navegador)", () => {
    expect(typeof window).not.toBe("undefined");
    expect(() => getServiceRoleClient()).toThrow(
      /nunca deve ser chamada em código que roda no navegador/,
    );
  });
});
