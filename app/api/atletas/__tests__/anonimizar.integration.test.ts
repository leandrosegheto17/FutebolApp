/**
 * Teste de integração de BE-07 (TASK.md Seção 3.1) — critério de aceite
 * literal: "Chamar a função sobrescreve nome_completo/apelido_exibicao/
 * contato/data_nascimento, marca ativo=false e anonimizado_em, desativa
 * restricao_obrigatoria associadas — tudo em uma transação;
 * lancamento_pontos/participacao_rodada/time_atleta/substituicao não sofrem
 * nenhuma alteração; log_auditoria grava valores_antes só com marcadores
 * redigidos".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento de
 * BE-02/03/04/05/06 (ver `.env.test.local` / `npm run test:integration`).
 *
 * `app.atleta` é append-only para exclusão física (GUARDRAILS.md regra 9) —
 * mesmo padrão de BE-06: cada atleta criado por este teste recebe
 * `nome_completo`/`apelido_exibicao` prefixado com um `runId` único por
 * execução; tabelas fisicamente removíveis (`rodada`, `participacao_rodada`,
 * `lancamento_pontos`, `time`, `time_atleta`, `substituicao`,
 * `restricao_obrigatoria`) são limpas em `try/finally` dedicado.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as postAnonimizar } from "../[id]/anonimizar/route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildAnonimizarRequest(id: string): Request {
  return new Request(`http://localhost:3000/api/atletas/${id}/anonimizar`, {
    method: "POST",
  });
}

describe.skipIf(!podeRodar)("BE-07 — POST /api/atletas/:id/anonimizar", () => {
  let service: SupabaseClient<any, any, any>;
  const runId = `be07-${Date.now()}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("retorna 404 para id inexistente, sem gravar log_auditoria", async () => {
    const idInexistente = "00000000-0000-0000-0000-000000000000";
    const response = await postAnonimizar(buildAnonimizarRequest(idInexistente), {
      params: { id: idInexistente },
    });
    expect(response.status).toBe(404);

    const { data: log } = await service
      .from("log_auditoria")
      .select("id")
      .eq("atleta_id", idInexistente);
    expect(log).toHaveLength(0);
  });

  it(
    "sobrescreve dado pessoal, marca ativo=false/anonimizado_em, desativa restrição " +
      "associada, preserva lancamento_pontos/participacao_rodada/time_atleta/" +
      "substituicao, grava log_auditoria só com marcadores redigidos, e recusa " +
      "reprocessar o mesmo atleta (409)",
    async () => {
      // --- Setup: dois atletas (o alvo da anonimização e um par de restrição),
      // uma rodada lançada com o alvo presente, um lançamento de pontos, um
      // time com o alvo, e uma substituição envolvendo o alvo.
      const { data: atletas, error: atletasError } = await service
        .from("atleta")
        .insert([
          {
            nome_completo: `${runId} Alvo Anonimizacao`,
            apelido_exibicao: `${runId}-alvo`,
            contato: "11988887777",
            data_nascimento: "1990-06-15",
            pontuacao_inicial: 5,
          },
          {
            nome_completo: `${runId} Par Restricao`,
            apelido_exibicao: `${runId}-par`,
            contato: "11977776666",
            data_nascimento: "1991-07-16",
            pontuacao_inicial: 0,
          },
          {
            nome_completo: `${runId} Substituto`,
            apelido_exibicao: `${runId}-substituto`,
            data_nascimento: "1992-08-17",
            pontuacao_inicial: 0,
          },
        ])
        .select("id, nome_completo");
      if (atletasError) throw atletasError;
      const atletaAlvo = atletas!.find((a: any) => a.nome_completo.includes("Alvo"))!.id;
      const atletaPar = atletas!.find((a: any) => a.nome_completo.includes("Par"))!.id;
      const atletaSubstituto = atletas!.find((a: any) =>
        a.nome_completo.includes("Substituto"),
      )!.id;

      const { data: restricao, error: restricaoError } = await service
        .from("restricao_obrigatoria")
        .insert({ atleta_a_id: atletaAlvo, atleta_b_id: atletaPar, ativo: true })
        .select("id, ativo, desativado_em")
        .single();
      if (restricaoError) throw restricaoError;

      const rodadasCriadas: string[] = [];
      const timesCriados: string[] = [];
      try {
        const { data: rodada, error: rodadaError } = await service
          .from("rodada")
          .insert({ data: "2026-08-20", status: "lancada" })
          .select("id")
          .single();
        if (rodadaError) throw rodadaError;
        const rodadaId = rodada!.id as string;
        rodadasCriadas.push(rodadaId);

        const { data: participacao, error: participacaoError } = await service
          .from("participacao_rodada")
          .insert({ rodada_id: rodadaId, atleta_id: atletaAlvo, status: "presente" })
          .select("id")
          .single();
        if (participacaoError) throw participacaoError;

        const { data: lancamento, error: lancamentoError } = await service
          .from("lancamento_pontos")
          .insert({
            atleta_id: atletaAlvo,
            rodada_id: rodadaId,
            origem: "lancamento",
            pontos_delta: 3,
          })
          .select("id, pontos_delta")
          .single();
        if (lancamentoError) throw lancamentoError;

        const { data: time, error: timeError } = await service
          .from("time")
          .insert({ rodada_id: rodadaId, label: "Time A" })
          .select("id")
          .single();
        if (timeError) throw timeError;
        const timeId = time!.id as string;
        timesCriados.push(timeId);

        const { error: timeAtletaError } = await service
          .from("time_atleta")
          .insert({ time_id: timeId, atleta_id: atletaAlvo });
        if (timeAtletaError) throw timeAtletaError;

        const { data: substituicao, error: substituicaoError } = await service
          .from("substituicao")
          .insert({
            rodada_id: rodadaId,
            time_id: timeId,
            atleta_sai_id: atletaAlvo,
            atleta_entra_id: atletaSubstituto,
          })
          .select("id")
          .single();
        if (substituicaoError) throw substituicaoError;

        // --- Ação: aciona a anonimização via endpoint (BE-07).
        const response = await postAnonimizar(buildAnonimizarRequest(atletaAlvo), {
          params: { id: atletaAlvo },
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.nome_completo).toBe("Atleta anonimizado");
        expect(body.apelido_exibicao).toBe(`Atleta #${atletaAlvo.slice(0, 8)}`);
        expect(body.contato).toBeNull();
        expect(body.data_nascimento).toBeNull();
        expect(body.ativo).toBe(false);
        expect(body.anonimizado_em).toBeTruthy();

        // --- Confirma diretamente no banco (não só via resposta da API).
        const { data: atletaAtualizado } = await service
          .from("atleta")
          .select(
            "nome_completo, apelido_exibicao, contato, data_nascimento, ativo, anonimizado_em",
          )
          .eq("id", atletaAlvo)
          .single();
        expect(atletaAtualizado!.nome_completo).toBe("Atleta anonimizado");
        expect(atletaAtualizado!.apelido_exibicao).toBe(
          `Atleta #${atletaAlvo.slice(0, 8)}`,
        );
        expect(atletaAtualizado!.contato).toBeNull();
        expect(atletaAtualizado!.data_nascimento).toBeNull();
        expect(atletaAtualizado!.ativo).toBe(false);
        expect(atletaAtualizado!.anonimizado_em).toBeTruthy();

        // Restrição associada desativada (RN-11 mesmo padrão de soft-delete).
        const { data: restricaoAtualizada } = await service
          .from("restricao_obrigatoria")
          .select("ativo, desativado_em")
          .eq("id", restricao!.id)
          .single();
        expect(restricaoAtualizada!.ativo).toBe(false);
        expect(restricaoAtualizada!.desativado_em).toBeTruthy();

        // Ledger/histórico multi-tabela intactos — nenhuma alteração.
        const { data: participacaoDepois } = await service
          .from("participacao_rodada")
          .select("status")
          .eq("id", participacao!.id)
          .single();
        expect(participacaoDepois!.status).toBe("presente");

        const { data: lancamentoDepois } = await service
          .from("lancamento_pontos")
          .select("pontos_delta, origem")
          .eq("id", lancamento!.id)
          .single();
        expect(Number(lancamentoDepois!.pontos_delta)).toBe(3);
        expect(lancamentoDepois!.origem).toBe("lancamento");

        const { data: timeAtletaDepois } = await service
          .from("time_atleta")
          .select("atleta_id")
          .eq("time_id", timeId)
          .eq("atleta_id", atletaAlvo);
        expect(timeAtletaDepois).toHaveLength(1);

        const { data: substituicaoDepois } = await service
          .from("substituicao")
          .select("atleta_sai_id, atleta_entra_id")
          .eq("id", substituicao!.id)
          .single();
        expect(substituicaoDepois!.atleta_sai_id).toBe(atletaAlvo);
        expect(substituicaoDepois!.atleta_entra_id).toBe(atletaSubstituto);

        // log_auditoria: tipo_evento='anonimizacao', valores_antes SÓ com
        // marcadores redigidos — nunca o dado pessoal real (GUARDRAILS.md
        // regra 20), nem em nenhum ponto do JSON gravado.
        const { data: logs } = await service
          .from("log_auditoria")
          .select("tipo_evento, atleta_id, rodada_id, valores_antes, valores_depois")
          .eq("atleta_id", atletaAlvo);
        expect(logs).toHaveLength(1);
        const log = logs![0]!;
        expect(log.tipo_evento).toBe("anonimizacao");
        expect(log.rodada_id).toBeNull();
        expect(log.valores_antes).toEqual({
          nome_completo: "[REDACTED]",
          apelido_exibicao: "[REDACTED]",
          contato: "[REDACTED]",
          data_nascimento: "[REDACTED]",
        });
        const valoresAntesTexto = JSON.stringify(log.valores_antes);
        expect(valoresAntesTexto).not.toContain("Alvo Anonimizacao");
        expect(valoresAntesTexto).not.toContain("11988887777");
        expect(valoresAntesTexto).not.toContain("1990-06-15");
        expect(log.valores_depois).toEqual({
          nome_completo: "Atleta anonimizado",
          apelido_exibicao: `Atleta #${atletaAlvo.slice(0, 8)}`,
          contato: null,
          data_nascimento: null,
          ativo: false,
        });

        // --- Reprocessar o mesmo atleta é recusado (irreversibilidade,
        // ADR-011) — 409, sem segunda entrada em log_auditoria.
        const segunda = await postAnonimizar(buildAnonimizarRequest(atletaAlvo), {
          params: { id: atletaAlvo },
        });
        expect(segunda.status).toBe(409);

        const { data: logsDepoisSegundaChamada } = await service
          .from("log_auditoria")
          .select("id")
          .eq("atleta_id", atletaAlvo);
        expect(logsDepoisSegundaChamada).toHaveLength(1);
      } finally {
        // Limpeza garantida (try/finally, mesmo padrão do cenário de nível
        // técnico de BE-06): tabelas fisicamente removíveis criadas por
        // este cenário — nunca `atleta`/`restricao_obrigatoria`/
        // `log_auditoria` (soft-delete/append-only, preservados de
        // propósito para auditoria futura).
        if (timesCriados.length > 0) {
          await service.from("substituicao").delete().in("time_id", timesCriados);
          await service.from("time_atleta").delete().in("time_id", timesCriados);
          await service.from("time").delete().in("id", timesCriados);
        }
        if (rodadasCriadas.length > 0) {
          await service
            .from("lancamento_pontos")
            .delete()
            .in("rodada_id", rodadasCriadas);
          await service
            .from("participacao_rodada")
            .delete()
            .in("rodada_id", rodadasCriadas);
          await service.from("rodada").delete().in("id", rodadasCriadas);
        }
      }
    },
  );
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Seção 1.0: "nunca
  // esconder incerteza").
  describe("BE-07 — POST /api/atletas/:id/anonimizar (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
