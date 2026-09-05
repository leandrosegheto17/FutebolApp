/**
 * Acesso a `app.rodada`/`app.participacao_rodada`/`app.evento_jogo`/
 * `app.lancamento_pontos` (BE-08) — sempre via `getServiceRoleClient()`
 * (TASK.md Seção 1.2/GUARDRAILS.md regra 6: `anon` nunca escreve/lê estas
 * tabelas; toda leitura/escrita passa pela `service role` no servidor,
 * atrás do middleware de sessão).
 *
 * A escrita multi-tabela em si (INSERT em `rodada` + `participacao_rodada` +
 * `evento_jogo` + `lancamento_pontos`, cálculo de pontos) NUNCA acontece
 * aqui — vive inteira na função PL/pgSQL `app.lancar_rodada` (migration
 * `20260903120100_create_lancar_rodada_function.sql`), acionada via RPC
 * (`lancarRodadaViaRpc` abaixo). Este módulo só lê/verifica duplicidade
 * antes da chamada e relê o resultado depois — mesmo padrão de separação já
 * usado por `src/modules/atletas/anonimizar.ts` (BE-07) para
 * `app.anonimizar_atleta`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RodadaRow = {
  id: string;
  data: string;
  status: string;
  criado_em: string;
};

/**
 * Rodadas `lancada` (nunca `excluida` — soft-delete, BE-02) com a mesma
 * `data` — usada para o alerta de duplicidade (RF-02.8). Decisão de detalhe
 * (não escalada, mesmo racional já documentado na migration de
 * `app.lancar_rodada`): rodada `excluida` não conta como "já existente" para
 * este alerta, porque seus pontos já foram revertidos e ela deixou de
 * representar um lançamento real na data em questão.
 */
export async function listarRodadasLancadasPorData(
  client: SupabaseClient<any, any, any>,
  data: string,
): Promise<RodadaRow[]> {
  const { data: rows, error } = await client
    .from("rodada")
    .select("id, data, status, criado_em")
    .eq("data", data)
    .eq("status", "lancada");
  if (error) {
    throw new Error(`Falha ao consultar app.rodada por data ${data}: ${error.message}`);
  }
  return (rows ?? []) as unknown as RodadaRow[];
}

