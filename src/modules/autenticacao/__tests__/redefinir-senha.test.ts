// @vitest-environment node
import { describe, expect, it } from "vitest";
import { TAMANHO_MINIMO_SENHA, validarNovaSenha } from "../redefinir-senha";

describe("validarNovaSenha (BE-05, TASK.md Seção 3.1)", () => {
  it("aceita uma senha válida com confirmação idêntica", () => {
    const senha = "senha-nova-valida-123";
    expect(validarNovaSenha(senha, senha)).toEqual({ ok: true });
  });

  it("rejeita quando a confirmação não confere com a nova senha", () => {
    const resultado = validarNovaSenha("senha-nova-valida-123", "senha-diferente-456");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivo).toMatch(/confirmação/i);
    }
  });

  it(`rejeita senha com menos de ${TAMANHO_MINIMO_SENHA} caracteres, mesmo com confirmação igual`, () => {
    const curta = "abc123";
    expect(curta.length).toBeLessThan(TAMANHO_MINIMO_SENHA);
    const resultado = validarNovaSenha(curta, curta);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivo).toMatch(new RegExp(`${TAMANHO_MINIMO_SENHA} caracteres`));
    }
  });

  it(`aceita senha com exatamente ${TAMANHO_MINIMO_SENHA} caracteres (limite inclusivo)`, () => {
    const limite = "a".repeat(TAMANHO_MINIMO_SENHA);
    expect(validarNovaSenha(limite, limite)).toEqual({ ok: true });
  });

  it("prioriza o erro de tamanho sobre o de confirmação quando os dois falham", () => {
    // Não é um requisito literal do critério de aceite, só um comportamento
    // determinístico documentado (evita depender de ordem não especificada
    // de validação em uso futuro deste helper).
    const resultado = validarNovaSenha("abc", "xyz");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivo).toMatch(/caracteres/);
    }
  });
});
