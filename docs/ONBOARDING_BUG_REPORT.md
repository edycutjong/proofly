# Terminal 3 ADK — Onboarding Bug & Documentation-Gap Report

> Submitted for the **$200 "most detailed developer"** track of the T3 ADK Bounty Challenge (beta).
> Author: Edy Cu · Project: **Proofly** · SDK: `@terminal3/t3n-sdk@3.5.0` · Date: 7 June 2026
> Contact: edy.cu@live.com

This report captures the concrete friction, ambiguities, and documentation gaps encountered while building Proofly — a `did:t3n` privacy-verification agent — against the published ADK docs (`docs.terminal3.io`) and the installed SDK. Findings are ordered by impact. Each item notes **what we expected**, **what actually happened / what's unclear**, and a **suggested fix**.

---

## A. SDK / API bugs & behavioral gaps

### A1. `authenticate()` silently requires an `EthSign` handler — no guard, no doc callout
- **Expected:** `new T3nClient({ baseUrl, wasmComponent, headers })` + `handshake()` + `authenticate(createEthAuthInput(address))` would establish a session, as a `headers: { Authorization: Bearer … }` token suggests bearer auth is supported.
- **Actual:** `createEthAuthInput(address)` triggers a guest-to-host `EthSign` challenge that can only be answered if `handlers: { EthSign: metamask_sign(account, logger, privateKey) }` was passed to the constructor. With no `EthSign` handler the challenge cannot be signed and auth fails. The `headers` field is accepted by `T3nClientOptions` but is **not** an auth path.
- **Impact:** A new dev who follows the constructor type (which advertises `headers`) builds a client that compiles, handshakes, then dies at `authenticate()`. The failure surface doesn't say "you forgot the EthSign handler."
- **Suggested fix:** (1) Make `authenticate()` throw a typed, descriptive error when an `EthSign` AuthInput is used without a configured handler. (2) In the type docs for `T3nClientOptions.headers`, state explicitly that it is **not** an authentication mechanism. (3) Add a one-liner to the invoke-contract walkthrough: "`createEthAuthInput` requires `handlers.EthSign`."

### A2. No documented bearer / API-key auth, yet `headers` is a first-class option
- **Gap:** `T3nClientOptions.headers?: Record<string,string>` exists and is the natural place a dev reaches for a sandbox token, but no docs page explains what `headers` is *for* (custom transport headers?) vs. how sandbox **test tokens** from the claim page actually map to auth. We never found how a claimed test token is consumed by the SDK.
- **Suggested fix:** Document the relationship between (a) the claim-page sandbox token, (b) `createEthAuthInput`/`EthSign`, and (c) `headers`. A "Authentication" page with one canonical happy-path snippet would close this.

### A3. `loadWasmComponent()` — environment/node resolution is implicit
- **Expected:** `loadWasmComponent()` is documented as taking an optional config; the invoke walkthrough comment says "node URL resolved from `setEnvironment()`".
- **Gap:** It's unclear what happens if `setEnvironment()` was never called before `loadWasmComponent()` / `T3nClient` construction. Ordering requirements (`setEnvironment` → `loadWasmComponent` → `new T3nClient` → `handshake`) are spread across pages and never stated as a single required sequence.
- **Suggested fix:** Add an explicit "client bootstrap order" list to the set-up-dev-env page.

### A4. Script-name resolution (`z:<tid>:<tail>`) has no failure example
- **Expected:** `script_name` must be `z:<tid>:<tail>` where `<tid>` is the tenant DID hex.
- **Gap:** The docs show how to *build* the string (`z:${tenantDid.slice("did:t3n:".length)}:travel/contracts`) but not what error you get when it's wrong, or how `getScriptVersion(getNodeUrl(), scriptName)` fails for an unregistered/placeholder name. New devs commonly start with a placeholder like `z:tenant:<name>` and get an opaque failure.
- **Suggested fix:** Document the error returned for an unresolved script name, and warn that the `<tid>` segment is the hex **without** the `did:t3n:` prefix.

### A5. KV host API has no list/scan — undocumented constraint
- **Expected:** Being able to enumerate keys in a namespace (e.g. list all policies or audit entries) from the contract.
- **Actual:** The `kv-store` host API is get/set by exact key only; there is no wildcard/prefix listing. We had to keep a parallel in-memory list of created policies/audits in the agent process to support a "list" UI.
- **Suggested fix:** State this limitation explicitly on the `create-kv-maps` page, and document the recommended pattern for "list all" (e.g. maintain an index key) so devs don't discover it by trial.

---

## B. Documentation gaps & inconsistencies

