import type { Metadata } from "next";
import { Bebas_Neue, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

// RNF-08 / WCAG 3.1.1 — idioma da página declarado em todo o documento.
export const metadata: Metadata = {
  title: "Turma do Rola - Comary",
  description: "Sistema de ranking do Turma do Rola - Comary",
};

/**
 * `next/font/google` — self-host das 3 fontes do redesenho visual em tempo
 * de build (ADR-012/FE-R00). Nenhuma requisição a `fonts.googleapis.com`/
 * `fonts.gstatic.com` acontece no navegador em produção — a CSP vigente
 * (`vercel.json`, `font-src 'self'`) não precisa de nenhuma alteração.
 *
 * Cada fonte expõe uma CSS custom property (`variable`) aplicada na tag
 * `<html>` abaixo; `src/design-system/tokens.css` referencia essas
 * variáveis em `--font-family-base`/`-display`/`-mono` — nenhum componente
 * individual importa `next/font` diretamente (fonte única de verdade
 * continua sendo `tokens.css`, Guardrail 31).
 */
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

// Bebas Neue só existe em peso 400 no catálogo do Google Fonts — confirmado
// diretamente no manifesto de fontes do `next/font/google` nesta tarefa
// (checagem obrigatória de ADR-012 antes de concluir FE-R00). É também o
// único peso usado pelo mockup real para esta fonte.
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${publicSans.variable} ${bebasNeue.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* ToastProvider no topo da árvore — UX-SPEC.md Seção 3.2 exige
            Toast disponível em "todas as telas com ação de escrita"; cada
            tela (FE-01…FE-12) só precisa chamar `useToast()`, nunca
            reimplementar o provider. */}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
