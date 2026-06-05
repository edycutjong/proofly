# 🛡️ Proofly Contract — Agent Instructions

## Project
Proofly's TEE contract running on Terminal 3 (T3). Written in Rust using WebAssembly (WASM) and `wit-bindgen`.

## Tech Stack
- **Language**: Rust (edition 2021)
- **Target**: `wasm32-unknown-unknown`
- **Bindings**: `wit-bindgen` version 0.36.0
- **Serialization**: `serde` and `serde_json`

## Key Rules
- **Pure Functions**: The contract is a pure function that evaluates user policies securely inside the TEE enclave.
- **No I/O**: Do not attempt to write to disk or make outbound network requests within the contract logic. All state must be passed through the `executeAndDecode` parameters.
- **JSON Input**: Contract arguments are passed via JSON. Ensure `serde_json` correctly parses structures.
- **Build**: Use standard `cargo build --target wasm32-unknown-unknown --release` to compile.
