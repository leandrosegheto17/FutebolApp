# PIPELINE-CONVENTIONS.md

Convenções que amarram os 12 agentes do pipeline entre si. Onde AGENT-TEMPLATE.md
define a estrutura de **cada** agente, este documento define como eles **conversam**:
artefatos, handoff, nomenclatura, governança de inconsistência e o papel do
GUARDRAILS.md.

## Ordem de atuação (referência)

```
1. CTO / Head de Tecnologia   → 2. PM  → 3. Business Analyst → 4. Software Architect
→ 5. UX/UI → 6. Tech Lead → 7. Backend → 8. Frontend → 9. Mobile → 10. QA
→ 11. DevSecOps → 12. DevOps
```

O CTO/Head de Tecnologia não é só a etapa 1: ele também atua como camada de governança
que reabre em pontos específicos mais adiante (ver "Gates do CTO" abaixo) — a posição 1
marca onde ele entra primeiro, não o único momento em que atua.

Backend, Frontend e Mobile (7-9) rodam em paralelo/sequência conforme o escopo do
projeto exigir (nem todo projeto tem os três); a ordem numérica é só para referência de
handoff a partir do TASK.md, não uma dependência estrita entre eles.

---

## 1. Lista definitiva de artefatos

| # | Artefato | Dono (cria) | Consumidores (leem) | Formato |
|---|---|---|---|---|
| 1 | `CTO-REVIEW.md` | CTO/Head de Tecnologia | Todos | Log datado por gate, cada seção termina em veredito (Aprovado / Aprovado com ressalvas / Reprovado) |
| 2 | `PRD.md` | PM | Business Analyst, CTO | Requisitos funcionais e não-funcionais, regras de negócio, critérios de aceite |
| 3 | `PRD-TECNICO.md` | Business Analyst | Software Architect, Tech Lead, QA, Backend (contexto), CTO | Tradução dos requisitos em restrições/contratos técnicos |
| 4 | `SDD.md` | Software Architect | Tech Lead, Backend, DevSecOps, DevOps, CTO | Arquitetura, schemas de dados, contratos de API, decisões estruturais |
| 5 | `UX-SPEC.md` | UX/UI | Tech Lead, Frontend, Mobile, QA | Fluxos de tela, wireframes, design system, estados de tela, acessibilidade (WCAG), comportamento responsivo |
| 6 | `GUARDRAILS.md` | Tech Lead (propõe) + CTO (aprova) | Todos | Regras inegociáveis do projeto — documento vivo, ver seção 5 |
| 7 | `TASK.md` | Tech Lead | Backend, Frontend, Mobile, QA, CTO | Tarefas granulares, ordenadas por dependência, cada uma com dono (papel) e coluna de Status atualizada pelos times de execução (Backend/Frontend/Mobile) conforme progresso |
| 8 | `TEST-PLAN.md` | QA | DevSecOps, CTO | Estratégia de teste (funcional, integração, regressão, e2e) derivada de PRD-TECNICO.md + TASK.md, produzida em paralelo à implementação |
| 9 | `QA-REPORT.md` | QA | Backend, Frontend, Mobile, DevSecOps, DevOps, CTO | Validação por tarefa concluída (aprovado/reprovado/aprovado com ressalva), log de bugs com severidade e evidência, veredito de release-readiness |
| 10 | `SECURITY-REVIEW.md` | DevSecOps | DevOps, CTO | Achados de segurança por severidade (SAST, dependências, secrets, OWASP, requisitos do SDD.md), status (bloqueia deploy / débito registrado com prazo), requisitos de segurança operacional para o DevOps |
| 11 | `DEPLOY.md` | DevOps | CTO | IaC, pipeline de CI/CD, execução de deploy por ambiente, observabilidade, estratégia de rollback, relatório de cada deploy (status, versão, incidente) |
| — | `BLOCKERS.md` | Qualquer agente que reporta bloqueio | Agente escalado + CTO | Log de inconsistências/bloqueios entre agentes — ver seção 4 |
| — | `adr/NNN-titulo-kebab-case.md` | Software Architect | Tech Lead, Backend, Frontend, Mobile, DevSecOps, DevOps, CTO | Um arquivo por decisão arquitetural, imutável — ver exceção de nomenclatura abaixo |
| — | `API-CONTRACT.yaml` | Backend | Frontend, Mobile, QA, DevSecOps | OpenAPI 3.x, publicado incrementalmente por endpoint, `info.version` incrementado a cada mudança incompatível — ver exceção de nomenclatura abaixo |

Esta lista é o contrato: um agente só pode listar em `upstream`/`downstream` (no
frontmatter, ver AGENT-TEMPLATE.md) um artefato que apareça aqui, e só pode produzir um
artefato que não esteja na tabela se, no mesmo PR/sessão, esta tabela for atualizada
junto.

