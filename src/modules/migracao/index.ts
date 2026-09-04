/**
 * Serviço de Migração (SDD.md Seção 2.1, ADR-008) — transformação e carga
 * não-destrutiva da schema legada (`LEGADO-SCHEMA.md`, SPK-01) para a schema
 * `app`, gravação em `app.legado_migracao_registro` (idempotência) e
 * relatório de conferência (RF-08.5). Implementado em BE-15.
 *
 * `migrar.ts` é puro em termos de I/O (interfaces de `tipos.ts`, testável
 * inteiramente com fixtures — `__tests__/fixtures.ts`). A implementação real
 * das interfaces (`deps-supabase.ts`, Supabase legado + Supabase `app`) só é
 * usada pelo CLI `scripts/migrar-legado.ts` — execução real contra a schema
 * legada segue bloqueada por GUARDRAILS.md regra 35/BLOCKER-003 (ver
 * `scripts/migrar-legado.ts` e runbook em `scripts/README.md`).
 */
export * from "./tipos";
export * from "./transformar";
export * from "./migrar";
export * from "./relatorio";
export * from "./governanca";