export async function buscarRodadaPorId(
  client: SupabaseClient<any, any, any>,
  id: string,
): Promise<RodadaRow | null> {
  const { data, error } = await client
    .from("rodada")
    .select("id, data, status, criado_em")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao buscar app.rodada ${id}: ${error.message}`);
  }
  return (data as unknown as RodadaRow | null) ?? null;
}

export type EventoJogoRow = {
  id: string;
  participacao_id: string;
  tipo: string;
  quantidade: number;
};

export type ParticipacaoRodadaRow = {
  id: string;
  rodada_id: string;
  atleta_id: string;
  status: string;
};

/** Participações de uma rodada, cada uma com os eventos de jogo associados (gol/cartão). */
export async function listarParticipacoesComEventos(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<Array<ParticipacaoRodadaRow & { eventos: EventoJogoRow[] }>> {
  const { data: participacoes, error: participacoesError } = await client
    .from("participacao_rodada")
    .select("id, rodada_id, atleta_id, status")
    .eq("rodada_id", rodadaId);
  if (participacoesError) {
    throw new Error(
      `Falha ao listar app.participacao_rodada da rodada ${rodadaId}: ${participacoesError.message}`,
    );
  }
  const linhas = (participacoes ?? []) as unknown as ParticipacaoRodadaRow[];
  if (linhas.length === 0) {
    return [];
  }

  const participacaoIds = linhas.map((linha) => linha.id);
  const { data: eventos, error: eventosError } = await client
    .from("evento_jogo")
    .select("id, participacao_id, tipo, quantidade")
    .in("participacao_id", participacaoIds);
  if (eventosError) {
    throw new Error(
      `Falha ao listar app.evento_jogo da rodada ${rodadaId}: ${eventosError.message}`,
    );
  }
  const eventosPorParticipacao = new Map<string, EventoJogoRow[]>();
  for (const evento of (eventos ?? []) as unknown as EventoJogoRow[]) {
    const lista = eventosPorParticipacao.get(evento.participacao_id) ?? [];
    lista.push(evento);
    eventosPorParticipacao.set(evento.participacao_id, lista);
  }

  return linhas.map((linha) => ({
    ...linha,
    eventos: eventosPorParticipacao.get(linha.id) ?? [],
  }));
}

export type LancamentoPontosRow = {
  id: string;
  atleta_id: string;
  rodada_id: string;
  origem: string;
  pontos_delta: number;
  criado_em: string;
};

/** Lançamentos de pontos (`origem = 'lancamento'`) desta rodada — um por atleta. */
export async function listarLancamentosPorRodada(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<LancamentoPontosRow[]> {
  const { data, error } = await client
    .from("lancamento_pontos")
    .select("id, atleta_id, rodada_id, origem, pontos_delta, criado_em")
    .eq("rodada_id", rodadaId);
  if (error) {
    throw new Error(
      `Falha ao listar app.lancamento_pontos da rodada ${rodadaId}: ${error.message}`,
    );
  }
  return (data ?? []) as unknown as LancamentoPontosRow[];
}

/**
 * Payload aceito pela RPC `app.lancar_rodada` — espelha exatamente o corpo
 * jsonb documentado na migration (`p_participacoes`).
 */
export type ParticipacaoRpcInput = {
  atleta_id: string;
  status: "presente" | "ausente" | "lesionado";
  eventos: Array<{
    tipo: "gol" | "cartao_amarelo" | "cartao_vermelho";
    quantidade: number;
  }>;
};

/**
 * Aciona `app.lancar_rodada` via RPC (sempre `service role`, TASK.md Seção
 * 1.2/GUARDRAILS.md regra 6) — retorna o `id` da rodada recém-criada. Toda a
 * gravação multi-tabela (presença + eventos + cálculo/gravação de pontos)
 * acontece dentro da própria função, em uma única transação Postgres; este
 * cliente TypeScript nunca orquestra os INSERTs em separado.
 */
export async function lancarRodadaViaRpc(
  client: SupabaseClient<any, any, any>,
  data: string,
  participacoes: ParticipacaoRpcInput[],
): Promise<{ rodadaId: string } | { erro: { code: string; message: string } }> {
  const { data: rodadaId, error } = await client.rpc("lancar_rodada", {
    p_data: data,
    p_participacoes: participacoes,
  });

  if (error) {
    return { erro: { code: error.code ?? "", message: error.message } };
  }
  return { rodadaId: rodadaId as unknown as string };
}

/**
 * Aciona `app.excluir_rodada` via RPC (BE-09, RF-04.1 — sempre `service
 * role`). Toda a reversão multi-tabela (estorno de pontos por atleta +
 * `rodada.status = 'excluida'` + `log_auditoria`) acontece dentro da
 * própria função, em uma única transação Postgres.
 */
export async function excluirRodadaViaRpc(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<{ ok: true } | { erro: { code: string; message: string } }> {
  const { error } = await client.rpc("excluir_rodada", { p_rodada_id: rodadaId });
  if (error) {
    return { erro: { code: error.code ?? "", message: error.message } };
  }
  return { ok: true };
}

/**
 * Aciona `app.corrigir_participacao_rodada` via RPC (BE-09, RF-04.2 —
 * sempre `service role`). Toda a correção multi-tabela (atualização de
 * `participacao_rodada`/`evento_jogo` + lançamento de ajuste +
 * `log_auditoria`) acontece dentro da própria função, em uma única
 * transação Postgres.
 */
export async function corrigirParticipacaoViaRpc(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  atletaId: string,
  novoStatus: "presente" | "ausente" | "lesionado",
  novosEventos: Array<{
    tipo: "gol" | "cartao_amarelo" | "cartao_vermelho";
    quantidade: number;
  }>,
): Promise<{ ok: true } | { erro: { code: string; message: string } }> {
  const { error } = await client.rpc("corrigir_participacao_rodada", {
    p_rodada_id: rodadaId,
    p_atleta_id: atletaId,
    p_novo_status: novoStatus,
    p_novos_eventos: novosEventos,
  });
  if (error) {
    return { erro: { code: error.code ?? "", message: error.message } };
  }
  return { ok: true };
}

/**
 * Soma líquida de `lancamento_pontos.pontos_delta` para um `(atleta_id,
 * rodada_id)` — o total já efetivamente refletido no saldo do atleta para
 * esta rodada, após qualquer lançamento/correção/estorno (BE-09). Usado
 * para montar a resposta de `PATCH .../participacoes/:atletaId` e para
 * releitura em testes.
 */
export async function somaPontosPorAtletaRodada(
  client: SupabaseClient<any, any, any>,
  atletaId: string,
  rodadaId: string,
): Promise<number> {
  const { data, error } = await client
    .from("lancamento_pontos")
    .select("pontos_delta")
    .eq("atleta_id", atletaId)
    .eq("rodada_id", rodadaId);
  if (error) {
    throw new Error(
      `Falha ao somar app.lancamento_pontos de ${atletaId}/${rodadaId}: ${error.message}`,
    );
  }
  return (data ?? []).reduce(
    (total, linha) => total + Number((linha as { pontos_delta: number }).pontos_delta),
    0,
  );
}

/** Uma participação (com eventos) de um atleta específico numa rodada — `null` se não existir. */
export async function buscarParticipacaoComEventos(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  atletaId: string,
): Promise<(ParticipacaoRodadaRow & { eventos: EventoJogoRow[] }) | null> {
  const { data: participacao, error } = await client
    .from("participacao_rodada")
    .select("id, rodada_id, atleta_id, status")
    .eq("rodada_id", rodadaId)
    .eq("atleta_id", atletaId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Falha ao buscar app.participacao_rodada ${rodadaId}/${atletaId}: ${error.message}`,
    );
  }
  if (!participacao) {
    return null;
  }
  const linha = participacao as unknown as ParticipacaoRodadaRow;
  const { data: eventos, error: eventosError } = await client
    .from("evento_jogo")
    .select("id, participacao_id, tipo, quantidade")
    .eq("participacao_id", linha.id);
  if (eventosError) {
    throw new Error(
      `Falha ao listar app.evento_jogo da participação ${linha.id}: ${eventosError.message}`,
    );
  }
  return { ...linha, eventos: (eventos ?? []) as unknown as EventoJogoRow[] };
}

