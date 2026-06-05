# PRODUCTION PLAN — Proofly (proof-of-production)

## Live URL
- **Portal + demo:** Vercel — `proofly.edycu.dev` (Next.js).
- **Agent service:** Fly.io / Railway — `agent.proofly.app` (Node, holds the T3nClient session).

## Identity / registry proof
- Proofly's `did:t3n` registered via **`did-registry`** and published via **`agent-registry`** — include the DID + any on-chain link so a judge can resolve the agent independently.
- Each Verifiable Presentation is verifiable (OID4VP); log the disclosed-claim set so a judge can confirm only the required claim left the enclave.

## Published package
- Publish the verifier SDK to npm: **`proofly-verify`** — `npm i proofly-verify` → `verify(userDid, policyId)`. A judge can install it and validate an attestation themselves.

## Tests
- Target **120+ Vitest tests**, count stated in README ("124 tests (Vitest)").
- Coverage focus: policy engine truth tables (every pass/fail reason), attestation validation, zero-PII payload assertion (a test that **fails** if any PII key appears in the verifier response).

## Benchmark
- `scripts/bench.py` → p50/p95/mean/min/max over 200 `/verify` calls. Publish numbers in README with methodology (sandbox region, warm session).

## Verify-offline / integrity
- `scripts/verify_zero_pii.ts` — replays seeded verifications and asserts the verifier payload contains only `{result, proof, attestation}`. This is the product's core invariant as an executable check.

## On-chain anchor
- `did-registry` links authenticators to the DID on-chain — include the link in README so a judge can resolve Proofly's identity.

## Readiness gate
- `scripts/check_submission_readiness.py` fails if any `https://github.com/edycutjong/dorahacks-t3adk-proofly`/`https://proofly.edycu.dev`/`https://youtu.be/proofly-demo` placeholder remains in `SUBMISSION.md` or README.
