/**
 * CLI de redefinicao da senha unica compartilhada da area interna (BE-05,
 * TASK.md Secao 3.1 - "Gate 2, item 7" / Secao 6.2 item 4: resolvido
 * operacionalmente via script/CLI de acesso direto ao banco, sem introduzir
 * fluxo de "esqueci minha senha" na interface, RN-12/ADR-004).
 *
 * Uso (runbook completo em `scripts/README.md`):
 *
 *   npm run senha:redefinir
 *
 * O script:
 *   1. carrega `.env.local` (se existir - opcional; em homologacao/producao
 *      as variaveis tambem podem ja estar exportadas no shell, ex.: via
 *      `vercel env pull` seguido de `source`, sem exigir o arquivo);
 *   2. pede a nova senha duas vezes, COM ENTRADA OCULTA (nunca ecoada no
 *      terminal, nunca aceita como argumento de linha de comando - um
 *      argumento de CLI fica visivel em `ps`/historico do shell, o que
 *      vazaria a senha; decisao de seguranca de detalhe, nao escalada);
 *   3. valida tamanho minimo e confirmacao (`validarNovaSenha`);
 *   4. pede uma confirmacao final explicita antes de escrever no banco
 *      (evita trocar a senha por engano num ambiente errado);
 *   5. gera o hash argon2id e substitui a linha unica de `app.auth_interno`
 *      (`redefinirSenhaInterna`, mesma funcao coberta pelo teste de
 *      integracao `src/modules/autenticacao/__tests__/redefinir-senha.integration.test.ts`).
 *
 * Nunca imprime a senha nem o hash em nenhum momento (stdout/stderr/log) -
 * so confirma sucesso/falha genericamente, mesmo espirito de RF-07.3 (nunca
 * vazar dado sensivel por um canal incidental).
 *
 * Runtime Node.js (mesmo motivo de `login/route.ts`): `hashPassword`
 * (`@node-rs/argon2`) e um addon nativo, nao roda em Edge Runtime - mas este
 * script nunca roda em Edge Runtime, e executado localmente/via SSH pelo
 * operador, entao isso e so uma nota de contexto, nao uma restricao real
 * aqui.
 */
import { existsSync } from "node:fs";
import readline from "node:readline";
import { config as loadDotenv } from "dotenv";

if (existsSync(".env.local")) {
  loadDotenv({ path: ".env.local", quiet: true });
}

// Codigos de controle usados por `promptOculto`, construidos via
// `String.fromCharCode` (nunca como byte de controle literal no
// arquivo-fonte - alguns editores/ferramentas de diff exibem caractere de
// controle bruto de forma inconsistente ou o normalizam silenciosamente).
const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);
const BACKSPACE = String.fromCharCode(127);

async function main(): Promise<void> {
  // Import dinamico, depois de carregar `.env.local`: `getServiceRoleClient()`
  // (via `@/lib/config/env`) valida as variaveis de ambiente no momento em
  // que e chamado - importar antes garantiria a ordem, mas o dinamico deixa
  // essa dependencia de sequencia explicita no proprio codigo, em vez de
  // depender so da posicao do `import` estatico no topo do arquivo.
  const { getServiceRoleClient } = await import("@/lib/supabase/server-client");
  const { redefinirSenhaInterna, validarNovaSenha } =
    await import("@/modules/autenticacao/redefinir-senha");

  console.log("Redefinicao da senha unica compartilhada - area interna (BE-05)");
  console.log(
    "Atencao: este script grava direto em app.auth_interno do projeto Supabase " +
      "configurado nas variaveis de ambiente atuais (NEXT_PUBLIC_SUPABASE_URL). " +
      "Confirme o ambiente ANTES de continuar.\n",
  );

  try {
    const novaSenha = await promptOculto("Nova senha: ");
    const confirmacao = await promptOculto("Confirme a nova senha: ");

    const validacao = validarNovaSenha(novaSenha, confirmacao);
    if (!validacao.ok) {
      console.error(`\nErro: ${validacao.motivo}`);
      process.exitCode = 1;
      return;
    }

    const prosseguir = await promptSimNao(
      "\nConfirma a substituicao da senha unica da area interna? [s/N] ",
    );
    if (!prosseguir) {
      console.log("Operacao cancelada - nenhuma alteracao feita.");
      return;
    }

    const client = getServiceRoleClient();
    await redefinirSenhaInterna(client, novaSenha);

    console.log(
      "\nSenha redefinida com sucesso. Sessoes ja emitidas com a senha antiga " +
        "continuam validas ate expirar (TTL 8-12h, ADR-004) - a troca de senha " +
        "nao invalida cookies de sessao ja emitidos; se isso for necessario, " +
        "gire tambem SESSION_COOKIE_SECRET (invalida toda sessao ativa).",
    );
  } finally {
    // Fecha a UNICA instancia compartilhada de readline (se chegou a ser
    // criada - `promptVisivel`/fallback nao-TTY) para o processo poder
    // encerrar sozinho, sem handle de stdin pendurado.
    closeSharedReadline();
  }
}

