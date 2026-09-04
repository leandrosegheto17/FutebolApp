import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { RodadaActionMenu } from "./RodadaActionMenu";

function renderMenu(onExcluir = vi.fn()) {
  const utils = render(
    <RodadaActionMenu
      rodadaLabel="rodada de 19/09/2026"
      corrigirHref="/rodadas/rodada-1/corrigir"
      onExcluir={onExcluir}
    />,
  );
  return { ...utils, onExcluir };
}

describe("RodadaActionMenu", () => {
  it("botão-gatilho tem nome acessível específico da rodada, painel começa fechado", () => {
    renderMenu();
    const trigger = screen.getByRole("button", {
      name: "Mais ações para rodada de 19/09/2026",
    });
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Corrigir" })).not.toBeInTheDocument();
  });

  it("clicar no gatilho abre o painel com 'Corrigir' (link) e 'Excluir rodada' (botão), foco vai para o primeiro item", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));

    const corrigirLink = screen.getByRole("link", { name: "Corrigir" });
    expect(corrigirLink).toHaveAttribute("href", "/rodadas/rodada-1/corrigir");
    expect(screen.getByRole("button", { name: "Excluir rodada" })).toBeInTheDocument();
    expect(corrigirLink).toHaveFocus();
    expect(screen.getByRole("button", { name: /Mais ações/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("Escape fecha o painel e devolve o foco ao gatilho", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: /Mais ações/ });
    await user.click(trigger);
    expect(screen.getByRole("link", { name: "Corrigir" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("link", { name: "Corrigir" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("clicar fora do painel fecha o menu", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <RodadaActionMenu
          rodadaLabel="rodada de 19/09/2026"
          corrigirHref="/rodadas/rodada-1/corrigir"
          onExcluir={vi.fn()}
        />
        <button type="button">Fora</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));
    expect(screen.getByRole("link", { name: "Corrigir" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fora" }));

    expect(screen.queryByRole("link", { name: "Corrigir" })).not.toBeInTheDocument();
  });

  it("clicar em 'Excluir rodada' chama onExcluir e fecha o painel", async () => {
    const user = userEvent.setup();
    const { onExcluir } = renderMenu();

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));
    await user.click(screen.getByRole("button", { name: "Excluir rodada" }));

    expect(onExcluir).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Excluir rodada" }),
    ).not.toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe) com o painel aberto", async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();
    await user.click(screen.getByRole("button", { name: /Mais ações/ }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
