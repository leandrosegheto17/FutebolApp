"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandCrest, Tabs } from "@/components/ui";
import { RankingList } from "./RankingList";
import { PresencaMensal } from "@/features/presenca-mensal/PresencaMensal";
import styles from "./PublicHomeShell.module.css";

/**
 * Shell da Área Pública (UX-SPEC.md Parte II Seção 2.2/2.3/3.2 — `FE-R02`).
 *
 * **Hero navy→verde + `BrandCrest`/pill dourado** (redesenho desta tarefa):
 * o "TopNav completo" descrito no wireframe desktop de T02 ("Ranking" /
 * "Presença mensal" / botão "Acesso interno" em pill dourado-sobre-navy) é
 * implementado aqui como uma faixa navy única contendo marca + o botão pill
 * — decisão de detalhe documentada (não escalada): as abas "Ranking"/
 * "Presença mensal" permanecem o componente `Tabs` já existente, sem
 * duplicar um segundo controle de navegação com o mesmo propósito dentro da
 * faixa navy (o que criaria uma "variação paralela" do mesmo controle,
 * Guardrail 31) — o próprio UX-SPEC.md confirma "Tabs... mesma semântica
 * ARIA da Parte I — sem mudança", então o componente não muda de lugar nem
 * de implementação, só de vizinhança visual (segue logo abaixo do hero).
 *
 * O botão pill "Acesso interno" só aparece dentro do hero a partir de `lg`
 * (Seção 2.2: "Desktop (lg):... botão 'Acesso interno' em pill dourado");
 * em `base`/`sm`, o único acesso é o link discreto do rodapé (já existente),
 * exatamente como o wireframe mobile registra ("Acesso interno no rodapé").
 */
export function PublicHomeShell() {
  const [tab, setTab] = useState<string>("ranking");

  return (
    <div className={styles.page}>
      {/* `<header>`/`<footer>` como IRMÃOS de `<main>`, nunca descendentes
          dele — landmark "banner"/"contentinfo" tem que ser top-level
          (WCAG/axe `landmark-banner-is-top-level`; `<header>` dentro de
          `<main>` reprovaria essa regra, achado desta própria tarefa
          durante o `accessibility-review`). */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroTopRow}>
            <a href="/" className={styles.heroBrand}>
              {/* `decorative` — o texto ao lado já identifica a marca por
                  extenso (mesmo padrão de `AppNav`, FE-R00). */}
              <BrandCrest size="compact" decorative className={styles.heroCrest} />
              Turma do Rola — Comary
            </a>
            <Link href="/login" className={styles.accessPill}>
              Acesso interno
            </Link>
          </div>
          <p className={styles.kicker}>Temporada 2026</p>
          <h1 className={styles.title}>Classificação Geral · Ranking</h1>
        </div>
      </header>

      <main className={styles.content}>
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
      </main>

      <footer className={styles.footer}>
        {/* Link discreto de acesso interno (RF-07.2/UX-SPEC.md Seção 1.2) —
            aponta para T01 (FE-01, já Concluída). Mantido em todo breakpoint,
            mesmo quando o pill do hero já está visível em `lg` — nunca a
            única forma de acesso some de um breakpoint para outro. */}
        <Link href="/login" className={styles.loginLink}>
          Acesso interno
        </Link>
      </footer>
    </div>
  );
}
