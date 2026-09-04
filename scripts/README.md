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

---

# Runbook — Migração do Legado (BE-15, RF-08)

**Dono**: Backend.
**Origem**: `TASK.md` Seção 3.1 (`BE-15`), `ADR-008`, mapeamento campo a campo
em `LEGADO-SCHEMA.md` (SPK-01). Este documento é o runbook do CLI exigido
pelo item 3 do "Ao terminar" de `BE-15`.

## ⚠️ Bloqueio de governança (GUARDRAILS.md regra 35 / BLOCKERS.md BLOCKER-003)

**Este script não roda contra a schema legada real por padrão.** Ele exige a
variável de ambiente `LEGADO_MIGRACAO_AUTORIZACAO` definida com o valor exato
`AUTORIZO-EXECUCAO-REAL-CONTRA-LEGADO-REGRA-35-SATISFEITA`
(`src/modules/migracao/governanca.ts`) — sem ela, o script imprime o
bloqueio e encerra **antes** de ler `LEGACY_SUPABASE_URL`/
`LEGACY_SUPABASE_SERVICE_ROLE_KEY`, sem abrir nenhuma conexão.

Essa variável só deve ser definida depois de confirmação **formal e
explícita** do Tech Lead/Software Architect/CTO de que a condição da regra 35
está satisfeita — nunca por conta própria do Backend. Na execução de BE-15
que produziu este runbook, essa confirmação **não** foi obtida nesta rodada
de trabalho (instrução explícita recebida para esta execução: tratar a regra
35/`BLOCKER-003` como ainda bloqueante e implementar/testar exclusivamente
contra fixtures) — o script e toda a lógica de transformação (`src/modules/
migracao/migrar.ts`) foram implementados e testados inteiramente contra
fixtures em memória (`src/modules/migracao/__tests__/`, reproduzindo a
estrutura real documentada em `LEGADO-SCHEMA.md`, incluindo as sete
divergências D1-D7 e ênfase em D1 — 24% de presenças órfãs de rodada), nunca
contra o projeto Supabase legado real (`ipnbdrejlikrmqyxggsp`). As
credenciais `LEGACY_SUPABASE_*` em `.env.local` continuam reservadas
exclusivamente para o uso read-only já feito por `SPK-01`.

