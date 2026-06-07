"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localAudits = exports.localPolicies = exports.app = void 0;
exports.bootstrapAgent = bootstrapAgent;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const t3n_sdk_1 = require("@terminal3/t3n-sdk");
const identity_1 = require("./identity");
const authz_1 = require("./authz");
const app = (0, express_1.default)();
exports.app = app;
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let t3n;
let identityManager;
// Store created policies locally since TEE KV store doesn't support wildcards/listing natively yet
const localPolicies = [];
exports.localPolicies = localPolicies;
const localAudits = [];
exports.localAudits = localAudits;
// Seed personas & default policies in TEE KV store
async function bootstrapAgent() {
    const wasmComponent = await (0, t3n_sdk_1.loadWasmComponent)();
    t3n = new t3n_sdk_1.T3nClient({
        baseUrl: "https://api.terminal3.io",
        wasmComponent,
        headers: {
            "Authorization": `Bearer ${process.env.T3N_BEARER_TOKEN || "0xREDACTED_TESTNET_KEY"}`
        }
    });
    identityManager = new identity_1.AgentIdentityManager(t3n);
    await t3n.handshake();
    await t3n.authenticate((0, t3n_sdk_1.createEthAuthInput)("0x1111111111111111111111111111111111111111"));
    await identityManager.setupAgentIdentity();
    console.log("[Boot] Real T3N Agent bootstrapped & connected to live network.");
}
// REST Endpoints
app.post("/verify", async (req, res) => {
    try {
        const { userDid, policyId, verifierDid } = req.body;
        // Enforcement: pre-flight check inside TEE host layer
        authz_1.AgentAuthChecker.authorizeFunction("verify-policy");
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post("/policies", async (req, res) => {
    try {
        authz_1.AgentAuthChecker.authorizeFunction("create-policy");
        const policy = req.body;
        const created = await t3n.executeAndDecode({
            script_name: "z:tenant:proofly",
            script_version: "1.0.0",
            function_name: "create-policy",
            input: policy
        });
        localPolicies.push(policy);
        res.json(created);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/policies", (req, res) => {
    try {
        res.json(localPolicies);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/audit", (req, res) => {
    try {
        const verifier = req.query.verifier || undefined;
        const audits = verifier ? localAudits.filter(a => a.verifier === verifier) : localAudits;
        res.json(audits);
    }
    catch (error) {
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
