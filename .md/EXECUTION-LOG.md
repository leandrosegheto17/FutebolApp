# EXECUTION-LOG.md — Sistema de Ranking "Turma do Rola - Comary"

Resumo compacto de cada lote fechado durante a fase de execução
(`EXECUTION-FLOW.md` §7). Cada entrada é o único contexto de lotes já
fechados que os prompts de dispatch de lotes seguintes devem referenciar —
não o histórico completo de dispatches/fix-loops (esse fica em
`QA-REPORT.md`/`SECURITY-REVIEW.md`).

---

## Lote L0 — Fundação Técnica

- **Fechado em**: 2026-09-03
- **Tarefas incluídas**: BE-01 (setup do projeto Next.js/estrutura de
  módulos), BE-02 (migrations da schema `app` completa + RLS
  deny-by-default), FE-00 (fundação do design system).
- **Veredito de QA**: Aprovado com ressalvas nas três tarefas (débitos de
  baixa severidade: `BUG-QA-BE01-01/02`, `BUG-QA-FE00-01/02`,
  `BUG-QA-BE02-01` — higiene de workspace, `format:check` quebrado em 2
  arquivos do Frontend, ausência de FK entre `lancamento_pontos` e
  `participacao_rodada`; nenhum bloqueante).
- **Veredito de DevSecOps**: Aprovado com débito registrado, após um ciclo
  de bloqueio→correção→reauditoria. Achado crítico `CRIT-01`
  (CVE-2025-29927/GHSA-f82v-jwr5-mffw, CVSS 9.1, bypass de `middleware.ts`
  via `next@14.2.5`) — bloqueou o fechamento, corrigido pelo Backend
  (`next` → `14.2.35`, `vitest` → `2.1.9`), confirmado resolvido pela
  reauditoria do DevSecOps. Débitos residuais com prazo/dono: `DEBT-01`
  (vitest `GHSA-5xrq-8626-4rwp`, Baixa, dev-only, reavaliar antes do
  fechamento de L2), `DEBT-04` (next, advisories DoS/cache residuais não
  relacionadas à classe de CRIT-01, Média, antes do primeiro deploy de
  produção), `DEBT-02` (toolchain glob/minimatch/eslint, Baixa, sem prazo
  formal), `DEBT-03` (ausência de CSP em `vercel.json`, Baixa, antes do
  primeiro deploy de produção, após L2 estabilizar origens de fetch).
- **Aprovação do Tech Lead**: Fechado — checklist de `EXECUTION-FLOW.md` §5
  100% satisfeito, verificado de forma independente sobre os artefatos
  reais. Nenhuma tarefa reaberta, nenhuma edição de `TASK.md` necessária.
- **Bloqueio resolvido durante o fechamento**: `BLOCKER-006` (devsecops →
  backend), `Resolvido`.
- **Débitos/pendências que seguem carregados** (nenhum bloqueante): ver
  `DEBT-01` a `DEBT-04` em `.md/SECURITY-REVIEW.md` e os `BUG-QA-*` de
  baixa severidade acima, em `.md/QA-REPORT.md`.

---

## Lote L6 — Montagem de Times, Restrições e Substituições

- **Fechado em**: 2026-09-04
- **Tarefas incluídas**: BE-11 (Serviço de Times — heurística de duas
  fases, ADR-007), BE-12 (CRUD de Restrições Obrigatórias), BE-13
  (Serviço de Substituições, com persistência de `app.time`/
  `app.time_atleta` via RPC `confirmar_times_rodada`, decisão explícita
  do usuário durante a execução), FE-09 (T09 — Montagem de Times, com
  novo componente `ConflictList`), FE-10 (T10 — Gestão de Restrições,
  com novo componente `Combobox`), FE-11 (T11 — Substituição no
  Intervalo, com novo componente `Select`).
- **Veredito de QA**: Aprovado com ressalvas (`QA-REPORT.md` Seção 11).
  Individualmente: BE-11/BE-12/BE-13/FE-09/FE-11 Aprovado sem ressalva;
  FE-10 Aprovado com ressalvas (`BUG-QA-FE10-01`, baixa severidade,
  `Combobox` sem `aria-haspopup="listbox"`, reforço de boa prática APG,
  não é falha WCAG 4.1.2 — sem prazo formal). Validação incluiu
  reexecução independente da suíte completa (788 testes/101 arquivos) e
  da suíte de integração (190 testes) contra Supabase local resetado do
  zero, além de verificação direta via `psql` de RLS deny-by-default,
  trigger de não-exclusão de restrição e atomicidade da confirmação de
  times.
- **Veredito de DevSecOps**: Aprovado, sem débito novo
  (`SECURITY-REVIEW.md` Seções 18-28). Confirmado: as 4 rotas novas
  exigem sessão via `middleware.ts`; RLS deny-by-default + `service_role`
  exclusivo nas 4 tabelas novas; RPC `confirmar_times_rodada` restrita a
  `service_role`; trigger de não-exclusão de `restricao_obrigatoria`
  ativo mesmo para superusuário; nenhum campo sensível
  (`contato`/`data_nascimento` bruto) exposto pelas novas rotas; nenhuma
  dependência nova introduzida pelo lote. Débitos herdados (`DEBT-01`,
  `DEBT-02`, `DEBT-04`) reconfirmados sem alteração de severidade/prazo.
- **Aprovação do Tech Lead**: Fechado — checklist de `EXECUTION-FLOW.md`
  §5 verificado de forma independente (vereditos de QA/DevSecOps lidos
  na íntegra, não só o agregado; nenhuma tarefa `Bloqueada`; `TASK.md`
  reflete fielmente o que foi implementado, incluindo as decisões de
  detalhe não escaladas de BE-13/FE-10/FE-11). Nenhuma tarefa reaberta,
  nenhuma edição de `TASK.md` necessária além do próprio progresso das
  tarefas.
- **Bloqueio durante a execução**: nenhum novo — nenhuma entrada em
  `BLOCKERS.md` referenciando este lote.
- **Achado de processo sinalizado (fora do escopo de fechamento de L6,
  não bloqueante)**: o Lote L2 (Ranking e Presença Pública) nunca
  recebeu veredito agregado de QA nem auditoria completa de DevSecOps
  como unidade fechada, apesar de BE-03/FE-02/FE-03 estarem `Concluída`
  — e, mais especificamente, `QA-REPORT.md` não tem nenhuma seção de
  validação individual de FE-02/FE-03 (diferente do rigor aplicado a
  L0/L1/L6). Mesmo gap possivelmente se repete em L1/L3/L4/L5 (ver nota
  "Atenção na retomada" em `TASK.md` §3.0, também desatualizada quanto a
  FE-03). Recomendado ao Tech Lead/CTO priorizar o fechamento formal
  desses lotes antes de acumular mais ciclos — não impede o
  prosseguimento de L6 nem de lotes futuros independentes.
- **Débitos/pendências que seguem carregados** (nenhum bloqueante):
  `BUG-QA-FE10-01` (baixa, sem prazo formal, `QA-REPORT.md`), `DEBT-01`/
  `DEBT-02`/`DEBT-04` (`SECURITY-REVIEW.md`, prazos já vigentes desde
  L0/L1), e o achado de processo acima (fechamento retroativo de L1-L5
  pendente).
