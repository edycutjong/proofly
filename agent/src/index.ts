import express from "express";
import cors from "cors";
import { T3nClient, createEthAuthInput } from "./T3nClient";
import { AgentIdentityManager } from "./identity";
import { AgentAuthChecker } from "./authz";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize persistent T3N TEE Client session
const t3n = new T3nClient();
const identityManager = new AgentIdentityManager(t3n);

// Seed personas & default policies in TEE KV store
async function bootstrapAgent() {
  await t3n.handshake();
  await t3n.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));
  await identityManager.setupAgentIdentity();

  // Seed default personas
  T3nClient.seedProfile("did:t3n:maya_lisbon_24", {
    age: 24,
    country: "PT",
    kyc: "valid",
    sanctioned: "no",
    accredited: false
  });

  T3nClient.seedProfile("did:t3n:dmitri_moscow_31", {
    age: 31,
    country: "RU",
    kyc: "valid",
    sanctioned: "yes",
    accredited: false
  });

  T3nClient.seedProfile("did:t3n:leo_berlin_16", {
    age: 16,
    country: "DE",
    kyc: "valid",
    sanctioned: "no",
    accredited: false
  });

  // Seed default policies
  await t3n.executeAndDecode({
    script_name: "z:tenant:proofly",
    script_version: "1.0.0",
    function_name: "create-policy",
    input: {
      id: "adult-eu-nosanction",
      require: [
        { claim: "age", op: ">=", value: 18 },
        { claim: "country", op: "in", value: "EU" },
        { claim: "sanctioned", op: "==", value: "no" }
      ]
    }
  });

  console.log("[Boot] Standalone Proofly Agent bootstrapped & default scenarios seeded.");
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

    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/policies", (req, res) => {
  try {
    const policies = [
      T3nClient.getPolicy("adult-eu-nosanction"),
      T3nClient.getPolicy("accredited-us"),
      T3nClient.getPolicy("age-gate-18")
    ].filter(Boolean);

    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/audit", (req, res) => {
  try {
    const verifier = (req.query.verifier as string) || undefined;
    const audits = T3nClient.getAudits(verifier);
    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({
    agentDid: identityManager.getAgentDid(),
    registry: "ok",
    status: "healthy",
    uptime: process.uptime()
  });
});

app.listen(port, async () => {
  await bootstrapAgent();
  console.log(`🚀 Proofly Agent backend service running at http://localhost:${port}`);
});
