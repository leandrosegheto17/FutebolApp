"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/ui";
import { RankingList } from "./RankingList";
import { PresencaMensal } from "@/features/presenca-mensal/PresencaMensal";
import styles from "./PublicHomeShell.module.css";

/**
 * Shell da Área Pública (UX-SPEC.md Seção 1.2 — site map: T02 <-> T03
 * compartilham o mesmo par de abas "Ranking"/"Presença Mensal"; Seção 2,
 * wireframes de T02/T03).
 *
 * A aba "Ranking" (`RankingList`) é conteúdo de `FE-02`; a aba "Presença
 * Mensal" (`PresencaMensal`) é conteúdo de `FE-03` — tarefas separadas no
 * TASK.md, mesma dependência (`BE-03`), que puderam rodar em paralelo
 * (Seção 4.2: "FE-02/FE-03 (público) podem rodar em paralelo... não têm
 * nenhuma dependência de autenticação"), ambas já concluídas nesta versão.
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
              panel: <PresencaMensal />,
            },
          ]}
        />
      </div>

      <footer className={styles.footer}>
        {/* Link discreto de acesso interno (RF-07.2/UX-SPEC.md Seção 1.2) —
            aponta para T01 (FE-01, já Concluída). */}
        <Link href="/login" className={styles.loginLink}>
          Acesso interno
        </Link>
      </footer>
    </main>
  );
}
