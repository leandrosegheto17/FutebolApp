# LEGADO-SCHEMA.md — SPK-01: Descoberta do Schema Legado do Supabase

**Dono**: Backend Developer (acompanhamento do Software Architect para
interpretação de ambiguidade de schema, conforme `TASK.md` Seção 2).
**Gerado em**: 2026-09-03 (execução do spike, credenciais liberadas nesta fase).
**Projeto legado**: Supabase `futebol-ranking` (ref já divulgado em texto claro
pelo Tech Lead/orquestrador em `TASK.md`/`BE-14`, não extraído de segredo).
**Escopo**: Seção 2 do `TASK.md` (SPK-01) — introspecção completa, mapeamento
campo a campo para a schema `app` (fechada desde o Gate 2, `SDD.md` Seção 5) e
lista de divergências para confirmação do organizador (RF-08.3). **Não inclui**
o desenho do script de transformação (BE-15, próxima tarefa da cadeia).

**Nota de segurança (aplicada durante todo o spike)**: as credenciais do legado
(`LEGACY_SUPABASE_URL`, `LEGACY_SUPABASE_SERVICE_ROLE_KEY`,
`LEGACY_SUPABASE_DB_HOST`, em `.env.local`, não versionado) foram lidas
exclusivamente por variável de ambiente em scripts locais descartáveis, nunca
impressas em terminal, nunca copiadas para este documento ou qualquer outro
arquivo versionado. Todas as chamadas feitas contra o projeto legado nesta
tarefa foram **somente leitura** (`GET`, nunca `POST`/`PATCH`/`DELETE`),
consistente com o guardrail "schema legada permanece intocada até validação
explícita" (`GUARDRAILS.md` regra 11) — este spike não grava nada no legado,
apenas lê.

---

## 0. Método de introspecção usado (e por que não SQL direto)

O procedimento da Seção 2 do `TASK.md` descreve o método de referência como
`information_schema.tables`/`information_schema.columns`/`pg_constraint` via
conexão SQL direta. As credenciais disponibilizadas neste momento da execução
são exatamente três: URL do projeto (REST/PostgREST), chave `service_role`
(JWT) e hostname de conexão direta ao Postgres — **sem senha de banco**. Sem
senha, não há como abrir uma conexão `pg` bruta contra o host de banco para
rodar SQL arbitrário.

`BE-14` (tarefa imediatamente anterior desta mesma cadeia) já havia validado,
de forma independente, que a via disponível e não-destrutiva para introspecção
com essas credenciais é a **raiz do PostgREST** (`GET {url}/rest/v1/` com
header `apikey`/`Authorization: Bearer <service_role>`), que devolve uma
descrição OpenAPI/Swagger 2.0 completa do schema exposto — construída pelo
próprio PostgREST a partir de `information_schema`/`pg_catalog` internamente,
então é equivalente em conteúdo (tabelas, colunas, tipos, nullability,
defaults, chave primária/estrangeira) ao que uma consulta SQL direta traria,
sem exigir senha de banco e sem qualquer escrita. Este spike reaproveita e
**aprofunda** o mesmo método: além da raiz OpenAPI, foram feitas chamadas
`GET` agregadas por tabela (`Prefer: count=exact`, filtros `select=`) para
obter contagem exata de linhas e distribuição de valores por coluna — o
equivalente funcional de `SELECT count(*)`/`GROUP BY` sem acesso SQL bruto.

**Limite explícito deste método (documentado, não lacuna silenciosa)**: a
raiz do PostgREST só reflete o schema **exposto** ao PostgREST (`public`,
já confirmado por BE-14). Se existir schema adicional não exposto ao
PostgREST no mesmo projeto, este método não o veria — mitigado parcialmente
abaixo (Seção 5, checagem de jurisdição/projeto), mas não é uma garantia
absoluta equivalente a rodar `information_schema.schemata` sem filtro. Se
isso for um risco inaceitável para o Tech Lead/Architect, a alternativa é
solicitar a senha de conexão direta ao banco antes de BE-15 rodar de fato.

---

## 1. Tabelas encontradas (schema `public`, único schema exposto)

