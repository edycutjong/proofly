# 🛡️ Proofly Agent — Agent Instructions

## Project
Proofly's automated agent logic written in TypeScript. This agent utilizes the `@terminal3/t3n-sdk` to securely interact with the Terminal 3 TEE contract, verify selective disclosures, and return cryptographic proofs.

## Tech Stack
- **Language**: TypeScript
- **Testing**: Vitest (`vitest.config.ts` included)
- **SDK**: `@terminal3/t3n-sdk` connected to live testnet

## Key Rules
- **No Mockups**: Do not use simulated API responses or fake data. All data must hit the T3 network.
- **Authentication**: Use the `T3N_SANDBOX_TOKEN` environment variable to authenticate the SDK client via `createEthAuthInput`.
- **Zero PII**: The agent must never cache, log, or store Personally Identifiable Information (PII) returned from or sent to the TEE.
- **Testing**: Tests must be written for Vitest. Ensure any network tests do not excessively spam the live sandbox.
