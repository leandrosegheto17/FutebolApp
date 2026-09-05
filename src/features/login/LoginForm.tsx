"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertBanner, BrandCrest, Button, PasswordInput } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { login, LoginError } from "./loginApi";
import { LOGIN_TECHNICAL_ERROR_MESSAGE } from "./constants";
import { getSafeRedirectTarget } from "./redirectTarget";
import styles from "./LoginForm.module.css";

/**
 * T01 — Login (senha única) — UX-SPEC.md Parte II Seção 2.1 (delta visual,
 * "corrigido na revisão 2")/5.3-5.4 (contraste); TASK.md FE-R01 (reestimativa
 * de FE-01).
 *
 * **Redesenho desta tarefa (FE-R01, puramente visual)**: hero navy
 * full-bleed (radial gradient com leve tingimento `--color-primary` no topo,
 * UX-SPEC.md Seção 2.1) + cartão branco central com `BrandCrest` grande +
 * título real "Acesso interno" (não o wordmark "Turma do Rola" — essa
 * correção da revisão 2 do UX-SPEC.md já estava refletida no texto anterior,
 * só a composição visual muda agora) + link de retorno fora do cartão, sobre
 * o navy, com contraste corrigido (branco sublinhado, 15,29:1 — UX-SPEC.md
 * Seção 5.4 — nunca dourado nem verde, Seção 2.1). Nenhuma mudança de lógica
 * de formulário/erro/redirect nesta tarefa.
 *
 * `BrandCrest` usa `decorative` porque o texto adjacente "Organização · Turma
 * do Rola" já identifica a marca por extenso — mesmo padrão já estabelecido
 * em `AppNav`/`PublicHomeShell` (FE-R00/FE-R02), evita duplicar/discordar do
 * `aria-label` default do componente ("Grupo Rola Futebol", nome da entidade
 * jurídica, diferente do nome de produto "Turma do Rola" usado nesta tela).
 *
 * Componente cliente único da tela: sem barra de navegação da área interna
 * (ainda não autenticado, Seção 2), único campo (senha, RN-12/ADR-004), sem
 * link "esqueci minha senha" nesta versão (Seção 7, procedimento de
 * redefinição — BE-05 — ainda não definido, ausência documentada, não
 * decidida por este agente).
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSenhaChange(event: ChangeEvent<HTMLInputElement>) {
    setSenha(event.target.value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Defesa em profundidade além do `required` nativo do campo (Seção
    // 1.0 do TASK.md — nunca assume que validação de navegador/teclado
    // sempre intercepta o submit antes deste handler rodar).
    if (senha.length === 0) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(senha);
      // Sessão emitida via `Set-Cookie` httpOnly na própria resposta do
      // fetch (o navegador grava, este componente nunca lê/manipula o
      // cookie) — critério de aceite: "redireciona à última tela interna ou
      // T05 por padrão após sucesso".
      const target = getSafeRedirectTarget(searchParams.get("redirect"));
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof LoginError ? err.message : LOGIN_TECHNICAL_ERROR_MESSAGE);
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandBlock}>
          <BrandCrest size="large" decorative className={styles.crest} />
          <h1 className={styles.heading}>Acesso interno</h1>
          <p className={styles.brandSecondary}>Organização · Turma do Rola</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <PasswordInput
            label="Senha"
            value={senha}
            onChange={handleSenhaChange}
            required
            disabled={loading}
          />

          {/* Mensagem de erro genérica anunciada via aria-live="assertive"
              (UX-SPEC.md Seção 5.2) — `AlertBanner` com `variant="danger"`
              usa `role="alert"`, que carrega a semântica implícita
              `aria-live="assertive"` (WAI-ARIA), sem precisar de uma
              variação paralela do componente do design system. */}
          {error && <AlertBanner variant="danger">{error}</AlertBanner>}

          <Button type="submit" fullWidth loading={loading}>
            Entrar
          </Button>
        </form>
      </div>

      {/* Link de retorno ao ranking público — sempre visível, em todo estado
          da tela (RF-07.2, Seção 2 do UX-SPEC.md), agora fora do cartão
          branco e diretamente sobre o hero navy (UX-SPEC.md Parte II Seção
          2.1) — cor clara (branco) sublinhada, nunca dourado/verde isolado
          (Seção 2.1/5.4, contraste corrigido desta tarefa). */}
      <Link href={ROUTES.rankingPublico} className={styles.backLink}>
        ← Voltar ao ranking público
      </Link>
    </main>
  );
}
