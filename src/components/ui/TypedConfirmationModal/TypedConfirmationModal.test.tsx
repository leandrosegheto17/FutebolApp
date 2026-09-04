import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { TypedConfirmationModal } from "./TypedConfirmationModal";

describe("TypedConfirmationModal", () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    onConfirm.mockReset();
    onClose.mockReset();
  });

  function renderModal(
    props: Partial<React.ComponentProps<typeof TypedConfirmationModal>> = {},
  ) {
    return render(
      <TypedConfirmationModal
        open
        title="Anonimizar dados de Carlinhos?"
        description={<p>Esta ação não pode ser desfeita.</p>}
        confirmationWord="ANONIMIZAR"
        confirmLabel="Confirmar anonimização"
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
      />,
    );
  }

  it("foco inicial vai para o botão Cancelar, nunca para o botão destrutivo (ação segura por padrão)", async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    );
  });

  it("botão de confirmação começa aria-disabled=true e digitar texto errado mantém assim", async () => {
    const user = userEvent.setup();
    renderModal();

    const confirmButton = screen.getByRole("button", { name: "Confirmar anonimização" });
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");

    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "anonimizar",
    );
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");

    await user.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("botão permanece no DOM/tabulável mesmo aria-disabled (nunca removido via disabled nativo)", () => {
    renderModal();
    const confirmButton = screen.getByRole("button", { name: "Confirmar anonimização" });
    expect(confirmButton).not.toBeDisabled();
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
  });

  it("digitar exatamente a palavra de confirmação habilita o botão (aria-disabled=false) e confirma ao clicar", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    const confirmButton = screen.getByRole("button", { name: "Confirmar anonimização" });
    expect(confirmButton).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByText("Confirmação habilitada.")).toBeInTheDocument();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("feedback textual associado via aria-describedby (não só cor)", () => {
    renderModal();
    const input = screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:');
    const confirmButton = screen.getByRole("button", { name: "Confirmar anonimização" });
    const describedBy = confirmButton.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toBe(describedBy);
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'O texto digitado precisa ser exatamente "ANONIMIZAR".',
    );
  });

  it("clicar em Cancelar chama onClose", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reseta o texto digitado quando reaberto", async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();
    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    expect(
      screen.getByRole("button", { name: "Confirmar anonimização" }),
    ).toHaveAttribute("aria-disabled", "false");

    rerender(
      <TypedConfirmationModal
        open={false}
        title="Anonimizar dados de Carlinhos?"
        description={<p>Esta ação não pode ser desfeita.</p>}
        confirmationWord="ANONIMIZAR"
        confirmLabel="Confirmar anonimização"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    rerender(
      <TypedConfirmationModal
        open
        title="Anonimizar dados de Carlinhos?"
        description={<p>Esta ação não pode ser desfeita.</p>}
        confirmationWord="ANONIMIZAR"
        confirmLabel="Confirmar anonimização"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Confirmar anonimização" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("estado loading desabilita nativamente o botão (ação em voo, distinto do gate de texto)", async () => {
    const user = userEvent.setup();
    renderModal({ loading: true });
    await user.type(
      screen.getByLabelText('Digite "ANONIMIZAR" para confirmar:'),
      "ANONIMIZAR",
    );
    expect(screen.getByRole("button", { name: "Confirmar anonimização" })).toBeDisabled();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = renderModal();
    expect(await axe(container)).toHaveNoViolations();
  });
});
