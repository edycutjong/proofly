import { describe, it, expect } from "vitest";
import nextConfig from "./next.config";

describe("next.config.ts", () => {
  it("exports configuration", () => {
    expect(nextConfig).toBeDefined();
  });
});
