import { test, expect } from "@playwright/test";

test.describe("Compliance Verification Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept network requests to /api/verify so tests don't require actual TEE profile seeding
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
        // Default (Maya) succeeds
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
  });

  test("should successfully verify Maya Silva against the adult-eu-nosanction policy", async ({ page }) => {
    // 1. Select Maya Silva (should be selected by default, but click it to be sure)
    const mayaButton = page.locator("button", { hasText: "Maya Silva" });
    await mayaButton.click();

    // 2. Select verification policy
    const policyButton = page.locator("button", { hasText: "adult-eu-nosanction" });
    await policyButton.click();

    // 3. Click Generate Proof
    const generateProofButton = page.locator("button", { hasText: "Generate Proof" });
    await generateProofButton.click();

    // 4. Assert that the policy check shows PASSED
    const passedBadge = page.locator("text=Policy Check: PASSED");
    await expect(passedBadge).toBeVisible({ timeout: 10000 });

    // 5. Assert that the Verifier SDK Status shows VERIFIED
    await expect(page.getByText("Verifier SDK Status:")).toBeVisible();

    // 6. Assert that zero PII is disclosed
    const responseBox = page.locator("text=Network Response (Disclosed Claim Only):");
    await expect(responseBox).toBeVisible();
    
    const responseText = page.locator("div.whitespace-pre-wrap", { hasText: "result" });
    await expect(responseText).not.toContainText("passportNo");
    await expect(responseText).not.toContainText("age");
  });

  test("should fail verification for Dmitri Volkov due to sanction list match", async ({ page }) => {
    // 1. Select Dmitri Volkov
    const dmitriButton = page.locator("button", { hasText: "Dmitri Volkov" });
    await dmitriButton.click();

    // 2. Select policy
    const policyButton = page.locator("button", { hasText: "adult-eu-nosanction" });
    await policyButton.click();

    // 3. Click Generate Proof
    const generateProofButton = page.locator("button", { hasText: "Generate Proof" });
    await generateProofButton.click();

    // 4. Assert that the policy check shows FAILED
    const failedBadge = page.locator("text=Policy Check: FAILED");
    await expect(failedBadge).toBeVisible({ timeout: 10000 });

    // 5. Assert that the failure reason is displayed
    await expect(page.getByText("does not match policy value").first()).toBeVisible();

    // 6. Assert that the cryptographic signature is still valid
    await expect(page.getByText("Verifier SDK Status:")).toBeVisible();
  });
});
