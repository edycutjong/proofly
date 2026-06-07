import { T3nClient } from "@terminal3/t3n-sdk";

export class AgentIdentityManager {
  private client: T3nClient;
  private agentDid = "did:t3n:proofly_verify_agent";

  constructor(client: T3nClient) {
    this.client = client;
  }

  /**
   * Assumes the identity is provisioned out-of-band for the demo or
   * uses the live T3N infrastructure.
   */
  async setupAgentIdentity() {
    console.log(`[Identity] Using registered agent identity: ${this.agentDid}`);
    console.log(`[Identity] Ready to accept proofs.`);
    return {
      agentDid: this.agentDid,
      success: true
    };
  }

  getAgentDid() {
    return this.agentDid;
  }
}
