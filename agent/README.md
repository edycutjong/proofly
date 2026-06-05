# 🛡️ Proofly Agent

This directory contains the automated agent for the Proofly project. Built with TypeScript and Node.js, the agent leverages the `@terminal3/t3n-sdk` to perform zero-knowledge policy verifications against user profiles within the Terminal 3 Trusted Execution Environment (TEE).

## 🚀 Features
- **Automated Verification**: Headless agent execution for verifying user profiles against T3 policies.
- **Zero-PII**: Operates without logging or caching Personally Identifiable Information (PII). Returns only cryptographic assertions (booleans) and the resulting proofs.

## 📦 Getting Started

### 1. Installation
Install the required dependencies:
```bash
npm install
```

### 2. Configuration
Ensure your environment exports your Terminal 3 Sandbox Token:
```bash
export T3N_SANDBOX_TOKEN="your_token_here"
```

### 3. Build & Run
To compile and run the agent:
```bash
npm run build
npm start
```

## 🧪 Testing
The agent suite uses Vitest for ensuring robust policy checks. 
Run tests via:
```bash
npm run test
```
