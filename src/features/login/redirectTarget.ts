import { ROUTES } from "@/lib/routes";

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
 * 1.0): só aceita caminho relativo de mesma origem (`/algo`), nunca um
 * protocolo absoluto/relativo (`https://...`, `//host`, vetor clássico de
 * open redirect), e nunca aponta de volta para o próprio login.
 */
export function getSafeRedirectTarget(rawParam: string | null | undefined): string {
  if (!rawParam) {
    return ROUTES.lancamentoRodada;
  }

  const isSingleSlashRelativePath =
    rawParam.startsWith("/") && !rawParam.startsWith("//");
  const hasNoEmbeddedProtocol = !rawParam.includes("://");

  if (!isSingleSlashRelativePath || !hasNoEmbeddedProtocol || rawParam === ROUTES.login) {
    return ROUTES.lancamentoRodada;
  }

  return rawParam;
}
