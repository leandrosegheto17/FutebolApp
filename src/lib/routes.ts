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
 */
export const ROUTES = {
  rankingPublico: "/",
  login: "/login",
  lancamentoRodada: "/rodadas/nova",
} as const;
