/**
 * CLI de migração do legado (BE-15, RF-08, ADR-008) — lê a schema legada
 * real (Supabase legado, `public`), transforma e grava na schema `app`
 * (Supabase principal, `service_role`), registra cada mapeamento
 * origem→destino em `app.legado_migracao_registro` (idempotência, ADR-008) e
 * imprime o relatório de conferência (RF-08.5).
 *
 * Uso (runbook completo em `scripts/README.md`):
 *
 *   npm run legado:migrar
 *
 * ============================================================================
 * BLOQUEIO DE GOVERNANÇA (GUARDRAILS.md regra 35 / BLOCKERS.md BLOCKER-003)
 * ============================================================================
 * Este script SÓ conecta à schema legada real depois de
 * `verificarAutorizacaoGovernanca()` (`src/modules/migracao/governanca.ts`)
 * confirmar a variável de ambiente `LEGADO_MIGRACAO_AUTORIZACAO` com o valor
 * exato esperado — nunca por padrão. Essa variável só deve ser definida
 * depois de confirmação FORMAL e EXPLÍCITA do Tech Lead/Software
 * Architect/CTO de que a condição da regra 35 está satisfeita (ADR-002 com o
 * parágrafo de "plano de saída" redigido e aceito). Sem essa variável
 * definida, o script imprime a mensagem de bloqueio e encerra (`exit code`
 * 1) SEM ler `LEGACY_SUPABASE_URL`/`LEGACY_SUPABASE_SERVICE_ROLE_KEY`, sem
 * abrir nenhuma conexão.
 *
 * A lógica de transformação/migração em si (`migrarLegado`,
 * `src/modules/migracao/migrar.ts`) é testada inteiramente contra fixtures
 * em memória (`src/modules/migracao/__tests__/`) — nunca contra a schema
 * legada real nesta fase.
 */
import { existsSync } from "node:fs";
import readline from "node:readline";
import { config as loadDotenv } from "dotenv";

if (existsSync(".env.local")) {
  loadDotenv({ path: ".env.local", quiet: true });
}

async function main(): Promise<void> {
  const { verificarAutorizacaoGovernanca } =
    await import("@/modules/migracao/governanca");

  console.log("Migração do legado — schema legada -> app (BE-15, RF-08)\n");

  const autorizacao = verificarAutorizacaoGovernanca();
  if (!autorizacao.autorizado) {
    console.error(`\n${autorizacao.mensagem}\n`);
    process.exitCode = 1;
    return;
  }

  // A partir daqui, a autorização de governança já foi confirmada — mas
  // ainda exige confirmação humana explícita de QUAL ambiente vai ser
  // atingido (mesmo racional de `scripts/redefinir-senha-interna.ts`: nunca
  // assumir silenciosamente que o ambiente atual é o pretendido).
  console.log(
    "Atenção: este script vai LER da schema legada real " +
      "(LEGACY_SUPABASE_URL) e ESCREVER na schema `app` do projeto Supabase " +
      "configurado (NEXT_PUBLIC_SUPABASE_URL). Confirme os dois ambientes " +
      "ANTES de continuar.\n",
  );

  const prosseguir = await promptSimNao(
    "Confirma a execução real da migração do legado agora? [s/N] ",
  );
  if (!prosseguir) {
    console.log("Operação cancelada — nenhuma leitura/escrita feita.");
    closeSharedReadline();
    return;
  }

  const { getLegadoClient } = await import("@/modules/migracao/legado-client");
  const { getServiceRoleClient } = await import("@/lib/supabase/server-client");
  const { criarDepsSupabase } = await import("@/modules/migracao/deps-supabase");
  const { migrarLegado } = await import("@/modules/migracao/migrar");
  const { formatarRelatorioTexto } = await import("@/modules/migracao/relatorio");

  try {
    const deps = criarDepsSupabase(getLegadoClient(), getServiceRoleClient());
    const relatorio = await migrarLegado(deps);
    console.log(`\n${formatarRelatorioTexto(relatorio)}\n`);
    console.log(
      "Migração concluída. Revise o relatório acima (especialmente " +
        "divergências e alertas de saldo) ANTES de gravar a flag de validação " +
        "explícita (app.legado_migracao_validacao, RF-08.5/RF-08.6/BE-14) — " +
        "essa gravação NÃO é automática, é um passo manual separado (ver " +
        "runbook, scripts/README.md).",
    );
  } finally {
    closeSharedReadline();
  }
}

// Mesmo padrão/achado empírico já documentado em
// `scripts/redefinir-senha-interna.ts`: instância ÚNICA de
// `readline.Interface`, lida via async iterator (nunca `rl.question`
// encadeado, que trava silenciosamente em entrada não-TTY neste ambiente).
let sharedReadline: readline.Interface | null = null;
let sharedReadlineIterator: AsyncIterator<string> | null = null;

function getSharedReadlineIterator(): AsyncIterator<string> {
  if (!sharedReadline || !sharedReadlineIterator) {
    sharedReadline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    sharedReadlineIterator = sharedReadline[Symbol.asyncIterator]();
  }
  return sharedReadlineIterator;
}

function closeSharedReadline(): void {
  sharedReadline?.close();
  sharedReadline = null;
  sharedReadlineIterator = null;
}

async function promptVisivel(pergunta: string): Promise<string> {
  process.stdout.write(pergunta);
  const it = getSharedReadlineIterator();
  const { value, done } = await it.next();
  return done ? "" : value;
}

async function promptSimNao(pergunta: string): Promise<boolean> {
  const resposta = await promptVisivel(pergunta);
  return resposta.trim().toLowerCase() === "s";
}

main().catch((error: unknown) => {
  console.error(`\nFalha na migração do legado: ${(error as Error).message}`);
  process.exitCode = 1;
});