| Tabela | Linhas (contagem exata) | Natureza |
|---|---|---|
| `goleiros` | 5 | Domínio (atletas — papel goleiro) |
| `jogadores` | 42 | Domínio (atletas — papel linha) |
| `rodadas` | 13 | Domínio (rodadas) |
| `presencas_rodada` | 770 | Domínio (presença/eventos/pontos por rodada) |
| `substituicoes_rodada` | 0 | Domínio (substituições) — **tabela vazia**, estrutura existe mas nunca foi usada em produção |
| `migrations` | 8 | **Infraestrutura do framework legado, não é dado de domínio** |

**Achado de contexto (não pedido explicitamente, mas relevante para BE-15)**:
a tabela `migrations` (colunas `id`, `migration`, `batch`, com nomes de
migration no padrão `AAAA_MM_DD_HHMMSS_create_<tabela>_table`) é a tabela de
controle de migrations do framework do backend legado (padrão idêntico ao do
Laravel/PHP) — confirma que o sistema legado não era Node/Next.js, é
irrelevante para o mapeamento de domínio e **não deve ser migrada** para
`app` (não tem equivalente nem faz sentido ter).

Nenhuma outra tabela existe no schema `public` além das 6 acima — a
introspecção via raiz do PostgREST lista o schema inteiro exposto, não uma
lista pré-selecionada.

---

## 2. Colunas, tipos e constraints por tabela

Tipos abaixo são os tipos Postgres reais (campo `format` do OpenAPI, que é o
tipo SQL nativo — `type` é só o tipo JSON Schema genérico e foi ignorado onde
`format` é mais preciso, ex. `format: bigint` prevalece sobre `type: integer`).

### 2.1 `goleiros` (5 linhas)

| Coluna | Tipo | Nullable/Default | Observação empírica |
|---|---|---|---|
| `id` | `bigint` | PK (`<pk/>` confirmado via introspecção) | — |
| `nome` | `text` | obrigatório | dado pessoal — nome |
| `telefone` | `text` | obrigatório | dado pessoal — contato |
| `pontuacao_inicial` | `integer` | default `0` | **100% das 5 linhas = 0** |
| `pontuacao_atual` | `integer` | default `0` | **100% das 5 linhas = 0** (nenhum goleiro acumulou pontos) |
| `criado_em` | `timestamp with time zone` | default `now()` | — |
| `data_nascimento` | `date` | nullable (sem default) | **100% das 5 linhas = `null`** (nunca preenchido para goleiro) |

### 2.2 `jogadores` (42 linhas)

| Coluna | Tipo | Nullable/Default | Observação empírica |
|---|---|---|---|
| `id` | `bigint` | PK | — |
| `nome` | `text` | obrigatório | dado pessoal — nome |
| `telefone` | `text` | obrigatório | dado pessoal — contato |
| `pontuacao_inicial` | `integer` | default `0` | valores reais variados (ex. dezenas a centenas) |
| `pontuacao_atual` | `integer` | default `0` | **sempre ≥ `pontuacao_inicial`** nas amostras — reforça que é campo derivado/cache no legado (saldo = inicial + histórico), não fonte independente |
| `criado_em` | `timestamp with time zone` | default `now()` | — |
| `visao_jogo` | `integer` | nullable | escala observada ~2–10 |
| `passe` | `integer` | nullable | escala observada ~2–10 |
| `preparo_fisico` | `integer` | nullable | escala observada ~2–10 |
| `drible` | `integer` | nullable | escala observada ~2–10 |
| `chute` | `integer` | nullable | escala observada ~2–10 |
| `desarme` | `integer` | nullable | escala observada ~2–10 |
| `idade` | `integer` | nullable | campo **redundante** com `data_nascimento` (ambos presentes) |
| `posicoes_preferidas` | `text[]` (array) | nullable | valores como `ZAG`,`LAT`,`VOL`,`MEI`,`ATA`,`CA` (abreviações de posição em português) |
| `data_nascimento` | `date` | **100% das 42 linhas preenchido** | dado pessoal sensível |

### 2.3 `rodadas` (13 linhas)

