/**
 * Tipos do lado do Frontend para T09 (Montagem de Times) — TASK.md FE-09.
 * Espelham `SugestaoTimesBody`/`SugestaoTimesOkResponse`/
 * `SugestaoTimesConflitoResponse`/`RestricaoConflitanteItem`/
 * `GrupoConflitoItem` (`POST /api/times/sugestao`, BE-11) e
 * `ConfirmarTimesBody`/`TimesConfirmadosResponse`
 * (`POST /api/rodadas/{id}/times`, BE-13) de `API-CONTRACT.yaml`, conferidos
 * campo a campo contra o contrato real — nenhum é mock a substituir depois.
 */

/** Um atleta dentro de um time sugerido (`SugestaoTimesOkResponse`/BE-11). */
export interface AtletaMontado {
  atleta_id: string;
  apelido_exibicao: string;
  /** RN-03. `null` no fallback local de "Gerar mesmo assim" (ver `times.ts`). */
  nivel_tecnico: number | null;
  /** `null` quando o atleta não tem `data_nascimento` cadastrado (RF-08.3) ou no fallback local. */
  idade: number | null;
}

/** Um time sugerido/ajustado manualmente, antes ou depois da confirmação. */
export interface TimeMontado {
  /** 0-based — "Time A" = índice 0 (ver `labelParaIndice`, `times.ts`). */
  indice: number;
  atletas: AtletaMontado[];
  nivel_tecnico_medio: number | null;
  idade_media: number | null;
}

/** Resposta de sucesso (`status: "ok"`) de `POST /api/times/sugestao` (BE-11). */
export interface SugestaoTimesOk {
  status: "ok";
  quantidade_times_solicitada: number;
  times: TimeMontado[];
}

/** Um par em conflito — contrato EXATO do ADR-010 (`RestricaoConflitanteItem`). */
export interface RestricaoConflitante {
  restricao_id: string;
  atleta_a_id: string;
  atleta_a_nome: string;
  atleta_b_id: string;
  atleta_b_nome: string;
  motivo: "restricao_obrigatoria_ativa";
  grupo_conflito: number;
}

/** Um componente conexo sem coloração válida (`GrupoConflitoItem`, ADR-010). */
export interface GrupoConflito {
  grupo_conflito: number;
  atletas_ids: string[];
  quantidade_times_solicitada: number;
  mensagem: string;
}

/** Resposta de conflito (`status: "conflito"`) de `POST /api/times/sugestao` (BE-11, RF-05.2). */
export interface SugestaoTimesConflito {
  status: "conflito";
  restricoes_conflitantes: RestricaoConflitante[];
  grupos_conflito: GrupoConflito[];
}

export type SugestaoTimesResultado = SugestaoTimesOk | SugestaoTimesConflito;

/** Item mínimo de `GET /api/rodadas` (BE-16) usado aqui só para achar "a rodada atual". */
export interface RodadaResumo {
  id: string;
  data: string;
  status: "lancada" | "excluida";
  criado_em: string;
}

/** Uma participação com `status: "presente"` dentro do detalhe de `GET /api/rodadas/{id}` (BE-16). */
export interface ParticipacaoPresente {
  atleta_id: string;
  apelido_exibicao: string;
}

/** Corpo de um time dentro de `POST /api/rodadas/{id}/times` (`TimeConfirmadoInput`, BE-13). */
export interface TimeConfirmadoInput {
  label: string;
  atletas_ids: string[];
}

/** Um atleta dentro de um time já persistido (`AtletaConfirmadoResponse`, BE-13). */
export interface AtletaConfirmado {
  atleta_id: string;
  apelido_exibicao: string;
}

/** Um time já persistido em `app.time`/`app.time_atleta` (`TimeConfirmadoResponse`, BE-13). */
export interface TimeConfirmado {
  time_id: string;
  label: string;
  atletas: AtletaConfirmado[];
}

/** Resposta de sucesso de `POST /api/rodadas/{id}/times` (`TimesConfirmadosResponse`, BE-13). */
export interface TimesConfirmados {
  rodada_id: string;
  times: TimeConfirmado[];
}

/**
 * Uma substituição registrada (`SubstituicaoResponse`, BE-13) — T11 (TASK.md
 * FE-11, RF-06.1/RF-06.3): puro registro de fidelidade histórica, sem nenhum
 * campo de autor individual (RN-12) e sem efeito sobre pontuação.
 */
export interface Substituicao {
  id: string;
  rodada_id: string;
  time_id: string;
  atleta_sai_id: string;
  atleta_sai_nome: string;
  atleta_entra_id: string;
  atleta_entra_nome: string;
  criado_em: string;
}

/** Corpo de `POST /api/rodadas/{id}/substituicoes` (`SubstituicaoBody`, BE-13). */
export interface SubstituicaoInput {
  time_id: string;
  atleta_sai_id: string;
  atleta_entra_id: string;
}
