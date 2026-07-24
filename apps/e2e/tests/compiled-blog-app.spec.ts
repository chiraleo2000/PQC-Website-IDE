import { test, expect } from "@playwright/test";
import {
  DEMO_API_BASE,
  DEMO_CREDENTIALS,
  expectBlogFeedReady,
  openCompiledLogin,
  publishCompiledPost,
  submitCompiledLogin,
} from "../src/helpers/compiled-blog.js";

/**
 * E2E for the *compiled* Login & Blog app (IDE compiler output), not the IDE UI.
 *
 * - Static site: http://localhost:4010  (login.html, blog.html, demo-app.js)
 * - Demo API:    http://localhost:4000  (/demo-api/login, /demo-api/posts)
 *
 * The login *form* lives on :4010; authentication is performed via POST to
 * `${DEMO_API_BASE}/demo-api/login` (embedded in demo-app.js as window.__PQC_API__).
 */
test.describe("Compiled blog app (exported static site)", () => {
  test("login, create post, and see it on the feed", async ({ page, baseURL }) => {
    test.info().annotations.push({
      type: "note",
      description: `Static ${baseURL} → API ${DEMO_API_BASE}/demo-api/*`,
    });

    await openCompiledLogin(page, baseURL);

    await submitCompiledLogin(page);
    await expectBlogFeedReady(page);

    const title = `E2E Post ${Date.now()}`;
    const body = "Created by Playwright against the compiled blog export.";
    await publishCompiledPost(page, title, body);

    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-demo="blog-feed"]')).toContainText(title);
  });

  test("rejects invalid demo credentials", async ({ page, baseURL }) => {
    await openCompiledLogin(page, baseURL);

    const loginResponse = page.waitForResponse((res) =>
      res.url().includes("/demo-api/login")
    );

    await page.fill('input[name="email"]', DEMO_CREDENTIALS.email);
    await page.fill('input[name="password"]', "wrong-password");
    await page.click('[data-demo="login-submit"]');

    const res = await loginResponse;
    expect(res.status()).toBe(401);
    await expect(page).toHaveURL(/login/);
  });
});
