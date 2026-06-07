import { describe, it, expect, vi } from "vitest";
import { AgentIdentityManager } from "./identity";
import { T3nClient } from "@terminal3/t3n-sdk";

describe("AgentIdentityManager", () => {
  it("should return the correct agent DID", () => {
    const mockClient = {} as T3nClient;
    const manager = new AgentIdentityManager(mockClient);
    expect(manager.getAgentDid()).toBe("did:t3n:proofly_verify_agent");
  });

  it("should setup agent identity and log correctly", async () => {
    const mockClient = {} as T3nClient;
    const manager = new AgentIdentityManager(mockClient);
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    const res = await manager.setupAgentIdentity();
    expect(res).toEqual({
      agentDid: "did:t3n:proofly_verify_agent",
      success: true
    });
    
    expect(consoleSpy).toHaveBeenCalledWith("[Identity] Using registered agent identity: did:t3n:proofly_verify_agent");
    expect(consoleSpy).toHaveBeenCalledWith("[Identity] Ready to accept proofs.");
    
    consoleSpy.mockRestore();
  });
});