| Coluna | Tipo | Nullable/Default | Observação empírica |
|---|---|---|---|
| `id` | `bigint` | PK | IDs observados: 5,6,11–17,21–24 — **sequência com lacunas** (1–4, 7–10, 18–20 ausentes), indício de linhas deletadas no legado |
| `data_rodada` | `date` | obrigatório | intervalo real: **2026-05-31 a 2026-08-30**; único valor por linha nas 13 existentes (checado — sem duplicata), mas **sem constraint `UNIQUE` declarada** |
| `nome_time_a` | `text` | nullable, observado `""` (string vazia) em 9/13 linhas, `"Colete"` nas 4 mais recentes | recurso adotado recentemente, não retroativo |
| `nome_time_b` | `text` | mesmo padrão — `""` em 9/13, `"Sem Colete"` nas 4 mais recentes | idem |
| `formacao` | `text` | `"4-3-3"` em 100% das 13 linhas amostradas | formação tática fixa, nunca variou nos dados reais |
| `criado_em` | `timestamp with time zone` | default `now()` | — |

### 2.4 `presencas_rodada` (770 linhas)

| Coluna | Tipo | Nullable/Default | Observação empírica |
|---|---|---|---|
| `id` | `bigint` | PK | — |
| `data_rodada` | `date` | obrigatório | **não é FK declarada** — associação a `rodadas` só por igualdade de valor de data (ver Seção 3) |
| `atleta_id` | `bigint` | obrigatório | **não é FK declarada** — associação polimórfica, resolvida junto com `tipo_atleta` (ver Seção 3) |
| `tipo_atleta` | `text` | obrigatório | só 2 valores observados: `"Linha"` (714 linhas) e `"Goleiro"` (56 linhas) — soma bate com o total (770) |
| `presente` | `boolean` | default `false` | — |
| `gols_marcados` | `integer` | default `0` | **0 em 100% das 770 linhas** — coluna nunca incrementada nos dados reais |
| `cartao_amarelo` | `integer` | default `0` | **0 em 100% das 770 linhas** — idem |
| `cartao_vermelho` | `boolean` | default `false` | `true` em apenas 4/770 linhas |
| `pontos_ganhos` | `integer` | default `0` | só 3 valores distintos observados: `0`, `2`, `3` (ver análise de fórmula abaixo) |
| `status` | `text` | **nullable** | valores: `"presente"` (298), `"ausente"` (252), `"lesionado"` (36), `null` (184) |
| `posicao` | `text` | nullable | **`null` em 100% das 770 linhas** — coluna morta nos dados reais |
| `time` | `text` | nullable | preenchido em apenas 22/770 linhas (~2,9%) |

**Fórmula de pontuação legada inferida empiricamente** (apenas para contexto
de BE-15/RN-13 — não é a tabela RN-05 nova, que é diferente por desenho):
`status = "ausente"` → `pontos_ganhos = 0` sempre; `status = "lesionado"` →
`pontos_ganhos = 3` sempre (mesmo valor de presença, consistente com a
decisão RF-02.3/RN-05 do PRD-TECNICO de tratar lesão como presença); `status
= "presente"` → `pontos_ganhos = 3`, exceto quando `cartao_vermelho = true`,
caso em que `pontos_ganhos = 2` (penalidade de 1 ponto). Nenhuma linha com
`gols_marcados > 0` ou `cartao_amarelo > 0` existe nos dados reais, então o
efeito desses dois eventos na fórmula de pontos **não pôde ser confirmado
empiricamente** (fica como lacuna documentada, não suposição).

**Confirmação cruzada relevante para RN-13**: a tabela de pontuação nova
(RN-05, `PRD-TECNICO.md`) é **presença +2, ausência 0, gol +3, cartão
amarelo −1, cartão vermelho −3** — diferente da fórmula legada observada
acima (presença +3, ausência 0, cartão vermelho reduz para +2, i.e.
penalidade de apenas −1). Isso **confirma empiricamente** que a decisão já
tomada em RF-08.4/RN-13 (preservar pontuação histórica exatamente como está,
sem recálculo retroativo sob a tabela RN-05 nova) é necessária de fato — as
duas fórmulas não são equivalentes, recalcular mudaria resultados de rodadas
já disputadas.

### 2.5 `substituicoes_rodada` (0 linhas — tabela vazia)

