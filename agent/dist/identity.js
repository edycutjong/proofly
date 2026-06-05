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
     * Simulates provisioning the Proofly did:t3n in did-registry
     * and publishing the agent URI in agent-registry.
     */
    async setupAgentIdentity() {
        console.log(`[Identity] Registering agent identity: ${this.agentDid}`);
        // Simulate did-registry call
        const regResult = await this.client.contracts.register({
            tail: "did-registry",
            version: "1.0.0",
            wasm: null
        });
        console.log(`[Identity] Registered DID in did-registry: ${regResult.script_name}`);
        // Simulate agent-registry URI publish
        const publishResult = await this.client.contracts.register({
            tail: "agent-registry",
            version: "1.0.0",
            wasm: null
        });
        console.log(`[Identity] Published agent URI "t3n://agents/proofly-verifier" in agent-registry`);
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
