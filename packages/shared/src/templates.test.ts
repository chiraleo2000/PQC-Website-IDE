import { describe, it, expect } from "vitest";
import { loadTemplate } from "./templates.js";
import { astRootSchema } from "./ast.js";

function findByType(node: { type: string; children: unknown[] }, type: string): boolean {
  if (node.type === type) return true;
  return node.children.some((c) => findByType(c as { type: string; children: unknown[] }, type));
}

describe("demo templates", () => {
  it("login template validates against astRootSchema", () => {
    const t = loadTemplate("login");
    expect(astRootSchema.safeParse(t).success).toBe(true);
    expect(t.root.props.page).toBe("login");
  });

  it("login template includes email, password, and submit", () => {
    const t = loadTemplate("login");
    expect(findByType(t.root, "input")).toBe(true);
    expect(findByType(t.root, "button")).toBe(true);
    expect(findByType(t.root, "form")).toBe(true);
    expect(findByType(t.root, "nav")).toBe(true);

    const json = JSON.stringify(t);
    expect(json).toContain('"type":"email"');
    expect(json).toContain('"type":"password"');
    expect(json).toContain("login-submit");
  });

  it("blog template validates against astRootSchema", () => {
    const t = loadTemplate("blog");
    expect(astRootSchema.safeParse(t).success).toBe(true);
    expect(t.root.props.page).toBe("blog");
  });

  it("blog template includes nav, blogFeed mapping, and new post input", () => {
    const t = loadTemplate("blog");
    expect(findByType(t.root, "nav")).toBe(true);
    expect(findByType(t.root, "blogFeed")).toBe(true);
    expect(findByType(t.root, "blogCard")).toBe(true);
    expect(findByType(t.root, "newPostForm")).toBe(true);
    expect(findByType(t.root, "input")).toBe(true);
  });
});
