import { createNode } from "@pqc/shared";
import { describe, expect, it } from "vitest";
import { compileNodeReact, compileReactPage } from "./compile-react.js";

describe("compile-react", () => {
  it("compiles img, input, and nested text nodes", () => {
    const img = createNode("img", { src: "https://example.com/a.png", alt: "A" });
    const input = createNode("input", { type: "email", placeholder: "x" });
    const p = createNode("p", { children: "Hello", className: "lead" });
    const link = createNode("a", { href: "https://example.com", children: "Go" });
    p.children = [link];

    expect(compileNodeReact(img)).toContain("img");
    expect(compileNodeReact(input)).toContain('type="email"');
    expect(compileNodeReact(p)).toContain("Go");
    expect(compileNodeReact(p)).toContain("className=");
    expect(compileNodeReact(createNode("p", { children: "Plain" }))).toContain("Plain");
  });

  it("compiles a full React page wrapper", () => {
    const root = createNode("section", { className: "page" });
    root.children = [createNode("h1", { children: "Title" })];
    const page = compileReactPage(root, "demo");
    expect(page).toContain("export default function Page");
    expect(page).toContain('data-scope="demo"');
    expect(page).toContain("Title");
  });

  it("compiles semantic blog types", () => {
    const feed = createNode("blogFeed", {});
    feed.children = [createNode("blogCard", { children: "Post" })];
    expect(compileNodeReact(feed)).toContain("data-demo");
    expect(compileNodeReact(feed)).toContain("Post");
  });
});