### B1. Selective disclosure path is under-specified for contract authors
- **Gap:** Docs describe SD-JWT VC issuance (`signing`) and OID4VP (`vp`) at the capability level, but there is no end-to-end **contract-side** example showing the WIT import names and the call sequence to (a) issue an SD-JWT disclosing a subset of claims and (b) wrap it as a Verifiable Presentation. We had to infer function shapes.
- **Suggested fix:** Publish a minimal Rust contract sample importing the real `signing` + `vp` host interfaces with a working disclose→present flow.

### B2. `agent-auth` grant flow: the bounty centerpiece needs a copy-pasteable user-side example
- **Gap:** The invoke-contract walkthrough shows the `agent-auth-update` payload, but the surrounding *user-client* setup (how the data owner's `userClient` is constructed/authenticated, where `tee:user/contracts` version comes from, how a **self-grant** differs from an **agent grant**) is scattered. For a challenge whose headline prize is "best implementation of the Agent Auth SDK," there should be one canonical, runnable grant example.
- **Suggested fix:** A dedicated "Agent Auth end-to-end" page: user authenticates → fetches `tee:user/contracts` version → signs `agent-auth-update` → agent calls a scoped function → show the **denied** path (`host/http.egress_denied`) when out of scope.

### B3. Host API capability list vs. WIT import names aren't cross-linked
- **Gap:** The host-api page lists capabilities by friendly name (`signing`, `vp`, `user-profile`, `agent-auth`, …), but the exact **WIT package/interface/function identifiers** a contract must `import` are not on the same page. "Capabilities come from WIT imports" is stated as a principle without the import strings to copy.
- **Suggested fix:** For each capability, show the literal `wit_bindgen` import path and function signatures.

### B4. npm package name was historically ambiguous
- **Gap:** Earlier docs/community material did not pin the published package name; we initially guessed. The installed package is `@terminal3/t3n-sdk` (v3.5.0). Several third-party/LLM-sourced references still cite non-existent surfaces (`PRIVATE_DATA_PROCESSING`, `ERC-8004`, `A2A`, `MCP`).
- **Suggested fix:** Put `npm i @terminal3/t3n-sdk` at the top of the ADK overview and the prereq page, and add a short "things the ADK is NOT" disambiguation box.

### B5. Latency / performance expectations undocumented
- **Gap:** No guidance on realistic round-trip latency for a TEE contract invocation (handshake + encrypted channel + Wasmtime execution + SD-JWT/VP). Devs can't tell whether their timings are reasonable, and risk publishing nonsense numbers.
- **Suggested fix:** Publish ballpark p50/p95 latency ranges for a typical contract call in the sandbox.

### B6. Claim-page → dev-env handoff has a discontinuity
- **Gap:** The "claim sandbox test tokens" step and the "set up dev env" step are separate pages with no explicit "now plug the token in here" bridge (ties back to A2).
- **Suggested fix:** End the claim-page docs with the exact next command that consumes the token.

---

## C. Minor / quality-of-life

- **C1.** `request-test-tokens` and the claim page link to the same marketing URL (`terminal3.io/claim-page`) in several places; a direct deep link to the developer token flow would help.
- **C2.** WIT version pinning (`wit-bindgen 0.49`) is mentioned in passing; a copy-paste `Cargo.toml` dependency block on the build-contract page would prevent version-mismatch errors.
- **C3.** Error namespace conventions (`host/http.egress_denied`, etc.) are shown by example but not enumerated; a reference table of host error codes would speed debugging.

---

## Summary table

| # | Type | Title | Severity |
|---|---|---|---|
| A1 | Bug/DX | `authenticate()` needs `EthSign` handler, no guard/doc | High |
| A2 | Doc gap | No documented bearer/token auth despite `headers` option | High |
| A3 | Doc gap | Implicit env/node + bootstrap ordering | Medium |
| A4 | Doc gap | `z:<tid>:<tail>` failure modes undocumented | Medium |
| A5 | Constraint | KV has no list/scan; undocumented | Medium |
| B1 | Doc gap | No contract-side SD-JWT→VP example | High |
| B2 | Doc gap | No canonical agent-auth end-to-end example | High |
| B3 | Doc gap | Capability names not linked to WIT import strings | Medium |
| B4 | Doc gap | npm package name historically ambiguous | Medium |
| B5 | Doc gap | No latency/perf expectations | Low |
| B6 | Doc gap | Claim-page → dev-env token handoff missing | Low |
| C1–C3 | QoL | Links, Cargo block, error-code table | Low |

**Total: 11 substantive findings + 3 QoL.** All discovered building a real agent (Proofly) against the live SDK and published docs.
