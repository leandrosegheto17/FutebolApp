/**
 * Tipos do lado do Frontend para T10 (Gestão de Restrições Obrigatórias) —
 * TASK.md FE-10. Espelham `RestricaoBody`/`RestricaoObrigatoriaResponse`/
 * `ErroValidacaoRestricao`/`ErroAtletaReferenciadoNaoEncontrado`/
 * `ErroRestricaoNaoEncontrada` de `API-CONTRACT.yaml` (BE-12, já `Concluída`
 * e aprovada pelo QA — integração contra a API real, sem mock), conferidos
 * campo a campo contra o contrato. Definidos localmente, não importados de
 * `src/modules/times/restricoes` — mesma fronteira já usada por
 * `src/features/atletas`/`src/features/times` (módulo de backend assume um
 * client Supabase de servidor, importar o barrel arrastaria código de
 * servidor para o bundle do cliente sem necessidade).
 */

/** Resposta de todos os endpoints de `/api/restricoes*` (BE-12). */
export interface Restricao {
  id: string;
  atleta_a_id: string;
  /** `apelido_exibicao` (RN-06) do atleta em `atleta_a_id`. */
  atleta_a_nome: string;
  atleta_b_id: string;
  /** `apelido_exibicao` (RN-06) do atleta em `atleta_b_id`. */
  atleta_b_nome: string;
  ativo: boolean;
  /** Preenchido na primeira desativação (RN-11); `null` quando ativa. */
  desativado_em: string | null;
  criado_em: string;
}

/** Corpo de `POST /api/restricoes` e `PUT /api/restricoes/{id}` (BE-12). */
export interface RestricaoBody {
  atleta_a_id: string;
  atleta_b_id: string;
}

export interface RestricaoErroDetalhe {
  path: PropertyKey[];
  message: string;
}
