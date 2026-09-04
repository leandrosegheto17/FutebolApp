/**
 * Teste de integração de BE-11 (TASK.md Secao 3.1) — critério de aceite
 * literal: "execução acima do timeout configurado retorna erro de 'falha
 * técnica real' (não trava a função serverless)".
 *
 * Chama `montarSugestaoTimes` diretamente (não via `POST /api/times/sugestao`)
 * usando `orcamentoMsOverride` — uma sobrescrita de teste documentada no
 * próprio `montar.ts`, nunca repassada pelo Route Handler — para forçar o
 * `Deadline` a já estar vencido ANTES do algoritmo começar. Isso exercita o
 * caminho de produção real (busca real contra o banco real + o mesmo guard
 * de timeout usado em produção, `TimeoutError`/`Deadline`) de forma
 * determinística e instantânea, sem precisar esperar `TIMEOUT_MONTAGEM_MS`
 * de verdade (8s) nem montar uma entrada adversária artificialmente densa só
 * para forçar o backtracking real a estourar o tempo.
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02/03/04/06/12 (ver `sugestao.integration.test.ts` para o passo a
 * passo completo).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { montarSugestaoTimes } from "../montar";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

describe.skipIf(!podeRodar)("BE-11 — montarSugestaoTimes (timeout)", () => {
  let service: SupabaseClient<any, any, any>;
  const runId = `be11-timeout-${Date.now()}`;

  async function criarAtleta(apelido: string): Promise<string> {
    const { data, error } = await service
      .from("atleta")
      .insert({
        nome_completo: `${runId} ${apelido}`,
        apelido_exibicao: `${runId}-${apelido}`,
        data_nascimento: "1990-01-01",
        pontuacao_inicial: 5,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it(
    "com o orçamento de tempo já vencido (orcamentoMsOverride negativo), devolve " +
      "{ tipo: 'falha_tecnica' } em vez de travar ou devolver um resultado incompleto " +
      "(nem 'ok' nem 'conflito' — o algoritmo não teve tempo de provar nenhum dos dois)",
    async () => {
      const a = await criarAtleta("timeout-a");
      const b = await criarAtleta("timeout-b");

      const resultado = await montarSugestaoTimes(
        service,
        { atletas_ids: [a, b], quantidade_times: 2 },
        { orcamentoMsOverride: -1 },
      );

      expect(resultado.tipo).toBe("falha_tecnica");
      if (resultado.tipo === "falha_tecnica") {
        expect(resultado.mensagem).toContain("Tempo máximo");
      }
    },
  );

  it(
    "a checagem de atletas_ids inexistente acontece ANTES do timeout (404 tem prioridade " +
      "sobre falha técnica — falhar rápido no que já se sabe errado)",
    async () => {
      const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000";
      const a = await criarAtleta("timeout-existente");

      const resultado = await montarSugestaoTimes(
        service,
        { atletas_ids: [a, ID_INEXISTENTE], quantidade_times: 2 },
        { orcamentoMsOverride: -1 },
      );

      expect(resultado.tipo).toBe("atleta_nao_encontrado");
    },
  );
});

if (!podeRodar) {
  describe("BE-11 — montarSugestaoTimes (timeout, integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
