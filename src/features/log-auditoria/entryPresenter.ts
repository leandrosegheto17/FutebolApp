import type { DiffViewerItem } from "@/components/ui";
import { formatDataExibicao } from "@/features/rodadas/format";
import { STATUS_PARTICIPACAO_LABEL } from "@/features/rodadas/statusParticipacao";
import { formatDataHora, truncateId } from "./format";
import type { LogAuditoriaItem, TipoEventoAuditoria } from "./types";
import type { LookupMaps } from "./enrichment";

/**
 * Monta o modelo de exibição de uma entrada do log (T08) a partir do dado
 * cru de `LogAuditoriaItem` — TASK.md FE-08/`UX-SPEC.md` Seção 2.
 *
 * Lógica pura, testável isoladamente sem montar nenhum componente (mesmo
 * racional de `format.ts` das demais features) — `LogAuditoriaEntry.tsx`
 * só renderiza o resultado, sem interpretar `valores_antes`/`valores_depois`
 * ela mesma.
 *
 * NUNCA lê/expõe nenhum campo de autor — `LogAuditoriaItem` não tem essa
 * coluna (RN-12/GUARDRAILS.md regra 18) e nenhuma função abaixo inventa um
 * placeholder para preenchê-la.
 */

export interface LogAuditoriaEntryViewModel {
  id: string;
  ocorridoEm: string;
  titulo: string;
  subtitulo?: string;
  diffItems: DiffViewerItem[];
  resumoLinhas: string[];
}

const TIPO_EVENTO_LABEL: Record<TipoEventoAuditoria, string> = {
  correcao: "correção",
  // RF-04.1/wireframe T08 chamam o evento de exclusão de rodada de
  // "exclusão" na UI, embora `tipo_evento` grave o valor interno "estorno"
  // (o que de fato acontece: reversão/estorno de 100% dos pontos) — mesmo
  // texto literal do wireframe da Seção 2 do `UX-SPEC.md`.
  estorno: "exclusão",
  anonimizacao: "anonimização",
};

const RODADA_STATUS_LABEL: Record<string, string> = {
  lancada: "Lançada",
  excluida: "Excluída",
};

/** Rótulos amigáveis para os campos redigidos de `ATLETA` (ADR-011). */
const CAMPO_ANONIMIZADO_LABEL: Record<string, string> = {
  nome_completo: "Nome completo",
  apelido_exibicao: "Apelido de exibição",
  contato: "Contato",
  data_nascimento: "Data de nascimento",
};

