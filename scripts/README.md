# Runbook — Redefinição da Senha Única Compartilhada (BE-05)

**Dono**: Backend.
**Origem**: `TASK.md` Seção 3.1 (`BE-05`) e Seção 6.2 item 4 — decisão do Tech
Lead de resolver o "Gate 2, item 7" (procedimento de redefinição da senha
única compartilhada da área interna, RF-07/ADR-004/RN-12) **operacionalmente,
via script/CLI de acesso direto ao banco**, sem introduzir nenhum fluxo de
"esqueci minha senha" na interface (`T01` do `UX-SPEC.md` permanece sem esse
link). Este documento é o runbook exigido pelo critério de aceite de BE-05.

## Quando usar

Sempre que a senha única compartilhada da área interna precisar ser trocada:
rotina de segurança periódica, suspeita de vazamento, saída de alguém que
tinha acesso, ou simplesmente porque o organizador esqueceu a senha atual (não
há como recuperá-la — só redefinir, já que `hash_senha` é irreversível por
desenho, argon2id).

## Pré-requisitos

- Acesso ao repositório e a um ambiente com Node.js instalado (mesma versão
  mínima do projeto, `engines.node >= 20.9.0`, `package.json`).
- Variáveis de ambiente do ambiente-alvo (homologação/staging ou produção)
  disponíveis de uma das duas formas:
  - um arquivo `.env.local` na raiz do projeto (nunca versionado —
    `.gitignore` já cobre `.env*.local`) com pelo menos
    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_COOKIE_SECRET`,
    `NEXT_PUBLIC_APP_BASE_URL` (mesmo schema de `.env.example`); **ou**
  - as mesmas variáveis já exportadas no shell atual (ex.: depois de
    `vercel env pull` + `source`, sem precisar do arquivo).
- **Confirme que está apontando para o projeto Supabase certo** antes de
  continuar — o script grava direto em `app.auth_interno` do projeto
  referenciado por `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no
  ambiente atual. Não há como desfazer uma troca de senha no ambiente errado
  a não ser rodando o procedimento de novo.

## Procedimento

1. Instale as dependências do projeto, se ainda não instaladas:

   ```
   npm install
   ```

2. Rode o script:

   ```
   npm run senha:redefinir
   ```

3. Digite a nova senha quando solicitado (entrada oculta, não aparece no
   terminal) e digite de novo para confirmar.
   - A senha precisa ter pelo menos 8 caracteres (única regra de validação —
     nenhum requisito de complexidade adicional foi definido para este
     projeto).
   - Se a confirmação não bater com a senha digitada primeiro, ou se a senha
     for curta demais, o script explica o motivo e encerra sem alterar nada
     (`exit code` 1) — rode `npm run senha:redefinir` de novo.
4. Confirme a operação quando o script perguntar (`Confirma a substituição da
   senha única da área interna? [s/N]`) — qualquer resposta diferente de `s`
   cancela sem gravar nada.
5. O script imprime "Senha redefinida com sucesso" quando termina. **Nunca**
   imprime a senha nem o hash em nenhum momento, em nenhuma etapa.
6. Avise quem precisar da nova senha por um canal fora deste repositório
   (nunca registre a senha em texto puro em nenhum lugar — issue, PR,
   mensagem, etc.).

## O que o procedimento NÃO faz (importante)

- **Não invalida sessões já emitidas com a senha antiga.** O cookie de sessão
  (`sessao_interna`) continua válido até expirar naturalmente (TTL de 8-12h,
  ADR-004) mesmo depois da troca de senha — a sessão não depende da senha
  depois de emitida. Se for necessário revogar todo mundo imediatamente (ex.:
  suspeita de sessão comprometida, não só de senha), a ação correta é girar
  `SESSION_COOKIE_SECRET` no ambiente (isso invalida a assinatura de toda
  sessão já emitida) — fora do escopo deste script, é uma variável de
  ambiente da hospedagem (Vercel).
- **Não envia e-mail nem notificação para ninguém** — por desenho (RN-12, sem
  conta individual, não há "para quem" notificar).
- **Não funciona sem acesso à `SUPABASE_SERVICE_ROLE_KEY` do ambiente-alvo**
  — não existe (nem deveria existir) uma forma de trocar a senha só com a
  chave anônima (`GUARDRAILS.md` regras 6/7).

## Como funciona por baixo (para quem for dar manutenção)

- Lógica testável (validação + gravação do hash) em
  `src/modules/autenticacao/redefinir-senha.ts`
  (`validarNovaSenha`/`redefinirSenhaInterna`) — coberta por:
  - teste unitário (`src/modules/autenticacao/__tests__/redefinir-senha.test.ts`,
    lógica de validação, sem I/O);
  - teste de integração contra Supabase local real
    (`src/modules/autenticacao/__tests__/redefinir-senha.integration.test.ts`,
    via `npm run test:integration`, exige `supabase start` — mesmo
    procedimento de BE-02/03/04).
- Wiring de terminal (prompt de senha oculta, confirmação, `.env.local`) em
  `scripts/redefinir-senha-interna.ts` — não tem teste automatizado próprio
  (depende de I/O de terminal), mas foi validado manualmente (ver nota de
  validação em `TASK.md`, linha de status de `BE-05`).
- `redefinirSenhaInterna` sempre faz `UPSERT` (`id = 1`, singleton) — nunca
  `DELETE`+`INSERT`. A tabela `app.auth_interno` bloqueia `DELETE`
  incondicionalmente (`trg_auth_interno_no_delete`, BE-04) mesmo para
  `service_role`; `UPSERT` é o único caminho, também funciona para a
  primeira definição de senha (ambiente sem nenhuma linha ainda).

## Validação manual de referência

Sempre que este runbook for executado num ambiente novo, validar o resultado
de ponta a ponta (não só confiar na mensagem "sucesso" do script):

```
curl -i -X POST <base-url>/api/auth/login \
  -H "content-type: application/json" \
  -d '{"senha":"<a-senha-nova>"}'
```

Deve retornar `200` com `Set-Cookie: sessao_interna=...; HttpOnly; SameSite=strict`.
Repetir com a senha antiga deve retornar `401` com o corpo genérico
`{"error":"Senha incorreta."}` (RF-07.3).
