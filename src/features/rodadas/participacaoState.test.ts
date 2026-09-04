import { describe, expect, it } from "vitest";
import type { Atleta } from "@/features/atletas/types";
import {
  buildLancarRodadaBody,
  initParticipacoes,
  resumirParticipacoes,
  type ParticipacaoState,
} from "./participacaoState";

function atleta(overrides: Partial<Atleta> = {}): Atleta {
  return {
    id: "atleta-1",
    nome_completo: "Carlinhos Silva",
    apelido_exibicao: "Carlinhos",
    contato: null,
    data_nascimento: "1990-01-01",
    consentimento_responsavel_obtido: false,
    pontuacao_inicial: 0,
    ativo: true,
    anonimizado_em: null,
    criado_em: "2026-01-01T00:00:00.000Z",
    nivel_tecnico: 2,
    rodadas_presentes: 5,
    ...overrides,
  };
}

describe("initParticipacoes", () => {
  it("inicia cada atleta como presente, sem eventos, usando apelido de exibição", () => {
    const result = initParticipacoes([atleta()]);
    expect(result).toEqual([
      {
        atletaId: "atleta-1",
        nome: "Carlinhos",
        status: "presente",
        gols: 0,
        cartoesAmarelos: 0,
        cartoesVermelhos: 0,
      },
    ]);
  });

  it("usa nome_completo como fallback quando apelido_exibicao vier vazio", () => {
    const result = initParticipacoes([atleta({ apelido_exibicao: "" })]);
    expect(result[0]?.nome).toBe("Carlinhos Silva");
  });
});

describe("buildLancarRodadaBody", () => {
  it("monta o corpo único do POST — eventos só como itens de quantidade > 0", () => {
    const participacoes: ParticipacaoState[] = [
      {
        atletaId: "atleta-1",
        nome: "Carlinhos",
        status: "presente",
        gols: 2,
        cartoesAmarelos: 0,
        cartoesVermelhos: 1,
      },
    ];

    const body = buildLancarRodadaBody("2026-09-05", participacoes, false);

    expect(body).toEqual({
      data: "2026-09-05",
      confirmar_duplicidade: false,
      participacoes: [
        {
          atleta_id: "atleta-1",
          status: "presente",
          eventos: [
            { tipo: "gol", quantidade: 2 },
            { tipo: "cartao_vermelho", quantidade: 1 },
          ],
        },
      ],
    });
  });

  it("nunca envia eventos para um atleta ausente (RF-02.6), mesmo com contadores não-zerados em memória", () => {
    const participacoes: ParticipacaoState[] = [
      {
        atletaId: "atleta-2",
        nome: "João Pedro",
        status: "ausente",
        gols: 3,
        cartoesAmarelos: 1,
        cartoesVermelhos: 0,
      },
    ];

    const body = buildLancarRodadaBody("2026-09-05", participacoes, false);

    expect(body.participacoes[0]?.eventos).toEqual([]);
  });

  it("propaga confirmar_duplicidade quando true (RF-02.8)", () => {
    const body = buildLancarRodadaBody("2026-09-05", [], true);
    expect(body.confirmar_duplicidade).toBe(true);
  });
});

describe("resumirParticipacoes", () => {
  it("agrega presença e eventos de todos os atletas", () => {
    const participacoes: ParticipacaoState[] = [
      {
        atletaId: "1",
        nome: "A",
        status: "presente",
        gols: 2,
        cartoesAmarelos: 1,
        cartoesVermelhos: 0,
      },
      {
        atletaId: "2",
        nome: "B",
        status: "ausente",
        gols: 0,
        cartoesAmarelos: 0,
        cartoesVermelhos: 0,
      },
      {
        atletaId: "3",
        nome: "C",
        status: "lesionado",
        gols: 1,
        cartoesAmarelos: 0,
        cartoesVermelhos: 1,
      },
    ];

    expect(resumirParticipacoes(participacoes)).toEqual({
      presentes: 1,
      ausentes: 1,
      lesionados: 1,
      gols: 3,
      cartoesAmarelos: 1,
      cartoesVermelhos: 1,
    });
  });
});
