/**
 * Lógica testável do procedimento de redefinição da senha única
 * compartilhada (BE-05, TASK.md Seção 3.1 — "Gate 2, item 7" / TASK.md Seção
 * 6.2 item 4: resolvido via script/CLI de acesso direto ao banco, sem fluxo
 * de "esqueci minha senha" na interface).
 *
 * Separado do wiring de I/O (`scripts/redefinir-senha-interna.ts`, que lê a
 * nova senha do terminal e chama as funções daqui) para poder ser coberto por
 * teste automatizado sem depender de TTY/`readline` — mesmo padrão já usado
 * neste módulo entre `rate-limit.ts` (lógica pura) e `login/route.ts`
 * (wiring), e entre `session-token.ts`/`middleware.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "./password";

/**
 * Tamanho mínimo exigido para a nova senha. Nenhuma regra de complexidade de
 * senha está definida em `TASK.md`/`SDD.md`/`PRD-TECNICO.md` para a senha
 * única compartilhada (RF-07/ADR-004 só exigem hash argon2id + comparação em
 * tempo constante, nada sobre tamanho mínimo) — decisão de detalhe
 * documentada aqui (não escalada, TASK.md Seção 1.0): 8 caracteres, o piso
 * comumente aceito para evitar senha trivial, sem introduzir uma política de
 * complexidade (maiúscula/número/símbolo) não pedida por nenhum requisito.
 */
export const TAMANHO_MINIMO_SENHA = 8;

export type ValidacaoNovaSenha = { ok: true } | { ok: false; motivo: string };

/**
 * Valida a nova senha antes de gerar o hash: confirmação precisa bater
 * (evita trocar a senha por um valor digitado errado sem detecção, já que
 * não há tela/e-mail de confirmação neste fluxo operacional) e tamanho
 * mínimo. Função pura — nenhum I/O, testável sem TTY nem banco.
 */
export function validarNovaSenha(
  novaSenha: string,
  confirmacao: string,
): ValidacaoNovaSenha {
  if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
    return {
      ok: false,
      motivo: `A nova senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
    };
  }
  if (novaSenha !== confirmacao) {
    return { ok: false, motivo: "A confirmação não confere com a nova senha digitada." };
  }
  return { ok: true };
}

/**
 * Gera o hash argon2id da nova senha e substitui a linha única (singleton,
 * `id = 1`) de `app.auth_interno` — sempre via `UPDATE`/`UPSERT`, nunca
 * `DELETE`+`INSERT` (a tabela bloqueia `DELETE` incondicionalmente,
 * `trg_auth_interno_no_delete`, BE-04). Funciona tanto para a primeira
 * definição de senha (nenhuma linha ainda) quanto para redefinição
 * subsequente, porque `upsert` cobre os dois casos com o mesmo código.
 *
 * Requer um cliente Supabase com `service_role` (`getServiceRoleClient()`,
 * schema `app`) — nunca a chave anônima (GUARDRAILS.md regra 6).
 */
export async function redefinirSenhaInterna(
  client: SupabaseClient<any, any, any>,
  novaSenha: string,
  now: Date = new Date(),
): Promise<void> {
  const hash = await hashPassword(novaSenha);
  const { error } = await client
    .from("auth_interno")
    .upsert({ id: 1, hash_senha: hash, atualizado_em: now.toISOString() });
  if (error) {
    throw new Error(`Falha ao gravar novo hash em app.auth_interno: ${error.message}`);
  }
}
