import { describe, it, expect } from "vitest";

describe("postcss.config.mjs", () => {
  it("exports configuration", async () => {
    const config = await import("./postcss.config.mjs");
    expect(config.default).toBeDefined();
    expect(config.default.plugins).toBeDefined();
  });
});
