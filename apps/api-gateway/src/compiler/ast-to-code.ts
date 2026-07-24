import type { AstNode } from "@pqc/shared";
import { compileHtmlDocument } from "./compile-html.js";
import { compileReactPage } from "./compile-react.js";
export { CompilerSecurityError } from "./sanitize.js";

export interface CompileOptions {
  demoMode?: boolean;
  apiBase?: string;
  /** Absolute site origin for canonical / sitemap (e.g. https://example.com). */
  siteOrigin?: string;
}

export interface CompiledSite {
  html: string;
  css: string;
  react: string;
  scope: string;
  demoScript?: string;
  robotsTxt?: string;
  sitemapXml?: string;
}

/**
 * Parse verified AST JSON into production HTML, scoped CSS, and React (TSX).
 * All user-controlled props pass through aggressive sanitization (XSS-safe).
 */
export function compileAstToSite(
  ast: AstNode,
  projectName: string,
  options: CompileOptions = {}
): CompiledSite {
  const scope = projectName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "site";
  const { html, css } = compileHtmlDocument(ast, projectName, scope, options);
  const react = compileReactPage(ast, scope);
  const demoScript = options.demoMode
    ? `// Demo runtime\nconst API='${(options.apiBase ?? "http://localhost:4000").replace(/['"<>]/g, "")}';\n${DEMO_RUNTIME_SOURCE}`
    : undefined;

  const origin = (options.siteOrigin ?? "https://example.com").replace(/\/$/, "");
  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/index.html</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

  return { html, css, react, scope, demoScript, robotsTxt, sitemapXml };
}

const DEMO_RUNTIME_SOURCE = `
function bootDemo() {
  const page = document.body.dataset.demoPage;
  if (page === 'login') initLogin();
  if (page === 'blog') initBlog();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDemo);
} else {
  bootDemo();
}
function initLogin() {
  const btn = document.querySelector('[data-demo="login-submit"]');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.querySelector('input[name="email"]')?.value;
    const password = document.querySelector('input[name="password"]')?.value;
    const res = await fetch(API + '/demo-api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) { alert('Login failed'); return; }
    const { token } = await res.json();
    localStorage.setItem('demoToken', token);
    window.location.href = 'blog.html';
  });
}
async function initBlog() {
  const token = localStorage.getItem('demoToken');
  if (!token) { window.location.href = 'login.html'; return; }
  const feed = document.querySelector('[data-demo="blog-feed"]');
  const template = document.querySelector('[data-demo="blog-card"]');
  async function load() {
    const res = await fetch(API + '/demo-api/posts');
    const { posts } = await res.json();
    if (!feed || !template) return;
    feed.querySelectorAll('[data-demo="blog-card"]').forEach((el, i) => { if (i > 0) el.remove(); });
    posts.forEach((post) => {
      const card = template.cloneNode(true);
      card.querySelector('[data-demo="card-title"]') && (card.querySelector('[data-demo="card-title"]').textContent = post.title);
      card.querySelector('[data-demo="card-body"]') && (card.querySelector('[data-demo="card-body"]').textContent = post.body);
      feed.appendChild(card);
    });
  }
  const form = document.querySelector('[data-demo="new-post"]');
  const submit = form?.querySelector('[data-demo="post-submit"]');
  submit?.addEventListener('click', async (e) => {
    e.preventDefault();
    const title = form.querySelector('input[name="title"]')?.value;
    const body = form.querySelector('textarea[name="body"]')?.value;
    await fetch(API + '/demo-api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });
    await load();
  });
  await load();
}
`.trim();
