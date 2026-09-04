import type { Atleta } from "@/features/atletas/types";
import type {
  EventoJogoBody,
  LancarRodadaBody,
  ParticipacaoRodadaBody,
  StatusParticipacao,
} from "./types";

/**
 * Estado local (por atleta) do wizard de lançamento de rodada — forma mais
 * conveniente para edição em tela do que o array de `eventos` do contrato de
 * API; convertido para `ParticipacaoRodadaBody` só no momento do envio
 * (`buildLancarRodadaBody`).
 */
export interface ParticipacaoState {
  atletaId: string;
  /** Rótulo de exibição — `apelido_exibicao` (fallback `nome_completo`, mesmo critério de `AtletasList`). */
  nome: string;
  status: StatusParticipacao;
  gols: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
}

/** Ponto de partida de cada atleta ativo ao entrar na Etapa 1 — decisão de
 * detalhe (TASK.md Seção 1.0, "lacuna de detalhe decide"): `status` inicia
 * como "presente" porque a maioria do grupo comparece em uma rodada típica
 * de futebol amador (o organizador ajusta os poucos ausentes/lesionados na
 * Etapa 1, revisando tudo de novo na Etapa 3 antes de confirmar) — nenhum
 * `UX-SPEC.md`/`TASK.md` define esse default explicitamente. */
export function initParticipacoes(atletas: Atleta[]): ParticipacaoState[] {
  return atletas.map((atleta) => ({
    atletaId: atleta.id,
    nome: atleta.apelido_exibicao || atleta.nome_completo,
    status: "presente",
    gols: 0,
    cartoesAmarelos: 0,
    cartoesVermelhos: 0,
  }));
}

function buildEventos(participacao: ParticipacaoState): EventoJogoBody[] {
  const eventos: EventoJogoBody[] = [];
  if (participacao.gols > 0) {
    eventos.push({ tipo: "gol", quantidade: participacao.gols });
  }
  if (participacao.cartoesAmarelos > 0) {
    eventos.push({ tipo: "cartao_amarelo", quantidade: participacao.cartoesAmarelos });
  }
  if (participacao.cartoesVermelhos > 0) {
    eventos.push({ tipo: "cartao_vermelho", quantidade: participacao.cartoesVermelhos });
  }
  return eventos;
}

function toParticipacaoBody(participacao: ParticipacaoState): ParticipacaoRodadaBody {
  return {
    atleta_id: participacao.atletaId,
    status: participacao.status,
    // RF-02.6, reforçado no cliente: nunca envia eventos para um atleta
    // ausente, mesmo que contadores tenham ficado não-zerados em memória.
    eventos: participacao.status === "ausente" ? [] : buildEventos(participacao),
  };
}

/** Monta o corpo único de `POST /api/rodadas` a partir do estado da tela (TASK.md Seção 1.2 — um único `POST`, nunca chamadas incrementais). */
export function buildLancarRodadaBody(
  data: string,
  participacoes: ParticipacaoState[],
  confirmarDuplicidade: boolean,
): LancarRodadaBody {
  return {
    data,
    confirmar_duplicidade: confirmarDuplicidade,
    participacoes: participacoes.map(toParticipacaoBody),
  };
}

export interface ResumoRodada {
  presentes: number;
  ausentes: number;
  lesionados: number;
  gols: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
}

/** Resumo agregado exibido na Etapa 3 (Revisão e Confirmação, `UX-SPEC.md` T05). */
export function resumirParticipacoes(participacoes: ParticipacaoState[]): ResumoRodada {
  return participacoes.reduce<ResumoRodada>(
    (acc, participacao) => {
      if (participacao.status === "presente") acc.presentes += 1;
      if (participacao.status === "ausente") acc.ausentes += 1;
      if (participacao.status === "lesionado") acc.lesionados += 1;
      acc.gols += participacao.gols;
      acc.cartoesAmarelos += participacao.cartoesAmarelos;
      acc.cartoesVermelhos += participacao.cartoesVermelhos;
      return acc;
    },
    {
      presentes: 0,
      ausentes: 0,
      lesionados: 0,
      gols: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
    },
  );
}
