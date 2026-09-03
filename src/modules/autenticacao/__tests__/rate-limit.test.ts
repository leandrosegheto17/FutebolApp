// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateLoginRateLimit, type TentativaLogin } from "../rate-limit";

const NOW = new Date("2026-09-03T12:00:00.000Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

function secondsAgo(seconds: number): Date {
  return new Date(NOW.getTime() - seconds * 1000);
}

function falha(tentadoEm: Date): TentativaLogin {
  return { sucesso: false, tentadoEm };
}

function sucesso(tentadoEm: Date): TentativaLogin {
  return { sucesso: true, tentadoEm };
}

describe("evaluateLoginRateLimit (BE-04, RNF-03/RNF-04, TASK.md Secao 1.3)", () => {
  it("não bloqueia sem nenhuma tentativa", () => {
    const result = evaluateLoginRateLimit([], NOW);
    expect(result.bloqueado).toBe(false);
    expect(result.tentativasFalhasConsecutivas).toBe(0);
  });

  it("não bloqueia com 4 falhas consecutivas (abaixo do limiar de 5)", () => {
    const tentativas = [
      falha(secondsAgo(40)),
      falha(secondsAgo(30)),
      falha(secondsAgo(20)),
      falha(secondsAgo(10)),
    ];
    const result = evaluateLoginRateLimit(tentativas, NOW);
    expect(result.bloqueado).toBe(false);
    expect(result.tentativasFalhasConsecutivas).toBe(4);
  });

  it("bloqueia na 5ª falha consecutiva dentro da janela de 15 min", () => {
    const tentativas = [
      falha(secondsAgo(50)),
      falha(secondsAgo(40)),
      falha(secondsAgo(30)),
      falha(secondsAgo(20)),
      falha(secondsAgo(1)), // mais recente
    ];
    const result = evaluateLoginRateLimit(tentativas, NOW);
    expect(result.bloqueado).toBe(true);
    expect(result.tentativasFalhasConsecutivas).toBe(5);
    expect(result.desbloqueiaEm).toBeInstanceOf(Date);
  });

  it("um sucesso mais recente reseta o streak de falhas (não bloqueia)", () => {
    const tentativas = [
      falha(minutesAgo(10)),
      falha(minutesAgo(9)),
      falha(minutesAgo(8)),
      falha(minutesAgo(7)),
      falha(minutesAgo(6)),
      sucesso(minutesAgo(5)), // login correto depois das 5 falhas
      falha(minutesAgo(1)), // 1 falha nova após o sucesso
    ];
    const result = evaluateLoginRateLimit(tentativas, NOW);
    expect(result.bloqueado).toBe(false);
    expect(result.tentativasFalhasConsecutivas).toBe(1);
  });

  it("ignora tentativas fora da janela de 15 minutos", () => {
    const tentativas = [
      falha(minutesAgo(20)),
      falha(minutesAgo(19)),
      falha(minutesAgo(18)),
      falha(minutesAgo(17)),
      falha(minutesAgo(16)), // todas > 15 min atrás, "esquecidas"
    ];
    const result = evaluateLoginRateLimit(tentativas, NOW);
    expect(result.bloqueado).toBe(false);
    expect(result.tentativasFalhasConsecutivas).toBe(0);
  });

  it("backoff exponencial: 6ª falha consecutiva bloqueia por mais tempo que a 5ª", () => {
    const tentativasCincoFalhas: TentativaLogin[] = [
      falha(secondsAgo(130)),
      falha(secondsAgo(120)),
      falha(secondsAgo(110)),
      falha(secondsAgo(100)),
      falha(secondsAgo(35)), // mais recente das 5 (menor secondsAgo)
    ];
    const cincoFalhas = evaluateLoginRateLimit(tentativasCincoFalhas, NOW);
    // Lockout base (30s) já expirou 35s depois — desbloqueado de novo.
    expect(cincoFalhas.bloqueado).toBe(false);

    const tentativasSeisFalhas: TentativaLogin[] = [
      ...tentativasCincoFalhas,
      falha(secondsAgo(35)), // 6ª falha, mesma idade da mais recente acima
    ];
    const seisFalhas = evaluateLoginRateLimit(tentativasSeisFalhas, NOW);
    // Lockout dobrou (60s) — 35s atrás ainda está dentro do bloqueio.
    expect(seisFalhas.bloqueado).toBe(true);
    expect(seisFalhas.tentativasFalhasConsecutivas).toBe(6);
  });

  it("desbloqueia depois que o tempo de backoff passa", () => {
    const tentativas = [
      falha(secondsAgo(500)),
      falha(secondsAgo(400)),
      falha(secondsAgo(300)),
      falha(secondsAgo(200)),
      falha(secondsAgo(100)), // 100s atrás, > 30s de lockout base
    ];
    const result = evaluateLoginRateLimit(tentativas, NOW);
    expect(result.bloqueado).toBe(false);
    expect(result.tentativasFalhasConsecutivas).toBe(5);
  });

  it("nunca deixa o lockout passar de 15 minutos (teto), mesmo com streak muito longo", () => {
    const tentativas: TentativaLogin[] = [];
    for (let i = 30; i >= 1; i--) {
      tentativas.push(falha(minutesAgo(i * 0.1))); // todas dentro da janela
    }
    // Última falha 6 segundos atrás (0.1 min) — bem menos que 15 minutos.
    const result = evaluateLoginRateLimit(tentativas, NOW);
    expect(result.bloqueado).toBe(true);
    expect(result.desbloqueiaEm).toBeInstanceOf(Date);
    const lockoutMs =
      result.desbloqueiaEm!.getTime() -
      tentativas[tentativas.length - 1]!.tentadoEm.getTime();
    expect(lockoutMs).toBeLessThanOrEqual(15 * 60 * 1000);
  });
});
