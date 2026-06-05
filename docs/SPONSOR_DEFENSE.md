# SPONSOR DEFENSE — "Why ONLY Terminal 3" (Proofly)

> API verified against `docs.terminal3.io`.

Proofly's whole promise — *prove a claim without revealing the document* — is exactly what T3N's SD-JWT + Verifiable Presentation + TEE stack is built to do.

## Terminal 3 host interfaces used (by name)
1. **`vp`** — builds/verifies the **OID4VP Verifiable Presentation** the verifier receives. `contract/src/present.rs`.
2. **`signing` (SD-JWT VC issuance)** — discloses **only** the requested claim from the user's credential. `contract/src/disclose.rs`.
3. **`user-profile`** — the user's PII/claims are encrypted and stored alongside their DID; decrypt only inside the attested TEE. `contract/src/profile.rs`.
4. **`did-registry` / `agent-registry`** — Proofly's `did:t3n` identity and discoverable agent URI. `agent/src/identity.ts`.
5. **`agent-auth`** — scopes Proofly to just its `verify` functions (no rogue egress); enforced natively at the host layer. `agent/src/authz.ts`.
6. **TEE (Intel TDX) + cluster CEK** — claims decrypt only inside the attested enclave; the verifier (and Proofly) never see plaintext.

## What you'd need without Terminal 3
- An SD-JWT / OID4VP implementation + key management for selective-disclosure credentials.
- A confidential-compute environment (Intel TDX/SGX) + remote attestation so "decrypt only in-enclave" is real.
- A DID method + on-chain registry + revocation.
- An encrypted PII store keyed to identities + a delegated-permission system to scope the agent.

→ **Take Terminal 3 out and you'd need ~4 separate systems** (an SD-JWT/OID4VP stack, a TEE+attestation service, a DID registry, and an encrypted-profile + agent-permission layer) plus the glue between them. T3N collapses them into one host API.

## Honest limitations
- MVP uses **seeded/mock-issued SD-JWT VCs**, not live government KYC — the disclosure path is real, the issuance is simulated.
- Policy composition is **AND-only** (no nested OR/NOT trees yet).
- Exact ADK npm package name isn't pinned in public docs yet — we target the documented `T3nClient` surface and will pin on the published package.
