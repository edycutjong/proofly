import { test, expect, Page } from "@playwright/test";

const SHOTS = "/Users/edycu/Projects/DemoStudio/018_Proofly/screenshots";

const beat = (page: Page, ms = 1500) => page.waitForTimeout(ms);
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SHOTS}/${name}.png` });

test("Proofly — full demo walkthrough", async ({ page }) => {
  // Intercept network requests to /api/verify to mock backend without running the TEE node
  await page.route("**/api/verify", async (route) => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || "{}");
    
    if (postData.userDid === "did:t3n:dmitri_moscow_31") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vp: "mock-vp-token-dmitri",
          disclosed: {
            result: false,
            reason: "sanctioned does not match policy value no"
          },
          ts: Math.floor(Date.now() / 1000)
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vp: "mock-vp-token-maya",
          disclosed: {
            result: true
          },
          ts: Math.floor(Date.now() / 1000)
        })
      });
    }
  });

  await page.goto("/");
  await expect(page.locator("h1")).toContainText(/PROOFLY/i);
  await beat(page, 2000);
  await shot(page, "01-hero-dashboard");

  const mayaButton = page.locator("button", { hasText: "Maya Silva" });
  await mayaButton.click();
  const policyButton = page.locator("button", { hasText: "adult-eu-nosanction" });
  await policyButton.click();
  const generateProofButton = page.locator("button", { hasText: "Generate Proof" });
  await generateProofButton.click();
  
  const passedBadge = page.locator("text=Policy Check: PASSED");
  await expect(passedBadge).toBeVisible({ timeout: 10000 });
  await beat(page, 2000);
  await shot(page, "02-maya-passed");

  const dmitriButton = page.locator("button", { hasText: "Dmitri Volkov" });
  await dmitriButton.click();
  await policyButton.click();
  await generateProofButton.click();
  
  const failedBadge = page.locator("text=Policy Check: FAILED");
  await expect(failedBadge).toBeVisible({ timeout: 10000 });
  await beat(page, 2000);
  await shot(page, "03-dmitri-failed");
});
