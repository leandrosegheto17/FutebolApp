import type { Metadata } from "next";
import { LogAuditoriaList } from "@/features/log-auditoria/LogAuditoriaList";

export const metadata: Metadata = {
  title: "Log de Auditoria — Turma do Rola - Comary",
};

/** `/historico/auditoria` — T08 (log de auditoria, RF-04.5) — TASK.md FE-08. */
export default function LogAuditoriaPage() {
  return <LogAuditoriaList />;
}
