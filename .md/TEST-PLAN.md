# TEST-PLAN.md — Sistema de Ranking "Turma do Rola - Comary"

**Dono**: QA Engineer
**Status**: Produzido em paralelo ao início da implementação (BE-01/FE-00), logo
após o `TASK.md` ser aprovado no Gate 3 do CTO. Este documento **não** é um
relatório de execução — nenhuma tarefa foi validada ainda; é a estratégia que
será aplicada tarefa a tarefa assim que Backend/Frontend marcarem cada uma como
`Concluída`. Execução propriamente dita vai para `QA-REPORT.md`.
**Input de origem**: `TASK.md` (27 tarefas, Seção 3, aprovado Gate 3) +
`PRD-TECNICO.md` (RF-01 a RF-08, RNF-01 a RNF-12, RN-01 a RN-13) + `UX-SPEC.md`
(critérios transversais de acessibilidade, Seção 5.1; estados de tela, Seção 4) +
`adr/007`, `adr/010` (times/conflito), `adr/008`, `adr/011` (migração/anonimização),
`adr/004`, `adr/005`, `adr/006` (auth/RLS/atomicidade).
**Skill aplicada**: `test-strategy-planning`.

**Escopo desta release**: Backend e Frontend apenas (Mobile fora de escopo,
confirmado no `TASK.md`). Toda menção a "cross-platform" abaixo é **Backend↔Frontend**,
não Mobile.

---

## 1. Princípios da Estratégia

1. Cada tarefa é validada contra **seu próprio critério de aceite** no `TASK.md` —
   nunca contra uma reinterpretação do QA. Se o critério de aceite parecer
   incompleto/errado durante o planejamento, isso é registrado na Seção 6 abaixo
   como ponto de atenção para o Tech Lead, não corrigido silenciosamente aqui.
2. Validação real só começa quando a tarefa está `Concluída` no `TASK.md`. Este
   plano antecipa **o que** será testado e **como**, para não perder tempo
   desenhando casos de teste depois que o código já está pronto.
3. Testes automatizados de Backend/Frontend (unitários/integração próprios de
   cada time) não substituem a validação de QA — são pré-requisito de "pronto"
   de cada time, mas QA valida de forma independente, contra o requisito
   original (`PRD-TECNICO.md`), não contra a suíte que o time escreveu.
4. Toda tarefa com dependência cruzada Backend↔Frontend (mesma tela/mesmo
   contrato de endpoint) recebe um ponto de teste de integração dedicado
   (Seção 3), executado quando **ambos** os lados da dependência estiverem
   `Concluída` — não apenas quando um dos dois terminar.

---

## 2. Estratégia por Tipo de Teste

### 2.1 Testes Unitários (responsabilidade do time de implementação; QA audita cobertura, não reescreve)

QA não escreve unitários de Backend/Frontend — são parte do "pronto" de cada
time (`TASK.md`, Seção 1). QA **audita** que os pontos abaixo têm cobertura
unitária antes de aprovar a tarefa, porque são regras de negócio com alta
penalidade de erro silencioso:

- Cálculo de pontuação por evento (RN-05) — presença/ausência/lesão/gol/cartão,
  incluindo o caso "lesionado conta como presente + eventos até a lesão"
  (BE-08).
- Cálculo de nível técnico com fallback para atleta sem presença (RN-03) (BE-06).
- Cascata de desempate do ranking (RN-08): pontuação → presenças → cartões →
  ordem alfabética, incluindo o caso de triplo empate residual até o critério 4
  (BE-03/FE-02).
- Reversão de saldo em exclusão/correção de rodada, incluindo efeitos em
  cascata sobre substituições/eventos vinculados (RN-04) (BE-09).
- Componentes conexos (union-find) do algoritmo de explicação de conflito
  (ADR-010) — cada componente isolado, nenhuma aresta cruzando componentes
  (BE-11).
- Validação de idade/consentimento (RF-01.3) e alerta de duplicidade de nome
  (RF-01.5) (BE-06/FE-04).

### 2.2 Testes de Integração (Backend: API + banco; Frontend: componente + chamada de API mockada por contrato)

Executados por QA por tarefa, usando o ambiente de homologação/local com banco
Postgres real (não mock de banco) para tudo que envolve RLS, transação ou
função PL/pgSQL — mock de banco esconderia justamente a classe de bug mais
crítica deste projeto (RLS mal configurado, transação não atômica).