**Notas de consolidação** (auditoria end-to-end): dois artefatos citados em versões
anteriores deste documento nunca chegaram a ter um produtor real e foram consolidados
em artefatos já existentes, para não deixar referência morta na tabela:
- `CLAUDE.md` (guia de estilo/convenções de código) → Seção 1 do `TASK.md`
  ("Diretrizes de Implementação", produzida por `implementation-guideline-drafting`
  do Tech Lead).
- `VISAO-PRODUTO.md` (problema, objetivo de negócio, escopo do MVP) → Seções 1-3 do
  `PRD.md` ("Problema e Contexto", "Público-Alvo", "Objetivo de Sucesso"), já
  produzidas pelo PM.
- `CHANGELOG.md` (registro do que foi entregue por tarefa) → coluna Status +
  notas do `TASK.md` (linha 7 desta tabela), já atualizada por Backend/Frontend/
  Mobile conforme progresso — não existe registro cronológico separado.

### Exceção de nomenclatura: ADRs e API-CONTRACT.yaml

Todo artefato do pipeline é um arquivo único (`.md/<NOME>.md`, regra da seção 3). Duas
exceções:

- **ADRs**: uma decisão arquitetural não é um documento que se reescreve, é um
  registro que se acumula — por isso vivem em `.md/adr/`, um arquivo imutável por
  decisão, numerado sequencialmente (`001-titulo-kebab-case.md`, `002-...`). O
  `SDD.md` (Seção "Decisões Arquiteturais") não copia o conteúdo do ADR, só indexa e
  linka para ele. Mudar uma decisão já registrada nunca edita o ADR original — cria
  um novo ADR com `Status: Superseded by ADR-NNN` no antigo, apontando para o novo
  (mesma regra de `create-adr`, adotada aqui como padrão do projeto).
- **`API-CONTRACT.yaml`**: contrato de API é consumido por ferramenta (codegen,
  Swagger UI, validação de schema em Frontend/Mobile), não só lido por humano — por
  isso usa OpenAPI 3.x (`.yaml`), não Markdown. Continua vivendo em `.md/` como
  arquivo único (não é uma coleção como os ADRs), só a extensão muda. Publicado
  incrementalmente por endpoint conforme cada um fica estável, não só ao final da
  tarefa que o expõe.

### Gates do CTO (do início ao fim do pipeline)

- **Gate 1 — Pré-descoberta** (posição 1 → 2, antes do PM iniciar o levantamento):
  valida alinhamento estratégico direto sobre o briefing de negócio recebido do
  stakeholder — `VISAO-PRODUTO.md` ainda não existe neste ponto. Libera ou não o PM
  para começar.
- **Gate 2 — Pós-SDD** (entre 4 e 5): revisa trade-offs de arquitetura, build-vs-buy,
  vendor lock-in, risco técnico/compliance sobre o `SDD.md` (com `PRD.md`/
  `PRD-TECNICO.md` como contexto).
- **Gate 3 — Pré-TASK.md** (dentro de 6): valida viabilidade de prazo e capacidade de
  squad frente ao escopo decomposto em `TASK.md`.
- **Gate 4 — Fechamento** (após a etapa 12, DevOps): o DevOps reporta o resultado
  final do deploy (sucesso, rollback, incidente) em `DEPLOY.md`; o CTO registra o
  encerramento do ciclo de governança em `CTO-REVIEW.md`, fechando o que foi aberto
  no Gate 1. É o único gate sem poder de veto — o deploy já aconteceu; é um registro
  de fechamento, não uma aprovação prévia.
- **Ad hoc**: qualquer agente pode escalar um conflito direto para o CTO (ver seção 4);
  toda alteração estrutural em `GUARDRAILS.md` também passa por ele (seção 5).

---

## 2. Convenção de handoff

- **Localização**: todo artefato do pipeline vive na pasta `.md/` na raiz do projeto
  (`.md/PRD.md`, `.md/SDD.md`, ...) — exceção apenas para os arquivos de config dos
  próprios agentes, que ficam em `.claude/agents/` e `.claude/skills/`.
- **Nome de arquivo**: exatamente o nome da coluna "Artefato" da tabela acima —
  `MAIUSCULO-COM-HIFEN.md`. Um agente nunca inventa uma variação de nome
  (`prd-v2.md`, `SDD_final.md`); se precisar de uma nova versão, ver regra de
  versionamento abaixo.
- **Como o output de um agente vira input do próximo**: o agente downstream lê o
  artefato pelo caminho fixo (`.md/<ARTEFATO>.md`), nunca por um caminho combinado em
  conversa. Se o artefato esperado não existe, o agente aplica a coluna "Se ausente" do
  seu próprio `Inputs Esperados` (AGENT-TEMPLATE.md) — não presume conteúdo.
- **Versionamento**: os artefatos são versionados pelo git do projeto, não por sufixo
  de nome de arquivo. Um artefato "congela" quando o agente dono o entrega ao próximo
  da cadeia (commit); mudanças depois disso são um novo commit no mesmo arquivo, nunca
  uma cópia paralela. Exceção: `GUARDRAILS.md` mantém adicionalmente um log de
  alterações dentro do próprio arquivo (seção 5) porque o histórico de decisões
  precisa ser legível sem abrir o git log.
