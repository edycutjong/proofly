import { test, expect } from "@playwright/test";

test.describe("Proofly Smoke Test & Demo Mode", () => {
  test("should load the home page successfully with correct brand metadata", async ({ page }) => {
    // 1. Visit the home page
    await page.goto("/");

    // 2. Verify title and brand headers are visible
    await expect(page).toHaveTitle(/Proofly/);
    const headerTitle = page.locator("h1", { hasText: "PROOFLY" });
    await expect(headerTitle).toBeVisible();

    // 3. Verify that the app is running in dual-mode fallback successfully
    // (We should see the default personas rendered)
    const mayaButton = page.locator("button", { hasText: "Maya Silva" });
    await expect(mayaButton).toBeVisible();

    const dmitriButton = page.locator("button", { hasText: "Dmitri Volkov" });
    await expect(dmitriButton).toBeVisible();

    // 4. Verify default policy choices are loaded
    const defaultPolicy = page.locator("button", { hasText: "adult-eu-nosanction" });
    await expect(defaultPolicy).toBeVisible();
  });
});
