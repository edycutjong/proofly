export type ClaimReq = {
  claim: string;
  op?: ">=" | "in" | "==" | "not" | "!=";
  value?: any;
};

export type Policy = {
  id: string;
  require: ClaimReq[];
};

export type Presentation = {
  vp: string;
  disclosed: Record<string, any>;
  ts: number;
};

export type AuditEntry = {
  verifier: string;
  userDid: string;
  policyId: string;
  disclosed: string[];
  ts: number;
};

export class T3nClient {
  private isHandshakeDone = false;
  private authenticatedAddress: string | null = null;

  // In-memory global store simulating TEE KV store
  private static kvStore = new Map<string, string>();
  
  // Track keys / signatures generated inside enclave
  private static generatedEnclaveKeys = new Set<string>();

  // EU Country List for the policy engine
  private static EU_COUNTRIES = [
    "PT", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "IE", "FI", 
    "SE", "DK", "PL", "GR", "CZ", "HU", "RO", "BG", "HR", "LT", 
    "LV", "EE", "SK", "SI", "CY", "MT", "LU"
  ];

  constructor(config?: any) {}

  async handshake() {
    this.isHandshakeDone = true;
    return { success: true };
  }

  async authenticate(authInput: { address: string; type: string }) {
    if (!this.isHandshakeDone) {
      throw new Error("Handshake required before authentication");
    }
    this.authenticatedAddress = authInput.address;
    T3nClient.generatedEnclaveKeys.add(`enclave-key-${authInput.address}`);
    return { success: true };
  }

  // Modules
  tenant = {
    claim: async () => {
      return { success: true, did: "did:t3n:proofly_verify_agent" };
    },
    me: async () => {
      return { did: "did:t3n:proofly_verify_agent", authenticated: !!this.authenticatedAddress };
    }
  };

  contracts = {
    register: async (params: { tail: string; version: string; wasm: any }) => {
      return { success: true, contract_id: 2002, script_name: `z:tenant:${params.tail}` };
    }
  };

  static clearStore() {
    this.kvStore.clear();
    this.generatedEnclaveKeys.clear();
  }

  static getGeneratedKeys() {
    return Array.from(this.generatedEnclaveKeys);
  }

  // Seeding API for the web app and tests
  static seedProfile(userDid: string, profile: Record<string, any>) {
    this.kvStore.set(`profiles:${userDid}`, JSON.stringify(profile));
  }

  static getProfile(userDid: string): Record<string, any> | null {
    const data = this.kvStore.get(`profiles:${userDid}`);
    return data ? JSON.parse(data) : null;
  }

  static getPolicy(policyId: string): Policy | null {
    const data = this.kvStore.get(`policies:${policyId}`);
    return data ? JSON.parse(data) : null;
  }

  static getAudits(verifierDid?: string): AuditEntry[] {
    const list: AuditEntry[] = [];
    for (const [key, value] of this.kvStore.entries()) {
      if (key.startsWith("audits:")) {
        const audit: AuditEntry = JSON.parse(value);
        if (!verifierDid || audit.verifier === verifierDid) {
          list.push(audit);
        }
      }
    }
    // Sort audits newest first
    return list.sort((a, b) => b.ts - a.ts);
  }

  async executeAndDecode(params: {
    script_name: string;
    script_version: string;
    function_name: string;
    input: any;
  }): Promise<any> {
    if (!this.isHandshakeDone || !this.authenticatedAddress) {
      throw new Error("Client not authenticated");
    }

    const { function_name, input } = params;

    switch (function_name) {
      case "create-policy":
        return this.createPolicy(input);
      case "verify-policy":
        return this.verifyPolicy(input);
      case "get-health":
        return {
          agentDid: "did:t3n:proofly_verify_agent",
          registry: "ok",
          status: "healthy"
        };
      default:
        throw new Error(`Unknown function: ${function_name}`);
    }
  }

  private createPolicy(policy: Policy): Policy {
    T3nClient.kvStore.set(`policies:${policy.id}`, JSON.stringify(policy));
    return policy;
  }

