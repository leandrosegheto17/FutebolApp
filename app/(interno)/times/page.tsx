import type { Metadata } from "next";
import { MontagemTimesShell } from "@/features/times/MontagemTimesShell";

export const metadata: Metadata = {
  title: "Times — Turma do Rola - Comary",
};

/** `/times` — T09 (montagem de times, RF-05) — TASK.md FE-09. */
export default function TimesPage() {
  return <MontagemTimesShell />;
}
