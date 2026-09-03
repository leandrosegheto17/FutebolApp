/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // BE-04 (ADR-004): `@node-rs/argon2` publica um binário nativo pré-compilado
  // (`.node`) por plataforma — sem esta lista, o webpack do Next.js 14.2 tenta
  // empacotar o binário como se fosse um módulo JS comum e falha no build
  // ("Module parse failed: Unexpected character"). `serverComponentsExternalPackages`
  // instrui o bundler a manter o pacote como `require()` externo em tempo de
  // execução (Node.js runtime), nunca dentro do bundle do servidor — mesmo
  // efeito de `serverExternalPackages` (nome usado a partir do Next.js 15,
  // ainda não a versão deste projeto, ADR-003/BE-01). Não afeta o bundle do
  // navegador: `password.ts` só é importado por Route Handlers (Node.js
  // runtime), nunca por `middleware.ts` (Edge) nem por código client-side.
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2"],
  },
};

export default nextConfig;
