import { assertSessionAlive } from "@/features/sessao";
import type {
  ParticipacaoPresente,
  RodadaResumo,
  SugestaoTimesResultado,
  TimeConfirmadoInput,
  TimesConfirmados,
} from "./types";

/**
 * Cliente HTTP de T09 (Montagem de Times) — TASK.md FE-09. Os dois
 * endpoints de escrita/leitura consumidos aqui são **reais**, já
 * `Concluída` (`BE-11`/`BE-13`/`BE-16`) — nenhum é mock a substituir
 * depois. Mesmo padrão de `request()`/`assertSessionAlive` já usado por
 * `historicoApi.ts`/`correcaoApi.ts` (FE-06/FE-07).
 */

const RODADAS_URL = "/api/rodadas";
const SUGESTAO_URL = "/api/times/sugestao";

/**
 * Texto literal exigido pelo `UX-SPEC.md` Seção 4 (linha "T09 Montagem de
 * Times", coluna Erro, sub-caso "(b) falha técnica real") — reaproveitado
 * também para qualquer outra falha de geração (`400`/`404`/rede), já que a
 * Seção 4 não distingue um texto próprio por sub-causa de falha técnica
 * (mesmo critério já usado por `ExcluirRodadaModal`/FE-06 ao reaproveitar uma
 * única mensagem genérica para `404`/`409`/falha técnica).
 */
export const GERAR_SUGESTAO_ERROR_MESSAGE =
  "Não foi possível gerar a sugestão, tente novamente.";

/**
 * Sem texto literal no `UX-SPEC.md` para esta ação (o wireframe de T09 não
 * cobre o que acontece após "Confirmar Times" — decisão de detalhe
 * documentada, não escalada; ver nota de conclusão de FE-09 no `TASK.md`).
 * Tom consistente com as demais mensagens genéricas de escrita do projeto.
 */
export const CONFIRMAR_TIMES_ERROR_MESSAGE =
  "Não foi possível confirmar os times agora. Tente novamente.";

/** Idem — carregamento inicial da "rodada atual" também não tem texto próprio no `UX-SPEC.md`. */
export const RODADA_ATUAL_ERROR_MESSAGE =
  "Não foi possível carregar os dados da rodada atual. Tente novamente.";

export class TimesApiError extends Error {}

/** `500` de `POST /api/times/sugestao` — timeout do backtracking (TASK.md Seção 6.2 item 3). */
export class TimesFalhaTecnicaError extends Error {
  constructor() {
    super(GERAR_SUGESTAO_ERROR_MESSAGE);
    this.name = "TimesFalhaTecnicaError";
  }
}

export class RodadaNaoEncontradaError extends Error {
  constructor() {
    super("Rodada não encontrada.");
    this.name = "RodadaNaoEncontradaError";
  }
}

/** `errcode` PL/pgSQL `RD001` (BE-09/BE-13) — rodada já excluída, não é possível confirmar times. */
export class RodadaJaExcluidaError extends Error {
  constructor() {
    super("Esta rodada já foi excluída — não é possível confirmar times para ela.");
    this.name = "RodadaJaExcluidaError";
  }
}

/**
 * `errcode` PL/pgSQL `TM001` (BE-13) — já existe substituição registrada
 * contra a divisão atual; reconfirmar (substituir a divisão) é bloqueado
 * para preservar a fidelidade histórica (RF-06.1). Mensagem vem do próprio
 * servidor (`ErroSubstituicaoExistenteBloqueiaReconfirmacao.message`) — só
 * este erro tem texto explicativo específico o bastante para valer a pena
 * exibir literalmente, ao contrário dos demais (genéricos por design).
 */
export class SubstituicaoExistenteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubstituicaoExistenteError";
  }
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** `fetch` + tradução de falha de rede + checagem de sessão (401), comum a todo endpoint deste módulo. */
async function request(
  input: string,
  init: RequestInit | undefined,
  onNetworkError: () => Error,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw onNetworkError();
  }
  return assertSessionAlive(response);
}

/**
 * "Rodada atual" para T09 (decisão de detalhe, documentada, não escalada —
 * `UX-SPEC.md` Seção 2 mostra o wireframe de T09 com um cabeçalho "Times —
 * Rodada {data}" mas não especifica como essa rodada é escolhida quando o
 * organizador chega pelo item de navegação "Times", nem prevê um seletor de
 * rodada): a rodada `status: "lancada"` mais recente (`GET /api/rodadas`,
 * BE-16, já devolve `data desc, criado_em desc` — primeiro item não-excluído
 * é "a rodada em andamento"). `null` quando não há nenhuma rodada lançada
 * (tratado pela tela como estado de dependência, mesmo padrão já usado por
 * FE-05 para "nenhum atleta ativo cadastrado").
 */
