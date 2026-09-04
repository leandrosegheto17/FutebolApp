import { ROUTES } from "@/lib/routes";

/**
 * Origem de referência (sentinela, não é uma URL real de nenhum ambiente)
 * usada só para resolver `rawParam` via `new URL()` e detectar se o
 * navegador o interpretaria como apontando para fora do próprio app —
 * mesma técnica usada internamente pelo `next/navigation` (App Router) para
 * decidir se uma navegação é interna ou externa. O valor em si é opaco e
 * arbitrário; o que importa é comparar a origem resolvida antes/depois.
 */
const INTERNAL_ORIGIN_SENTINEL = "http://origem-interna.invalid";

/**
 * Resolve o destino pós-login (TASK.md FE-01: "redireciona à última tela
 * interna ou T05 por padrão após sucesso").
 *
 * "Última tela interna acessada" é transportada via querystring
 * (`/login?redirect=/caminho`) — mecanismo consumido por esta tarefa e
 * alimentado por tarefas futuras (FE-12, sessão expirada em ação de
 * escrita: "retornando à tela de origem após novo login bem-sucedido",
 * UX-SPEC.md Seção 1.3). Nenhuma outra tela interna existe ainda nesta
 * trilha de execução (T05/FE-05 não implementada) — o destino padrão abaixo
 * é o único caminho exercitado na prática até lá.
 *
 * Validação defensiva (não é requisito literal do UX-SPEC.md, decorre do
 * princípio geral de nunca confiar em input do usuário — TASK.md Seção
 * 1.0): só aceita caminho relativo de mesma origem (`/algo`), nunca aponta
 * de volta para o próprio login, e nunca resolve para uma origem diferente
 * da interna.
 *
 * Correção de QA (BUG-QA-FE01-01, severidade Alta): a validação anterior
 * checava apenas prefixos ad-hoc (`startsWith("/")`/`!startsWith("//")`/
 * `!includes("://")`), o que rejeitava os vetores clássicos (`https://...`,
 * `//host`) mas deixava passar `/\evil.example.com` — uma única barra
 * invertida logo após a barra inicial. O `next/navigation` do App Router
 * resolve o `href` via `new URL(href, location.href)` antes de decidir se a
 * navegação é interna ou externa; por especificação WHATWG URL, para
 * esquemas especiais (`http`/`https`) uma barra invertida é tratada como
 * equivalente a uma barra normal durante o parsing, então esse valor
 * resolvia para uma origem externa e o `router.replace(target)` do
 * `LoginForm.tsx` executava, na prática, uma navegação de página inteira
 * para fora do domínio. A correção resolve `rawParam` da mesma forma que o
 * próprio Next.js resolve (`new URL`) e compara a origem resultante, em vez
 * de tentar prever todo vetor de prefixo manualmente — cobre o vetor de
 * barra invertida (e qualquer outro que dependa de como o parser de URL
 * normaliza o valor) sem depender de uma lista fechada de prefixos
 * proibidos.
 */
export function getSafeRedirectTarget(rawParam: string | null | undefined): string {
  if (!rawParam) {
    return ROUTES.lancamentoRodada;
  }

  const isSingleSlashRelativePath =
    rawParam.startsWith("/") && !rawParam.startsWith("//");

  if (!isSingleSlashRelativePath || rawParam === ROUTES.login) {
    return ROUTES.lancamentoRodada;
  }

  let resolved: URL;
  try {
    resolved = new URL(rawParam, INTERNAL_ORIGIN_SENTINEL);
  } catch {
    return ROUTES.lancamentoRodada;
  }

  if (resolved.origin !== INTERNAL_ORIGIN_SENTINEL) {
    return ROUTES.lancamentoRodada;
  }

  return rawParam;
}
