import { describe, it, expect } from "vitest";
import { AgentAuthChecker } from "./authz";

describe("TEE Host Agent Auth Scope Enforcement", () => {
  it("Allows execution of authorized functions", () => {
    expect(AgentAuthChecker.authorizeFunction("verify-policy")).toBe(true);
    expect(AgentAuthChecker.authorizeFunction("create-policy")).toBe(true);
    expect(AgentAuthChecker.authorizeFunction("get-health")).toBe(true);
  });

  it("Blocks execution of unauthorized functions (egress control)", () => {
    expect(() => AgentAuthChecker.authorizeFunction("delete-profile")).toThrow("unauthorized_function");
    expect(() => AgentAuthChecker.authorizeFunction("export-keys")).toThrow("unauthorized_function");
  });

  it("Enforces outbound egress allowlist", () => {
    expect(AgentAuthChecker.authorizeEgress("api.terminal3.io")).toBe(true);
    expect(() => AgentAuthChecker.authorizeEgress("malicious-attacker-host.com")).toThrow("egress_denied");
  });
});
