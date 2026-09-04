/**
 * Teste de integração de BE-09 (TASK.md Secao 3.1, RF-04.5) — parte do
 * critério de aceite literal coberta aqui: "consulta do log ordena do mais
 * recente ao mais antigo".
 *
 * Exige um Supabase local rodando (`supabase start`) — mesmo procedimento
 * de BE-02 a BE-08 (ver `.env.test.local` / `npm run test:integration`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as getLogAuditoria } from "../route";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const podeRodar = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function buildGetRequest(query = ""): Request {
  return new Request(`http://localhost:3000/api/log-auditoria${query}`, {
    method: "GET",
  });
}

describe.skipIf(!podeRodar)("BE-09 — GET /api/log-auditoria", () => {
  let service: SupabaseClient<any, any, any>;
  const runSeed = Date.now();
  const runId = `be09-log-${runSeed}`;

  beforeAll(() => {
    service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  /** Data civil única por `indice`, âncora distinta das demais suítes deste lote. */
  function rodadaData(indice: number): string {
    const ancora = new Date("2034-01-01T00:00:00.000Z");
    const diasOffset = (runSeed % 100000) + indice;
    const data = new Date(ancora.getTime() + diasOffset * 24 * 60 * 60 * 1000);
    return data.toISOString().slice(0, 10);
  }

  async function criarAtleta(sufixo: string): Promise<string> {
    const { data, error } = await service
      .from("atleta")
      .insert({
        nome_completo: `${runId} ${sufixo}`,
        apelido_exibicao: `${runId}-${sufixo}`,
        data_nascimento: "1990-01-01",
        pontuacao_inicial: 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data!.id as string;
  }

  it("ordena do mais recente ao mais antigo (RF-04.5) — nunca inclui campo de autor", async () => {
    // --- Gera duas entradas reais e sequenciais em log_auditoria: uma
    // correção (mais antiga) e, na sequência, uma exclusão (mais
    // recente) — mesmas funções PL/pgSQL de BE-09 usadas nos demais
    // testes deste lote.
    const atletaMaisAntigo = await criarAtleta("mais-antigo");
    const { data: rodadaMaisAntiga, error: erroLancarA } = await service.rpc(
      "lancar_rodada",
      {
        p_data: rodadaData(1),
        p_participacoes: [
          { atleta_id: atletaMaisAntigo, status: "presente", eventos: [] },
        ],
      },
    );
    if (erroLancarA) throw erroLancarA;
    const { error: erroCorrigir } = await service.rpc("corrigir_participacao_rodada", {
      p_rodada_id: rodadaMaisAntiga,
      p_atleta_id: atletaMaisAntigo,
      p_novo_status: "ausente",
      p_novos_eventos: [],
    });
    if (erroCorrigir) throw erroCorrigir;

    const atletaMaisRecente = await criarAtleta("mais-recente");
    const { data: rodadaMaisRecente, error: erroLancarB } = await service.rpc(
      "lancar_rodada",
      {
        p_data: rodadaData(2),
        p_participacoes: [
          { atleta_id: atletaMaisRecente, status: "presente", eventos: [] },
        ],
      },
    );
    if (erroLancarB) throw erroLancarB;
    const { error: erroExcluir } = await service.rpc("excluir_rodada", {
      p_rodada_id: rodadaMaisRecente,
    });
    if (erroExcluir) throw erroExcluir;

    // --- As duas últimas escritas em log_auditoria de todo o banco são,
    // nesta ordem: exclusão de rodadaMaisRecente (mais recente),
    // correção de rodadaMaisAntiga (mais antiga) — limit alto o
    // suficiente para garantir que ambas apareçam mesmo com acúmulo de
    // execuções anteriores (log_auditoria é retido indefinidamente,
    // RNF-06, nunca limpo pelos testes deste projeto).
    const response = await getLogAuditoria(buildGetRequest("?limit=200"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);

    expect(body[0].rodada_id).toBe(rodadaMaisRecente);
    expect(body[0].tipo_evento).toBe("estorno");
    expect(body[1].rodada_id).toBe(rodadaMaisAntiga);
    expect(body[1].tipo_evento).toBe("correcao");

    // Confirma numericamente a ordenação (mais recente → mais antigo)
    // entre as duas entradas conhecidas, não só a posição relativa.
    const ocorridoRecente = new Date(body[0].ocorrido_em).getTime();
    const ocorridoAntigo = new Date(body[1].ocorrido_em).getTime();
    expect(ocorridoRecente).toBeGreaterThanOrEqual(ocorridoAntigo);

    // Nunca campo de autor (RN-12) — nem presente, nem como placeholder.
    for (const item of body) {
      expect(Object.keys(item)).not.toContain("autor");
      expect(JSON.stringify(item)).not.toMatch(/"autor"/i);
    }
  });

  it("recusa limit inválido com 400", async () => {
    const response = await getLogAuditoria(buildGetRequest("?limit=abc"));
    expect(response.status).toBe(400);
  });

  it("recusa limit acima do teto máximo com 400", async () => {
    const response = await getLogAuditoria(buildGetRequest("?limit=999"));
    expect(response.status).toBe(400);
  });

  it("usa o limit default quando o parâmetro está ausente", async () => {
    const response = await getLogAuditoria(buildGetRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.length).toBeLessThanOrEqual(50);
  });
});

if (!podeRodar) {
  // `describe.skipIf` não imprime motivo — deixa explícito no relatório de
  // teste por que a suíte inteira foi pulada (TASK.md Secao 1.0: "nunca
  // esconder incerteza").
  describe("BE-09 — GET /api/log-auditoria (integração)", () => {
    it.skip(
      "PULADO: defina TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (ver " +
        "`supabase status` após `supabase start`) para rodar este teste de integração",
      () => {},
    );
  });
}
