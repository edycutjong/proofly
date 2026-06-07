# Deploy Proofly on Railway (two services)

Proofly runs as **two long-running services** in one Railway project:

| Service | Root dir | Port | Notes |
|---|---|---|---|
| **agent** | `agent/` | Railway `$PORT` | Persistent Express agent; authenticates to T3N on boot, holds the `did:t3n` session + in-memory policies/audits. Keep at **1 replica**. |
| **board** | `board/` | Railway `$PORT` | Next.js UI; its `/api/*` routes proxy to the agent via `AGENT_SERVICE_URL`. |

Each service has its own `railway.json` (build + start + healthcheck) — Railway picks it up from the service's root directory.

---

## 1. Create the project

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → select `edycutjong/proofly`.
2. This creates the first service. Open it → **Settings**:
   - **Service name:** `agent`  ← must be exactly this (referenced by the board).
   - **Root Directory:** `agent`
   - Build/Start come from `agent/railway.json` automatically.
3. In the same project: **New → GitHub Repo → same repo** to add the second service. Open it → **Settings**:
   - **Service name:** `board`
   - **Root Directory:** `board`

## 2. Environment variables

**agent** service → **Variables**:
```
AGENT_KEY = 0x<your-fresh-claimed-key>     # from terminal3.io/claim-page
# T3N_BASE_URL = https://api.terminal3.io  # optional override
```
> Railway injects `PORT` automatically — the agent already reads `process.env.PORT`.

**board** service → **Variables**:
```
AGENT_SERVICE_URL = https://${{agent.RAILWAY_PUBLIC_DOMAIN}}
```
> `${{agent.RAILWAY_PUBLIC_DOMAIN}}` is a Railway **reference variable** — it resolves to the agent service's public URL, so you never hardcode it. (Requires the agent service to be named `agent`.)

## 3. Generate domains

- **agent** → Settings → **Networking → Generate Domain** (needed so the board can reach it via the reference variable).
- **board** → Settings → **Networking → Generate Domain**, then add your custom domain (`proofly.edycu.dev`) here.

## 4. Deploy & verify

Railway auto-deploys on push to `main`. After both are green:

- **agent**: logs should show `[Boot] Proofly agent authenticated to T3N as 0x...` (not the demo-mode line). `GET https://<agent-domain>/health` → `{"status":"healthy", ...}`.
- **board**: open the board domain → run a verification → it proxies to the agent → returns the OID4VP presentation.

---

## Notes & gotchas

- **Single replica for the agent.** It stores `localPolicies` / `localAudits` in memory; scaling to >1 replica would split state. Redeploys reset this seed data (re-run the seed flow).
- **Demo mode fallback:** if `AGENT_KEY` is unset the agent boots but does not authenticate (you'll see the demo-mode log). Set a real key for the live path.
- **Private networking (optional, faster):** since the board proxies server-side, you can instead set `AGENT_SERVICE_URL = http://${{agent.RAILWAY_PRIVATE_DOMAIN}}:${{agent.PORT}}` and skip the agent's public domain — but this requires the agent to listen on `::` (IPv6). The public-domain route above is the zero-config option.
- **Alternative (single platform):** to run board-only on Vercel, collapse the agent into the board's API routes (the board already has `src/sdk/t3n.ts`); the proxy routes would call T3N directly. That's a small refactor and drops the separate-agent narrative.
