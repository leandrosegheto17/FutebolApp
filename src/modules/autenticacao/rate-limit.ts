/**
 * Rate limiting de tentativas de login (BE-04, RNF-03/RNF-04, TASK.md Secao
 * 1.3): "5 tentativas erradas em 15 min bloqueiam com backoff exponencial",
 * implementado em tabela Postgres própria (`app.tentativa_login`, nunca
 * Redis/serviço externo).
 *
 * Lógica pura (sem I/O) para ser testável sem depender de banco — o
 * chamador (`app/api/auth/login/route.ts`) só precisa buscar as tentativas
 * recentes do IP e passar para `evaluateLoginRateLimit`.
 *
 * Decisão de detalhe documentada (não escalada): nem TASK.md nem SDD.md
 * especificam a curva exata de "backoff exponencial", só o limiar (5/15min)
 * e a propriedade qualitativa (cresce exponencialmente). Curva escolhida:
 * a partir da 5ª tentativa falha consecutiva (streak, resetada por qualquer
 * sucesso), cada tentativa falha adicional dobra o tempo de bloqueio a
 * partir de uma base de 30s, com teto de 15 minutos (mesma janela usada
 * para "esquecer" tentativas antigas) — evita bloqueio efetivamente
 * permanente por um streak muito longo, sem enfraquecer a proteção (o teto
 * já é igual ao pior caso da janela de contagem).
 */
import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS } from "./constants";

const LOCKOUT_BASE_MS = 30_000;
const LOCKOUT_MAX_MS = LOGIN_RATE_LIMIT_WINDOW_MS;
/** Evita `2 ** n` degenerar para `Infinity` num streak anormalmente longo. */
const MAX_BACKOFF_EXPONENT = 20;

export interface TentativaLogin {
  sucesso: boolean;
  tentadoEm: Date;
}

export interface LoginRateLimitResult {
  bloqueado: boolean;
  tentativasFalhasConsecutivas: number;
  /** Só definido quando `bloqueado === true` — quanto falta para poder tentar de novo. */
  desbloqueiaEm?: Date;
}

/**
 * Avalia se uma nova tentativa de login para este IP deve ser bloqueada,
 * a partir das tentativas já registradas (mais recente primeiro ou em
 * qualquer ordem — a função ordena internamente).
 */
export function evaluateLoginRateLimit(
  tentativas: readonly TentativaLogin[],
  now: Date = new Date(),
): LoginRateLimitResult {
  const janelaInicio = now.getTime() - LOGIN_RATE_LIMIT_WINDOW_MS;

  const recentesOrdenadas = tentativas
    .filter((t) => t.tentadoEm.getTime() > janelaInicio)
    .slice()
    .sort((a, b) => b.tentadoEm.getTime() - a.tentadoEm.getTime());

  // Conta falhas consecutivas a partir da mais recente, parando no primeiro
  // sucesso encontrado (um login correto sempre reseta o streak de bloqueio).
  let streak = 0;
  for (const tentativa of recentesOrdenadas) {
    if (!tentativa.sucesso) {
      streak += 1;
    } else {
      break;
    }
  }

  if (streak < LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return { bloqueado: false, tentativasFalhasConsecutivas: streak };
  }

  const ultimaTentativa = recentesOrdenadas[0];
  if (!ultimaTentativa) {
    // Impossível na prática (streak >= 5 implica que existe ao menos uma
    // tentativa), mas nunca lança por segurança defensiva.
    return { bloqueado: false, tentativasFalhasConsecutivas: streak };
  }

  const excedente = streak - LOGIN_RATE_LIMIT_MAX_ATTEMPTS + 1; // 1 na 5ª tentativa
  const expoente = Math.min(excedente - 1, MAX_BACKOFF_EXPONENT);
  const lockoutMs = Math.min(LOCKOUT_BASE_MS * 2 ** expoente, LOCKOUT_MAX_MS);
  const desbloqueiaEm = new Date(ultimaTentativa.tentadoEm.getTime() + lockoutMs);

  if (now.getTime() < desbloqueiaEm.getTime()) {
    return { bloqueado: true, tentativasFalhasConsecutivas: streak, desbloqueiaEm };
  }

  return { bloqueado: false, tentativasFalhasConsecutivas: streak };
}
