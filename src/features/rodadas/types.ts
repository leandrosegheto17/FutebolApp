/**
 * Tipos do lado do Frontend para o Serviço de Rodadas (BE-08) — espelham
 * `LancarRodadaBody`/`RodadaResponse`/`ErroDuplicidadeRodada`/
 * `ErroValidacaoRodada` de `API-CONTRACT.yaml`, definidos localmente (mesmo
 * padrão já usado por `src/features/atletas/types.ts`, TASK.md FE-04):
 * `src/modules/rodadas` assume um client Supabase de servidor, importar o
 * barrel arrastaria código de servidor para o bundle do cliente sem
 * necessidade.
 */

export type StatusParticipacao = "presente" | "ausente" | "lesionado";

export type TipoEvento = "gol" | "cartao_amarelo" | "cartao_vermelho";

/** Item de `eventos` dentro de uma participação — `LancarRodadaBody` (BE-08, RF-02.4/RF-02.5). */
export interface EventoJogoBody {
  tipo: TipoEvento;
  quantidade: number;
}

/** Presença de um atleta em `POST /api/rodadas` (BE-08, RF-02.1/RF-02.2/RF-02.3). */
export interface ParticipacaoRodadaBody {
  atleta_id: string;
  status: StatusParticipacao;
  /**
   * Sempre vazio quando `status: "ausente"` — bloqueado com `400` (RF-02.6)
   * se vier não vazio; permitido tanto para `presente` quanto para
   * `lesionado`.
   */
  eventos: EventoJogoBody[];
}

/** Corpo de `POST /api/rodadas` (BE-08, RF-02). */
export interface LancarRodadaBody {
  data: string;
  /** RF-02.8 — reenviado como `true` depois que o organizador confirma o modal de duplicidade. */
  confirmar_duplicidade: boolean;
  participacoes: ParticipacaoRodadaBody[];
}

export interface ParticipacaoRodadaResponse {
  atleta_id: string;
  status: StatusParticipacao;
  eventos: EventoJogoBody[];
  pontos_delta: number;
}

/** Resposta de sucesso (`201`) de `POST /api/rodadas` (BE-08). */
export interface RodadaResponse {
  id: string;
  data: string;
  status: "lancada" | "excluida";
  criado_em: string;
  participacoes: ParticipacaoRodadaResponse[];
}

export interface RodadaDuplicada {
  id: string;
  data: string;
  status: "lancada" | "excluida";
}

export interface RodadaErroDetalhe {
  path: PropertyKey[];
  message: string;
}
