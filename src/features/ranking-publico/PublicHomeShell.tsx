"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, Tabs } from "@/components/ui";
import { RankingList } from "./RankingList";
import styles from "./PublicHomeShell.module.css";

/**
 * Shell da Área Pública (UX-SPEC.md Seção 1.2 — site map: T02 <-> T03
 * compartilham o mesmo par de abas "Ranking"/"Presença Mensal"; Seção 2,
 * wireframes de T02/T03).
 *
 * Esta tarefa (`FE-02`) implementa só o conteúdo da aba "Ranking"
 * (`RankingList`). A aba "Presença Mensal" é conteúdo de `FE-03` — tarefa
 * separada no TASK.md, mesma dependência (`BE-03`), pode rodar em paralelo
 * (Seção 4.2: "FE-02/FE-03 (público) podem rodar em paralelo... não têm
 * nenhuma dependência de autenticação"). Renderizar aqui um placeholder
 * honesto (em vez de omitir a aba) preserva o layout final de duas abas já
 * confirmado pelo UX-SPEC.md sem antecipar/decidir sozinho o conteúdo real
 * de T03, que não é escopo desta tarefa.
 */
export function PublicHomeShell() {
  const [tab, setTab] = useState<string>("ranking");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>Turma do Rola - Comary</p>
      </header>

      <div className={styles.content}>
        <Tabs
          label="Navegação pública"
          value={tab}
          onChange={setTab}
          items={[
            { value: "ranking", label: "Ranking", panel: <RankingList /> },
            {
              value: "presenca",
              label: "Presença Mensal",
              panel: (
                <EmptyState
                  title="Presença mensal em breve"
                  description="Esta visão ainda está em desenvolvimento (FE-03)."
                />
              ),
            },
          ]}
        />
      </div>

      <footer className={styles.footer}>
        {/* Link discreto de acesso interno (RF-07.2/UX-SPEC.md Seção 1.2) —
            aponta para T01 (FE-01, ainda não implementada nesta tarefa). */}
        <Link href="/login" className={styles.loginLink}>
          Acesso interno
        </Link>
      </footer>
    </main>
  );
}
