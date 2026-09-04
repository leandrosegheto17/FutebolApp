import { ROUTES } from "@/lib/routes";

/**
 * Tratamento de 401 em ação de escrita — TASK.md FE-12 / UX-SPEC.md Seção
 * 1.3: "Se uma ação de escrita retornar 401 (sessão inválida/expirada), a
 * tela deve: preservar os dados não salvos em memória local (o que for
 * tecnicamente possível), exibir mensagem 'Sessão expirada, faça login
 * novamente' e redirecionar para T01, retornando à tela de origem após novo
 * login bem-sucedido."
 *
 * Mensagem literal exigida pelo UX-SPEC.md — nenhuma tela deve reformular
 * este texto.
 */
export const SESSION_EXPIRED_MESSAGE = "Sessão expirada, faça login novamente.";

/** Lançado por `assertSessionAlive` quando uma resposta de escrita é 401. */
export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
  }
}

/**
 * Qualquer cliente de API de escrita (T04…T11, ainda não implementados)
 * deve envolver a resposta do `fetch` com esta função antes de tratar o
 * corpo — "qualquer 401 em ação de escrita" (critério de aceite literal),
 * não um subconjunto de rotas. Devolve a própria resposta quando não é 401,
 * para permitir encadeamento (`assertSessionAlive(await fetch(...))`).
 */
export function assertSessionAlive(response: Response): Response {
  if (response.status === 401) {
    throw new SessionExpiredError();
  }
  return response;
}

/**
 * Monta a URL de retorno a T01 alimentando o mecanismo `?redirect=` já
 * construído por FE-01 (`src/features/login/redirectTarget.ts`,
 * `getSafeRedirectTarget`) — "retornando à tela de origem após novo login
 * bem-sucedido". A validação de segurança (rejeição de open redirect,
 * BUG-QA-FE01-01) já acontece do lado de consumo (T01); aqui só se
 * codifica o caminho atual, sempre um caminho relativo interno de verdade
 * (obtido via `usePathname()` do App Router — nunca uma URL absoluta
 * arbitrária).
 */
export function buildSessionExpiredRedirectUrl(currentPath: string): string {
  return `${ROUTES.login}?redirect=${encodeURIComponent(currentPath)}`;
}

const UNSAVED_DATA_STORAGE_PREFIX = "sessao_interna:dados_nao_salvos:";

function readStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Preserva o que for tecnicamente possível de um formulário/estado não
 * salvo antes do redirecionamento para T01 (UX-SPEC.md Seção 1.3).
 *
 * "Memória local" é interpretada como armazenamento do navegador
 * (`sessionStorage`), não a heap JS em si — decisão de detalhe documentada,
 * não escalada: o redirecionamento para T01 desmonta toda a árvore de
 * componentes da tela de origem (rota diferente no App Router), então
 * nenhuma variável em memória de processo sobrevive à navegação; o
 * `sessionStorage` é "local" no sentido em que a própria Seção 1.3 usa a
 * expressão (nunca sai do navegador do usuário, nunca é enviado ao
 * servidor) e sobrevive à troca de rota dentro da mesma aba.
 *
 * `key` é escolhida por quem chama (tipicamente o caminho da tela de
 * origem) para não colidir entre telas diferentes. Nunca lança — os dados
 * não são serializáveis (ex.: contêm uma função) é o caso de "não for
 * tecnicamente possível" citado no critério de aceite; falha em silêncio
 * (retorna `false`) em vez de quebrar o fluxo de redirecionamento, que é
 * mais importante do que a preservação em si.
 */
export function saveUnsavedData<T>(key: string, data: T): boolean {
  const storage = readStorage();
  if (!storage) return false;
  try {
    storage.setItem(UNSAVED_DATA_STORAGE_PREFIX + key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lê e remove (leitura única) os dados não salvos preservados para `key` —
 * chamado pela tela de destino (após o novo login bem-sucedido) ao montar,
 * tipicamente com `key = usePathname()` da própria tela. `null` cobre tanto
 * "nada preservado" quanto "falha ao restaurar" — quem chama trata os dois
 * casos da mesma forma (formulário começa vazio).
 */
export function takeUnsavedData<T>(key: string): T | null {
  const storage = readStorage();
  if (!storage) return null;
  const storageKey = UNSAVED_DATA_STORAGE_PREFIX + key;
  try {
    const raw = storage.getItem(storageKey);
    if (raw === null) return null;
    storage.removeItem(storageKey);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
