/**
 * Tipos do lado do Frontend para o Serviço de Atletas (BE-06/BE-07) —
 * espelham `AtletaResponse`/`AtletaBody` de `API-CONTRACT.yaml`, mas
 * definidos localmente (não importados de `src/modules/atletas`, mesmo
 * padrão já usado por `src/features/ranking-publico`/`presenca-mensal`):
 * o módulo de backend traz `repository.ts`/`mutate.ts`/`anonimizar.ts`
 * (que assumem um client Supabase de servidor) — importar o barrel
 * arrastaria código de servidor para o bundle do cliente sem necessidade,
 * mesmo que nenhum desses módulos referencie a chave de serviço
 * diretamente hoje (decisão de fronteira, não de segurança residual).
 */

/** Resposta de `GET/POST /api/atletas` e `GET/PUT/POST /api/atletas/{id}*` (BE-06/BE-07). */
export interface Atleta {
  id: string;
  nome_completo: string;
  apelido_exibicao: string;
  contato: string | null;
  data_nascimento: string | null;
  consentimento_responsavel_obtido: boolean;
  pontuacao_inicial: number;
  ativo: boolean;
  anonimizado_em: string | null;
  criado_em: string;
  /** RN-03, sempre derivado — nunca um campo de entrada do formulário (RF-01.4). */
  nivel_tecnico: number;
  rodadas_presentes: number;
}

/** Corpo de `POST /api/atletas` e `PUT /api/atletas/{id}` (BE-06). */
export interface AtletaBody {
  nome_completo: string;
  apelido_exibicao?: string;
  contato?: string;
  data_nascimento: string;
  consentimento_responsavel_obtido?: boolean;
  pontuacao_inicial: number;
  /** RF-01.5 — reenviado como `true` depois que o organizador confirma o modal de duplicidade. */
  confirmar_duplicidade?: boolean;
}

export interface AtletaDuplicado {
  id: string;
  nome_completo: string;
}

export interface AtletaErroDetalhe {
  path: PropertyKey[];
  message: string;
}
