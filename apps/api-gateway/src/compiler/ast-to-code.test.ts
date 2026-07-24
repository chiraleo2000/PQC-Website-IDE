import { describe, it, expect } from "vitest";
import { ensureAstV2, loadTemplate } from "@pqc/shared";
import { compileAstToSite, CompilerSecurityError } from "./ast-to-code.js";
import { compiledSiteFiles, validateGitRemote, GitOpsError } from "./package-export.js";

function rootWith(child: {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: never[];
}) {
  return {
    id: crypto.randomUUID(),
    type: "section",
    props: { className: "page" },
    children: [child],
  };
}

describe("AST compiler XSS", () => {
  it("rejects script tags in text", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "p",
      props: { children: "<script>alert(1)</script>" },
      children: [],
    });
    expect(() => compileAstToSite(ast, "test", {})).toThrow(CompilerSecurityError);
  });

  it("rejects javascript: URLs", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "a",
      props: { href: "javascript:alert(1)", children: "x" },
      children: [],
    });
    expect(() => compileAstToSite(ast, "test", {})).toThrow(CompilerSecurityError);
  });

  it("rejects event handler attributes", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "div",
      props: { onclick: "alert(1)" },
      children: [],
    });
    expect(() => compileAstToSite(ast, "test", {})).toThrow(CompilerSecurityError);
  });

  it("rejects disallowed custom CSS properties", () => {
    const ast = {
      id: crypto.randomUUID(),
      type: "p",
      props: { customCss: "behavior: url(evil.css)" },
      children: [] as never[],
    };
    expect(() => compileAstToSite(ast, "test", {})).toThrow(CompilerSecurityError);
  });

  it("escapes HTML in text nodes", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "p",
      props: { children: "Hello <world>" },
      children: [],
    });
    const { html } = compileAstToSite(ast, "test", {});
    expect(html).toContain("Hello &lt;world&gt;");
    expect(html).not.toContain("<world>");
  });

  it("emits semantic HTML, scoped CSS, and React page", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "h1",
      props: { children: "Title" },
      children: [],
    });
    const site = compileAstToSite(ast, "My Site", {});
    expect(site.html).toContain("<!DOCTYPE html>");
    expect(site.html).toContain("<h1");
    expect(site.html).toContain('data-scope="my-site"');
    expect(site.react).toContain("export default function Page");
    expect(site.react).toContain("<h1");
  });

  it("emits SEO meta, robots.txt, and sitemap.xml", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "h1",
      props: { children: "Hello" },
      children: [],
    });
    ast.props.seoTitle = "SEO Title";
    ast.props.seoDescription = "Crawlable description";
    ast.props.canonicalUrl = "https://example.com/";
    const site = compileAstToSite(ast, "My Site", { siteOrigin: "https://example.com" });
    expect(site.html).toContain("<title>SEO Title</title>");
    expect(site.html).toContain('name="description" content="Crawlable description"');
    expect(site.html).toContain('property="og:title"');
    expect(site.html).toContain('name="robots" content="index,follow"');
    expect(site.robotsTxt).toContain("Sitemap: https://example.com/sitemap.xml");
    expect(site.sitemapXml).toContain("https://example.com/index.html");
    const names = compiledSiteFiles(site).map((f) => f.name);
    expect(names).toContain("robots.txt");
    expect(names).toContain("sitemap.xml");
  });

  it("packages export file manifest", () => {
    const ast = rootWith({
      id: crypto.randomUUID(),
      type: "p",
      props: { children: "x" },
      children: [],
    });
    const site = compileAstToSite(ast, "demo", { demoMode: true });
    const names = compiledSiteFiles(site).map((f) => f.name);
    expect(names).toContain("index.html");
    expect(names).toContain("styles.css");
    expect(names).toContain("Page.tsx");
    expect(names).toContain("demo-app.js");
    expect(names).toContain("robots.txt");
    expect(names).toContain("sitemap.xml");
  });

  it("compiles multi-page landing template to multiple HTML files", () => {
    const site = compileAstToSite(ensureAstV2(loadTemplate("landing")), "Landing", {});
    const names = compiledSiteFiles(site).map((f) => f.name);
    expect(names).toContain("index.html");
    expect(names).toContain("about.html");
    expect(site.sitemapXml).toContain("about.html");
    expect(site.pages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GitOps validation", () => {
  it("allows HTTPS remotes", () => {
    expect(() =>
      validateGitRemote("https://github.com/org/repo.git")
    ).not.toThrow();
  });

  it("rejects non-HTTPS remotes", () => {
    expect(() => validateGitRemote("git@github.com:org/repo.git")).toThrow(GitOpsError);
  });
});
