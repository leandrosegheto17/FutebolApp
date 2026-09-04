/**
 * Monta o payload de resposta da API de Atletas (BE-06) a partir da linha de
 * `app.atleta` + o nível técnico derivado (RN-03, `app.atleta_nivel_tecnico`).
 * Função pura, separada da orquestração de I/O dos Route Handlers — mesmo
 * racional de `validation.ts`/`repository.ts` (testável sem banco).
 *
 * `nivel_tecnico`/`rodadas_presentes` nunca vêm do formulário (RF-01.4 —
 * "nunca como campo de entrada manual") — só aparecem aqui, no lado de
 * leitura, sempre calculados por `app.atleta_nivel_tecnico`.
 */
import type { AtletaRow, NivelTecnicoRow } from "./repository";

export type AtletaResponse = {
  id: string;
  nome_completo: string;
  apelido_exibicao: string;
  contato: string | null;
  data_nascimento: string | null;
  consentimento_responsavel_obtido: boolean;
  pontuacao_inicial: number;
  ativo: boolean;
  anonimizado_em: string | null;
  criado_em: string;
  nivel_tecnico: number;
  rodadas_presentes: number;
};

export function paraAtletaResponse(
  atleta: AtletaRow,
  nivelTecnico: NivelTecnicoRow | undefined,
): AtletaResponse {
  return {
    id: atleta.id,
    nome_completo: atleta.nome_completo,
    apelido_exibicao: atleta.apelido_exibicao,
    contato: atleta.contato,
    data_nascimento: atleta.data_nascimento,
    consentimento_responsavel_obtido: atleta.consentimento_responsavel_obtido,
    pontuacao_inicial: atleta.pontuacao_inicial,
    ativo: atleta.ativo,
    anonimizado_em: atleta.anonimizado_em,
    criado_em: atleta.criado_em,
    // Fallback defensivo (nunca deveria faltar — `app.atleta_nivel_tecnico`
    // tem um LEFT JOIN a partir de `app.atleta`, então toda linha de atleta
    // tem uma linha correspondente): se por algum motivo a busca do nível
    // técnico não encontrar a linha, cai para `pontuacao_inicial`, o mesmo
    // fallback que a própria view aplica para atleta sem presença (RN-03).
    nivel_tecnico: nivelTecnico?.nivel_tecnico ?? atleta.pontuacao_inicial,
    rodadas_presentes: nivelTecnico?.rodadas_presentes ?? 0,
  };
}
