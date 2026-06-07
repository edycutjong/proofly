import { test, expect, Page } from "@playwright/test";

const SHOTS = "/Users/edycu/Projects/DemoStudio/018_Proofly/screenshots";

const beat = (page: Page, ms = 1500) => page.waitForTimeout(ms);
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SHOTS}/${name}.png` });

test("Proofly — full demo walkthrough", async ({ page }) => {
  // Mock the read/seed endpoints so the recording is deterministic and does not
  // depend on a running agent service (the board's /api/* routes proxy to :3001).
  await page.route("**/api/seed", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }),
  );
  await page.route("**/api/policies", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "adult-eu-nosanction", require: [
          { claim: "age", op: ">=", value: 18 },
          { claim: "country", op: "in", value: "EU" },
          { claim: "sanctioned", op: "==", value: "no" },
        ] },
        { id: "accredited-us", require: [
          { claim: "country", op: "==", value: "US" },
          { claim: "kyc", op: "==", value: "valid" },
          { claim: "accredited", op: "==", value: true },
        ] },
        { id: "age-gate-18", require: [{ claim: "age", op: ">=", value: 18 }] },
      ]),
    }),
  );
  await page.route("**/api/audit**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  );

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

  // Beats are distributed to track the ~41s voiceover paragraphs:
  // [hero+select+policy ≈ problem + "an agent you delegate / one scoped permission"]
  // [PASSED ≈ "reads sealed credentials inside TDX … signed yes"]
  // [FAILED ≈ "Dmitri sanctioned, fails with a reason … prove it, don't reveal it"]
  await page.goto("/");
  await expect(page.locator("h1")).toContainText(/PROOFLY/i);
  await beat(page, 4500); // hold on the dashboard: agent identity, personas, policies
  await shot(page, "01-hero-dashboard");

  const mayaButton = page.locator("button", { hasText: "Maya Silva" });
  await mayaButton.click();
  await beat(page, 4000); // show the selected data owner's sealed PII
  const policyButton = page.locator("button", { hasText: "adult-eu-nosanction" });
  await policyButton.click();
  await beat(page, 4000); // show the composed policy rules (the scoped check)
  const generateProofButton = page.locator("button", { hasText: "Generate Proof" });
  await generateProofButton.click();

  const passedBadge = page.locator("text=Policy Check: PASSED");
  await expect(passedBadge).toBeVisible({ timeout: 10000 });
  await beat(page, 9000); // hold on PASSED: enclave + verifier-received panels
  await shot(page, "02-maya-passed");

  const dmitriButton = page.locator("button", { hasText: "Dmitri Volkov" });
  await dmitriButton.click();
  await beat(page, 3000);
  await policyButton.click();
  await generateProofButton.click();

  const failedBadge = page.locator("text=Policy Check: FAILED");
  await expect(failedBadge).toBeVisible({ timeout: 10000 });
  await beat(page, 9000); // hold on FAILED + reason, still zero PII disclosed
  await shot(page, "03-dmitri-failed");
});
