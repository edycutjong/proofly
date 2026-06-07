import express from "express";
import cors from "cors";
import { T3nClient, createEthAuthInput, loadWasmComponent } from "@terminal3/t3n-sdk";
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

// Seed personas & default policies in TEE KV store
async function bootstrapAgent() {
  const wasmComponent = await loadWasmComponent();
  
  t3n = new T3nClient({
    baseUrl: "https://api.terminal3.io",
    wasmComponent,
    headers: {
      "Authorization": `Bearer ${process.env.T3N_BEARER_TOKEN || "0xREDACTED_TESTNET_KEY"}`
    }
  });

  identityManager = new AgentIdentityManager(t3n);

  await t3n.handshake();
  await t3n.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));
  await identityManager.setupAgentIdentity();

  console.log("[Boot] Real T3N Agent bootstrapped & connected to live network.");
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
