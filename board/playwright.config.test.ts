import { describe, it, expect } from "vitest";
import config from "./playwright.config";

describe("playwright.config.ts", () => {
  it("exports configuration", () => {
    expect(config).toBeDefined();
    expect(config.testDir).toBe("./e2e");
  });
});