/**
 * Aciona `app.simular_correcao_rodada` via RPC (BE-10, preview read-only —
 * sempre `service role`). A função é estritamente de LEITURA (nenhum
 * INSERT/UPDATE/DELETE em nenhuma tabela, mesmo hipoteticamente) — delega
 * todo o cálculo ao mesmo helper (`app.calcular_correcao_participacao_rodada`)
 * que `app.corrigir_participacao_rodada` (BE-09) usa para gravar, então o
 * delta retornado aqui é exatamente o que a correção real aplicaria para o
 * mesmo cenário (TASK.md Seção 6.2 item 2).
 */
export type PreviewCorrecaoParticipacaoRpc = {
  atleta_id: string;
  status_atual: string;
  eventos_atuais: Array<{ tipo: string; quantidade: number }>;
  novo_status: string;
  novos_eventos: Array<{ tipo: string; quantidade: number }>;
  pontos_antes: number;
  pontos_depois: number;
  pontos_delta: number;
};

export async function simularCorrecaoParticipacaoViaRpc(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
  atletaId: string,
  novoStatus: "presente" | "ausente" | "lesionado",
  novosEventos: Array<{
    tipo: "gol" | "cartao_amarelo" | "cartao_vermelho";
    quantidade: number;
  }>,
): Promise<
  | { preview: PreviewCorrecaoParticipacaoRpc }
  | { erro: { code: string; message: string } }
> {
  const { data, error } = await client
    .rpc("simular_correcao_rodada", {
      p_rodada_id: rodadaId,
      p_atleta_id: atletaId,
      p_novo_status: novoStatus,
      p_novos_eventos: novosEventos,
    })
    .single();

  if (error) {
    return { erro: { code: error.code ?? "", message: error.message } };
  }
  return { preview: data as unknown as PreviewCorrecaoParticipacaoRpc };
}

/**
 * Resumo de uma rodada para a listagem de `GET /api/rodadas` (BE-16, T06 do
 * `UX-SPEC.md`) — os mesmos campos de `RodadaRow` mais `presentes`
 * (contagem de `participacao_rodada.status = 'presente'` desta rodada,
 * campo literal do wireframe T06: "19/09/2026 · 18 presentes").
 */
export type RodadaResumoRow = RodadaRow & { presentes: number };