| Coluna | Tipo | Nullable/Default |
|---|---|---|
| `id` | `bigint` | PK |
| `data_rodada` | `date` | obrigatório |
| `time` | `text` | nullable |
| `atleta_saindo_id` | `bigint` | obrigatório |
| `tipo_atleta_saindo` | `text` | obrigatório |
| `atleta_entrando_id` | `bigint` | obrigatório |
| `tipo_atleta_entrando` | `text` | obrigatório |

Estrutura idêntica ao padrão polimórfico de `presencas_rodada` (par
`id`+`tipo_*`), mas **sem nenhuma linha gravada** — recurso do app legado
que existia na estrutura, mas nunca foi usado em produção. Não há dado a
migrar aqui; BE-15 só precisa tratar esse caso como no-op idempotente.

### 2.6 `migrations` (8 linhas) — excluída do escopo de migração de domínio

Tabela de controle interno do framework legado (`id integer PK`,
`migration varchar(255)`, `batch integer`). Não representa nenhuma entidade
de domínio do ranking e não tem correspondência (nem precisa ter) em `app`.

---

## 3. Relacionamentos reais (nenhuma foreign key declarada)

A introspecção via raiz do PostgREST expõe explicitamente toda `FOREIGN KEY`
existente (tag `<fk table='...' column='...'/>` na descrição de cada coluna,
mesmo mecanismo usado para marcar `<pk/>`). **Nenhuma tag de foreign key foi
encontrada em nenhuma coluna de nenhuma das 6 tabelas** — ou seja, o schema
legado **não tem nenhuma `FOREIGN KEY` declarada no banco**, confirmado
(equivalente a rodar `pg_constraint` filtrando `contype = 'f'` e obter zero
linhas). Todos os relacionamentos abaixo são **implícitos** (por valor, sem
constraint de integridade referencial no Postgres):

- `presencas_rodada.atleta_id` + `presencas_rodada.tipo_atleta` →
  `jogadores.id` (quando `tipo_atleta = 'Linha'`) **ou** `goleiros.id`
  (quando `tipo_atleta = 'Goleiro'`) — associação polimórfica por
  discriminador de texto, não por FK.
- `substituicoes_rodada.atleta_saindo_id`/`atleta_entrando_id` seguem o
  mesmo padrão via `tipo_atleta_saindo`/`tipo_atleta_entrando` (tabela vazia,
  não verificável empiricamente, mas a estrutura é idêntica).
- `presencas_rodada.data_rodada` → `rodadas.data_rodada` — associação por
  **igualdade de data**, não por um `rodada_id`. **Achado crítico de
  qualidade de dados**: das 770 linhas de `presencas_rodada`, **184 (24%)
  têm uma `data_rodada` que não existe em nenhuma linha de `rodadas`** — são
  exatamente as 4 datas `2026-05-03`, `2026-05-10`, `2026-05-17`,
  `2026-05-24` (46 linhas cada, 4×46=184, bate exatamente com a contagem de
  `status = null` da Seção 2.4 — ou seja, **toda linha órfã tem `status`
  nulo**, consistente com serem presenças de rodadas que foram deletadas de
  `rodadas` sem cascata). Isso corrobora a lacuna de sequência de `id` já
  observada em `rodadas` (Seção 2.3). **Este é o achado de qualidade de
  dados mais relevante para BE-15** — vai exigir decisão explícita do
  organizador (ver Divergência D1 abaixo) sobre o que fazer com essas 184
  linhas antes do script de migração assumir qualquer comportamento padrão.
- `substituicoes_rodada.data_rodada` → `rodadas.data_rodada`, mesmo padrão
  (não verificável, tabela vazia).

---

## 4. Região/jurisdição de hospedagem (Gate 2 do CTO, item de baixa severidade)

Resolução DNS do host de conexão direta do projeto legado aponta para um
endereço IPv6 cujo prefixo (`2600:1f16::/34`) está listado no arquivo oficial
de faixas de IP da AWS (`ip-ranges.amazonaws.com/ip-ranges.json`, consultado
nesta tarefa) sob `region: us-east-2` (`network_border_group: us-east-2`),
tanto para o serviço `AMAZON` quanto `EC2`. **Conclusão: o projeto Supabase
legado está hospedado na região AWS us-east-2 (Ohio, EUA)**, fora do Brasil.

