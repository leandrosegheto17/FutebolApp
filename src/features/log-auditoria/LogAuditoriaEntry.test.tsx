import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { LogAuditoriaEntry } from "./LogAuditoriaEntry";
import type { LogAuditoriaEntryViewModel } from "./entryPresenter";

const ENTRY_CORRECAO: LogAuditoriaEntryViewModel = {
  id: "log-1",
  ocorridoEm: "02/09/2026 14:32",
  titulo: "Rodada 05/09/2026 — correção",
  subtitulo: "Atleta: Carlinhos",
  diffItems: [{ label: "Presença", before: "Presente", after: "Ausente" }],
  resumoLinhas: ["Ajuste aplicado: -2 pts"],
};

const ENTRY_ESTORNO: LogAuditoriaEntryViewModel = {
  id: "log-2",
  ocorridoEm: "01/09/2026 09:10",
  titulo: "Rodada 29/08/2026 — exclusão",
  diffItems: [],
  resumoLinhas: ["(20 atletas afetados)"],
};

describe("LogAuditoriaEntry", () => {
  it("renderiza timestamp, título, subtítulo, diff e resumo", () => {
    render(
      <ul>
        <LogAuditoriaEntry entry={ENTRY_CORRECAO} />
      </ul>,
    );
    expect(screen.getByText("02/09/2026 14:32")).toBeInTheDocument();
    expect(screen.getByText("Rodada 05/09/2026 — correção")).toBeInTheDocument();
    expect(screen.getByText("Atleta: Carlinhos")).toBeInTheDocument();
    expect(screen.getByText("Presença")).toBeInTheDocument();
    expect(screen.getByText("Ajuste aplicado: -2 pts")).toBeInTheDocument();
  });

  it("sem subtítulo (estorno): não renderiza nenhum parágrafo de subtítulo", () => {
    render(
      <ul>
        <LogAuditoriaEntry entry={ENTRY_ESTORNO} />
      </ul>,
    );
    expect(screen.getByText("Rodada 29/08/2026 — exclusão")).toBeInTheDocument();
    expect(screen.getByText("(20 atletas afetados)")).toBeInTheDocument();
    expect(screen.queryByText(/^Atleta:/)).not.toBeInTheDocument();
  });

  it("nunca renderiza nenhum campo/texto de autor, em nenhuma variante", () => {
    render(
      <ul>
        <LogAuditoriaEntry entry={ENTRY_CORRECAO} />
        <LogAuditoriaEntry entry={ENTRY_ESTORNO} />
      </ul>,
    );
    expect(screen.queryByText(/autor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/organizador desconhecido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bsistema\b/i)).not.toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <ul>
        <LogAuditoriaEntry entry={ENTRY_CORRECAO} />
        <LogAuditoriaEntry entry={ENTRY_ESTORNO} />
      </ul>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