Pontos de integração próprios de Backend (validados quando `BE-NN` vira
`Concluída`, sem esperar o Frontend correspondente):

- RLS `deny-by-default` tabela a tabela: tentar `SELECT`/`INSERT`/`UPDATE`/
  `DELETE` com a chave `anon` em cada tabela da schema `app` e confirmar
  negação, exceto as views públicas (BE-02/BE-03).
- Views públicas nunca retornam `contato`/`data_nascimento`, mesmo com
  `SELECT *` explícito, testado com a chave `anon` real (BE-03) — este é o
  teste de maior severidade potencial do projeto (vazamento de dado pessoal),
  tratado como bloqueante de alta severidade se falhar.
- Atomicidade de transação: forçar falha no meio de uma operação multi-tabela
  (lançamento de rodada, correção/estorno, anonimização) e confirmar que
  nenhuma escrita parcial persiste (BE-08/BE-09/BE-07).
- Rate limiting de login: 5 tentativas erradas em 15 min bloqueiam com
  mensagem idêntica à de senha incorreta (BE-04) — teste específico de
  "mensagem nunca diferencia bloqueado de senha errada" (RF-07.3).
- Trava técnica RF-08.6 (BE-14): tentar `DROP`/`ALTER` destrutivo na schema
  legada antes da flag de validação e confirmar falha por permissão negada no
  próprio Postgres (não só por convenção) — depois, gravar a flag e confirmar
  que a operação passa a ser permitida.
- Soft-delete nunca remove fisicamente o registro (BE-12, restrições
  obrigatórias; BE-07, `anonimizar_atleta` sobre `restricao_obrigatoria`).
- `lancamento_pontos` nunca sofre `UPDATE`/`DELETE` — qualquer correção sempre
  aparece como novo lançamento de ajuste (BE-09).

Pontos de integração próprios de Frontend (componente + estado, sem depender
do Backend estar `Concluído` — usa mock de contrato do `API-CONTRACT.yaml`):

- Componentes do Design System (FE-00) usados de forma consistente entre
  telas — nenhuma tela reimplementa `Button`/`Modal`/`Toast` (auditoria de
  reuso, não só de existência).
- Estados de tela (vazio/carregando/erro/sucesso) por tela, conforme Seção 4
  do `UX-SPEC.md` — cada tela testada nos 4 estados, não só o "caminho feliz".
- `Stepper` de 3 etapas (FE-05) navegável e com estado de carregamento
  explícito na etapa final; erro nunca sugere salvamento parcial.

### 2.3 Testes de Integração Cruzada Backend↔Frontend (contrato de API)

Ver Seção 3 (tabela dedicada) — só executados quando ambos os lados da
dependência (Backend e Frontend da mesma tela/contrato) estiverem `Concluída`.

### 2.4 Testes de Regressão

Suíte de regressão cresce incrementalmente a cada tarefa aprovada — não é uma
fase isolada ao final. Regras:

- Toda tarefa aprovada entra num checklist de regressão mínimo (contrato
  `API-CONTRACT.yaml` + critério de aceite original), reexecutado sempre que
  uma tarefa dependente dela (ver `TASK.md` Seção 4.1) for validada depois.
  Ex.: quando `BE-09` (correção/estorno) for validada, reexecutar o checklist
  de `BE-08` (lançamento de rodada) para confirmar que a correção não quebrou
  o cálculo original.
- Atenção especial às cadeias de maior risco de regressão silenciosa:
  `BE-06` → `BE-08` → `BE-09` → `BE-10` (toda a cadeia de saldo/pontuação);
  `BE-12` → `BE-11` → `FE-09` (restrições → montagem de times);
  `BE-04` → todas as rotas de escrita (qualquer mudança em autenticação
  precisa reexecutar o smoke test de sessão em toda tela interna já validada).
- Regressão de RLS: toda nova tabela/coluna sensível (Seção 1.2 do `TASK.md`)
  reexecuta o teste de vazamento das views públicas (BE-03), mesmo que a
  mudança pareça não relacionada.

### 2.5 Testes End-to-End (E2E) relevantes

E2E é seletivo, não exaustivo — cobre apenas os fluxos ponta-a-ponta do
`PRD-TECNICO.md` Seção 4 (os 6 diagramas Mermaid), usando `playwright-skill`
para os fluxos web:

