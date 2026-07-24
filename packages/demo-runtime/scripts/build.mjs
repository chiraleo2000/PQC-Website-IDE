import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../dist");
mkdirSync(dir, { recursive: true });

const source = `const API = window.__PQC_API__ || 'http://localhost:4000';
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
      const t = card.querySelector('[data-demo="card-title"]');
      const b = card.querySelector('[data-demo="card-body"]');
      if (t) t.textContent = post.title;
      if (b) b.textContent = post.body;
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
`;

writeFileSync(join(dir, "demo-app.js"), source, "utf-8");
console.log("Built demo-app.js");
