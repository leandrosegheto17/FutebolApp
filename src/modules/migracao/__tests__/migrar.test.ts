/**
 * Testes do orquestrador de migração do legado (BE-15) — cobrem o critério
 * de aceite literal da tarefa (`TASK.md` Seção 3.1):
 *
 * 1. Todo registro do legado aparece migrado OU explicitamente listado como
 *    divergência no relatório (nunca descartado silenciosamente).
 * 2. Script reexecutável sem duplicar dados já migrados (idempotência).
 * 3. Pontuação histórica preservada exatamente como estava (RN-13), sem
 *    reaplicar RN-05.
 *
 * Restrição de governança (GUARDRAILS.md regra 35/BLOCKER-003): todos os
 * testes abaixo rodam exclusivamente contra fixtures em memória
 * (`fixtures.ts`) — nenhuma conexão com a schema legada real.
 */
import { describe, expect, it } from "vitest";
import { migrarLegado } from "../migrar";
import type { ArmazemFake } from "./fixtures";
import { criarAmbienteFake, criarDadosLegadosFixture } from "./fixtures";
import type { RelatorioConferencia } from "../tipos";

function buscarIdDestino(
  armazem: ArmazemFake,
  tabelaOrigem: string,
  idOrigem: string,
): string | null {
  const registro = armazem.registros.find(
    (r) => r.tabela_origem === tabelaOrigem && r.id_origem === idOrigem,
  );
  return registro?.id_destino ?? null;
}

function resumoDe(relatorio: RelatorioConferencia, tabelaOrigem: string) {
  const resumo = relatorio.resumoPorTabela.find((r) => r.tabelaOrigem === tabelaOrigem);
  if (!resumo) throw new Error(`resumo não encontrado para ${tabelaOrigem}`);
  return resumo;
}

