import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/routes";
import {
  SESSION_EXPIRED_MESSAGE,
  SessionExpiredError,
  assertSessionAlive,
  buildSessionExpiredRedirectUrl,
  saveUnsavedData,
  takeUnsavedData,
} from "./writeActionSession";

function makeResponse(status: number): Response {
  return new Response(null, { status });
}

describe("assertSessionAlive", () => {
  it("devolve a própria resposta quando não é 401 (permite encadear)", () => {
    const ok = makeResponse(200);
    expect(assertSessionAlive(ok)).toBe(ok);

    const notFound = makeResponse(404);
    expect(assertSessionAlive(notFound)).toBe(notFound);
  });

  it("lança SessionExpiredError com a mensagem literal do UX-SPEC.md quando 401", () => {
    expect(() => assertSessionAlive(makeResponse(401))).toThrow(SessionExpiredError);
    try {
      assertSessionAlive(makeResponse(401));
    } catch (err) {
      expect(err).toBeInstanceOf(SessionExpiredError);
      expect((err as Error).message).toBe(SESSION_EXPIRED_MESSAGE);
    }
  });
});

describe("buildSessionExpiredRedirectUrl", () => {
  it("monta a URL de retorno ao login alimentando ?redirect= com o caminho de origem", () => {
    expect(buildSessionExpiredRedirectUrl("/rodadas/nova")).toBe(
      `${ROUTES.login}?redirect=%2Frodadas%2Fnova`,
    );
  });

  it("codifica caracteres especiais do caminho (ex.: querystring própria da tela de origem)", () => {
    expect(buildSessionExpiredRedirectUrl("/historico?pagina=2")).toBe(
      `${ROUTES.login}?redirect=%2Fhistorico%3Fpagina%3D2`,
    );
  });
});

describe("saveUnsavedData / takeUnsavedData", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trip: salva e depois lê exatamente o mesmo dado", () => {
    const data = { nome: "Fulano", idade: 17, consentimento: false };
    expect(saveUnsavedData("/atletas/novo", data)).toBe(true);
    expect(takeUnsavedData("/atletas/novo")).toEqual(data);
  });

  it("leitura é única — segunda leitura da mesma chave devolve null", () => {
    saveUnsavedData("/atletas/novo", { nome: "Fulano" });
    takeUnsavedData("/atletas/novo");
    expect(takeUnsavedData("/atletas/novo")).toBeNull();
  });

  it("chaves diferentes não colidem entre si", () => {
    saveUnsavedData("/atletas/novo", { valor: "A" });
    saveUnsavedData("/rodadas/nova", { valor: "B" });

    expect(takeUnsavedData("/atletas/novo")).toEqual({ valor: "A" });
    expect(takeUnsavedData("/rodadas/nova")).toEqual({ valor: "B" });
  });

  it("takeUnsavedData devolve null quando não há nada preservado para a chave", () => {
    expect(takeUnsavedData("/nada-aqui")).toBeNull();
  });

  it("nunca lança quando o dado não é serializável (best-effort, devolve false)", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => saveUnsavedData("/x", circular)).not.toThrow();
    expect(saveUnsavedData("/x", circular)).toBe(false);
  });

  it("degrada graciosamente se sessionStorage lançar (ex.: navegação privada)", () => {
    vi.spyOn(window.sessionStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("indisponível");
    });
    expect(saveUnsavedData("/x", { a: 1 })).toBe(false);
  });
});
