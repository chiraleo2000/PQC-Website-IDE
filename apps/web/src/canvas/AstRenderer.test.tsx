import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { AstRenderer } from "./AstRenderer";
import { createDefaultRoot, createNode } from "@pqc/shared";

function renderWithDnd(ui: ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

describe("AstRenderer", () => {
  it("renders empty canvas hint when root has no children", () => {
    const root = createNode("section", { className: "empty" });
    renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );
    expect(screen.getByTestId("canvas-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/design a simple page/i)).toBeInTheDocument();
    expect(screen.getByTestId("page-canvas")).toBeInTheDocument();
  });

  it("renders nested AST text content", () => {
    const root = createNode("section", { className: "root" });
    root.children = [createNode("p", { children: "Hello canvas" })];
    renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );
    expect(screen.getByText("Hello canvas")).toBeInTheDocument();
  });

  it("calls onSelect when a node is clicked", () => {
    const onSelect = vi.fn();
    const root = createNode("section");
    const child = createNode("p", { children: "Click me" });
    root.children = [child];

    renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText("Click me"));
    expect(onSelect).toHaveBeenCalledWith(child.id);
  });

  it("applies selection ring to the selected node", () => {
    const root = createNode("section");
    const child = createNode("h1", { children: "Title" });
    root.children = [child];

    const { container } = renderWithDnd(
      <AstRenderer root={root} selectedId={child.id} onSelect={vi.fn()} />
    );

    const selected = container.querySelector(`[data-node-id="${child.id}"]`);
    expect(selected?.className).toMatch(/ring-accent/);
  });

  it("exposes drop zones for @dnd-kit (parentId + index)", () => {
    const ast = createDefaultRoot();
    renderWithDnd(
      <AstRenderer root={ast.root} selectedId={null} onSelect={vi.fn()} />
    );
    expect(
      screen.getByTestId(`drop-zone-${ast.root.id}-${ast.root.children.length}`)
    ).toBeInTheDocument();
    const main = ast.root.children.find((c) => c.type === "main");
    expect(screen.getByTestId(`drop-zone-${main!.id}-0`)).toBeInTheDocument();
  });
});
