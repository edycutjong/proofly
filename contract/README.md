# 🛡️ Proofly TEE Contract

This is the Rust WebAssembly contract for Proofly, deployed on the Terminal 3 (T3) execution environment.

## Overview
The contract evaluates user profiles against boolean requirement policies inside a secure Trusted Execution Environment (TEE). It returns cryptographic assertions (e.g., "User is over 18") without ever leaking the raw Personally Identifiable Information (PII) to the verifier.

## Building
To compile the contract to WASM:
```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

## Architecture
- **Bindings**: Uses `wit-bindgen` to interface with the T3 runtime.
- **Logic**: Implements `create-policy` and `verify-policy` endpoints.
- **Stateless**: All user data and policy constraints are passed into the function invocation, evaluated in-memory, and discarded.
