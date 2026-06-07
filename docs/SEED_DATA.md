# SEED_DATA — Proofly

## The ONE devastating demo query
> Verifier (a mock crypto exchange) calls `proofly.verify(maya.did, policy="adult-eu-nosanction")`
> → returns `{ result: true }` while the **network tab shows the response contains no birth date, no name, no country string — only a boolean and an attestation hash.**

The "wow" is the contrast: the exchange gets a compliant **yes** and is *structurally incapable* of leaking Maya's passport, because it never received it.

## Engineered fixtures
Three personas with **vocabulary/edge gaps** that make the policy engine visibly earn its keep:

| Persona | age | country | kyc | sanctioned | `adult-eu-nosanction` |
|---|---|---|---|---|---|
| **Maya** (Lisbon) | 24 | PT | valid | no | ✅ true |
| **Dmitri** (sanctioned) | 31 | RU | valid | **yes** | ❌ false (sanctions) |
| **Leo** (minor) | 16 | DE | valid | no | ❌ false (age) |

Each fails for a **different** reason → proves composition (`age AND country AND NOT sanctioned`), not a hardcoded `true`.

## Policies seeded
- `adult-eu-nosanction`: `age>=18 AND country in [EU] AND not sanctioned`
- `accredited-us`: `country==US AND kyc==valid AND accredited==true`
- `age-gate-18`: `age>=18`

## Generator
`scripts/seed.ts` — deterministic: seals the three personas' credentials into the live TEE store, registers Proofly's `did:t3n`, creates the three policies. Same output every run. Fixtures mirrored to `data/fixtures/personas.json` for inspection.

## Anti-pattern avoided
No lorem-ipsum users. Each persona is engineered so the demo can show a **true**, a **policy-fail-on-sanctions**, and a **policy-fail-on-age** back to back — a 30-second proof that the engine reasons, and that PII never crosses the boundary in any case.
