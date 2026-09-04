import { describe, expect, it } from "vitest";
import {
  VALOR_AUTORIZACAO_ESPERADO,
  VARIAVEL_AUTORIZACAO_GOVERNANCA,
  verificarAutorizacaoGovernanca,
} from "../governanca";

describe("verificarAutorizacaoGovernanca (GUARDRAILS.md regra 35 / BLOCKER-003)", () => {
  it("bloqueia por padrão quando a variável de autorização não está definida", () => {
    const resultado = verificarAutorizacaoGovernanca({});
    expect(resultado.autorizado).toBe(false);
    if (!resultado.autorizado) {
      expect(resultado.mensagem).toMatch(/regra 35/);
      expect(resultado.mensagem).toMatch(/BLOCKER-003/);
    }
  });

  it("bloqueia quando a variável está definida com um valor diferente do esperado", () => {
    const resultado = verificarAutorizacaoGovernanca({
      [VARIAVEL_AUTORIZACAO_GOVERNANCA]: "sim",
    });
    expect(resultado.autorizado).toBe(false);
  });

  it("libera somente com o valor exato esperado", () => {
    const resultado = verificarAutorizacaoGovernanca({
      [VARIAVEL_AUTORIZACAO_GOVERNANCA]: VALOR_AUTORIZACAO_ESPERADO,
    });
    expect(resultado.autorizado).toBe(true);
  });
});