| Fluxo E2E | Diagrama de origem | Cobre tarefas | Prioridade |
|---|---|---|---|
| Login → cadastro de atleta menor sem consentimento → bloqueio → com consentimento → sucesso | PRD-TECNICO.md 4.1 | FE-01, FE-04, BE-04, BE-06 | Alta |
| Login → lançamento de rodada completo (presença/ausente/lesionado + eventos + bloqueio de evento para ausente) → confirmação → ranking público atualizado | PRD-TECNICO.md 4.2 | FE-01, FE-05, BE-08, FE-02, BE-03 | Alta (é o fluxo central do produto) |
| Visitante acessa ranking sem login → ordenação com cascata de desempate → visão mensal | PRD-TECNICO.md 4.3 | FE-02, FE-03, BE-03 | Alta |
| Login → correção de rodada com preview → exclusão de rodada com reversão em cascata → log de auditoria reflete a mudança | PRD-TECNICO.md 4.4 | FE-06, FE-07, FE-08, BE-09, BE-10 | Alta |
| Login → seleção de presentes → conflito de restrição obrigatória exibido (`ConflictList`) → ajuste manual → confirmação de times | PRD-TECNICO.md 4.5 | FE-09, FE-10, BE-11, BE-12 | Alta (contrato ADR-010, ver Seção 3) |
| Login → registro de substituição no intervalo → confirma que pontuação não muda | PRD-TECNICO.md 4.6 | FE-11, BE-13 | Média |
| Sessão expirando durante ação de escrita → banner de aviso → 401 → preservação de dado não salvo → redirecionamento e retorno pós-login | Transversal (FE-12) | FE-12, BE-04 | Alta (risco de perda de dado do usuário) |
| Solicitação de anonimização de atleta (T04) com `TypedConfirmationModal` → estado pós-anonimização com campos `aria-readonly` | UX-SPEC.md T04 | FE-04 (incremento), BE-07 | Média-alta (LGPD) |

E2E de migração do legado (RF-08/BE-15) é tratado à parte (Seção 4.2), pois
depende de SPK-01 e de dado real, não de um fluxo de usuário repetível.

---

## 3. Pontos de Teste de Integração Cruzada Backend↔Frontend

Tabela de rastreamento — cada linha só é executada quando **ambos os lados**
estiverem `Concluída` no `TASK.md`. Nenhuma linha aqui é validada com apenas um
lado pronto (isso é integração unilateral, coberto em 2.2, não cruzada).