/**
 * Le uma linha do terminal sem ecoar os caracteres digitados. Cai para
 * leitura visivel, com aviso explicito, quando `stdin` nao e um TTY (ex.:
 * entrada via pipe em teste manual/automacao) - nunca trava silenciosamente
 * esperando um TTY que nao existe.
 */
function promptOculto(pergunta: string): Promise<string> {
  if (!process.stdin.isTTY) {
    console.warn(
      "[aviso] entrada padrao nao e um terminal interativo - a senha sera lida " +
        "sem ocultacao (uso esperado so em teste automatizado/pipe controlado).",
    );
    return promptVisivel(pergunta);
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(pergunta);

    let valor = "";

    const cleanup = (): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (char: string): void => {
      if (char === "\n" || char === "\r" || char === CTRL_D) {
        cleanup();
        process.stdout.write("\n");
        resolve(valor);
        return;
      }
      if (char === CTRL_C) {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Cancelado pelo usuario (Ctrl+C)."));
        return;
      }
      if (char === BACKSPACE || char === "\b") {
        valor = valor.slice(0, -1);
        return;
      }
      valor += char;
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  });
}

// Instancia UNICA e reaproveitada de `readline.Interface` (nunca uma nova
// por chamada de `promptVisivel`), lida via async iterator
// (`rl[Symbol.asyncIterator]()`), NUNCA via `rl.question(cb)` encadeado.
//
// Achado empirico (validacao manual desta tarefa, nao um requisito
// conhecido de antemao): neste ambiente (Windows/Git Bash, Node 24), chamar
// `rl.question()` mais de uma vez em sequencia sobre a MESMA instancia, com
// `stdin` redirecionado de um pipe (nao-TTY — exatamente o caminho usado por
// teste automatizado/`printf ... | npm run senha:redefinir`), so a PRIMEIRA
// chamada resolve; a segunda nunca chama seu callback e fica pendurada para
// sempre — sem lancar erro, sem timeout (reproduzido isoladamente fora deste
// script antes de aplicar a correcao, nao e suposicao). Como uma Promise
// pendurada nao mantem o event loop vivo sozinha, o processo acaba
// terminando (exit code 0) DEPOIS de fechar o readline em outro lugar, dando
// a falsa impressao de que a segunda pergunta simplesmente "sumiu" — nunca
// pede confirmacao nem grava nada, mas tambem nunca avisa que falhou. A
// alternativa oficial do Node (`for await (const linha of rl)` / iterar
// manualmente `rl[Symbol.asyncIterator]()`) nao tem esse problema — testada
// e confirmada com o mesmo cenario de entrada via pipe antes de virar o
// padrao final deste arquivo.
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
  // `done` (stdin fechou/EOF sem mais linhas) e tratado como linha vazia,
  // nunca como travamento silencioso — mesma disciplina de "nunca lacuna
  // silenciosa" (TASK.md Secao 1.0): `validarNovaSenha`/`promptSimNao`
  // tratam string vazia como invalida/"nao", nunca como sucesso por engano.
  return done ? "" : value;
}

async function promptSimNao(pergunta: string): Promise<boolean> {
  const resposta = await promptVisivel(pergunta);
  return resposta.trim().toLowerCase() === "s";
}

main().catch((error: unknown) => {
  console.error(`\nFalha ao redefinir a senha: ${(error as Error).message}`);
  process.exitCode = 1;
});
