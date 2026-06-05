# 🛡️ Proofly Dashboard

This is the frontend dashboard for the Proofly project, built with [Next.js](https://nextjs.org) 16 (App Router) and Tailwind CSS v4. It acts as the primary interface for users to verify their identities against Terminal 3 (T3) TEE policies without exposing Personally Identifiable Information (PII).

## 🚀 Features
- **Real-Time Verifications**: Uses the `@terminal3/t3n-sdk` to execute `verify-policy` contract calls within the T3 enclave.
- **Audit Logs**: Provides a live audit trail of all compliance verification events queried directly from the SDK.
- **Zero-Knowledge Architecture**: Raw user data (PII) is never serialized or logged on the frontend. Only the boolean cryptographic assertions return to the dashboard.

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4, Lucide React
- **Network Interface:** `@terminal3/t3n-sdk` (WASM bindings to T3 Testnet)

## 📦 Getting Started

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Run the Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## 📁 Directory Structure
- `src/app/` - Next.js page components and API routes (`/api/verify`, `/api/audit`, etc.).
- `src/sdk/` - The unified T3 SDK wrapper (`t3n.ts`) that initializes the WASM environment and connects to the live Terminal 3 network.

## ⚙️ Configuration
The connection to the T3 enclave is handled by the `getT3nClient()` function located in `src/sdk/t3n.ts`. This dynamically loads the WASM component required to interact with the Terminal 3 API using the authorized sandbox token.
