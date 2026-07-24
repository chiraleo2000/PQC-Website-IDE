import type { Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import { PORTS } from "@pqc/shared";

export const COMPILED_BASE = `http://127.0.0.1:${PORTS.compiledStatic}`;
export const DEMO_API_BASE =
  process.env.API_URL ?? `http://localhost:${PORTS.apiGateway}`;

export const DEMO_CREDENTIALS = {
  email: "demo@local",
  password: "demo-password",
} as const;

/** Static login page on :4010 — form POSTs to gateway `/demo-api/login` on :4000. */
export async function openCompiledLogin(page: Page, baseURL = COMPILED_BASE) {
  await page.goto(`${baseURL}/login.html`);
  await expect(page.locator('[data-demo="login-submit"]')).toBeVisible();
}

export async function submitCompiledLogin(page: Page): Promise<Response> {
  const loginResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/demo-api/login") &&
      res.request().method() === "POST" &&
      res.status() !== 0
  );

  await page.fill('input[name="email"]', DEMO_CREDENTIALS.email);
  await page.fill('input[name="password"]', DEMO_CREDENTIALS.password);
  await page.click('[data-demo="login-submit"]');

  const response = await loginResponse;
  expect(response.ok(), `login failed: ${response.status()}`).toBeTruthy();

  await page.waitForFunction(() => !!localStorage.getItem("demoToken"), null, {
    timeout: 10_000,
  });

  return response;
}

export async function expectBlogFeedReady(page: Page) {
  await page.waitForURL(/\/blog(\.html)?$/);
  await expect(page.locator('[data-demo="blog-feed"]')).toBeVisible();
  await expect(page.locator('[data-demo="new-post"]')).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem("demoToken"));
  expect(token, "demoToken should be set after login").toBeTruthy();
}

export async function publishCompiledPost(
  page: Page,
  title: string,
  body: string
): Promise<Response> {
  const postResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/demo-api/posts") &&
      res.request().method() === "POST" &&
      res.status() !== 0
  );

  await page.fill('input[name="title"]', title);
  const bodyField = page.locator('textarea[name="body"]');
  if (await bodyField.count()) {
    await bodyField.fill(body);
  }
  await page.click('[data-demo="post-submit"]');

  const response = await postResponse;
  expect(response.status(), "create post should return 201").toBe(201);

  await page.waitForFunction(
    (expectedTitle) => document.body.innerText.includes(expectedTitle),
    title,
    { timeout: 10_000 }
  );

  return response;
}
