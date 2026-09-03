"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertBanner, Button, PasswordInput } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { login, LoginError } from "./loginApi";
import { LOGIN_TECHNICAL_ERROR_MESSAGE } from "./constants";
import { getSafeRedirectTarget } from "./redirectTarget";
import styles from "./LoginForm.module.css";

/**
 * T01 — Login (senha única) — UX-SPEC.md Seção 2 (wireframe)/4 (estados)/
 * 5.2 (acessibilidade); TASK.md FE-01.
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
          <p className={styles.brand}>Turma do Rola</p>
          <p className={styles.brandSecondary}>Comary</p>
          <h1 className={styles.heading}>Acesso interno</h1>
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

        {/* Link de retorno ao ranking público — sempre visível, em todo
            estado da tela (RF-07.2, Seção 2 do UX-SPEC.md). */}
        <Link href={ROUTES.rankingPublico} className={styles.backLink}>
          ← Voltar ao ranking público
        </Link>
      </div>
    </main>
  );
}
