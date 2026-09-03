/**
 * Tipos do Ranking Público (T02) — espelham `RankingPublicoItem` de
 * `API-CONTRACT.yaml` (view `app.ranking_publico`, BE-03). Lista de campos
 * idêntica ao contrato: nunca inclui `contato`/`data_nascimento` (RN-01/
 * ADR-005) — nem como campo opcional, para que seja impossível referenciar
 * esses campos em qualquer parte deste módulo sem erro de tipo.
 *
 * Nota rastreável (BLOCKERS.md, BLOCKER-004 — não decidido silenciosamente
 * aqui): `PRD-TECNICO.md` RF-03.1/`UX-SPEC.md` Seção 2 (prosa) mencionam
 * também "número de ausências", mas o wireframe da própria Seção 2, a
 * Seção 6.2 (colunas de T02 em `lg`, citada no critério de aceite de FE-02)
 * e este contrato de dado real (BE-03) concordam em não incluir esse campo —
 * não há como derivá-lo no cliente sem um total de rodadas por atleta, que
 * também não está exposto. Nenhum campo `ausencias` foi inventado aqui;
 * aguardando confirmação do `ux-ui` (ver BLOCKER-004).
 */
export interface RankingPublicoItem {
  atleta_id: string;
  nome_exibicao: string;
  pontuacao_acumulada: number;
  presencas: number;
  cartoes: number;
}