describe("migrarLegado", () => {
  it("migra todo registro resolvível e lista toda divergência explicitamente (RF-08.3/RF-08.5)", async () => {
    const { deps, armazem } = criarAmbienteFake();

    const relatorio = await migrarLegado(deps);

    expect(resumoDe(relatorio, "goleiros")).toMatchObject({
      totalOrigem: 2,
      migradosTotal: 2,
      divergenciasTotal: 0,
      errosTotal: 0,
    });
    expect(resumoDe(relatorio, "jogadores")).toMatchObject({
      totalOrigem: 3,
      migradosTotal: 3,
      divergenciasTotal: 0,
      errosTotal: 0,
    });
    expect(resumoDe(relatorio, "rodadas")).toMatchObject({
      totalOrigem: 2,
      migradosTotal: 2,
      divergenciasTotal: 0,
      errosTotal: 0,
    });
    // presencas_rodada: 5 resolvíveis migradas + 2 órfãs (D1) como divergência
    // — soma bate com o total de origem, nenhuma linha "some" do relatório.
    expect(resumoDe(relatorio, "presencas_rodada")).toMatchObject({
      totalOrigem: 7,
      migradosTotal: 5,
      divergenciasTotal: 2,
      errosTotal: 0,
    });
    // substituicoes_rodada: nunca migrada de fato (depende de app.time, fora
    // de escopo — D7), mas a única linha da fixture aparece como divergência,
    // nunca descartada.
    expect(resumoDe(relatorio, "substituicoes_rodada")).toMatchObject({
      totalOrigem: 1,
      migradosTotal: 0,
      divergenciasTotal: 1,
      errosTotal: 0,
    });

    // Toda linha de origem, em toda tabela, ou foi migrada ou apareceu em
    // `divergenciasRegistro` (nenhum "erro" nesta fixture) — verificação
    // agregada do critério de aceite literal.
    const totalOrigemGeral = relatorio.resumoPorTabela.reduce(
      (s, r) => s + r.totalOrigem,
      0,
    );
    const totalContabilizado = relatorio.resumoPorTabela.reduce(
      (s, r) => s + r.migradosTotal + r.divergenciasTotal + r.errosTotal,
      0,
    );
    expect(totalContabilizado).toBe(totalOrigemGeral);

    expect(armazem.atletas).toHaveLength(5);
    expect(armazem.rodadas).toHaveLength(2);
    expect(armazem.participacoes).toHaveLength(5);
    expect(armazem.lancamentos).toHaveLength(5);
  });

  it("D1 — presenças órfãs de rodada aparecem como divergência, nunca migradas nem descartadas", async () => {
    const { deps, armazem } = criarAmbienteFake();
    const relatorio = await migrarLegado(deps);

    const divergenciasD1 = relatorio.divergenciasRegistro.filter(
      (d) => d.codigo === "D1",
    );
    expect(divergenciasD1).toHaveLength(2);
    expect(divergenciasD1.map((d) => d.idOrigem).sort()).toEqual(["200", "201"]);
    for (const divergencia of divergenciasD1) {
      expect(divergencia.tabelaOrigem).toBe("presencas_rodada");
      expect(divergencia.motivo).toMatch(/Divergência D1/);
    }

    // Nenhuma participação foi criada para as linhas órfãs.
    expect(buscarIdDestino(armazem, "presencas_rodada", "200")).toBeNull();
    expect(buscarIdDestino(armazem, "presencas_rodada", "201")).toBeNull();
    const registro200 = armazem.registros.find(
      (r) => r.tabela_origem === "presencas_rodada" && r.id_origem === "200",
    );
    expect(registro200?.status).toBe("divergencia");
  });

  it("preserva pontos_ganhos exatamente como no legado (RN-13), sem reaplicar RN-05", async () => {
    const { deps, armazem } = criarAmbienteFake();
    await migrarLegado(deps);

    const jogador11Destino = buscarIdDestino(armazem, "jogadores", "11");
    const rodada5Destino = buscarIdDestino(armazem, "rodadas", "5");
    const rodada6Destino = buscarIdDestino(armazem, "rodadas", "6");
    expect(jogador11Destino).not.toBeNull();
    expect(rodada5Destino).not.toBeNull();
    expect(rodada6Destino).not.toBeNull();

    // Presença 102: lesionado, rodada 5 — legado grava 3 (mesma fórmula de
    // presença); RN-05 vigente (app.configuracao_pontuacao, seed BE-08)
    // trataria lesionado como presença = 2. O valor migrado tem que ser 3,
    // NUNCA 2 — prova de que não houve recálculo.
    const lancamentoLesionado = armazem.lancamentos.find(
      (l) => l.atleta_id === jogador11Destino && l.rodada_id === rodada5Destino,
    );
    expect(lancamentoLesionado?.pontos_delta).toBe(3);
    expect(lancamentoLesionado?.pontos_delta).not.toBe(2);

    // Presença 103: presente + cartão vermelho, rodada 6 — legado grava 2
    // (fórmula legada: presente=3, vermelho reduz 1). RN-05 vigente daria
    // -1 (presença +2, vermelho -3). O valor migrado tem que ser 2, nunca -1.
    const lancamentoVermelho = armazem.lancamentos.find(
      (l) => l.atleta_id === jogador11Destino && l.rodada_id === rodada6Destino,
    );
    expect(lancamentoVermelho?.pontos_delta).toBe(2);
    expect(lancamentoVermelho?.pontos_delta).not.toBe(-1);

    // Evento cartão vermelho foi criado mesmo assim (estrutura RF-02 nova
    // suporta consulta do evento em si — só o CÁLCULO de pontos não é
    // reaplicado).
    const eventoVermelho = armazem.eventos.find(
      (e) =>
        e.tipo === "cartao_vermelho" &&
        e.participacao_id ===
          armazem.participacoes.find(
            (p) => p.atleta_id === jogador11Destino && p.rodada_id === rodada6Destino,
          )?.id,
    );
    expect(eventoVermelho).toBeDefined();
    expect(eventoVermelho?.quantidade).toBe(1);

    // Evento gol + cartão amarelo (goleiro 2, presença 104) — 0 ocorrências
    // reais, mas a estrutura precisa suportar > 0 quando aparecer.
    const goleiro2Destino = buscarIdDestino(armazem, "goleiros", "2");
    const participacaoGoleiro2 = armazem.participacoes.find(
      (p) => p.atleta_id === goleiro2Destino,
    );
    expect(
      armazem.eventos.find(
        (e) => e.tipo === "gol" && e.participacao_id === participacaoGoleiro2?.id,
      )?.quantidade,
    ).toBe(1);
    expect(
      armazem.eventos.find(
        (e) =>
          e.tipo === "cartao_amarelo" && e.participacao_id === participacaoGoleiro2?.id,
      )?.quantidade,
    ).toBe(1);
  });

  it("é reexecutável sem duplicar dados já migrados (idempotência, ADR-008)", async () => {
    const { deps, armazem } = criarAmbienteFake();

    const relatorio1 = await migrarLegado(deps);
    const contagens1 = {
      atletas: armazem.atletas.length,
      rodadas: armazem.rodadas.length,
      participacoes: armazem.participacoes.length,
      eventos: armazem.eventos.length,
      lancamentos: armazem.lancamentos.length,
      registros: armazem.registros.length,
    };

    // Segunda execução — MESMO ambiente/estado (`armazem`/`deps`), simulando
    // rodar o script de novo sobre um banco já parcialmente/totalmente
    // migrado.
    const relatorio2 = await migrarLegado(deps);

    expect(armazem.atletas).toHaveLength(contagens1.atletas);
    expect(armazem.rodadas).toHaveLength(contagens1.rodadas);
    expect(armazem.participacoes).toHaveLength(contagens1.participacoes);
    expect(armazem.eventos).toHaveLength(contagens1.eventos);
    // Crítico: `lancamento_pontos` é ledger append-only — reprocessar
    // dobraria os pontos se a idempotência falhasse. Precisa continuar
    // exatamente no mesmo tamanho.
    expect(armazem.lancamentos).toHaveLength(contagens1.lancamentos);
    expect(armazem.registros).toHaveLength(contagens1.registros);

    // A segunda execução não migra nada de novo — tudo já estava resolvido
    // (migrado ou divergência) na primeira.
    for (const resumo of relatorio2.resumoPorTabela) {
      expect(resumo.migradosNestaExecucao).toBe(0);
      expect(resumo.jaMigradosAnteriormente).toBe(resumo.totalOrigem);
    }

    // O relatório da segunda execução continua mostrando as mesmas
    // divergências da primeira — nunca "somem" do relatório só por já
    // terem sido vistas antes.
    expect(relatorio2.divergenciasRegistro).toHaveLength(
      relatorio1.divergenciasRegistro.length,
    );
    expect(
      relatorio2.divergenciasRegistro
        .map((d) => `${d.tabelaOrigem}:${d.idOrigem}`)
        .sort(),
    ).toEqual(
      relatorio1.divergenciasRegistro
        .map((d) => `${d.tabelaOrigem}:${d.idOrigem}`)
        .sort(),
    );

    // Totais agregados (migrado+divergência+erro) idênticos entre as duas
    // execuções — prova direta de "sem duplicar dados já migrados".
    expect(relatorio2.resumoPorTabela.map((r) => r.migradosTotal)).toEqual(
      relatorio1.resumoPorTabela.map((r) => r.migradosTotal),
    );
    expect(relatorio2.resumoPorTabela.map((r) => r.divergenciasTotal)).toEqual(
      relatorio1.resumoPorTabela.map((r) => r.divergenciasTotal),
    );
  });

  it("catálogo de divergências estruturais (D2-D7) e decisões de detalhe sempre aparecem, mesmo sem nenhum dado", async () => {
    const dadosVazios = {
      goleiros: [],
      jogadores: [],
      rodadas: [],
      presencas: [],
      substituicoes: [],
    };
    const { deps } = criarAmbienteFake(dadosVazios);

    const relatorio = await migrarLegado(deps);

    expect(relatorio.divergenciasEstruturais.map((d) => d.codigo).sort()).toEqual([
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
    ]);
    expect(relatorio.decisoesDeDetalhe.length).toBeGreaterThan(0);
    expect(relatorio.resumoPorTabela.every((r) => r.totalOrigem === 0)).toBe(true);
    expect(relatorio.divergenciasRegistro).toHaveLength(0);
    expect(relatorio.validacaoSaldoAtletas).toHaveLength(0);
  });

  it("validação de saldo (RN-13) reconcilia pontuacao_atual do legado com o ledger migrado, e explicita quando não bate (efeito de D1)", async () => {
    const { deps } = criarAmbienteFake();
    const relatorio = await migrarLegado(deps);

    expect(relatorio.validacaoSaldoAtletas).toHaveLength(5);

    const jogador12 = relatorio.validacaoSaldoAtletas.find(
      (v) => v.tabelaOrigem === "jogadores" && v.idOrigem === "12",
    );
    // Jogador 12 só tem uma presença órfã (D1, nunca migrada) — o saldo
    // calculado pós-migração (20) não bate com pontuacao_atual do legado
    // (23), e isso É esperado/documentado, não um bug escondido.
    expect(jogador12).toMatchObject({
      pontuacaoAtualLegado: 23,
      saldoCalculadoPosMigracao: 20,
      ok: false,
    });

    const jogador10 = relatorio.validacaoSaldoAtletas.find(
      (v) => v.tabelaOrigem === "jogadores" && v.idOrigem === "10",
    );
    expect(jogador10).toMatchObject({
      pontuacaoAtualLegado: 103,
      saldoCalculadoPosMigracao: 103,
      ok: true,
    });
  });

  it("mapeia campos default de app.atleta/app.rodada sem correspondência no legado (decisões de detalhe documentadas)", async () => {
    const { deps, armazem } = criarAmbienteFake();
    await migrarLegado(deps);

    const jogador10Destino = buscarIdDestino(armazem, "jogadores", "10");
    const atletaJogador10 = armazem.atletas.find((a) => a.id === jogador10Destino);
    expect(atletaJogador10).toMatchObject({
      apelido_exibicao: "Jogador Fixture Dez", // = nome_completo (decisão de detalhe)
      ativo: true,
      consentimento_responsavel_obtido: false, // D3
      contato: "11900000010",
    });

    const rodada5Destino = buscarIdDestino(armazem, "rodadas", "5");
    const rodada5 = armazem.rodadas.find((r) => r.id === rodada5Destino);
    expect(rodada5).toMatchObject({ status: "lancada", data: "2026-06-07" });
  });

  it("usa uma fixture de dados diferente sem quebrar (garante que a orquestração não depende de valores hardcoded específicos da fixture padrão)", async () => {
    const dados = criarDadosLegadosFixture();
    // Remove a divergência D1 desta variação para provar que, sem órfãs, o
    // relatório reflete 100% de migração para presencas_rodada.
    dados.presencas = dados.presencas.filter((p) => p.status !== null);

    const { deps } = criarAmbienteFake(dados);
    const relatorio = await migrarLegado(deps);

    const resumoPresencas = resumoDe(relatorio, "presencas_rodada");
    expect(resumoPresencas.totalOrigem).toBe(5);
    expect(resumoPresencas.migradosTotal).toBe(5);
    expect(resumoPresencas.divergenciasTotal).toBe(0);
    expect(relatorio.divergenciasRegistro.filter((d) => d.codigo === "D1")).toHaveLength(
      0,
    );
  });
});
