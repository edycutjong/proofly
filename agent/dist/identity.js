"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIdentityManager = void 0;
class AgentIdentityManager {
    client;
    agentDid = "did:t3n:proofly_verify_agent";
    constructor(client) {
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
exports.AgentIdentityManager = AgentIdentityManager;
