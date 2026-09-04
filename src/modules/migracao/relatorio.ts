/**
 * Formatação textual do relatório de conferência (RF-08.5) — usada pelo CLI
 * (`scripts/migrar-legado.ts`) para imprimir um resumo legível no terminal
 * (redirecionável pelo operador para um arquivo via `>`, convenção padrão de
 * CLI, sem este módulo precisar decidir um caminho/formato de arquivo).
 * Função pura — sem I/O, testável isoladamente.
 */
import type { RelatorioConferencia } from "./tipos";

export function formatarRelatorioTexto(relatorio: RelatorioConferencia): string {
  const linhas: string[] = [];
  linhas.push("=".repeat(78));
  linhas.push("RELATÓRIO DE CONFERÊNCIA — MIGRAÇÃO DO LEGADO (BE-15, RF-08.5)");
  linhas.push(`Gerado em: ${relatorio.geradoEm}`);
  linhas.push("=".repeat(78));

  linhas.push("\n-- Resumo por tabela de origem --");
  for (const resumo of relatorio.resumoPorTabela) {
    linhas.push(
      `  ${resumo.tabelaOrigem}: total=${resumo.totalOrigem} | ` +
        `migrados=${resumo.migradosTotal} (${resumo.migradosNestaExecucao} nesta execução, ` +
        `${resumo.jaMigradosAnteriormente} já migrados antes) | ` +
        `divergências=${resumo.divergenciasTotal} | erros=${resumo.errosTotal}`,
    );
  }

  linhas.push(
    `\n-- Divergências de registro individual (${relatorio.divergenciasRegistro.length}) --`,
  );
  if (relatorio.divergenciasRegistro.length === 0) {
    linhas.push("  (nenhuma)");
  }
  for (const divergencia of relatorio.divergenciasRegistro) {
    linhas.push(
      `  [${divergencia.codigo}] ${divergencia.tabelaOrigem}#${divergencia.idOrigem}: ${divergencia.motivo}`,
    );
  }

  linhas.push("\n-- Divergências estruturais de mapeamento (D2-D7, sempre listadas) --");
  for (const divergencia of relatorio.divergenciasEstruturais) {
    linhas.push(`  [${divergencia.codigo}] ${divergencia.descricao}`);
  }

  linhas.push("\n-- Decisões de detalhe aplicadas (documentadas, não escaladas) --");
  for (const decisao of relatorio.decisoesDeDetalhe) {
    linhas.push(`  - ${decisao}`);
  }

  linhas.push(
    "\n-- Validação de saldo por atleta (pontuacao_atual legado vs. ledger migrado) --",
  );
  const inconsistentes = relatorio.validacaoSaldoAtletas.filter((v) => !v.ok);
  linhas.push(
    `  ${relatorio.validacaoSaldoAtletas.length} atleta(s) verificado(s), ` +
      `${inconsistentes.length} divergente(s) de saldo.`,
  );
  for (const validacao of inconsistentes) {
    linhas.push(
      `  [ATENÇÃO] ${validacao.tabelaOrigem}#${validacao.idOrigem}: pontuacao_atual legado=` +
        `${validacao.pontuacaoAtualLegado}, saldo calculado pós-migração=` +
        `${validacao.saldoCalculadoPosMigracao} — provável efeito de presença(s) órfã(s) ` +
        "não migrada(s) (Divergência D1); confirmar manualmente antes de validar RF-08.5.",
    );
  }

  linhas.push(`\n${"=".repeat(78)}`);
  linhas.push(
    "Nenhuma flag de validação (app.legado_migracao_validacao, RF-08.5/RF-08.6) " +
      "é gravada automaticamente por este script — decisão explícita: exige uma " +
      "revisão humana deste relatório pelo organizador ANTES de qualquer " +
      "confirmação (ver runbook, scripts/README.md).",
  );

  return linhas.join("\n");
}