const EVENTO_LABEL: Record<"gol" | "cartao_amarelo" | "cartao_vermelho", string> = {
  gol: "Gols",
  cartao_amarelo: "Cartões amarelos",
  cartao_vermelho: "Cartões vermelhos",
};
const TIPOS_EVENTO: Array<"gol" | "cartao_amarelo" | "cartao_vermelho"> = [
  "gol",
  "cartao_amarelo",
  "cartao_vermelho",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asEventoContagem(value: unknown): Record<string, number> {
  const contagem: Record<string, number> = {
    gol: 0,
    cartao_amarelo: 0,
    cartao_vermelho: 0,
  };
  if (!Array.isArray(value)) return contagem;
  for (const item of value) {
    if (
      isRecord(item) &&
      (item.tipo === "gol" ||
        item.tipo === "cartao_amarelo" ||
        item.tipo === "cartao_vermelho") &&
      typeof item.quantidade === "number"
    ) {
      contagem[item.tipo] = item.quantidade;
    }
  }
  return contagem;
}

function labelRodada(rodadaId: string, lookup: Map<string, string>): string {
  const data = lookup.get(rodadaId);
  return data ? formatDataExibicao(data) : `#${truncateId(rodadaId)}`;
}

function labelAtleta(atletaId: string, lookup: Map<string, string>): string {
  return lookup.get(atletaId) ?? `Atleta #${truncateId(atletaId)}`;
}

/**
 * Diff de uma correção de campo único (`tipo_evento: "correcao"`) — mesmo
 * recorte de `montarDiffItems` em `ParticipacaoCorrecaoRow.tsx`/FE-07 (só os
 * campos de fato alterados): presença, cada tipo de evento e pontos
 * acumulados.
 */
function montarDiffCorrecao(antes: unknown, depois: unknown): DiffViewerItem[] {
  const items: DiffViewerItem[] = [];
  if (!isRecord(antes) || !isRecord(depois)) return items;

  const statusAntes = asString(antes.status);
  const statusDepois = asString(depois.status);
  if (statusAntes && statusDepois && statusAntes !== statusDepois) {
    items.push({
      label: "Presença",
      before:
        STATUS_PARTICIPACAO_LABEL[
          statusAntes as keyof typeof STATUS_PARTICIPACAO_LABEL
        ] ?? statusAntes,
      after:
        STATUS_PARTICIPACAO_LABEL[
          statusDepois as keyof typeof STATUS_PARTICIPACAO_LABEL
        ] ?? statusDepois,
    });
  }

  const eventosAntes = asEventoContagem(antes.eventos);
  const eventosDepois = asEventoContagem(depois.eventos);
  for (const tipo of TIPOS_EVENTO) {
    if (eventosAntes[tipo] !== eventosDepois[tipo]) {
      items.push({
        label: EVENTO_LABEL[tipo],
        before: String(eventosAntes[tipo]),
        after: String(eventosDepois[tipo]),
      });
    }
  }

  const pontosAntes = asNumber(antes.pontos_acumulados);
  const pontosDepois = asNumber(depois.pontos_acumulados);
  if (
    pontosAntes !== undefined &&
    pontosDepois !== undefined &&
    pontosAntes !== pontosDepois
  ) {
    items.push({
      label: "Pontos acumulados",
      before: String(pontosAntes),
      after: String(pontosDepois),
    });
  }

  return items;
}

function formatAjuste(delta: number): string {
  const sinal = delta >= 0 ? "+" : "";
  return `Ajuste aplicado: ${sinal}${delta} pts`;
}

function montarResumoCorrecao(depois: unknown): string[] {
  if (!isRecord(depois)) return [];
  const ajuste = asNumber(depois.ajuste_aplicado);
  return ajuste !== undefined ? [formatAjuste(ajuste)] : [];
}

/** Diff de uma exclusão de rodada (`tipo_evento: "estorno"`) — só o status da rodada muda de forma comparável. */
function montarDiffEstorno(antes: unknown, depois: unknown): DiffViewerItem[] {
  const items: DiffViewerItem[] = [];
  if (!isRecord(antes) || !isRecord(depois)) return items;
  const statusAntes = asString(antes.status);
  const statusDepois = asString(depois.status);
  if (statusAntes && statusDepois && statusAntes !== statusDepois) {
    items.push({
      label: "Status da rodada",
      before: RODADA_STATUS_LABEL[statusAntes] ?? statusAntes,
      after: RODADA_STATUS_LABEL[statusDepois] ?? statusDepois,
    });
  }
  return items;
}

function pluralAtletasAfetados(n: number): string {
  return n === 1 ? "1 atleta afetado" : `${n} atletas afetados`;
}

/**
 * Resumo textual de uma exclusão (RF-04.3) — "(20 atletas afetados)",
 * literal do wireframe da Seção 2 do `UX-SPEC.md`, mais o total revertido
 * quando `pontos_revertidos` vem como um número simples no payload (o
 * contrato não fixa formalmente esse formato — `substituicoes_vinculadas`
 * fica de fora do resumo primário, campo só informativo por natureza,
 * RF-06.3).
 */
function montarResumoEstorno(depois: unknown): string[] {
  if (!isRecord(depois)) return [];
  const linhas: string[] = [];
  const atletasAfetados = asNumber(depois.atletas_afetados);
  if (atletasAfetados !== undefined) {
    linhas.push(`(${pluralAtletasAfetados(atletasAfetados)})`);
  }
  const pontosRevertidos = asNumber(depois.pontos_revertidos);
  if (pontosRevertidos !== undefined) {
    linhas.push(`Total revertido: ${pontosRevertidos} pts`);
  }
  return linhas;
}

function formatValorAnonimizado(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "—";
}

/**
 * Diff de uma anonimização (`tipo_evento: "anonimizacao"`, ADR-011) — só
 * monta uma linha para uma chave se `valores_antes[chave]` for
 * EXATAMENTE o marcador redigido `"[REDACTED]"` (GUARDRAILS.md regra 20,
 * TASK.md Seção 1.5: "log de auditoria de anonimização grava apenas
 * marcadores redigidos em `valores_antes`"). Defesa em profundidade
 * deliberada, além da garantia já existente no Backend: o valor de "antes"
 * exibido é sempre o literal fixo "Dado redigido", nunca
 * `valores_antes[chave]` — mesmo que o Backend um dia tivesse um bug que
 * gravasse o dado pessoal real ali, esta tela jamais o renderizaria (modo de
 * falha "fechado", mesmo racional de ADR-005). O "depois" mostra o
 * placeholder já seguro devolvido pela própria anonimização (ex.: "Atleta
 * anonimizado", "Atleta #a1b2c3d4"), nunca dado sensível.
 */
function montarDiffAnonimizacao(antes: unknown, depois: unknown): DiffViewerItem[] {
  if (!isRecord(antes)) return [];
  const depoisRecord = isRecord(depois) ? depois : {};
  const items: DiffViewerItem[] = [];
  for (const chave of Object.keys(antes)) {
    if (antes[chave] !== "[REDACTED]") continue;
    items.push({
      label: CAMPO_ANONIMIZADO_LABEL[chave] ?? chave,
      before: "Dado redigido",
      after: formatValorAnonimizado(depoisRecord[chave]),
    });
  }
  return items;
}

export function buildEntryViewModel(
  item: LogAuditoriaItem,
  lookups: LookupMaps,
): LogAuditoriaEntryViewModel {
  const ocorridoEm = formatDataHora(item.ocorrido_em);
  const tipoLabel = TIPO_EVENTO_LABEL[item.tipo_evento];

  if (item.tipo_evento === "correcao") {
    const rodadaLabel = item.rodada_id
      ? labelRodada(item.rodada_id, lookups.rodadaData)
      : "rodada não identificada";
    const atletaLabel = item.atleta_id
      ? labelAtleta(item.atleta_id, lookups.atletaNome)
      : "atleta não identificado";
    return {
      id: item.id,
      ocorridoEm,
      titulo: `Rodada ${rodadaLabel} — ${tipoLabel}`,
      subtitulo: `Atleta: ${atletaLabel}`,
      diffItems: montarDiffCorrecao(item.valores_antes, item.valores_depois),
      resumoLinhas: montarResumoCorrecao(item.valores_depois),
    };
  }

  if (item.tipo_evento === "estorno") {
    const rodadaLabel = item.rodada_id
      ? labelRodada(item.rodada_id, lookups.rodadaData)
      : "rodada não identificada";
    return {
      id: item.id,
      ocorridoEm,
      titulo: `Rodada ${rodadaLabel} — ${tipoLabel}`,
      diffItems: montarDiffEstorno(item.valores_antes, item.valores_depois),
      resumoLinhas: montarResumoEstorno(item.valores_depois),
    };
  }

  // anonimizacao
  const atletaLabel = item.atleta_id
    ? labelAtleta(item.atleta_id, lookups.atletaNome)
    : "atleta não identificado";
  return {
    id: item.id,
    ocorridoEm,
    titulo: `Anonimização de atleta`,
    subtitulo: `Atleta: ${atletaLabel}`,
    diffItems: montarDiffAnonimizacao(item.valores_antes, item.valores_depois),
    resumoLinhas: [],
  };
}