  private verifyPolicy(input: {
    userDid: string;
    policyId: string;
    verifierDid?: string;
    ts?: number;
  }): Presentation {
    const { userDid, policyId, verifierDid = "did:t3n:unknown_verifier", ts = Math.floor(Date.now() / 1000) } = input;

    const policyData = T3nClient.kvStore.get(`policies:${policyId}`);
    if (!policyData) {
      throw new Error(`Policy ${policyId} not found`);
    }
    const policy: Policy = JSON.parse(policyData);

    const profileData = T3nClient.kvStore.get(`profiles:${userDid}`);
    if (!profileData) {
      throw new Error(`Profile for ${userDid} not found`);
    }
    const profile = JSON.parse(profileData);

    // Evaluate rules
    let evaluationResult = true;
    const failReasons: string[] = [];

    for (const rule of policy.require) {
      const claimVal = profile[rule.claim];
      if (claimVal === undefined) {
        evaluationResult = false;
        failReasons.push(`Missing required claim '${rule.claim}'`);
        continue;
      }

      const op = rule.op || "==";
      const ruleVal = rule.value;

      if (op === ">=") {
        const pNum = Number(claimVal);
        const rNum = Number(ruleVal);
        if (isNaN(pNum) || isNaN(rNum)) {
          throw new Error(`Age/number comparison failed due to invalid values: claim=${claimVal}, policy=${ruleVal}`);
        }
        if (pNum < rNum) {
          evaluationResult = false;
          failReasons.push(`Claim '${rule.claim}' is ${pNum}, required >= ${rNum}`);
        }
      } else if (op === "in") {
        let allowedList: string[] = [];
        if (ruleVal === "EU") {
          allowedList = T3nClient.EU_COUNTRIES;
        } else if (Array.isArray(ruleVal)) {
          allowedList = ruleVal;
        } else if (typeof ruleVal === "string") {
          allowedList = [ruleVal];
        }

        if (!allowedList.includes(claimVal)) {
          evaluationResult = false;
          failReasons.push(`Claim '${rule.claim}' (${claimVal}) is not in allowed list`);
        }
      } else if (op === "==") {
        if (claimVal !== ruleVal) {
          evaluationResult = false;
          failReasons.push(`Claim '${rule.claim}' does not match policy value`);
        }
      } else if (op === "not" || op === "!=") {
        if (claimVal === ruleVal) {
          evaluationResult = false;
          failReasons.push(`Claim '${rule.claim}' matches restricted policy value`);
        }
      } else {
        throw new Error(`Unsupported operator: ${op}`);
      }
    }

    // Build Selective Disclosure payload (zero PII! Only result + reason if failed)
    const disclosed: Record<string, any> = { result: evaluationResult };
    if (!evaluationResult && failReasons.length > 0) {
      disclosed.reason = failReasons.join("; ");
    }

    // Generate mock SD-JWT inside TEE
    const disclosedJson = JSON.stringify(disclosed);
    const mockSignature = this.simpleSha256(userDid + ":" + disclosedJson + ":" + ts);
    const sdJwt = `sd-jwt.${Buffer.from(disclosedJson).toString("base64")}.${mockSignature}`;
    
    T3nClient.generatedEnclaveKeys.add(`sd-jwt-sig-${mockSignature}`);

    // Build Verifiable Presentation (OID4VP)
    const vp = `vp.proofly.${Buffer.from(JSON.stringify({
      sdJwt,
      presentation_definition_id: "proofly_verify_presentation",
      verifier: verifierDid,
      ts
    })).toString("base64")}`;

    // Record the audit entry in the KV store
    const audit: AuditEntry = {
      verifier: verifierDid,
      userDid,
      policyId,
      disclosed: ["result"],
      ts
    };
    T3nClient.kvStore.set(`audits:${verifierDid}:${ts}:${userDid}`, JSON.stringify(audit));

    return {
      vp,
      disclosed,
      ts
    };
  }

  private simpleSha256(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
      h = h & h; // Convert to 32bit integer
    }
    return Math.abs(h).toString(16).padStart(8, "0");
  }
}

export function createEthAuthInput(address: string) {
  return { address, type: "ethereum" };
}
