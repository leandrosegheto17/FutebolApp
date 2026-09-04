import { SESSION_TTL_MS } from "@/modules/autenticacao/constants";

/**
 * Marcador client-side da expiração **estimada** da sessão — TASK.md FE-12 /
 * UX-SPEC.md Seção 1.3 ("2 minutos antes da expiração estimada").
 *
 * O cookie de sessão (`sessao_interna`, BE-04) é `httpOnly` por desenho
 * (ADR-004/GUARDRAILS.md regra 16) — o cliente nunca consegue ler seu valor
 * ou seu `Max-Age` real via `document.cookie`. Não há, hoje, nenhum campo no
 * corpo de `POST /api/auth/login` nem cookie companheiro não-`httpOnly`
 * expondo o instante exato de expiração ao cliente (conferido em
 * `API-CONTRACT.yaml`); por isso o UX-SPEC.md já qualifica a janela como
 * "estimada", não exata.
 *
 * Decisão de implementação (detalhe, não estrutural — TASK.md Seção 1.0/
 * GUARDRAILS.md regra 32): a estimativa é ancorada no primeiro momento em
 * que este marcador é lido dentro da aba do navegador (tipicamente o mount
 * da primeira tela interna após o login, já que este agente evita tocar em
 * `src/features/login/*`, mid-edição por outro agente em paralelo — ver nota
 * de retomada do lote L1) e persiste em `sessionStorage` (sobrevive a
 * navegação entre telas internas, mas nunca a fechamento da aba — mesmo
 * espírito de "sem sessão persistente de longa duração" do ADR-004) como
 * `agoraDoMount + SESSION_TTL_MS`. Reimporta `SESSION_TTL_MS` diretamente do
 * módulo de autenticação (BE-04) em vez de duplicar o valor `10 * 60 * 60 *
 * 1000` aqui — é uma constante pura sem I/O nem segredo (conferido: o
 * arquivo `constants.ts` de origem não importa nada), então reaproveitá-la
 * evita que as duas metades do sistema divirjam silenciosamente se o TTL
 * mudar no futuro.
 *
 * Consequência conhecida e aceita da aproximação (documentada, não uma
 * lacuna silenciosa): se a aba ficar aberta por mais tempo do que o TTL real
 * antes de qualquer tela interna montar pela primeira vez, ou se a mesma aba
 * for reaproveitada após um novo login (sessão renovada) sem que o marcador
 * seja limpo, a estimativa pode divergir da expiração real — o tratamento de
 * 401 em ação de escrita (`writeActionSession.ts`) continua sendo a rede de
 * segurança definitiva, o aviso aqui é só uma cortesia antecipada (WCAG
 * 2.2.1), não a única defesa.
 */
const SESSION_EXPIRY_STORAGE_KEY = "sessao_interna:expira_em_estimado";

function readStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Navegação privada/`sessionStorage` bloqueado — degrada graciosamente
    // (nunca lança), a estimativa passa a viver só em memória do hook.
    return null;
  }
}

/**
 * Lê o marcador existente ou cria um novo (`now + SESSION_TTL_MS`) na
 * primeira leitura desta aba. Nunca lança.
 */
export function getEstimatedSessionExpiry(now: number = Date.now()): number {
  const storage = readStorage();
  if (!storage) {
    return now + SESSION_TTL_MS;
  }

  try {
    const stored = storage.getItem(SESSION_EXPIRY_STORAGE_KEY);
    const parsed = stored === null ? NaN : Number(stored);
    if (Number.isFinite(parsed) && parsed > now) {
      return parsed;
    }

    const fresh = now + SESSION_TTL_MS;
    storage.setItem(SESSION_EXPIRY_STORAGE_KEY, String(fresh));
    return fresh;
  } catch {
    return now + SESSION_TTL_MS;
  }
}

/**
 * Limpa o marcador — chamado ao detectar 401 real (sessão de fato expirada
 * ou invalidada) para que a próxima sessão (pós-novo-login) comece a
 * estimativa do zero, em vez de herdar um valor obsoleto.
 */
export function clearEstimatedSessionExpiry(): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.removeItem(SESSION_EXPIRY_STORAGE_KEY);
  } catch {
    // Best-effort — nada a fazer se o storage não permitir remoção.
  }
}
