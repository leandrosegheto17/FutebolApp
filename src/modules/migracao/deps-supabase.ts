/**
 * Implementação real (Supabase) das interfaces de `tipos.ts` — wiring de I/O
 * puro, sem lógica de transformação (isso fica em `migrar.ts`/`transformar.ts`,
 * cobertos por teste). Mesmo racional de `scripts/redefinir-senha-interna.ts`:
 * "wiring... não tem teste automatizado próprio (depende de I/O real)".
 *
 * Usado EXCLUSIVAMENTE por `scripts/migrar-legado.ts` — nunca importado por
 * Route Handler nem por qualquer caminho de execução da aplicação em tempo
 * de request.
 *
 * `legadoClient` lê a schema `public` do projeto Supabase LEGADO
 * (`legado-client.ts`); `appClient` é `getServiceRoleClient()` (schema
 * `app`, mesmo projeto Supabase principal, `service_role`, GUARDRAILS.md
 * regra 6/7).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppWriter,
  GoleiroLegado,
  JogadorLegado,
  LegadoReader,
  MigracaoDeps,
  NovoRegistroMigracao,
  PresencaRodadaLegada,
  RegistroMigracaoExistente,
  RegistroMigracaoStore,
  RodadaLegada,
  SubstituicaoRodadaLegada,
} from "./tipos";

const TAMANHO_PAGINA = 1000;

/**
 * Paginação defensiva via `.range()` — o volume real (770 linhas na maior
 * tabela, LEGADO-SCHEMA.md Seção 1) cabe folgado num único page do limite
 * padrão do PostgREST (1000), mas este helper não assume isso silenciosamente:
 * segue paginando até uma página vir com menos linhas que `TAMANHO_PAGINA`.
 */
async function lerTodasLinhas<T>(
  client: SupabaseClient<any, any, any>,
  tabela: string,
): Promise<T[]> {
  const linhas: T[] = [];
  let pagina = 0;
  for (;;) {
    const inicio = pagina * TAMANHO_PAGINA;
    const fim = inicio + TAMANHO_PAGINA - 1;
    const { data, error } = await client.from(tabela).select("*").range(inicio, fim);
    if (error) {
      throw new Error(`Falha ao ler '${tabela}' da schema legada: ${error.message}`);
    }
    const pagina_dados = (data ?? []) as T[];
    linhas.push(...pagina_dados);
    if (pagina_dados.length < TAMANHO_PAGINA) break;
    pagina += 1;
  }
  return linhas;
}

export function criarLegadoReaderSupabase(
  legadoClient: SupabaseClient<any, any, any>,
): LegadoReader {
  return {
    lerGoleiros: () => lerTodasLinhas<GoleiroLegado>(legadoClient, "goleiros"),
    lerJogadores: () => lerTodasLinhas<JogadorLegado>(legadoClient, "jogadores"),
    lerRodadas: () => lerTodasLinhas<RodadaLegada>(legadoClient, "rodadas"),
    lerPresencasRodada: () =>
      lerTodasLinhas<PresencaRodadaLegada>(legadoClient, "presencas_rodada"),
    lerSubstituicoesRodada: () =>
      lerTodasLinhas<SubstituicaoRodadaLegada>(legadoClient, "substituicoes_rodada"),
  };
}

export function criarRegistroStoreSupabase(
  appClient: SupabaseClient<any, any, any>,
): RegistroMigracaoStore {
  return {
    async listarPorTabela(tabelaOrigem: string): Promise<RegistroMigracaoExistente[]> {
      const { data, error } = await appClient
        .from("legado_migracao_registro")
        .select(
          "tabela_origem, id_origem, tabela_destino, id_destino, status, observacao",
        )
        .eq("tabela_origem", tabelaOrigem);
      if (error) {
        throw new Error(`Falha ao ler app.legado_migracao_registro: ${error.message}`);
      }
      return (data ?? []) as RegistroMigracaoExistente[];
    },
    async gravar(registro: NovoRegistroMigracao): Promise<void> {
      // UPSERT por (tabela_origem, id_origem) — chave de idempotência
      // (constraint `legado_migracao_registro_origem_unique`, BE-02).
      const { error } = await appClient
        .from("legado_migracao_registro")
        .upsert(registro, { onConflict: "tabela_origem,id_origem" });
      if (error) {
        throw new Error(`Falha ao gravar app.legado_migracao_registro: ${error.message}`);
      }
    },
  };
}

async function inserirRetornandoId(
  client: SupabaseClient<any, any, any>,
  tabela: string,
  dados: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await client.from(tabela).insert(dados).select("id").single();
  if (error) {
    throw new Error(`Falha ao inserir em app.${tabela}: ${error.message}`);
  }
  return (data as { id: string }).id;
}

export function criarAppWriterSupabase(
  appClient: SupabaseClient<any, any, any>,
): AppWriter {
  return {
    inserirAtleta: (dados) => inserirRetornandoId(appClient, "atleta", dados),
    inserirRodada: (dados) => inserirRetornandoId(appClient, "rodada", dados),
    inserirParticipacaoRodada: (dados) =>
      inserirRetornandoId(appClient, "participacao_rodada", dados),
    async inserirEventoJogo(dados) {
      const { error } = await appClient.from("evento_jogo").insert(dados);
      if (error) {
        throw new Error(`Falha ao inserir em app.evento_jogo: ${error.message}`);
      }
    },
    async inserirLancamentoPontos(dados) {
      const { error } = await appClient.from("lancamento_pontos").insert(dados);
      if (error) {
        throw new Error(`Falha ao inserir em app.lancamento_pontos: ${error.message}`);
      }
    },
  };
}

export function criarDepsSupabase(
  legadoClient: SupabaseClient<any, any, any>,
  appClient: SupabaseClient<any, any, any>,
): MigracaoDeps {
  return {
    legado: criarLegadoReaderSupabase(legadoClient),
    registro: criarRegistroStoreSupabase(appClient),
    app: criarAppWriterSupabase(appClient),
  };
}
