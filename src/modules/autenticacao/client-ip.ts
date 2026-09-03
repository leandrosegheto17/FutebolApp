/**
 * Extração do IP do cliente para o rate limiting de login (BE-04, RNF-03).
 *
 * Decisão de detalhe documentada (não escalada): Next.js 14 removeu
 * `NextRequest.ip` (dependia de integração específica da Vercel); a forma
 * portátil e independente de plataforma é ler o cabeçalho `x-forwarded-for`
 * (padrão em qualquer proxy reverso, incluindo a borda da Vercel — SDD.md
 * Secao 7.3) e, na ausência dele, `x-real-ip`. Sem nenhum dos dois (ex.:
 * `next dev` local sem proxy na frente), cai em `"unknown"` — um valor
 * fixo faz todas as tentativas locais sem proxy compartilharem o mesmo
 * "IP" para fins de rate limiting, o que é aceitável em desenvolvimento
 * local (nunca é o caminho de produção, onde a Vercel sempre popula
 * `x-forwarded-for`).
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    const trimmed = firstIp?.trim();
    if (trimmed) return trimmed;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}