| # | Contrato/dependência | Backend | Frontend | O que valida | Severidade se falhar |
|---|---|---|---|---|---|
| X1 | `restricoes_conflitantes`/`grupos_conflito` (ADR-010) | BE-11 | FE-09 | Formato exato do JSON de conflito (campos `restricao_id`, `atleta_a_id/nome`, `atleta_b_id/nome`, `motivo`, `grupo_conflito`) consumido sem transformação adicional pelo `ConflictList`; agrupamento visual por `grupo_conflito` corresponde a componentes conexos reais; mensagem de `grupos_conflito[].mensagem` renderizada literalmente; `status: "conflito"` nunca aparece misturado com sugestão de times parcial | Alta — quebra o fluxo central de RF-05.2 |
| X2 | Guarda de timeout de 8s do algoritmo de times (Seção 6.2 do `TASK.md`) | BE-11 | FE-09 | Excedido o timeout, backend retorna erro de "falha técnica real"; frontend reaproveita o estado de erro genérico já existente (nenhuma tela nova), sem travar a UI aguardando resposta indefinidamente | Alta |
| X3 | Contrato de sessão/401 | BE-04 | FE-01, FE-12 | Cookie `httpOnly`/`Secure`/`SameSite=Strict` aceito e enviado corretamente pelo browser; qualquer 401 em ação de escrita (não só login) aciona o fluxo de FE-12 (preservação + redirecionamento), testado em pelo menos 3 telas diferentes de escrita (FE-04, FE-05, FE-07) | Alta |
| X4 | Mensagem de erro de login genérica sob rate limit | BE-04 | FE-01 | Backend retorna a mesma mensagem/status estando ou não sob bloqueio; frontend exibe texto idêntico nos dois casos, sem diferenciar visualmente (RF-07.3) | Média (privacidade de estado de segurança, não dado pessoal) |
| X5 | `ranking_publico`/`presenca_mensal_publica` (views) | BE-03 | FE-02, FE-03 | Payload real da view (via chave `anon`, sem intermediação) nunca contém `contato`/`data_nascimento`; frontend nunca solicita esses campos nem os exibe mesmo se acidentalmente presentes na resposta (defesa em profundidade) | Alta |
| X6 | `simular_correcao_rodada` (RPC preview) | BE-10 | FE-07 | Preview inline reflete exatamente o delta que a correção real aplicaria; nenhuma linha é gravada ao chamar o preview (RPC read-only confirmado via contagem de linhas antes/depois); preview e correção real usam a mesma `configuracao_pontuacao` vigente na mesma execução de teste | Alta (divergência preview vs. real quebra confiança no fluxo de correção) |
| X7 | Reversão em cascata de correção/exclusão | BE-09 | FE-06, FE-07 | Excluir rodada com substituições vinculadas reflete no frontend a mensagem de efeito em cascata antes de confirmar (modal bloqueante); após confirmação, histórico (FE-06) e log de auditoria (FE-08) refletem o novo estado sem exigir refresh manual | Alta |
| X8 | Log de auditoria sem autor | BE-09 | FE-08 | Nenhum campo de autor aparece em nenhuma camada — nem no payload da API, nem renderizado, nem como placeholder visual ("sistema"/"organizador desconhecido" também proibido) | Média-alta (viola RN-12 explicitamente, é regra transversal do projeto) |
| X9 | CRUD de restrições + soft-delete | BE-12 | FE-10 | Desativar uma restrição no frontend nunca remove a linha da lista (aparece com data de desativação); restrição desativada não é usada pelo backend como hard constraint na próxima montagem de times (integração indireta com X1) | Média |
| X10 | Substituição — bloqueio de mesmo atleta em "sai"/"entra" | BE-13 | FE-11 | Backend rejeita a combinação mesmo que o frontend falhe em bloquear (defesa em profundidade); frontend bloqueia de forma acessível (mensagem de erro, não só submit silencioso) | Média |
| X11 | Anonimização (ADR-011) | BE-07 | FE-04 (incremento) | Após confirmação via `TypedConfirmationModal`, os campos retornados pela API já vêm sobrescritos/redigidos; frontend nunca cacheia/exibe o valor anterior (ex.: de uma consulta anterior em memória) após a operação | Alta (LGPD) |
| X12 | Alerta de duplicidade de nome | BE-06 | FE-04 (núcleo) | Nome duplicado dispara o modal antes de confirmar a criação; texto do alerta reflete exatamente a condição verificada pelo backend (mesmo nome completo, não apelido) | Baixa-média |
| X13 | Bloqueio de evento para ausente | BE-08 | FE-05 | Controles de evento (gol/cartão) aparecem desabilitados (não escondidos) para atleta ausente, com texto explicativo; tentativa de forçar via chamada direta à API (bypass de UI) também é bloqueada pelo backend | Média-alta |
| X14 | Alerta de rodada duplicada | BE-08 | FE-05 | Data já existente exige confirmação explícita antes de prosseguir, testado tanto pela UI quanto por chamada direta ao endpoint (garante que a regra não depende só do frontend lembrar de perguntar) | Média |

---

## 4. Requisitos Não Funcionais a Validar (RNF-01 a RNF-12)

