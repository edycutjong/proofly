import express from "express";
import cors from "cors";
import {
  T3nClient,
  createEthAuthInput,
  loadWasmComponent,
  metamask_sign,
  eth_get_address,
} from "@terminal3/t3n-sdk";
import { AgentIdentityManager } from "./identity";
import { AgentAuthChecker } from "./authz";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let t3n: T3nClient;
let identityManager: AgentIdentityManager;

// Store created policies locally since TEE KV store doesn't support wildcards/listing natively yet
const localPolicies: any[] = [];
const localAudits: any[] = [];

// Bootstrap the agent: open an encrypted TEE channel and authenticate the
// agent *as itself* (agents authenticate as themselves, not as tenants).
//
// T3N auth is a challenge/response signed by the agent's key via the EthSign
// guest-to-host handler — there is no bearer-token path. The agent key is
// supplied out-of-band through AGENT_KEY; we derive the address from it and
// wire `handlers.EthSign` so `authenticate()` can answer the challenge.
async function bootstrapAgent() {
  const wasmComponent = await loadWasmComponent();

  const agentKey = process.env.AGENT_KEY;
  const agentAddress = agentKey ? eth_get_address(agentKey) : undefined;

  t3n = new T3nClient({
    baseUrl: process.env.T3N_BASE_URL || "https://api.terminal3.io",
    wasmComponent,
    // The only auth path: sign the handshake challenge with the agent's key.
    handlers: agentAddress
      ? { EthSign: metamask_sign(agentAddress, undefined, agentKey) }
      : {},
  });

  identityManager = new AgentIdentityManager(t3n);

  await t3n.handshake();
  // Authenticate as the agent's own DID. Without AGENT_KEY this runs in demo
  // mode against a mocked/sandbox transport (the EthSign challenge is not signed).
  await t3n.authenticate(
    createEthAuthInput(agentAddress || "0x1111111111111111111111111111111111111111"),
  );
  await identityManager.setupAgentIdentity();

  console.log(
    agentAddress
      ? `[Boot] Proofly agent authenticated to T3N as ${agentAddress}.`
      : "[Boot] Proofly agent bootstrapped in demo mode (set AGENT_KEY for live auth).",
  );
}

// REST Endpoints
app.post("/verify", async (req, res) => {
  try {
    const { userDid, policyId, verifierDid } = req.body;
    
    // Enforcement: pre-flight check inside TEE host layer
    AgentAuthChecker.authorizeFunction("verify-policy");

    const presentation = await t3n.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "verify-policy",
      input: {
        userDid,
        policyId,
        verifierDid: verifierDid || "did:t3n:crypto_exchange_verifier",
        ts: Math.floor(Date.now() / 1000)
      }
    });
    
    localAudits.push({
      verifier: verifierDid,
      userDid,
      policyId,
      disclosed: ["result"],
      ts: Math.floor(Date.now() / 1000)
    });

    res.json(presentation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/policies", async (req, res) => {
  try {
    AgentAuthChecker.authorizeFunction("create-policy");

    const policy = req.body;
    const created = await t3n.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "create-policy",
      input: policy
    });
    
    localPolicies.push(policy);
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/policies", (req, res) => {
  try {
    res.json(localPolicies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/audit", (req, res) => {
  try {
    const verifier = (req.query.verifier as string) || undefined;
    const audits = verifier ? localAudits.filter(a => a.verifier === verifier) : localAudits;
    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({
    agentDid: identityManager?.getAgentDid() || "unknown",
    registry: "ok",
    status: "healthy",
    uptime: process.uptime()
  });
});

/* v8 ignore next 6 */
if (require.main === module) {
  app.listen(port, async () => {
    await bootstrapAgent();
    console.log(`🚀 Proofly Agent backend service running at http://localhost:${port}`);
  });
}

export { app, bootstrapAgent, localPolicies, localAudits };
