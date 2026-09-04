import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchAtletas } from "@/features/atletas/atletasApi";
import { listarRodadas } from "@/features/historico/historicoApi";
import type { Atleta } from "@/features/atletas/types";
import type { RodadaHistoricoItem } from "@/features/historico/types";
import { buildLookupMaps } from "./enrichment";

vi.mock("@/features/atletas/atletasApi", () => ({ fetchAtletas: vi.fn() }));
vi.mock("@/features/historico/historicoApi", () => ({ listarRodadas: vi.fn() }));

const RODADA: RodadaHistoricoItem = {
  id: "rodada-1",
  data: "2026-09-05",
  status: "lancada",
  criado_em: "2026-09-05T20:00:00.000Z",
  presentes: 18,
};

const ATLETA: Atleta = {
  id: "atleta-1",
  nome_completo: "Carlos Silva",
  apelido_exibicao: "Carlinhos",
  contato: null,
  data_nascimento: null,
  consentimento_responsavel_obtido: false,
  pontuacao_inicial: 0,
  ativo: true,
  anonimizado_em: null,
  criado_em: "2026-01-01T00:00:00.000Z",
  nivel_tecnico: 5,
  rodadas_presentes: 10,
};

describe("buildLookupMaps", () => {
  beforeEach(() => {
    vi.mocked(fetchAtletas).mockReset();
    vi.mocked(listarRodadas).mockReset();
  });

  it("monta os dois mapas (rodada_id -> data, atleta_id -> apelido) quando ambas as chamadas têm sucesso", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA]);
    vi.mocked(fetchAtletas).mockResolvedValue([ATLETA]);

    const lookups = await buildLookupMaps();

    expect(lookups.rodadaData.get("rodada-1")).toBe("2026-09-05");
    expect(lookups.atletaNome.get("atleta-1")).toBe("Carlinhos");
  });

  it("degrada para mapas vazios (nunca lança) quando a busca de rodadas falha", async () => {
    vi.mocked(listarRodadas).mockRejectedValue(new Error("falhou"));
    vi.mocked(fetchAtletas).mockResolvedValue([ATLETA]);

    const lookups = await buildLookupMaps();

    expect(lookups.rodadaData.size).toBe(0);
    expect(lookups.atletaNome.get("atleta-1")).toBe("Carlinhos");
  });

  it("degrada para mapas vazios (nunca lança) quando a busca de atletas falha", async () => {
    vi.mocked(listarRodadas).mockResolvedValue([RODADA]);
    vi.mocked(fetchAtletas).mockRejectedValue(new Error("falhou"));

    const lookups = await buildLookupMaps();

    expect(lookups.rodadaData.get("rodada-1")).toBe("2026-09-05");
    expect(lookups.atletaNome.size).toBe(0);
  });

  it("degrada para os dois mapas vazios (nunca lança) quando ambas as chamadas falham", async () => {
    vi.mocked(listarRodadas).mockRejectedValue(new Error("falhou"));
    vi.mocked(fetchAtletas).mockRejectedValue(new Error("falhou"));

    await expect(buildLookupMaps()).resolves.toEqual({
      rodadaData: new Map(),
      atletaNome: new Map(),
    });
  });
});
