import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

// RNF-08 / WCAG 3.1.1 — idioma da página declarado em todo o documento.
export const metadata: Metadata = {
  title: "Turma do Rola - Comary",
  description: "Sistema de ranking do Turma do Rola - Comary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
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
