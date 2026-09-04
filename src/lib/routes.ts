/**
 * Nomes de rota internos compartilhados entre tarefas de Frontend — fonte
 * única para evitar caminhos de URL duplicados/divergentes entre telas (ex.:
 * FE-01 precisa saber para onde redirecionar após login bem-sucedido, mesmo
 * antes de a tela de destino existir).
 *
 * `lancamentoRodada` (T05) é uma decisão de detalhe do Frontend (TASK.md
 * Seção 1.0/6 — "lacuna de detalhe decide, lacuna estrutural escala"): nem
 * `UX-SPEC.md` nem `TASK.md` definem uma convenção de URL para as telas
 * internas, e a própria tela (FE-05) ainda não foi implementada nesta
 * trilha de execução. Se FE-05 publicar uma rota diferente, este valor deve
 * ser atualizado aqui (ponto único de mudança), não em cada consumidor
 * (hoje: só FE-01/`redirectTarget.ts`; no futuro, também FE-12).
 *
 * `atletas`/`novoAtleta`/`historico`/`times`/`restricoes` — adicionadas por
 * FE-04 (T04, primeira tela interna real desta trilha de execução), que
 * também monta `app/(interno)/layout.tsx`/`InternalShell` (nav fixa de 5
 * destinos, UX-SPEC.md Seção 1.2) — decisão de detalhe antecipada pela
 * própria FE-12 ("só a primeira tela interna real tem contexto para
 * decidir isso"), consistente com os exemplos de caminho já usados nos
 * testes de FE-00 (`AppNav.test.tsx`) e FE-12
 * (`useHandleSessionExpired.test.ts`, `pathname = "/historico"`/
 * `"/atletas/novo"`). `historico`/`times`/`restricoes` apontam para rotas
 * que `T06`/`T09`/`T10` (FE-06/FE-09/FE-10, ainda não implementadas nesta
 * trilha) vão criar depois — mesmo padrão já aceito por `lancamentoRodada`
 * acima (rota definida antes da tela existir), ponto único a ajustar se
 * essas tarefas publicarem um caminho diferente.
 *
 * `logAuditoria`/`corrigirRodada` — adicionadas por FE-06 (T06, Histórico de
 * Rodadas), que também é quem primeiro navega para T07/T08 (menu "⋮" de cada
 * rodada da lista → "Corrigir"; link permanente de rodapé → "Ver log de
 * auditoria") sem que essas telas existam ainda nesta trilha de execução —
 * mesmo padrão de "rota reservada antes da tela existir" já usado acima.
 * `corrigirRodada` é uma função (não uma string estática) porque T07 é uma
 * tela de detalhe por rodada (`/rodadas/{id}/corrigir`), sob o mesmo prefixo
 * `/rodadas` já usado por `lancamentoRodada`; ponto único a ajustar se FE-07/
 * FE-08 publicarem um caminho diferente.
 */
export const ROUTES = {
  rankingPublico: "/",
  login: "/login",
  lancamentoRodada: "/rodadas/nova",
  atletas: "/atletas",
  novoAtleta: "/atletas/novo",
  historico: "/historico",
  times: "/times",
  restricoes: "/restricoes",
  logAuditoria: "/historico/auditoria",
  corrigirRodada: (id: string) => `/rodadas/${id}/corrigir`,
} as const;
