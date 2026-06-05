import { describe, it, expect, beforeEach } from "vitest";
import { T3nClient, createEthAuthInput } from "./T3nClient";
import { AgentIdentityManager } from "./identity";
import { AgentAuthChecker } from "./authz";

describe("Proofly Standalone Backend Agent Service Test Suite", () => {
  let client: T3nClient;
  const mayaDid = "did:t3n:maya_lisbon_24";
  const dmitriDid = "did:t3n:dmitri_moscow_31";
  const verifierDid = "did:t3n:crypto_exchange_verifier";

  beforeEach(async () => {
    T3nClient.clearStore();
    client = new T3nClient();
    await client.handshake();
    await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

    // Seed Personas
    T3nClient.seedProfile(mayaDid, {
      age: 24,
      country: "PT",
      kyc: "valid",
      sanctioned: "no"
    });

    T3nClient.seedProfile(dmitriDid, {
      age: 31,
      country: "RU",
      kyc: "valid",
      sanctioned: "yes"
    });

    // Create default policy
    await client.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "create-policy",
      input: {
        id: "adult-eu-nosanction",
        require: [
          { claim: "age", op: ">=", value: 18 },
          { claim: "country", op: "in", value: "EU" },
          { claim: "sanctioned", op: "==", value: "no" }
      ]
      }
    });
  });

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

  describe("Agent Identity Setup", () => {
    it("Correctly publishes did:t3n to did-registry and URI to agent-registry", async () => {
      const manager = new AgentIdentityManager(client);
      const res = await manager.setupAgentIdentity();
      expect(res.success).toBe(true);
      expect(res.agentDid).toBe("did:t3n:proofly_verify_agent");
    });
  });

  describe("TEE Enclave Policy Verification logic", () => {
    it("Generates a valid OID4VP presentation with selective disclosure and 0 bytes PII", async () => {
      const presentation = await client.executeAndDecode({
        script_name: "z:tenant:proofly",
        script_version: "1.0.0",
        function_name: "verify-policy",
        input: {
          userDid: mayaDid,
          policyId: "adult-eu-nosanction",
          verifierDid
        }
      });

      expect(presentation.vp).toContain("vp.proofly.");
      expect(presentation.disclosed.result).toBe(true);
      expect(presentation.disclosed.age).toBeUndefined(); // Zero PII check
      expect(presentation.disclosed.country).toBeUndefined();
    });

    it("Evaluates failure reasons correctly", async () => {
      const presentation = await client.executeAndDecode({
        script_name: "z:tenant:proofly",
        script_version: "1.0.0",
        function_name: "verify-policy",
        input: {
          userDid: dmitriDid,
          policyId: "adult-eu-nosanction",
          verifierDid
        }
      });

      expect(presentation.disclosed.result).toBe(false);
      expect(presentation.disclosed.reason).toContain("allowed list"); // failed country RU
      expect(presentation.disclosed.reason).toContain("sanctioned"); // failed sanctions yes
    });
  });
});
