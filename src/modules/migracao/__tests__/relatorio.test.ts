import { describe, expect, it } from "vitest";
import { migrarLegado } from "../migrar";
import { criarAmbienteFake } from "./fixtures";
import { formatarRelatorioTexto } from "../relatorio";

describe("formatarRelatorioTexto", () => {
  it("inclui resumo por tabela, divergências (registro e estruturais) e alerta de saldo inconsistente", async () => {
    const { deps } = criarAmbienteFake();
    const relatorio = await migrarLegado(deps);

    const texto = formatarRelatorioTexto(relatorio);

    expect(texto).toContain("RELATÓRIO DE CONFERÊNCIA");
    expect(texto).toContain("presencas_rodada: total=7");
    expect(texto).toContain("[D1] presencas_rodada#200");
    expect(texto).toContain("[D1] presencas_rodada#201");
    expect(texto).toContain("[D2]");
    expect(texto).toContain("[D7]");
    expect(texto).toContain("jogadores#12");
    expect(texto).toContain("ATENÇÃO");
    expect(texto).toContain("Nenhuma flag de validação");
  });

  it("não lista nenhuma divergência de registro quando não há nenhuma", async () => {
    const dadosVazios = {
      goleiros: [],
      jogadores: [],
      rodadas: [],
      presencas: [],
      substituicoes: [],
    };
    const { deps } = criarAmbienteFake(dadosVazios);
    const relatorio = await migrarLegado(deps);

    const texto = formatarRelatorioTexto(relatorio);
    expect(texto).toContain("(nenhuma)");
  });
});
