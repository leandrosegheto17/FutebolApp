import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/login/LoginForm";

// T01 é o gate de entrada da área interna (UX-SPEC.md Seção 1.1) — título
// próprio, herda o restante de `app/layout.tsx` (lang="pt-BR", ToastProvider).
export const metadata: Metadata = {
  title: "Acesso interno — Turma do Rola - Comary",
};

/**
 * `/login` — T01 Login (TASK.md FE-01). `LoginForm` usa `useSearchParams`
 * (parâmetro `redirect`, ver `redirectTarget.ts`) — exige um limite
 * `Suspense` no App Router para não forçar a página inteira a desistir de
 * geração estática; `fallback={null}` é aceitável aqui porque o formulário
 * é praticamente instantâneo para hidratar (sem fetch de dados no
 * carregamento inicial, só no submit).
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
