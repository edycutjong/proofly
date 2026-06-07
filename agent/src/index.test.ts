import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, bootstrapAgent, localPolicies, localAudits } from "./index";
import { T3nClient, loadWasmComponent } from "@terminal3/t3n-sdk";
import { AgentAuthChecker } from "./authz";

vi.mock("@terminal3/t3n-sdk", () => ({
  T3nClient: vi.fn(),
  loadWasmComponent: vi.fn().mockResolvedValue({}),
  createEthAuthInput: vi.fn().mockReturnValue({})
}));

vi.mock("./authz", () => ({
  AgentAuthChecker: {
    authorizeFunction: vi.fn()
  }
}));

describe("Proofly Agent Server", () => {
  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localPolicies.length = 0;
    localAudits.length = 0;
  });

  describe("bootstrapAgent", () => {
    it("should successfully bootstrap the agent", async () => {
      const mockHandshake = vi.fn().mockResolvedValue(true);
      const mockAuthenticate = vi.fn().mockResolvedValue(true);
      
      (T3nClient as any).mockImplementation(function() {
        return {
          handshake: mockHandshake,
          authenticate: mockAuthenticate
        };
      });

      await bootstrapAgent();
      
      expect(mockHandshake).toHaveBeenCalled();
      expect(mockAuthenticate).toHaveBeenCalled();
    });
  });

  describe("POST /verify", () => {
    it("should verify successfully", async () => {
      const mockExecuteAndDecode = vi.fn().mockResolvedValue({ verified: true });
      (T3nClient as any).mockImplementation(function() {
        return {
          handshake: vi.fn(),
          authenticate: vi.fn(),
          executeAndDecode: mockExecuteAndDecode
        };
      });
      await bootstrapAgent();

      const res = await request(app)
        .post("/verify")
        .send({ userDid: "did:test", policyId: "policy1", verifierDid: "did:verifier" });
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ verified: true });
      expect(AgentAuthChecker.authorizeFunction).toHaveBeenCalledWith("verify-policy");
      expect(localAudits.length).toBe(1);
    });

    it("should handle verification errors", async () => {
      const mockExecuteAndDecode = vi.fn().mockRejectedValue(new Error("Verify Error"));
      (T3nClient as any).mockImplementation(function() {
        return {
          handshake: vi.fn(),
          authenticate: vi.fn(),
          executeAndDecode: mockExecuteAndDecode
        };
      });
      await bootstrapAgent();

      const res = await request(app)
        .post("/verify")
        .send({ userDid: "did:test", policyId: "policy1" });
      
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Verify Error" });
    });
  });

  describe("POST /policies", () => {
    it("should create policy successfully", async () => {
      const mockExecuteAndDecode = vi.fn().mockResolvedValue({ success: true });
      (T3nClient as any).mockImplementation(function() {
        return {
          handshake: vi.fn(),
          authenticate: vi.fn(),
          executeAndDecode: mockExecuteAndDecode
        };
      });
      await bootstrapAgent();

      const res = await request(app)
        .post("/policies")
        .send({ id: "policy1", require: [] });
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(AgentAuthChecker.authorizeFunction).toHaveBeenCalledWith("create-policy");
      expect(localPolicies.length).toBe(1);
    });

    it("should handle creation errors", async () => {
      const mockExecuteAndDecode = vi.fn().mockRejectedValue(new Error("Create Error"));
      (T3nClient as any).mockImplementation(function() {
        return {
          handshake: vi.fn(),
          authenticate: vi.fn(),
          executeAndDecode: mockExecuteAndDecode
        };
      });
      await bootstrapAgent();

      const res = await request(app)
        .post("/policies")
        .send({ id: "policy1" });
      
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Create Error" });
    });
  });

  describe("GET /policies", () => {
    it("should return policies", async () => {
      localPolicies.push({ id: "policy1" });
      const res = await request(app).get("/policies");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "policy1" }]);
    });

    it("should handle error in GET policies", async () => {
      const circular: any = {};
      circular.self = circular;
      localPolicies.push(circular);
      const res = await request(app).get("/policies");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /audit", () => {
    it("should return all audits without verifier filter", async () => {
      localAudits.push({ verifier: "did:verifier1" }, { verifier: "did:verifier2" });
      const res = await request(app).get("/audit");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("should return filtered audits when verifier is provided", async () => {
      localAudits.push({ verifier: "did:verifier1" }, { verifier: "did:verifier2" });
      const res = await request(app).get("/audit?verifier=did:verifier1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].verifier).toBe("did:verifier1");
    });

    it("should handle error in GET audit", async () => {
      const circular: any = {};
      circular.self = circular;
      localAudits.push(circular);
      const res = await request(app).get("/audit");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.agentDid).toBeDefined();
      expect(res.body.uptime).toBeDefined();
    });

    it("should fallback to unknown when agentDid is falsy", async () => {
      const { AgentIdentityManager } = await import("./identity");
      const getAgentSpy = vi.spyOn(AgentIdentityManager.prototype, "getAgentDid").mockReturnValue("");
      
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.agentDid).toBe("unknown");
      
      getAgentSpy.mockRestore();
    });
  });
});
