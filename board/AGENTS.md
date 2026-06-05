<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🛡️ Proofly Dashboard — Agent Instructions

## Project
Proofly is a Next.js 16 dashboard that interacts with a Terminal 3 (T3) TEE contract to perform selective disclosures of user profiles.
It uses the `@terminal3/t3n-sdk` to attest booleans without leaking PII.

## Tech Stack
- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS v4
- **SDK**: `@terminal3/t3n-sdk` connected to live testnet
- **State**: TEE enclave variables managed via API routes
- **Deployment**: Vercel

## Key Rules
- **No Mockups**: Do not use simulated API responses or fake data.
- **SDK Wrapper**: Import from `src/sdk/t3n.ts` instead of `@terminal3/t3n-sdk` directly.
- **Environment**: Next.js 16 handles route handlers as async `params`. Always `await` them.
- **Components**: UI components reside in `src/components/`. Use `'use client'` where appropriate.