| RNF | O que QA valida | Quando (tarefas-gatilho) | Método |
|---|---|---|---|
| RNF-01 Privacidade/LGPD | Nenhuma resposta de API/página pública devolve `contato`/`data_nascimento`, inclusive em payload de erro/stack trace exposto acidentalmente | BE-03, FE-02, FE-03 | Inspeção de rede (`chrome-devtools`) em todas as chamadas públicas; teste automatizado de contrato negativo |
| RNF-02 Proteção de menores | Consentimento obrigatório e bloqueante para idade <18, sem bypass via edição posterior do campo data de nascimento | BE-06, FE-04 | Funcional + tentativa de bypass (editar data de nascimento de adulto para menor sem re-confirmar consentimento) |
| RNF-03 Segurança de acesso | Hash argon2id (nunca texto puro, confirmado via inspeção do banco); comparação em tempo constante (não testável por I/O direto — QA confirma via revisão de código/relato do Backend, não reimplementa timing attack); rate limiting 5/15min com backoff | BE-04 | Inspeção de schema/dado + funcional de rate limit |
| RNF-04 Disponibilidade/custo | Fora do escopo de teste funcional de QA (é decisão de infraestrutura do DevOps) — QA apenas confirma que nenhuma tarefa introduziu serviço de terceiro pago não aprovado (grep de dependências novas no PR) | Toda tarefa | Revisão de dependências adicionadas por PR |
| RNF-05 Backup/restauração | Fora do escopo funcional de QA nesta fase (é entrega do DevOps/`DEPLOY.md`) — QA sinaliza a dependência para `qa-report-drafting` mencionar como não coberto por esta suíte | — | Não aplicável a QA; nota de escopo no `QA-REPORT.md` |
| RNF-06 Auditabilidade (retenção indefinida do log) | Log de auditoria nunca tem expurgo automático nem paginação que descarte registros antigos sem acesso | BE-09, FE-08 | Funcional (volume sintético de N correções, confirma todas acessíveis) |
| RNF-07 Usabilidade/dispositivo (mobile-first) | Toda tela testada primeiro em viewport `base` (<640px), depois `sm`/`lg`; nenhuma funcionalidade exclusiva de desktop | Toda tarefa Frontend | `playwright-skill` (viewport emulation) por tela |
| RNF-08 Idioma/formato regional | `lang="pt-BR"`; datas em `dd/mm/aaaa` em toda tela que exibe data | Toda tarefa Frontend | Inspeção de DOM + revisão visual |
| RNF-09 Compatibilidade de navegador | Smoke test dos fluxos E2E de prioridade Alta (Seção 2.5) nas 2 versões mais recentes de Chrome, Firefox, Safari (desktop + mobile) | Antes do veredito de release-readiness (não por tarefa individual — custo alto, feito em lote) | `playwright-skill` cross-browser |
| RNF-10 Atomicidade/consistência | Ranking nunca fica parcialmente atualizado visível ao público durante recálculo — teste de leitura concorrente durante escrita (ler `ranking_publico` no meio de um lançamento de rodada em outra sessão) | BE-08, BE-09, FE-02 | Teste de integração com concorrência simulada |
| RNF-11 Integridade referencial pós-migração | Nenhum evento órfão (gol/cartão sem jogador/rodada válido) após migração; processo auditável e reversível confirmado (schema legada intocada até validação, ADR-008) | BE-15 (após SPK-01) | Query de integridade referencial + teste de rollback (confirma que schema legada permanece intocada) |
| RNF-12 Zero perda de dados na migração | Contagem/checksum de registros origem vs. destino bate 100% (jogadores, rodadas, eventos, ranking, configuração de pontuação, times); qualquer divergência bloqueia a validação (RF-08.5/RF-08.6) | BE-15 (após SPK-01) | Comparação origem→destino via relatório de conferência (RF-08.5), auditada por QA antes de aprovar |

Nota: RNF-04 e RNF-05 não geram caso de teste funcional próprio de QA — ficam
registrados aqui só para deixar explícito que QA não os ignorou, e para que o
`qa-report-drafting` não os liste como "pendente de teste" por engano.

---

## 5. Ponto de Atenção Específico: Migração do Legado (RF-08 / BE-15 / SPK-01)

Tratamento diferenciado porque depende de SPK-01 (spike, sem estimativa fixa) e
de dado real do legado, não disponível nesta fase de planejamento:

- QA **não** pode desenhar casos de teste com dado real antes de SPK-01
  entregar o mapeamento campo a campo — o que QA prepara agora é o **roteiro**
  de validação, a ser executado assim que `BE-15` for marcada `Concluída`:
  1. Comparar contagem de registros por entidade (jogadores, rodadas, eventos,
     configuração de pontuação, times) entre schema legada e schema `app`
     (RNF-12) — qualquer divergência é severidade crítica, reprova a tarefa.
  2. Confirmar que a schema legada permanece **intocada** (só leitura) após a
     migração — nenhuma `UPDATE`/`DELETE`/`ALTER` nela (ADR-008), testável via
     comparação de checksum/timestamp da schema legada antes/depois.
  3. Confirmar reexecução idempotente do script (rodar `BE-15` uma segunda vez
     sobre o mesmo dado de origem e confirmar que não duplica registros já
     migrados via `legado_migracao_registro`).
  4. Confirmar que pontuação histórica migrada não foi recalculada sob RN-05
     (RN-13) — amostra de rodadas antigas comparada valor a valor.
  5. Confirmar que a trava técnica de BE-14 realmente bloqueia
     `DROP`/`ALTER` destrutivo na schema legada antes da flag de validação, e
     libera depois (teste de integração cruzada com BE-15/BE-14, não só
     unitário).
  6. Validar o relatório de conferência (RF-08.5) como artefato de saída —
     campos: contagem migrados, contagem de divergências, lista de registros
     não migrados. QA audita esse relatório antes de considerar a tarefa apta
     a ir a produção; não é QA quem decide "ir a produção com dados reais"
     (RF-08 bloqueia isso até validação do organizador), mas QA reprova a
     tarefa se o relatório estiver incompleto ou omitir uma divergência
     conhecida.