- **Reset de contexto**: a partir da fase de Segurança/Observabilidade/CI-CD (QA →
  DevSecOps → DevOps), cada agente entra com escopo limpo — não carrega o histórico de
  decisões de implementação das fases anteriores, só os artefatos formais da tabela
  acima. Isso é deliberado: evita que vício de contexto de implementação influencie a
  revisão de segurança/infra.

## 3. Convenção de nomenclatura de arquivos e pastas

- Artefatos de pipeline (raiz `.md/`): `MAIUSCULO-COM-HIFEN.md`, conforme tabela da
  seção 1.
- Definições de agente (`.claude/agents/`): `slug-kebab-case.md`, um arquivo por
  agente, nome igual ao campo `name` do frontmatter (AGENT-TEMPLATE.md).
- Skills (`.claude/skills/<slug>/SKILL.md`): pasta em `kebab-case` nomeando a skill,
  arquivo sempre `SKILL.md` dentro dela.
- Código-fonte: segue a convenção de nomenclatura definida em `CLAUDE.md` (artefato
  de dono do Tech Lead) — este documento não define convenção de código, só de
  artefatos de pipeline e config de agente.

## 4. Governança — reporte de inconsistência entre agentes

Quando um agente downstream encontra um problema em um artefato upstream (ex.: Tech
Lead encontra ambiguidade no `SDD.md` do Software Architect):

1. **Nunca resolve por conta própria** reinterpretando o artefato upstream — isso
   quebra a rastreabilidade da decisão.
2. **Registra o bloqueio** em `BLOCKERS.md` (raiz `.md/`), como uma nova entrada:

   ```markdown
   ## Bloqueio <NNN> — <data>
   - Reportado por: <slug do agente>
   - Escalado para: <slug do agente dono do artefato com problema>
   - Artefato/trecho afetado: <arquivo.md#seção-ou-linha>
   - Descrição: <o que está ambíguo/inconsistente/impossível de cumprir>
   - Impacto se não resolvido: <o que trava a jusante>
   - Sugestão (opcional): <proposta do agente que reportou>
   - Status: Aberto / Em resolução / Resolvido em <artefato + data>
   ```

3. **O dono do artefato original resolve**, atualiza o artefato afetado e marca o
   bloqueio como `Resolvido`, referenciando o commit/seção que corrigiu.
4. **Conflito entre pares sem dono claro** (ex.: Frontend e Backend discordam de um
   contrato que o SDD.md deixou subespecificado) escala direto para o CTO/Head de
   Tecnologia, que arbitra usando o mesmo formato de entrada acima, com
   "Escalado para: cto" e o veredito final registrado em `CTO-REVIEW.md`.
5. Nenhuma etapa downstream começa trabalho novo sobre um artefato com bloqueio
   `Aberto` que a afete diretamente — trabalho não-relacionado ao bloqueio pode
   continuar em paralelo.

## 5. GUARDRAILS.md como documento vivo

`GUARDRAILS.md` guarda as regras inegociáveis do projeto (ex.: "não implementar camada
de frontend neste MVP", "toda migration precisa de rollback", limites de stack). Regras
de governança:

- **Quem propõe**: Tech Lead, ao gerar/atualizar o documento (etapa 6), ou qualquer
  agente que precise de uma exceção pontual a uma regra existente.
- **Quem aprova mudança estrutural ou exceção**: só o CTO/Head de Tecnologia. Uma
  "mudança estrutural" é qualquer alteração que adiciona, remove ou reescreve uma
  regra — não inclui correções de formatação/typo, que qualquer agente pode fazer
  diretamente.
- **Rastreabilidade obrigatória**: toda alteração aprovada é registrada numa tabela no
  final do próprio `GUARDRAILS.md`:

  ```markdown
  ## Log de Alterações
  | Data | Proposto por | Aprovado por | Mudança | Motivo |
  |---|---|---|---|---|
  | AAAA-MM-DD | <slug> | cto | <regra adicionada/removida/alterada> | <por quê> |
  ```

- **Exceção temporária vs. mudança permanente**: uma exceção pontual (ex.: "esta
  sprint pode pular o requisito X por causa de Y") entra no log com uma coluna extra
  `Validade` (data ou "permanente"); ao expirar, a regra original volta a valer sem
  precisar de nova aprovação.
- Qualquer agente pode **ler** `GUARDRAILS.md` livremente (é input padrão de todos);
  só o Tech Lead propõe e só o CTO aprova a escrita.

---

## Checklist de auto-revisão antes de considerar este documento aplicado

- [ ] Todo artefato citado em algum `AGENT-TEMPLATE.md` de agente existe na tabela da
      seção 1 aqui
- [ ] Todo agente que "lê X" tem o dono de X no seu `upstream`
- [ ] Todo agente que "escreve Y" tem Y na tabela da seção 1 com ele como "Dono"
- [ ] Caminho de qualquer artefato é sempre `.md/<NOME>.md`, sem exceção não
      documentada aqui
