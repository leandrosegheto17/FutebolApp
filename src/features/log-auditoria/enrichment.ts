import { fetchAtletas } from "@/features/atletas/atletasApi";
import { listarRodadas } from "@/features/historico/historicoApi";

export interface LookupMaps {
  /** `rodada_id` -> `data` civil (`"AAAA-MM-DD"`), de `GET /api/rodadas` (BE-16). */
  rodadaData: Map<string, string>;
  /** `atleta_id` -> `apelido_exibicao`, de `GET /api/atletas` (BE-06). */
  atletaNome: Map<string, string>;
}

/**
 * Enriquecimento **best-effort** dos rótulos de rodada/atleta exibidos por
 * uma entrada do log (T08) — decisão de detalhe deste agente, documentada
 * aqui, não escalada ao `ux-ui`.
 *
 * Contexto da decisão: nem `LogAuditoriaItem` (`API-CONTRACT.yaml`, BE-09)
 * nem o modelo `LOG_AUDITORIA` (`SDD.md` Seção 5) denormalizam a data da
 * rodada ou o nome do atleta — só trazem `rodada_id`/`atleta_id` crus (uuid).
 * O wireframe da Seção 2 do `UX-SPEC.md`, porém, mostra "Rodada 05/09/2026"
 * e "Carlinhos" (não o id cru) — diferente de `BLOCKER-004` (FE-02), aqui o
 * dado NÃO precisa ser inventado: já existe, real, em dois endpoints
 * internos já publicados e já consumidos pelo resto do projeto (`GET
 * /api/rodadas` via `listarRodadas()`/FE-06, `GET /api/atletas` via
 * `fetchAtletas()`/FE-04). Este módulo só correlaciona localmente ids já
 * reais do log com registros já reais dessas duas listas — nenhum dado é
 * fabricado.
 *
 * Melhor esforço, nunca bloqueante: se qualquer uma das duas chamadas
 * falhar (rede, técnica, etc.), a lista principal do log **continua** sendo
 * exibida normalmente — só o rótulo humano de uma entrada específica
 * degrada para o id truncado (`entryPresenter.ts`, `labelRodada`/
 * `labelAtleta`), nunca propaga o erro para quebrar a tela inteira por causa
 * de um enriquecimento opcional. Por isso `Promise.allSettled` (não
 * `Promise.all`) e nenhum tratamento especial de `SessionExpiredError`
 * aqui — se a sessão caiu exatamente entre a chamada principal (que já
 * teria disparado o fluxo de sessão expirada, FE-12) e esta, a próxima ação
 * real do usuário nesta tela (ex.: "Tentar novamente") aciona o mesmo fluxo
 * normalmente.
 */
export async function buildLookupMaps(): Promise<LookupMaps> {
  const [rodadasResult, atletasResult] = await Promise.allSettled([
    listarRodadas(),
    fetchAtletas(),
  ]);

  const rodadaData = new Map<string, string>();
  if (rodadasResult.status === "fulfilled") {
    for (const rodada of rodadasResult.value) {
      rodadaData.set(rodada.id, rodada.data);
    }
  }

  const atletaNome = new Map<string, string>();
  if (atletasResult.status === "fulfilled") {
    for (const atleta of atletasResult.value) {
      atletaNome.set(atleta.id, atleta.apelido_exibicao);
    }
  }

  return { rodadaData, atletaNome };
}