Nota metodológica: o endpoint REST público (`{url}/rest/v1/`) responde via
Cloudflare (proxy de borda, cabeçalho `CF-Ray` aponta a localização do PoP
mais próximo de quem faz a requisição, não a região real do banco — por
isso **não foi usado** como evidência de região). Já a resolução DNS do
hostname de conexão direta ao Postgres não passa por esse proxy (conexão de
banco não pode ir através de HTTP/CDN), então o endereço IP resultante é uma
evidência direta e confiável da região real de hospedagem do banco.

Isso confirma/mantém o ponto já sinalizado como risco de baixa severidade no
Gate 2 do CTO (Risco/Compliance — "Localização/jurisdição"): dado pessoal de
atleta (nome, telefone, data de nascimento) do grupo amador está armazenado
fora do território nacional. Não é um bloqueio para SPK-01/BE-15 (já era
conhecido e aceito como risco baixo), mas o registro fica formalizado aqui
como pedido pela Seção 2 do `TASK.md`.

---

## 5. Mapeamento campo a campo: legado → `app` (SDD.md Seção 5)

### 5.1 `jogadores` + `goleiros` → `app.atleta`

| Campo legado | Campo `app.atleta` | Nota |
|---|---|---|
| `jogadores.id` / `goleiros.id` | — (novo `uuid` gerado na migração) | `id` legado (bigint) não é reaproveitado como PK nova; deve ser preservado só dentro de `legado_migracao_registro.id_origem` para rastreio |
| `nome` | `nome_completo` | mapeamento direto |
| — (não existe no legado) | `apelido_exibicao` | **sem correspondência no legado** — campo novo, opcional, não migra nada (fica vazio/null até o organizador preencher manualmente) |
| `telefone` | `contato` | dado sensível — preservar tratamento LGPD (nunca em view pública) |
| `data_nascimento` | `data_nascimento` | mapeamento direto; **`goleiros.data_nascimento` é sempre `null`** nas 5 linhas reais — os 5 goleiros migrariam com esse campo vazio |
| — (não existe no legado) | `consentimento_responsavel_obtido` | **sem correspondência** — RN-02 é regra nova (consentimento do responsável), não existia no legado; ver Divergência D3 |
| `pontuacao_inicial` | `pontuacao_inicial` | mapeamento direto, semântica igual (base do saldo, ver RN-10) |
| — (não existe explicitamente) | `ativo` | **sem correspondência** — legado não tem flag de atleta ativo/inativo; decisão sugerida (não aplicada aqui, só sinalizada): todos migram como `ativo = true` por padrão, sujeito à confirmação do organizador |
| — (não existe) | `anonimizado_em` | não aplicável — nenhum atleta legado foi anonimizado (conceito não existe no legado); todos migram com `null` |
| `pontuacao_atual` | — (não migra como coluna; **usar para validação**) | `app` não guarda saldo como coluna (é ledger append-only: `pontuacao_inicial` + soma de `lancamento_pontos`). Recomendação para BE-15: usar `pontuacao_atual` legado como **valor de conferência** do relatório RF-08.5 (saldo pós-migração calculado deve bater com este valor) |
| `tipo_atleta` (discriminador `"Linha"`/`"Goleiro"`, só existe implicitamente via a tabela de origem) | — (sem campo equivalente em `app.atleta`) | **Divergência D2** — ver abaixo |
| `visao_jogo`, `passe`, `preparo_fisico`, `drible`, `chute`, `desarme` | — (sem campo em `app.atleta`) | **Divergência D4** — ver abaixo |
| `idade` | — (não migra como coluna própria; `app` deriva idade de `data_nascimento` em tempo de leitura, usado como soft constraint em RF-05.3) | campo redundante no legado, descartável sem perda real (equivalente sempre recomputável a partir de `data_nascimento`) — **não é divergência**, é decisão de detalhe de baixa incerteza |
| `posicoes_preferidas` | — (sem campo em `app.atleta`; RF-01 é explícito: "Sem categoria fixa de posição") | **Divergência D4** — ver abaixo |
| `criado_em` | — (sem campo equivalente declarado no diagrama de alto nível do `SDD.md`; se `app.atleta` tiver `criado_em`/`atualizado_em` na modelagem física do Backend, mapeamento direto é trivial) | decisão de detalhe de BE-15, não uma divergência de dado |