- Qualquer campo do legado sem correspondência clara na schema `app` **não**
  pode ser silenciosamente descartado (RF-08.3) — QA verifica que toda
  divergência desse tipo aparece explicitamente no relatório, não como dado
  simplesmente ausente sem explicação.

---

## 6. Pontos de Atenção Sinalizados (não são bloqueio, apenas registro para rastreabilidade)

Nenhum destes é uma reinterpretação do critério de aceite — são observações de
planejamento que podem exigir esclarecimento do Tech Lead quando a tarefa
correspondente estiver perto de `Concluída`, registradas aqui para não se
perderem entre o planejamento (agora) e a validação (mais tarde):

1. **BE-11/FE-09 — volume de teste do algoritmo de times.** O `TASK.md` (Risco
   6) já sinaliza degradação combinatória acima de 60 atletas/rodada. QA
   incluirá um caso de teste de carga sintética (~60-70 atletas com poucas
   restrições esparsas) para confirmar que o guard de timeout (8s) realmente
   aciona antes de qualquer travamento perceptível — não é um teste de
   performance formal (fora de RNF explícito), mas decorre diretamente do
   Risco 6 já registrado.
2. **RNF-09 (compatibilidade de navegador) é custoso de rodar por tarefa.**
   Decisão de estratégia (não escalada, decisão de execução de QA dentro da
   própria autoridade): rodar cross-browser apenas nos fluxos E2E de
   prioridade Alta, em lote, antes do veredito de release-readiness — não a
   cada tarefa individual aprovada. Se o Tech Lead/CTO discordar do
   momento/frequência, é um ajuste de estratégia, não um bloqueio.
3. **RN-13 (preservação de pontuação histórica) tem pendência de reconfirmação
   com o organizador** (`PRD-TECNICO.md`, Interpretação #12) antes da
   implementação final de RF-08. Se essa reconfirmação mudar RN-13 depois que
   `BE-15` já tiver sido validada por QA sob a regra atual, isso não é um bug
   de QA nem de Backend — é mudança de requisito a montante, tratada como
   reabertura formal via `TASK.md`, não como reprovação retroativa.

---

## Checklist de Prontidão

- [x] Estratégia de teste cobre unitário (auditoria de cobertura, Seção 2.1),
      integração (Seção 2.2), integração cruzada (Seção 3), regressão
      (Seção 2.4) e E2E relevante (Seção 2.5) — nenhuma categoria vazia.
- [x] Todo RNF (RNF-01 a RNF-12) tem linha própria na Seção 4, incluindo os
      que ficam explicitamente fora do escopo funcional de QA (RNF-04/RNF-05),
      para não gerar ambiguidade de "esquecido" vs. "fora de escopo".
- [x] Pontos de integração cruzada Backend↔Frontend nomeiam o contrato exato
      (ADR-010 para `restricoes_conflitantes`/`grupos_conflito`) e a
      severidade esperada se falhar — Seção 3, 14 linhas rastreáveis.
- [x] Migração do legado (RF-08/BE-15) tem tratamento próprio, reconhecendo a
      dependência de SPK-01 sem forçar caso de teste com dado inexistente
      nesta fase — Seção 5.
- [x] Nenhuma decisão de estratégia foi escalada indevidamente — pontos de
      atenção da Seção 6 são registro, não bloqueio; nenhum bug foi
      encontrado nesta fase (não há código ainda), então nenhuma entrada em
      `QA-REPORT.md`/`BLOCKERS.md` foi aberta por este documento.

**Veredito**: `TEST-PLAN.md` pronto para uso incremental. Nenhuma tarefa será
validada (`acceptance-criteria-validation`) antes de aparecer como `Concluída`
no `TASK.md` — este documento aguarda esse gatilho, tarefa a tarefa, para
alimentar o `QA-REPORT.md`.
