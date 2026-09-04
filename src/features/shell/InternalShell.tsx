"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppNav, type NavItem } from "@/components/ui";
import { SessionExpiryStatus } from "@/features/sessao";
import { ROUTES } from "@/lib/routes";
import styles from "./InternalShell.module.css";

const NAV_DESTINATIONS: { href: string; label: string }[] = [
  { href: ROUTES.atletas, label: "Atletas" },
  { href: ROUTES.lancamentoRodada, label: "Rodada" },
  { href: ROUTES.historico, label: "Histórico" },
  { href: ROUTES.times, label: "Times" },
  { href: ROUTES.restricoes, label: "Restrições" },
];

/**
 * Casca da área interna (UX-SPEC.md Seção 1.2/3.2/6.2) — `BottomTabBar`
 * (mobile) / `TopNav` (desktop) com os 5 destinos de primeiro nível +
 * logout, mais `SessionExpiryStatus` (FE-12) montado **uma única vez**
 * aqui, nunca por tela individual (evita timers duplicados,
 * GUARDRAILS.md regra 31).
 *
 * Construída por FE-04 (T04) — primeira tela interna real desta trilha de
 * execução, decisão já antecipada explicitamente pela própria FE-12
 * ("só a primeira tela interna real tem contexto para decidir nome de
 * rota/agrupamento de arquivos"). `Rodada`/`Histórico`/`Times`/`Restrições`
 * apontam para rotas que `T05`/`T06`/`T09`/`T10` ainda vão criar (mesmo
 * padrão já aceito por `ROUTES.lancamentoRodada`, definido por FE-01 antes
 * de a tela existir) — decisão de detalhe, não escalada.
 */
export function InternalShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const items: NavItem[] = NAV_DESTINATIONS.map(({ href, label }) => ({
    href,
    label,
    active: pathname === href || Boolean(pathname?.startsWith(`${href}/`)),
  }));

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Melhor esforço — mesmo se a chamada de rede falhar, redireciona
      // para o login de qualquer forma (TASK.md Seção 1.0, decisão
      // documentada): o requisito funcional mínimo de "Sair" é devolver o
      // usuário à tela de entrada, não garantir que o cookie foi limpo no
      // servidor (o próprio endpoint de logout já é idempotente/tolerante
      // a sessão inválida, ver `app/api/auth/logout/route.ts`).
    }
    router.replace(ROUTES.login);
  }

  return (
    <div className={styles.shell}>
      <SessionExpiryStatus />
      <AppNav items={items} onLogout={handleLogout} brand="Turma do Rola" />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