### 5.2 `rodadas` → `app.rodada` + `app.time`

| Campo legado | Campo `app` | Nota |
|---|---|---|
| `id` | — (novo `uuid`, rastreado via `legado_migracao_registro`) | — |
| `data_rodada` | `rodada.data` | mapeamento direto |
| — | `rodada.status` | **sem correspondência no legado** — legado não tem conceito de status de rodada (aberta/fechada/etc.); decisão sugerida: todas as 13 rodadas migradas entram com status final (ex. `"encerrada"`), sujeito a confirmação do organizador/Tech Lead sobre os valores válidos de `status` |
| `nome_time_a` | `time.label` (uma linha de `time` por rodada) | 9/13 rodadas têm valor `""` (string vazia) — decisão de detalhe de BE-15: usar fallback (`"Time A"`) ou preservar vazio, mas **não é ambíguo o suficiente para virar divergência formal**, é decisão de detalhe |
| `nome_time_b` | `time.label` (segunda linha de `time` da mesma rodada) | idem |
| `formacao` | — (sem campo em `app.time`/`app.rodada`/`app.participacao_rodada`) | **Divergência D5** — ver abaixo |
| `criado_em` | — (decisão de detalhe, mesmo caso de `jogadores.criado_em`) | — |

### 5.3 `presencas_rodada` → `app.participacao_rodada` + `app.evento_jogo` + `app.lancamento_pontos`

| Campo legado | Campo `app` | Nota |
|---|---|---|
| `id` | — (novo `uuid`, rastreado via `legado_migracao_registro`) | — |
| `data_rodada` + `atleta_id` + `tipo_atleta` | `participacao_rodada.rodada_id` + `participacao_rodada.atleta_id` | requer resolver `data_rodada` → `rodada.id` novo (via `rodadas` já migrada) e `(atleta_id, tipo_atleta)` → `atleta.id` novo (via `jogadores`/`goleiros` já migrados) — **as 184 linhas órfãs (Divergência D1) não têm `data_rodada` resolvível** |
| `status` | `participacao_rodada.status` | valores `"presente"`/`"ausente"`/`"lesionado"` já batem **literalmente** com o enum do `SDD.md` (`"presente\|ausente\|lesionado"`) — mapeamento direto sem transformação, exceto as 184 linhas com `status = null` (Divergência D1) |
| `presente` (boolean) | — (redundante com `status`) | não precisa migrar como campo próprio — `status = "presente"`/`"lesionado"` já cobre a informação; **decisão de detalhe**, não divergência |
| `gols_marcados` | `evento_jogo` (uma linha com `tipo = "gol"`, `quantidade = gols_marcados`) quando `> 0` | mapeamento direto na estrutura, mas **0 eventos reais existem para validar** (coluna sempre 0 nos dados atuais) |
| `cartao_amarelo` (integer) | `evento_jogo` (uma linha com `tipo = "cartao_amarelo"`, `quantidade = cartao_amarelo`) quando `> 0` | mapeamento direto na estrutura, mas **0 eventos reais existem para validar** (coluna sempre 0 nos dados atuais) |
| `cartao_vermelho` (boolean) | `evento_jogo` (uma linha com `tipo = "cartao_vermelho"`, `quantidade = 1`) quando `true` | mapeamento direto, **4 linhas reais existem para validar** |
| `pontos_ganhos` | `lancamento_pontos` (uma linha com `origem = "migracao_legado"`, `pontos_delta = pontos_ganhos`, vinculada ao `atleta_id`/`rodada_id` novos) | RN-13/RF-08.4: preserva o valor exatamente como está, **nunca recalculado pela tabela RN-05 nova** (ver fórmula divergente confirmada na Seção 2.4) |
| `posicao` | — (sem campo em `app.participacao_rodada`) | **sempre `null` nos dados reais** — não há dado real a perder; ainda assim listada como coluna sem correspondência (Divergência D6, baixo impacto) |
| `time` (texto livre, "qual time o atleta jogou") | `time_atleta` (associação `time_id`+`atleta_id`, resolvendo o texto livre para o `time.id` novo da mesma rodada) | só 22/770 linhas (~2,9%) têm esse campo preenchido — cobertura muito baixa; ver Divergência D7 |

