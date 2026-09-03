import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { axe } from "jest-axe";
import { Modal } from "./Modal";

function OpenerAndModal({ onClose }: { onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button>Excluir rodada</button>
      <Modal
        open
        title="Excluir rodada 05/09/2026?"
        onClose={onClose}
        initialFocusRef={cancelRef as React.RefObject<HTMLElement>}
        actions={
          <>
            <button ref={cancelRef}>Cancelar</button>
            <button>Sim, excluir e estornar</button>
          </>
        }
      >
        <p>Isso reverte automaticamente todos os pontos desta rodada.</p>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("expõe role=dialog/aria-modal e título associado (default)", () => {
    render(
      <Modal open title="Confirmar" onClose={() => {}}>
        Conteúdo
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Confirmar" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("não renderiza nada quando open=false", () => {
    render(
      <Modal open={false} title="Confirmar" onClose={() => {}}>
        Conteúdo
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("foco inicial vai para initialFocusRef (padrão de ação segura: Cancelar)", async () => {
    render(<OpenerAndModal onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    });
  });

  it("Esc chama onClose", async () => {
    const onClose = vi.fn();
    render(<OpenerAndModal onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <Modal open title="Confirmar" onClose={() => {}}>
        Conteúdo
      </Modal>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
