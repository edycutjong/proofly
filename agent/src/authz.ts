/**
 * Agent Auth — Terminal 3 ADK delegated-permission model.
 *
 * The data owner (user) signs an `agent-auth-update` that scopes an agent DID to
 * specific contract functions and outbound hosts. T3N enforces this natively at
 * the host layer: an unauthorized function or egress is rejected with a
 * `host/agent-auth.*` / `host/http.egress_denied` error — no external
 * interceptor required.
 *
 * This module mirrors that grant shape exactly (see `buildAgentAuthUpdateInput`)
 * so Proofly's authorization is driven by a real delegation object rather than a
 * hardcoded allowlist. `AgentAuthChecker` evaluates calls against the active
 * grant the same way the host does, giving us a faithful local enforcement path
 * for tests and the demo while the identical payload is what gets signed and
 * submitted on the live network.
 */

/** One scoped grant entry — matches the `scripts[]` element of `agent-auth-update`. */
export type AgentAuthScript = {
  scriptName: string;
  versionReq: string;
  functions: string[];
  allowedHosts: string[];
};

/** Full delegation payload signed by the data owner. */
export type AgentAuthGrant = {
  agentDid: string;
  scripts: AgentAuthScript[];
};

/**
 * Build the exact `agent-auth-update` input the data owner signs to delegate
 * scoped permission to the Proofly agent. This is the payload submitted via
 * `userClient.execute({ script_name: "tee:user/contracts", function_name:
 * "agent-auth-update", input })` on the live network.
 */
export function buildAgentAuthUpdateInput(
  agentDid: string,
  tenantScript: string,
  scriptVersion: string,
): { agents: AgentAuthGrant[] } {
  return {
    agents: [
      {
        agentDid,
        scripts: [
          {
            scriptName: tenantScript,
            versionReq: scriptVersion,
            functions: ["verify-policy", "create-policy", "get-health"],
            allowedHosts: ["api.terminal3.io"],
          },
        ],
      },
    ],
  };
}

// The grant Proofly operates under. On the live network this is loaded from the
// user's signed `agent-auth-update`; here it is the same shape so enforcement is
// identical. `script_version` resolves at runtime via getScriptVersion().
const ACTIVE_GRANT: AgentAuthGrant = buildAgentAuthUpdateInput(
  "did:t3n:proofly_verify_agent",
  process.env.PROOFLY_TENANT_SCRIPT || "z:proofly:proofly/contracts",
  process.env.PROOFLY_SCRIPT_VERSION || "1.0.0",
).agents[0];

export class AgentAuthChecker {
  /** The delegation this agent is currently authorized under. */
  static grant: AgentAuthGrant = ACTIVE_GRANT;

  private static allFunctions(): string[] {
    return AgentAuthChecker.grant.scripts.flatMap((s) => s.functions);
  }

  private static allHosts(): string[] {
    return AgentAuthChecker.grant.scripts.flatMap((s) => s.allowedHosts);
  }

  /**
   * Pre-flight: assert the call targets a function the grant authorizes.
   * Mirrors the host's native check before dispatch.
   */
  static authorizeFunction(funcName: string) {
    if (!AgentAuthChecker.allFunctions().includes(funcName)) {
      throw new Error(
        `host/agent-auth.unauthorized_function: Execution of function '${funcName}' denied by host agent-auth policy`,
      );
    }
    return true;
  }

  /**
   * Assert an outbound HTTP target is inside the grant's egress allowlist.
   * Mirrors the host's `host/http.egress_denied`.
   */
  static authorizeEgress(host: string) {
    if (!AgentAuthChecker.allHosts().includes(host)) {
      throw new Error(
        `host/http.egress_denied: Outbound connection to host '${host}' blocked by agent-auth policy`,
      );
    }
    return true;
  }
}