export async function buscarRodadaAtual(): Promise<RodadaResumo | null> {
  const response = await request(
    RODADAS_URL,
    undefined,
    () => new TimesApiError(RODADA_ATUAL_ERROR_MESSAGE),
  );
  if (response.status !== 200) {
    throw new TimesApiError(RODADA_ATUAL_ERROR_MESSAGE);
  }
  const rodadas = (await response.json()) as RodadaResumo[];
  return rodadas.find((rodada) => rodada.status === "lancada") ?? null;
}

/**
 * Presentes (`status: "presente"`) da rodada — pré-preenchimento da seleção
 * de T09 ("Selecione os presentes da rodada para gerar times", UX-SPEC.md
 * Seção 4). `GET /api/rodadas/{id}` (BE-16) já resolve `apelido_exibicao`
 * (RN-06), nenhuma segunda chamada a `GET /api/atletas` é necessária.
 */
export async function buscarPresentesDaRodada(
  rodadaId: string,
): Promise<ParticipacaoPresente[]> {
  const response = await request(
    `${RODADAS_URL}/${rodadaId}`,
    undefined,
    () => new TimesApiError(RODADA_ATUAL_ERROR_MESSAGE),
  );
  if (response.status === 404) {
    throw new RodadaNaoEncontradaError();
  }
  if (response.status !== 200) {
    throw new TimesApiError(RODADA_ATUAL_ERROR_MESSAGE);
  }
  const detalhe = (await response.json()) as {
    participacoes: { atleta_id: string; apelido_exibicao: string; status: string }[];
  };
  return detalhe.participacoes
    .filter((participacao) => participacao.status === "presente")
    .map(({ atleta_id, apelido_exibicao }) => ({ atleta_id, apelido_exibicao }));
}

/**
 * `POST /api/times/sugestao` (BE-11, RF-05.1/RF-05.3) — heurística
 * determinística de duas fases (ADR-007). `N` sempre `QUANTIDADE_TIMES`
 * nesta release (`times.ts`), embora o Backend já seja paramétrico
 * (TASK.md Seção 1.4/6.2 item 1).
 */
export async function gerarSugestao(
  atletasIds: string[],
  quantidadeTimes: number,
): Promise<SugestaoTimesResultado> {
  const response = await request(
    SUGESTAO_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        atletas_ids: atletasIds,
        quantidade_times: quantidadeTimes,
      }),
    },
    () => new TimesApiError(GERAR_SUGESTAO_ERROR_MESSAGE),
  );

  if (response.status === 200) {
    return (await response.json()) as SugestaoTimesResultado;
  }
  if (response.status === 500) {
    // `ErroFalhaTecnicaMontagemTimes` — TASK.md Seção 6.2 item 3 (guarda de
    // 8s). Mensagem sempre a literal do `UX-SPEC.md`, não a `message` bruta
    // devolvida pelo servidor (texto técnico interno).
    throw new TimesFalhaTecnicaError();
  }
  // 400 (validação)/404 (atleta referenciado inexistente) — sem sub-caso
  // distinto no UX-SPEC.md; mesma mensagem genérica de falha de geração.
  throw new TimesApiError(GERAR_SUGESTAO_ERROR_MESSAGE);
}

/**
 * `POST /api/rodadas/{id}/times` (BE-13, RF-05.4) — confirma/persiste a
 * divisão ajustada manualmente pelo organizador. Reconfirmar substitui a
 * divisão anterior por completo, salvo bloqueio por substituição já
 * registrada (`409 TM001`, ver `SubstituicaoExistenteError`).
 */
export async function confirmarTimes(
  rodadaId: string,
  times: TimeConfirmadoInput[],
): Promise<TimesConfirmados> {
  const response = await request(
    `${RODADAS_URL}/${rodadaId}/times`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ times }),
    },
    () => new TimesApiError(CONFIRMAR_TIMES_ERROR_MESSAGE),
  );

  if (response.status === 200) {
    return (await response.json()) as TimesConfirmados;
  }
  if (response.status === 404) {
    throw new RodadaNaoEncontradaError();
  }
  if (response.status === 409) {
    const parsed = await safeReadJson(response);
    if (parsed?.error === "substituicao_existente") {
      throw new SubstituicaoExistenteError(
        typeof parsed.message === "string"
          ? parsed.message
          : CONFIRMAR_TIMES_ERROR_MESSAGE,
      );
    }
    throw new RodadaJaExcluidaError();
  }
  throw new TimesApiError(CONFIRMAR_TIMES_ERROR_MESSAGE);
}
