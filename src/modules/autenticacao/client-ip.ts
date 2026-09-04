/**
 * Extração do IP do cliente para o rate limiting de login (BE-04, RNF-03).
 *
 * Decisão de detalhe documentada (não escalada): Next.js 14 removeu
 * `NextRequest.ip` (dependia de integração específica da Vercel); a forma
 * portátil e independente de plataforma é ler cabeçalhos de proxy reverso
 * populados na borda (SDD.md Secao 7.3), na ordem de preferência abaixo, e
 * cair em `"unknown"` se nenhum estiver presente — um valor fixo faz todas
 * as tentativas locais sem proxy (`next dev`) compartilharem o mesmo "IP"
 * para fins de rate limiting, o que é aceitável em desenvolvimento local
 * (nunca é o caminho de produção).
 *
 * Ordem de preferência (DEBT-06, SECURITY-REVIEW.md Secao 12, resolvido —
 * ver nota de resolução na própria entrada):
 *   1. `x-vercel-forwarded-for` — segundo a documentação da Vercel
 *      (vercel.com/docs/headers/request-headers), é "idêntico a
 *      x-forwarded-for, porém não é sobrescrito caso você use um proxy em
 *      cima da Vercel" — mais resistente a spoofing se a topologia de rede
 *      mudar no futuro (CDN/WAF adicional na frente da Vercel).
 *   2. `x-forwarded-for` (primeiro valor da lista) — padrão em qualquer
 *      proxy reverso, incluindo a borda da Vercel hoje.
 *   3. `x-real-ip` — último recurso.
 *
 * ATENÇÃO — dependência de infraestrutura, não validada por este código:
 * esta proteção (e, por extensão, o rate limiting de login de `BE-04`)
 * assume que a plataforma de deploy SEMPRE sobrescreve esses cabeçalhos com
 * o IP real de conexão e nunca repassa um valor forjado pelo próprio
 * cliente. Isso é válido hoje na Vercel (confirmado contra a documentação
 * oficial, ver SECURITY-REVIEW.md DEBT-06) — mas se este projeto for
 * hospedado atrás de outro proxy/CDN adicional ou self-hosted sem um proxy
 * confiável equivalente na frente, o rate limiting de login fica vulnerável
 * a bypass por spoofing de cabeçalho (um cliente poderia enviar um
 * `x-forwarded-for` diferente a cada tentativa e nunca acumular um "streak"
 * de falhas). Reavaliar sempre que a topologia de rede de deploy mudar.
 */
export function getClientIp(request: Request): string {
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor?.trim()) return vercelForwardedFor.trim();

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