/**
 * Lista rodadas em ordem cronológica decrescente (mais recente primeiro,
 * BE-16, critério de aceite literal "lista cronológica decrescente" de
 * FE-06/T06) — ordenado por `data` desc e, em caso de empate (duas rodadas
 * na mesma data civil, cenário válido via `confirmar_duplicidade`, RF-02.8),
 * por `criado_em` desc como desempate (decisão de detalhe, não escalada).
 *
 * Decisão de detalhe (TASK.md — "rodada `excluida` aparece na listagem"):
 * NUNCA filtra por `status` — rodada `excluida` (soft-delete) aparece
 * normalmente na lista, com `status: "excluida"` visível, nunca escondida
 * silenciosamente (mesmo racional já usado para `restricao_obrigatoria`
 * desativada em T10/BE-12: histórico permanece visível, nunca some da
 * tela). Quem decide o que fazer com uma rodada excluída na UI é o
 * Frontend (FE-06/FE-07), não uma omissão silenciosa do Backend.
 *
 * `presentes` calculado em uma segunda query agregada em memória (mesmo
 * padrão de duas queries sem `JOIN` já usado por
 * `listarParticipacoesComEventos` acima) — evita N+1 (uma contagem por
 * rodada) mantendo a mesma simplicidade de não usar SQL agregado
 * customizado (`count(*) ... group by`) via PostgREST.
 */
export async function listarRodadasResumo(
  client: SupabaseClient<any, any, any>,
  limit: number,
): Promise<RodadaResumoRow[]> {
  const { data: rodadas, error } = await client
    .from("rodada")
    .select("id, data, status, criado_em")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`Falha ao listar app.rodada: ${error.message}`);
  }
  const linhas = (rodadas ?? []) as unknown as RodadaRow[];
  if (linhas.length === 0) {
    return [];
  }

  const ids = linhas.map((linha) => linha.id);
  const { data: presencas, error: presencasError } = await client
    .from("participacao_rodada")
    .select("rodada_id")
    .in("rodada_id", ids)
    .eq("status", "presente");
  if (presencasError) {
    throw new Error(
      `Falha ao contar presentes de app.participacao_rodada: ${presencasError.message}`,
    );
  }
  const presentesPorRodada = new Map<string, number>();
  for (const linha of (presencas ?? []) as unknown as Array<{ rodada_id: string }>) {
    presentesPorRodada.set(
      linha.rodada_id,
      (presentesPorRodada.get(linha.rodada_id) ?? 0) + 1,
    );
  }

  return linhas.map((linha) => ({
    ...linha,
    presentes: presentesPorRodada.get(linha.id) ?? 0,
  }));
}

/**
 * `id -> apelido_exibicao` (RN-06) dos atletas informados — usado para
 * denormalizar o nome de exibição de cada participação no detalhe de
 * `GET /api/rodadas/{id}` (BE-16, T07 do `UX-SPEC.md`: a tela mostra
 * "Carlinhos", não um uuid). Mesmo padrão já usado por
 * `buscarApelidosAtletas` em `src/modules/times/restricoes/repository.ts`
 * (BE-12) — cópia local, não importada de lá, para manter os módulos
 * independentes (mesmo racional de fronteira de módulo já aplicado entre
 * `rodadas` e `restricoes`, dois submódulos de domínios distintos que
 * também consomem `app.atleta` só para leitura de nome).
 */
export async function buscarApelidosAtletas(
  client: SupabaseClient<any, any, any>,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const idsUnicos = Array.from(new Set(ids));
  if (idsUnicos.length === 0) {
    return new Map();
  }
  const { data, error } = await client
    .from("atleta")
    .select("id, apelido_exibicao")
    .in("id", idsUnicos);
  if (error) {
    throw new Error(`Falha ao buscar apelido_exibicao de atletas: ${error.message}`);
  }
  return new Map(
    ((data ?? []) as unknown as Array<{ id: string; apelido_exibicao: string }>).map(
      (linha) => [linha.id, linha.apelido_exibicao],
    ),
  );
}

