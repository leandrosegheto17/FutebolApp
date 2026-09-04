// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getClientIp } from "../client-ip";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers,
  });
}

describe("getClientIp (BE-04, RNF-03)", () => {
  it("prefere x-vercel-forwarded-for sobre x-forwarded-for e x-real-ip (DEBT-06)", () => {
    const request = requestWithHeaders({
      "x-vercel-forwarded-for": "203.0.113.99",
      "x-forwarded-for": "203.0.113.10, 70.41.3.18",
      "x-real-ip": "198.51.100.23",
    });
    expect(getClientIp(request)).toBe("203.0.113.99");
  });

  it("cai para x-forwarded-for quando x-vercel-forwarded-for está ausente (DEBT-06)", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.10, 70.41.3.18",
      "x-real-ip": "198.51.100.23",
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("usa o primeiro IP de x-forwarded-for quando há vários (proxy encadeado)", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.10, 70.41.3.18, 150.172.238.178",
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("usa x-real-ip quando x-forwarded-for está ausente", () => {
    const request = requestWithHeaders({ "x-real-ip": "198.51.100.23" });
    expect(getClientIp(request)).toBe("198.51.100.23");
  });

  it("prefere x-forwarded-for sobre x-real-ip quando ambos presentes", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.23",
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("retorna 'unknown' quando nenhum cabeçalho de IP está presente", () => {
    const request = requestWithHeaders({});
    expect(getClientIp(request)).toBe("unknown");
  });

  it("ignora espaços em branco ao redor do IP", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "  203.0.113.10  , 70.41.3.18",
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});
