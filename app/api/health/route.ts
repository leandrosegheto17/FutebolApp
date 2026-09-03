import { NextResponse } from "next/server";

/**
 * Health-check simples (BE-01). Não toca banco/sessão de propósito — serve
 * só para provar que a camada de API (Route Handlers) do App Router está
 * funcional desde o setup do projeto, antes de qualquer serviço de domínio
 * existir (BE-02+). Nenhum dado sensível é exposto aqui (nem em erro).
 */
export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