/**
 * `app.time` + `app.time_atleta` das rodadas informadas, agrupados por
 * `rodada_id` (BE-R02, TASK.md Parte II Seção 3.1 — "Confronto" de `GET
 * /api/rodadas`). Times ordenados por `label asc, id asc` dentro de cada
 * rodada — base do mapeamento posicional `colete`/`sem_colete` de
 * `confronto.ts`.
 *
 * **Decisão de detalhe (não escalada) — por que `label`, não `criado_em`**:
 * `app.confirmar_times_rodada` (BE-13) insere todos os times de uma rodada
 * dentro da MESMA transação PL/pgSQL — `now()`/`default now()` do Postgres
 * é fixado no início da transação (não muda entre INSERTs sucessivos da
 * mesma chamada), então os N times de uma mesma confirmação sempre têm
 * `criado_em` IDÊNTICO entre si; ordenar por `criado_em` degeneraria, na
 * prática, em ordenar por `id` (uuid aleatório), sem nenhuma relação com a
 * ordem em que o organizador informou os times. `label` (default "Time
 * A"/"Time B" por posição, `src/modules/times/confirmacao/mutate.ts`) é o
 * único dado que preserva alguma ordem estável e determinística — usado
 * aqui só para produzir um split determinístico e reproduzível em `colete`/
 * `sem_colete`, não para inferir qual time é literalmente "o Colete" (essa
 * semântica real depende da renomeação de `label` ainda não implementada,
 * `UX-SPEC.md` Parte II Seção 2.6 item 1, escopo de `FE-R09`).
 *
 * Rodada sem NENHUM `app.time` persistido (todo o período legado,
 * confirmado por `SPK-02` — `BE-15` decidiu não migrar estas tabelas; ou
 * qualquer rodada do sistema novo cujos times ainda não foram confirmados
 * via T09) simplesmente não aparece no `Map` de retorno.
 */
export type TimeComAtletasRow = {
  id: string;
  rodada_id: string;
  atletaIds: string[];
};