### 5.4 `substituicoes_rodada` → `app.substituicao`

Tabela vazia no legado (0 linhas) — nada a migrar. Mapeamento estrutural
(para quando/se BE-15 quiser validar a estrutura mesmo sem dados):
`data_rodada` → resolve `rodada_id`; `time` → resolve `time_id`;
`atleta_saindo_id`+`tipo_atleta_saindo` → resolve `atleta_sai_id`;
`atleta_entrando_id`+`tipo_atleta_entrando` → resolve `atleta_entra_id`.

### 5.5 Sem correspondência no legado (tabelas novas que nascem vazias)

- `app.restricao_obrigatoria` — conceito de restrição obrigatória entre pares
  de atletas **não existe em nenhuma tabela do legado**. Nada a migrar; a
  tabela nasce vazia e só passa a ser populada por uso futuro do organizador
  na área interna nova. Não é uma divergência de dado perdido — é um
  recurso novo que o legado nunca teve.
- `app.configuracao_pontuacao` — a tabela de pontuação versionada (RN-05) não
  existe no legado (a fórmula de pontos do legado, inferida na Seção 2.4, era
  aparentemente fixa em código/aplicação, não configurável em tabela). Nada a
  migrar; a tabela nasce só com o seed dos valores RN-05 definidos no
  `PRD-TECNICO.md`, válidos a partir da primeira rodada pós-migração
  (RF-08.4).

---

## 6. Divergências para confirmação explícita do organizador (RF-08.3)

Nenhuma das divergências abaixo foi decidida unilateralmente por esta tarefa
— são listadas para confirmação antes de BE-15 assumir qualquer
comportamento padrão sobre elas, conforme a instrução literal do
procedimento (Seção 2 do `TASK.md`, item 3): "todo campo sem correspondência
clara exige confirmação explícita do organizador antes de descartar".

- **D1 — 184 linhas de `presencas_rodada` (24% do total) órfãs de `rodadas`**
  (datas `2026-05-03`, `2026-05-10`, `2026-05-17`, `2026-05-24`, 46 linhas
  cada, todas com `status = null`). Provável efeito de rodadas deletadas no
  legado sem cascata sobre as presenças associadas. **Pergunta ao
  organizador**: essas 184 linhas devem ser (a) descartadas na migração
  (rodadas nunca existiram "de verdade"), ou (b) reconstituídas como 4 novas
  `rodada` na schema `app` a partir da própria data, mesmo sem dados de
  `nome_time_a`/`nome_time_b`/`formacao` (que também não existem para essas
  4 datas)? Maior divergência de dado real encontrada neste spike — impacto
  direto em 24% do histórico de presença.
- **D2 — discriminador `tipo_atleta` (`"Linha"`/`"Goleiro"`) não tem campo
  equivalente em `app.atleta`.** O `RF-01` do `PRD-TECNICO.md` já declara
  "sem categoria fixa de posição" para o cadastro novo, o que sugere que essa
  distinção foi deliberadamente descartada no redesenho — mas como afeta
  **56 atletas goleiros reais** (e o texto do `RF-01` não menciona
  explicitamente "goleiro" como sinônimo de "posição"), fica como divergência
  formal para confirmação, não como decisão já assumida por este spike.
- **D3 — `consentimento_responsavel_obtido` (RN-02, campo obrigatório na
  tela de cadastro novo) não existe em nenhuma linha do legado.** Os 47
  atletas (42 jogadores + 5 goleiros) migrados não terão como preencher esse
  campo retroativamente com um valor real. **Pergunta ao organizador**: os
  registros migrados devem nascer com esse campo `false`/pendente (exigindo
  confirmação manual pós-migração, um a um) ou `true` assumido em bloco (sob
  responsabilidade do organizador, já que são atletas historicamente ativos
  no grupo)? Decisão de política, não de engenharia — não pode ser decidida
  pelo Backend.
