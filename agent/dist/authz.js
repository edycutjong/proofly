"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentAuthChecker = void 0;
class AgentAuthChecker {
    // Configured scopes (simulating agent-auth host permissions inside TEE)
    static permissions = {
        agentDid: "did:t3n:proofly_verify_agent",
        allowedFunctions: ["verify-policy", "create-policy", "get-health"],
        allowedHosts: ["api.terminal3.io", "proofly.vercel.app"]
    };
    /**
     * Asserts that a call to a function is authorized by agent-auth.
     * Host layer throws host/http.egress_denied if call is out of scope.
     */
    static authorizeFunction(funcName) {
        if (!this.permissions.allowedFunctions.includes(funcName)) {
            throw new Error(`host/agent-auth.unauthorized_function: Execution of function '${funcName}' denied by host agent-auth policy`);
        }
        return true;
    }
    /**
     * Asserts that outbound HTTP targets an allowed host in the egress allowlist.
     */
    static authorizeEgress(host) {
        if (!this.permissions.allowedHosts.includes(host)) {
            throw new Error(`host/http.egress_denied: Outbound connection to host '${host}' blocked by agent-auth policy`);
        }
        return true;
    }
}
exports.AgentAuthChecker = AgentAuthChecker;