export async function listarTimesComAtletasPorRodadas(
  client: SupabaseClient<any, any, any>,
  rodadaIds: readonly string[],
): Promise<Map<string, TimeComAtletasRow[]>> {
  if (rodadaIds.length === 0) {
    return new Map();
  }

  const { data: times, error } = await client
    .from("time")
    .select("id, rodada_id, label")
    .in("rodada_id", rodadaIds)
    .order("label", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Falha ao listar app.time das rodadas informadas: ${error.message}`);
  }
  const timeRows = (times ?? []) as unknown as Array<{
    id: string;
    rodada_id: string;
    label: string;
  }>;
  if (timeRows.length === 0) {
    return new Map();
  }

  const timeIds = timeRows.map((linha) => linha.id);
  const { data: timeAtletas, error: timeAtletaError } = await client
    .from("time_atleta")
    .select("time_id, atleta_id")
    .in("time_id", timeIds);
  if (timeAtletaError) {
    throw new Error(
      `Falha ao listar app.time_atleta dos times informados: ${timeAtletaError.message}`,
    );
  }
  const atletaIdsPorTime = new Map<string, string[]>();
  for (const linha of (timeAtletas ?? []) as unknown as Array<{
    time_id: string;
    atleta_id: string;
  }>) {
    const lista = atletaIdsPorTime.get(linha.time_id) ?? [];
    lista.push(linha.atleta_id);
    atletaIdsPorTime.set(linha.time_id, lista);
  }

  const timesPorRodada = new Map<string, TimeComAtletasRow[]>();
  for (const linha of timeRows) {
    const lista = timesPorRodada.get(linha.rodada_id) ?? [];
    lista.push({
      id: linha.id,
      rodada_id: linha.rodada_id,
      atletaIds: atletaIdsPorTime.get(linha.id) ?? [],
    });
    timesPorRodada.set(linha.rodada_id, lista);
  }
  return timesPorRodada;
}

/**
 * Total de gols (`app.evento_jogo.tipo = 'gol'`, somando `quantidade`) por
 * atleta, agrupado por rodada — usado por BE-R02 para "Confronto" (a soma
 * de pontos de gol de cada time exige saber quantos gols cada atleta da
 * rodada marcou, antes de multiplicar pelo valor vigente do evento "gol").
 * Ausência de entrada para um `atleta_id` numa rodada = 0 gols (nunca uma
 * linha explícita com `0`).
 */
export async function somarGolsPorAtletaERodada(
  client: SupabaseClient<any, any, any>,
  rodadaIds: readonly string[],
): Promise<Map<string, Map<string, number>>> {
  if (rodadaIds.length === 0) {
    return new Map();
  }

  const { data: participacoes, error } = await client
    .from("participacao_rodada")
    .select("id, rodada_id, atleta_id")
    .in("rodada_id", rodadaIds);
  if (error) {
    throw new Error(
      `Falha ao listar app.participacao_rodada para cálculo de gols: ${error.message}`,
    );
  }
  const participacaoRows = (participacoes ?? []) as unknown as Array<{
    id: string;
    rodada_id: string;
    atleta_id: string;
  }>;
  if (participacaoRows.length === 0) {
    return new Map();
  }

  const participacaoIds = participacaoRows.map((linha) => linha.id);
  const { data: eventosGol, error: eventosError } = await client
    .from("evento_jogo")
    .select("participacao_id, quantidade")
    .eq("tipo", "gol")
    .in("participacao_id", participacaoIds);
  if (eventosError) {
    throw new Error(
      `Falha ao listar app.evento_jogo (tipo=gol) para cálculo de confronto: ${eventosError.message}`,
    );
  }
  const golsPorParticipacao = new Map<string, number>();
  for (const linha of (eventosGol ?? []) as unknown as Array<{
    participacao_id: string;
    quantidade: number;
  }>) {
    golsPorParticipacao.set(
      linha.participacao_id,
      (golsPorParticipacao.get(linha.participacao_id) ?? 0) + Number(linha.quantidade),
    );
  }

  const resultado = new Map<string, Map<string, number>>();
  for (const linha of participacaoRows) {
    const gols = golsPorParticipacao.get(linha.id) ?? 0;
    if (gols === 0) {
      continue;
    }
    const porAtleta = resultado.get(linha.rodada_id) ?? new Map<string, number>();
    porAtleta.set(linha.atleta_id, (porAtleta.get(linha.atleta_id) ?? 0) + gols);
    resultado.set(linha.rodada_id, porAtleta);
  }
  return resultado;
}

/**
 * Valores vigentes de `app.configuracao_pontuacao` para um `evento`
 * específico (ex.: `"gol"`) — usado por BE-R02/`confronto.ts` para
 * resolver o valor de pontos por gol na data de cada rodada (mesma regra de
 * vigência de `app.lancar_rodada`, BE-08: a linha com a maior
 * `vigente_desde` que ainda seja `<=` a data do evento).
 */
export async function listarConfiguracaoPontosPorEvento(
  client: SupabaseClient<any, any, any>,
  evento: string,
): Promise<Array<{ pontos: number; vigente_desde: string }>> {
  const { data, error } = await client
    .from("configuracao_pontuacao")
    .select("pontos, vigente_desde")
    .eq("evento", evento);
  if (error) {
    throw new Error(
      `Falha ao listar app.configuracao_pontuacao do evento "${evento}": ${error.message}`,
    );
  }
  return (data ?? []) as unknown as Array<{ pontos: number; vigente_desde: string }>;
}

/**
 * `rodada_id`s (dentre os informados) que têm ao menos uma entrada em
 * `app.log_auditoria` — usado por BE-R02 para o campo `status_correcao`
 * ("corrigida" quando existe entrada, "encerrada" caso contrário, TASK.md
 * Parte II Seção 6.2-R item 5, RF-04.4). Não filtra por `tipo_evento`:
 * tanto `"correcao"` (RF-04.2, `app.corrigir_participacao_rodada`) quanto
 * `"estorno"` (RF-04.1, `app.excluir_rodada`) contam como "esta rodada já
 * teve uma entrada de auditoria registrada" — leitura literal do critério
 * de aceite ("derivado da existência de entrada em log de auditoria RF-04.4
 * para aquela rodada", sem exceção por tipo).
 */
export async function listarRodadaIdsComLogAuditoria(
  client: SupabaseClient<any, any, any>,
  rodadaIds: readonly string[],
): Promise<Set<string>> {
  if (rodadaIds.length === 0) {
    return new Set();
  }
  const { data, error } = await client
    .from("log_auditoria")
    .select("rodada_id")
    .in("rodada_id", rodadaIds);
  if (error) {
    throw new Error(`Falha ao listar app.log_auditoria das rodadas informadas: ${error.message}`);
  }
  return new Set(
    ((data ?? []) as unknown as Array<{ rodada_id: string | null }>)
      .map((linha) => linha.rodada_id)
      .filter((rodadaId): rodadaId is string => rodadaId !== null),
  );
}

/** Quantidade de atletas distintos com participação numa rodada — usado no resumo de exclusão (BE-09). */
export async function contarParticipantesPorRodada(
  client: SupabaseClient<any, any, any>,
  rodadaId: string,
): Promise<number> {
  const { count, error } = await client
    .from("participacao_rodada")
    .select("id", { count: "exact", head: true })
    .eq("rodada_id", rodadaId);
  if (error) {
    throw new Error(
      `Falha ao contar app.participacao_rodada da rodada ${rodadaId}: ${error.message}`,
    );
  }
  return count ?? 0;
}
