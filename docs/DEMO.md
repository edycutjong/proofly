# 🎬 Demo Guide — Proofly

Welcome to **Proofly**! This guide walks you through the deterministic scenarios built to prove the privacy boundaries, policy compilation, and zero-knowledge verification capabilities of our TEE-secured compliance agent.

---

## 🚀 How to Run the Demo

### 1. Start the Local Server
From the `board/` directory:
```bash
npm run dev
```
Open your browser to `http://localhost:3000`.

### 2. Automatic Seeding
The dashboard automatically seeds the personas and default compliance policies on mount. You can also reload the page to refresh the state from the `/api/seed` endpoint.

---

## 💡 Seeded Scenarios

We have pre-configured three personas and three compliance policies to demonstrate the policy evaluator.

### Compliance Matrix

| Persona | Age | Country | KYC | Sanctioned | `adult-eu-nosanction` |
|---|---|---|---|---|---|
| **Maya** (Lisbon) | 24 | PT | valid | no | ✅ **Passed** (Eligible EU Adult) |
| **Dmitri** (Moscow) | 31 | RU | valid | yes | ❌ **Failed** (Fails Sanctions & Country) |
| **Leo** (Berlin) | 16 | DE | valid | no | ❌ **Failed** (Fails Age) |

### 🎥 The "Wow" Money Shot
To see the zero-knowledge selective disclosure boundary:
1. Select **Maya** in the Persona Picker.
2. Select **`adult-eu-nosanction`** in the Policy Selector.
3. Click the glowing **"Generate Proof"** button.
4. You will see the **Transmission Diff** panel:
   * **Left Panel (Inside TEE Enclave):** Displays the raw decrypted PII (full name, birth country, age, passport number, etc.) decrypted only inside the hardware-enforced memory boundary.
   * **Right Panel (Verifier Received):** Displays the actual response returned to the calling app: `{ "result": true }` along with a signed `vp` string, proving she meets the policy. **0 bytes of raw PII** crossed the wire!
5. Now select **Dmitri** or **Leo** and run the proof to see the failed compliance reasons (e.g. sanctions check or age gate failure) without exposing their underlying records.

---

## 🧪 Verifying the Security Claims

### Enclave Key Custody Test
We built a unit test that verifies the enclave's security guarantee (keys never leak outside the TDX VM). Run it with:
```bash
npm run test
```
The test asserts that the generated keys never enter the Node process environment, log outputs, or global variables.

---

## ⚡ Latency Benchmarks
Run the latency benchmarks over 200 policy evaluations inside the enclave:
```bash
python3 scripts/bench.py
```
This will run the Rust contract dispatch evaluations and output the Mean, p50, and p95 latency.