- **D4 — atributos de habilidade (`visao_jogo`, `passe`, `preparo_fisico`,
  `drible`, `chute`, `desarme`) e `posicoes_preferidas` não têm campo em
  `app.atleta`.** Diferente de D2, esta já é uma decisão de produto
  **documentada e explícita** (`PRD-TECNICO.md`, item 3 da lista de
  interpretações/premissas, e `RN-03`: "nível técnico" no sistema novo é
  **derivado** de pontos por presença, não de nota manual de habilidade) —
  mas o próprio `PRD-TECNICO.md` marca essa decisão como "sujeita a
  validação do organizador", então continua listada aqui como pendente de
  confirmação final antes do relatório de conferência (RF-08.5), e não como
  já 100% resolvida. Risco residual a sinalizar: se não migrados nem
  arquivados em nenhum lugar, esses dados (histórico de avaliação de 42
  jogadores) somem definitivamente quando a schema legada for removida
  (RF-08.6) — vale perguntar ao organizador se quer um arquivo de backup
  bruto fora do banco antes da remoção, mesmo que não entre em `app`.
- **D5 — `rodadas.formacao` (formação tática, ex. "4-3-3") não tem campo em
  `app.rodada`/`app.time`.** Não é mencionado em nenhum RF/RN do
  `PRD-TECNICO.md`/`SDD.md`. Valor constante (`"4-3-3"`) nas 13 rodadas
  reais, então o impacto de descartar é baixo, mas ainda é um campo sem
  correspondência clara — fica na lista por regra, não descartado
  silenciosamente.
- **D6 — `presencas_rodada.posicao` sem campo correspondente.** Impacto real
  nulo (campo sempre `null` nas 770 linhas), mas listado por completude.
- **D7 — `presencas_rodada.time` (qual time o atleta jogou) tem cobertura
  muito baixa (22/770, ~2,9%) e é texto livre, não uma referência a
  `rodadas.nome_time_a`/`nome_time_b`.** **Pergunta ao organizador**: vale a
  pena migrar essas 22 linhas para `time_atleta` (baixíssima cobertura,
  possivelmente não representativa) ou é preferível tratar como dado não
  confiável e não migrar nenhuma associação `time_atleta` do histórico
  (rodadas migradas nascem sem composição de time registrada, só com o
  registro de presença/pontuação)?

---

## 7. Observações para quem for implementar BE-15

- Sem senha de conexão direta ao Postgres disponível nesta fase — BE-15
  provavelmente vai precisar do mesmo padrão de acesso via PostgREST
  (`@supabase/supabase-js` com a `service_role` key, que o projeto já usa
  como dependência) em vez de uma conexão `pg` direta ao legado, a não ser
  que a senha seja disponibilizada antes de BE-15 começar.
- `GUARDRAILS.md` regra 35: nenhuma execução real de BE-15 contra a schema
  legada real pode iniciar antes do adendo de "plano de saída" do ADR-002
  ser redigido e aceito pelo Software Architect (`BLOCKER-003`, ainda aberto
  na data deste spike). BE-15 pode ser desenvolvido/testado contra dado de
  teste, não contra o projeto legado real, até essa condição ser satisfeita.
- `BE-14` já implementou a trava técnica que impede `DROP`/`ALTER`
  destrutivo e qualquer escrita comum (`INSERT`/`UPDATE`/`DELETE`/
  `TRUNCATE`) contra `public` no legado até a flag de validação
  (`app.legado_migracao_validacao`) ser gravada — BE-15 já pode contar com
  essa proteção ativa.
- As 7 divergências (D1–D7) acima precisam de resposta do organizador antes
  do relatório de conferência final (RF-08.5); nenhuma foi decidida
  unilateralmente aqui. Recomenda-se que o Tech Lead leve essa lista ao
  organizador **antes** de BE-15 escrever a lógica de transformação, para
  evitar retrabalho se as respostas mudarem o mapeamento.
- Nenhum volume de dado é grande (770 linhas na maior tabela) — não há
  preocupação de performance/lote para o script de transformação em BE-15,
  mesmo rodando em uma única transação por entidade.

---

## 8. Timebox

Recomendado pelo `TASK.md` Seção 2: 2-3 PD. Gasto real neste spike: dentro
do timebox (investigação concentrada em uma única sessão, sem retrabalho —
método de introspecção já validado por BE-14 foi reaproveitado diretamente,
o que reduziu o tempo necessário frente ao pior caso de descobrir o método
do zero).
