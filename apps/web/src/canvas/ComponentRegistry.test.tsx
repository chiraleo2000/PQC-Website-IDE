import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createNode } from "@pqc/shared";
import { renderAstNode } from "./ComponentRegistry";

describe("ComponentRegistry", () => {
  it("renders button, link, input, and heading types", () => {
    const button = createNode("button", { children: "Go" });
    const link = createNode("a", { children: "Home", href: "/x" });
    const input = createNode("input", { type: "email", placeholder: "you@ex.com" });
    const h1 = createNode("h1", { children: "Title" });

    const { container } = render(
      <>
        {renderAstNode(button, { selectedId: null, onSelect: vi.fn(), depth: 0 })}
        {renderAstNode(link, { selectedId: null, onSelect: vi.fn(), depth: 0 })}
        {renderAstNode(input, { selectedId: null, onSelect: vi.fn(), depth: 0 })}
        {renderAstNode(h1, { selectedId: null, onSelect: vi.fn(), depth: 0 })}
      </>
    );

    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(container.querySelector("button")).toBeInTheDocument();
    expect(container.querySelector("a")).toHaveAttribute("href", "/x");
    expect(container.querySelector("input")).toHaveAttribute("placeholder", "you@ex.com");
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("renders img and blog semantic wrappers", () => {
    const img = createNode("img", { src: "https://example.com/a.png", alt: "Hero" });
    const feed = createNode("blogFeed", {});
    const onSelect = vi.fn();
    const { container } = render(
      <>
        {renderAstNode(img, { selectedId: img.id, onSelect, depth: 0 })}
        {renderAstNode(feed, { selectedId: null, onSelect, depth: 0 })}
      </>
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "Hero");
    expect(container.querySelector("[data-demo='blog-feed']")).toBeInTheDocument();
    fireEvent.click(container.querySelector(`[data-node-id="${img.id}"]`)!);
    expect(onSelect).toHaveBeenCalledWith(img.id);
  });
});