**Nota de discrepância, registrada por transparência (não uma lacuna
silenciosa)**: no estado atual de `BLOCKERS.md`, `BLOCKER-003` já aparece com
`Status: Resolvido` (o Software Architect já adicionou o parágrafo de "plano
de saída" ao `ADR-002`, conforme `GUARDRAILS.md` regra 35 prevê: "a regra 35
se extingue automaticamente quando o adendo do ADR-002 for aceito"). Mesmo
assim, esta execução de `BE-15` seguiu a instrução explícita recebida de
tratar o bloqueio como vigente e não realizar nenhuma execução real — o
Backend não decide sozinho reinterpretar esse estado (guardrail deste agente:
nunca reinterpretar ADR/guardrail por conta própria). **Antes de definir
`LEGADO_MIGRACAO_AUTORIZACAO` num ambiente real, o Tech Lead/Software
Architect/CTO precisam confirmar formalmente, num próximo ciclo, se a
condição da regra 35 está de fato satisfeita** — este runbook não faz essa
chamada.

## Quando usar (depois de autorizado)

Uma única vez, na janela de execução formal da migração do legado — não é
uma operação recorrente da área interna.

## Pré-requisitos

- Tudo que `scripts/redefinir-senha-interna.ts` já exige (Node.js, variáveis
  do projeto Supabase principal via `.env.local` ou shell).
- `LEGACY_SUPABASE_URL`/`LEGACY_SUPABASE_SERVICE_ROLE_KEY` do projeto
  Supabase legado (mesmas credenciais já usadas, só leitura, por `SPK-01`).
- `LEGADO_MIGRACAO_AUTORIZACAO` definida conforme a seção de bloqueio acima.
- `BE-14` (trava técnica contra `DROP`/`ALTER` destrutivo na schema legada)
  já aplicada no projeto Supabase legado — pré-requisito de dependência do
  próprio `TASK.md` (BE-14 → BE-15), não verificado automaticamente por este
  script.

## Procedimento

1. `npm install` (se ainda não instalado).
2. `npm run legado:migrar`.
3. Confirme a operação quando solicitado (`[s/N]`) — qualquer resposta
   diferente de `s` cancela sem ler/escrever nada.
4. O script imprime o **relatório de conferência** (RF-08.5) no terminal:
   resumo por tabela (migrados/divergências/erros), toda divergência
   individual (D1 e defensivas D0) com motivo, o catálogo fixo de
   divergências estruturais (D2-D7, sempre listado, pendente de confirmação
   do organizador), as decisões de detalhe já aplicadas, e a validação de
   saldo por atleta (`pontuacao_atual` do legado vs. ledger migrado).
5. **Revise o relatório manualmente** (organizador + Tech Lead) antes de
   qualquer passo seguinte — nenhuma divergência é decidida automaticamente
   pelo script (RF-08.3).
6. Reexecutar (`npm run legado:migrar` de novo) é seguro a qualquer momento —
   o script é idempotente (ADR-008): linhas já migradas não são duplicadas,
   `lancamento_pontos` (ledger append-only) não dobra pontos.
7. A gravação da flag de validação explícita
   (`app.legado_migracao_validacao`, RF-08.5/RF-08.6, que libera a trava de
   `BE-14` para arquivar a schema legada) **não é automática** — é um passo
   manual e deliberado, feito só depois de o organizador confirmar o
   relatório, via acesso direto ao banco (decisão de detalhe já registrada na
   migration de `BE-14`, `20260903170000_travar_schema_legada_ate_validacao.sql`).

## O que o script NÃO faz (importante)

- **Não migra `app.time`/`app.time_atleta`/`app.substituicao`** (Divergência
  D7) — cobertura de dado real baixa demais (~2,9%) para gerar composição de
  time automaticamente sem inventar dado; times precisam ser remontados na
  área nova quando necessário.
- **Não migra os atributos de habilidade** (`visao_jogo`, `passe`, etc.) nem
  `posicoes_preferidas` (Divergência D4) — sem campo correspondente em
  `app.atleta` (decisão de produto já registrada no `PRD-TECNICO.md`).
- **Nunca recalcula pontuação** — `pontos_delta` migrado é sempre o
  `pontos_ganhos` legado literal, nunca lido de `app.configuracao_pontuacao`
  (RN-13).
- **Nunca escreve na schema legada** — só leitura (`SELECT`, via PostgREST),
  reforçado pela trava de `BE-14` no próprio banco.
- **Não grava a flag de validação (RF-08.5/RF-08.6)** — passo manual
  separado, ver item 7 acima.

## Como funciona por baixo (para quem for dar manutenção)

- Lógica testável (leitura de fixtures → transformação → relatório) em
  `src/modules/migracao/` (`migrar.ts`, `transformar.ts`, `relatorio.ts`,
  `governanca.ts`) — coberta por teste unitário em
  `src/modules/migracao/__tests__/` (idempotência, D1-D7, RN-13, bloqueio de
  governança), sem depender de I/O real.
- Wiring de I/O real (Supabase legado + Supabase `app`) em
  `src/modules/migracao/deps-supabase.ts`/`legado-client.ts` — sem teste
  automatizado próprio (depende de rede/schema legada real), mesmo padrão já
  aplicado a `scripts/redefinir-senha-interna.ts`.
- `app.legado_migracao_registro` (`UNIQUE(tabela_origem, id_origem)`, BE-02)
  é a chave de idempotência — `gravar()` sempre faz `UPSERT` por essa chave.
