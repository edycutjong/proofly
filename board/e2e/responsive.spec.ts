import { test, expect } from "@playwright/test";

test.describe("Responsive Design & Layout Tests", () => {
  const viewports = [
    { width: 375, height: 667, name: "Mobile (iPhone SE)" },
    { width: 768, height: 1024, name: "Tablet (iPad Mini)" },
    { width: 1440, height: 900, name: "Desktop" },
  ];

  for (const vp of viewports) {
    test(`should render correctly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // 1. Check title is visible
      const headerTitle = page.locator("h1", { hasText: "PROOFLY" });
      await expect(headerTitle).toBeVisible();

      // 2. Check no horizontal scrollbar exists on the body (using clientWidth to exclude vertical scrollbar)
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing).toBe(false);

      // 3. Check persona options card is visible
      const selectPersonaHeader = page.locator("h2", { hasText: "Select Persona" });
      await expect(selectPersonaHeader).toBeVisible();
    });
  }
});
