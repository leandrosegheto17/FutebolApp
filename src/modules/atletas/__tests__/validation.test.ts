// @vitest-environment node
/**
 * Teste unitário de BE-06 (TASK.md Secao 3.1) — parte do critério de aceite
 * literal coberta aqui (lógica pura, sem banco): "cadastro com idade <18
 * anos bloqueia salvar sem checkbox de consentimento marcado" e "nome
 * duplicado dispara alerta antes de confirmar". O terceiro item do critério
 * ("nível técnico calculado corretamente com fallback de pontuação inicial
 * para atleta sem presença") é coberto pelo teste de integração
 * (`app/api/atletas/__tests__/atletas.integration.test.ts`), porque depende
 * da view `app.atleta_nivel_tecnico` contra um Supabase real.
 */
import { describe, expect, it } from "vitest";
import {
  atletaBodySchema,
  calcularIdade,
  derivarApelidoExibicao,
  encontrarDuplicatasDeNome,
  exigeConsentimentoResponsavel,
  normalizarNomeCompleto,
} from "../validation";

const HOJE = new Date("2026-09-03T12:00:00.000Z");

describe("calcularIdade (RF-01.3/RN-02)", () => {
  it("calcula idade completa quando o aniversário já ocorreu no ano", () => {
    expect(calcularIdade("2008-01-01", HOJE)).toBe(18);
  });

  it("calcula idade completa exatamente no dia do aniversário", () => {
    expect(calcularIdade("2008-09-03", HOJE)).toBe(18);
  });

  it("não incrementa a idade um dia antes do aniversário", () => {
    expect(calcularIdade("2008-09-04", HOJE)).toBe(17);
  });

  it("calcula idade quando o aniversário ainda não ocorreu no ano", () => {
    expect(calcularIdade("2008-12-25", HOJE)).toBe(17);
  });

  it("retorna idade negativa para data de nascimento no futuro (sinal para o chamador rejeitar)", () => {
    expect(calcularIdade("2999-01-01", HOJE)).toBeLessThan(0);
  });
});

describe("exigeConsentimentoResponsavel (RF-01.3/RN-02)", () => {
  it("exige consentimento para 17 anos", () => {
    expect(exigeConsentimentoResponsavel(17)).toBe(true);
  });

  it("não exige consentimento para 18 anos (maioridade)", () => {
    expect(exigeConsentimentoResponsavel(18)).toBe(false);
  });

  it("não exige consentimento para adulto", () => {
    expect(exigeConsentimentoResponsavel(30)).toBe(false);
  });
});

describe("normalizarNomeCompleto (RF-01.5)", () => {
  it("ignora caixa e espaços nas pontas", () => {
    expect(normalizarNomeCompleto("  João Silva  ")).toBe("joão silva");
  });

  it("colapsa espaços internos repetidos", () => {
    expect(normalizarNomeCompleto("João   Silva")).toBe("joão silva");
  });
});

describe("derivarApelidoExibicao (RF-01.2/RN-06)", () => {
  it("usa o primeiro nome quando o nome completo tem mais de uma palavra", () => {
    expect(derivarApelidoExibicao("Carlos Roberto Souza")).toBe("Carlos");
  });

  it("usa o nome inteiro quando só há uma palavra", () => {
    expect(derivarApelidoExibicao("Carlinhos")).toBe("Carlinhos");
  });

  it("ignora espaços nas pontas antes de derivar", () => {
    expect(derivarApelidoExibicao("  Ana Paula  ")).toBe("Ana");
  });
});

describe("encontrarDuplicatasDeNome (RF-01.5)", () => {
  const existentes = [
    { id: "id-1", nome_completo: "João Silva" },
    { id: "id-2", nome_completo: "Maria Souza" },
  ];

  it("encontra duplicata com nome idêntico", () => {
    const resultado = encontrarDuplicatasDeNome("João Silva", existentes);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.id).toBe("id-1");
  });

  it("encontra duplicata mesmo com caixa/espaçamento diferentes", () => {
    const resultado = encontrarDuplicatasDeNome("  joão   silva ", existentes);
    expect(resultado).toHaveLength(1);
  });

  it("não encontra duplicata para nome novo", () => {
    expect(encontrarDuplicatasDeNome("Pedro Santos", existentes)).toHaveLength(0);
  });

  it("exclui o próprio id (edição não deve alertar duplicidade contra si mesmo)", () => {
    const resultado = encontrarDuplicatasDeNome("João Silva", existentes, "id-1");
    expect(resultado).toHaveLength(0);
  });
});

describe("atletaBodySchema (RF-01.1/RF-01.3)", () => {
  const base = {
    nome_completo: "Atleta Teste",
    data_nascimento: "1990-01-01",
    pontuacao_inicial: 0,
  };

  it("aceita cadastro de adulto sem consentimento", () => {
    const resultado = atletaBodySchema.safeParse(base);
    expect(resultado.success).toBe(true);
  });

  it("bloqueia cadastro de menor de 18 anos sem checkbox de consentimento marcado", () => {
    const resultado = atletaBodySchema.safeParse({
      ...base,
      data_nascimento: "2015-06-15",
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const issue = resultado.error.issues.find(
        (i) => i.path[0] === "consentimento_responsavel_obtido",
      );
      expect(issue).toBeDefined();
    }
  });

  it("permite cadastro de menor de 18 anos quando o consentimento vem marcado", () => {
    const resultado = atletaBodySchema.safeParse({
      ...base,
      data_nascimento: "2015-06-15",
      consentimento_responsavel_obtido: true,
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita data_nascimento em formato inválido", () => {
    const resultado = atletaBodySchema.safeParse({
      ...base,
      data_nascimento: "15/06/2015",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita data_nascimento no futuro", () => {
    const resultado = atletaBodySchema.safeParse({
      ...base,
      data_nascimento: "2999-01-01",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita pontuacao_inicial negativa", () => {
    const resultado = atletaBodySchema.safeParse({ ...base, pontuacao_inicial: -1 });
    expect(resultado.success).toBe(false);
  });

  it("rejeita nome_completo vazio", () => {
    const resultado = atletaBodySchema.safeParse({ ...base, nome_completo: "   " });
    expect(resultado.success).toBe(false);
  });

  it("confirmar_duplicidade tem default false quando ausente", () => {
    const resultado = atletaBodySchema.safeParse(base);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.confirmar_duplicidade).toBe(false);
    }
  });
});
