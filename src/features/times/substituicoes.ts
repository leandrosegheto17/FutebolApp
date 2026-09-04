import type { AtletaConfirmado, Substituicao, TimeConfirmado } from "./types";

/**
 * Lógica pura de T11 (Substituição no Intervalo, TASK.md FE-11) — nenhuma
 * função aqui faz chamada de rede (ver `substituicoesApi.ts`).
 */

/**
 * Roster "ao vivo" de um time — aplica, em ordem cronológica, todas as
 * substituições já registradas PARA ESTE `time_id` (RF-06.1: "vincula esse
 * evento à rodada e ao time correspondente"). Decisão de detalhe documentada
 * (nem `UX-SPEC.md` nem `API-CONTRACT.yaml` atualizam `app.time_atleta` ao
 * registrar uma substituição — é puro registro histórico, RF-06.3, e o
 * `POST` correspondente só faz `INSERT` em `app.substituicao`): para que o
 * seletor "Sai" de uma substituição SEGUINTE ofereça quem de fato segue em
 * campo (não alguém que já saiu numa substituição anterior desta mesma
 * rodada), o Frontend deriva esse roster localmente a partir do roster
 * persistido (`TimeConfirmado.atletas`, `POST /api/rodadas/{id}/times`,
 * BE-13) + histórico (`GET /api/rodadas/{id}/substituicoes`), sem nunca
 * escrever nada de volta no servidor a partir deste cálculo.
 */
export function rosterAtualDoTime(
  time: TimeConfirmado,
  substituicoes: Substituicao[],
): AtletaConfirmado[] {
  const substituicoesDoTime = substituicoes.filter((sub) => sub.time_id === time.time_id);
  return substituicoesDoTime.reduce<AtletaConfirmado[]>((roster, sub) => {
    const semQuemSaiu = roster.filter((atleta) => atleta.atleta_id !== sub.atleta_sai_id);
    return [
      ...semQuemSaiu,
      { atleta_id: sub.atleta_entra_id, apelido_exibicao: sub.atleta_entra_nome },
    ];
  }, time.atletas);
}

/**
 * Rótulo do time de uma substituição, para a lista "Substituições
 * registradas" — mostrada com o histórico completo da rodada (todos os
 * times), não só do time em cujo contexto o organizador abriu T11
 * (`UX-SPEC.md` Seção 2, wireframe T11: "João Pedro ↔ Bruno (Time A)" — o
 * sufixo do time aparece mesmo dentro da tela de um time específico,
 * indicando que a lista não é filtrada por time). `"Time"` como fallback
 * nunca deveria ocorrer na prática (todo `time_id` de uma substituição
 * existente referencia um `TimeConfirmado` já carregado), mas evita um
 * `undefined` visível caso a lista de times fornecida esteja incompleta.
 */
export function labelDoTime(times: TimeConfirmado[], timeId: string): string {
  return times.find((time) => time.time_id === timeId)?.label ?? "Time";
}
