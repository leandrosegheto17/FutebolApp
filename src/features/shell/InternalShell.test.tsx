import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { InternalShell } from "./InternalShell";

const replaceMock = vi.fn();
let pathname = "/atletas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathname,
}));

// Mesma decisão documentada em `AppNav.test.tsx` (FE-00): jsdom não tem
// motor de layout e não avalia condição de `@media` alguma — sem este
// mock, `TopNav` herda `display:none` da regra incondicional e some da
// árvore de acessibilidade, tornando o botão "Sair" (que só existe em
// `TopNav`, não em `BottomTabBar`) impossível de alcançar por
// `getByRole`. A alternância responsiva real já é validada
// visualmente/manualmente (mesmo racional de FE-00), não é o que este
// teste cobre.
vi.mock("@/components/ui/AppNav/AppNav.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop: string) => prop }),
}));

describe("InternalShell", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathname = "/atletas";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza os 5 destinos de navegação de primeiro nível (UX-SPEC.md Seção 1.2)", () => {
    render(
      <InternalShell>
        <p>Conteúdo</p>
      </InternalShell>,
    );
    for (const label of ["Atletas", "Rodada", "Histórico", "Times", "Restrições"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it("marca o destino atual como aria-current=page", () => {
    render(
      <InternalShell>
        <p>Conteúdo</p>
      </InternalShell>,
    );
    const [atletasLink] = screen.getAllByRole("link", { name: "Atletas" });
    expect(atletasLink).toHaveAttribute("aria-current", "page");
  });

  it("renderiza o conteúdo filho", () => {
    render(
      <InternalShell>
        <p>Conteúdo da tela</p>
      </InternalShell>,
    );
    expect(screen.getByText("Conteúdo da tela")).toBeInTheDocument();
  });

  it("logout chama POST /api/auth/logout e redireciona para o login", async () => {
    const user = userEvent.setup();
    render(
      <InternalShell>
        <p>Conteúdo</p>
      </InternalShell>,
    );

    const logoutButton = screen.getByRole("button", { name: "Sair" });
    await user.click(logoutButton);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" }),
    );
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("logout redireciona para o login mesmo se a chamada de rede falhar", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(
      <InternalShell>
        <p>Conteúdo</p>
      </InternalShell>,
    );

    const logoutButton = screen.getByRole("button", { name: "Sair" });
    await user.click(logoutButton);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <InternalShell>
        <p>Conteúdo</p>
      </InternalShell>,
    );
    // `landmark-unique` desabilitada só nesta suíte: o mock de
    // `AppNav.module.css` acima (necessário para alcançar o botão "Sair",
    // que só existe em `TopNav`) faz `BottomTabBar` e `TopNav` ficarem
    // simultaneamente visíveis para o jsdom/axe (os dois usam o mesmo
    // `aria-label="Navegação principal"`) — artefato só deste teste, nunca
    // do runtime real: em qualquer navegador de verdade, a media query de
    // `AppNav.module.css` garante que só um dos dois esteja visível a
    // qualquer momento (nunca dois landmarks "Navegação principal"
    // simultâneos), mesma limitação de jsdom já documentada em
    // `AppNav.test.tsx` (FE-00).
    expect(
      await axe(container, { rules: { "landmark-unique": { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
