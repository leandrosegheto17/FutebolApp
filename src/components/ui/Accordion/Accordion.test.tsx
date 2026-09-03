import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Accordion } from "./Accordion";

const items = [
  {
    value: "05-09",
    title: "05/09 · Presentes: 18",
    content: <p>João Pedro, Carlinhos</p>,
  },
  { value: "12-09", title: "12/09 · Presentes: 15", content: <p>Rafa</p> },
];

describe("Accordion", () => {
  it("começa fechado (default) e expande ao clicar, expondo aria-expanded", async () => {
    render(<Accordion items={items} />);
    const trigger = screen.getByRole("button", { name: "05/09 · Presentes: 18" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("João Pedro, Carlinhos")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("João Pedro, Carlinhos")).toBeVisible();
  });

  it("permite múltiplos itens abertos quando allowMultiple=true", async () => {
    render(<Accordion items={items} allowMultiple />);
    await userEvent.click(screen.getByRole("button", { name: "05/09 · Presentes: 18" }));
    await userEvent.click(screen.getByRole("button", { name: "12/09 · Presentes: 15" }));
    expect(screen.getByText("João Pedro, Carlinhos")).toBeVisible();
    expect(screen.getByText("Rafa")).toBeVisible();
  });

  it("painel expandido usa role=region associado ao trigger", async () => {
    render(<Accordion items={items} />);
    await userEvent.click(screen.getByRole("button", { name: "05/09 · Presentes: 18" }));
    expect(
      screen.getByRole("region", { name: "05/09 · Presentes: 18" }),
    ).toBeInTheDocument();
  });

  it("sem violação de acessibilidade (axe)", async () => {
    const { container } = render(
      <Accordion items={items} defaultOpenValues={["05-09"]} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
