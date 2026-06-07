/**
 * In-process policy-evaluation microbenchmark.
 *
 * Times the deterministic policy-evaluation step that runs inside the contract
 * (claim comparison for an AND-composed policy) repeated N times, and prints the
 * per-iteration durations as a JSON array on a single line (consumed by
 * scripts/bench.py).
 *
 * NOTE: This measures the *evaluation* logic in-process — NOT a live T3N enclave
 * round-trip (handshake + encrypted channel + Wasmtime + SD-JWT/VP). Live-enclave
 * latency is network-bound and reported separately. Mirrors the comparison logic
 * in contract/src/lib.rs:verify_policy.
 */

type ClaimReq = { claim: string; op?: string; value?: unknown };

const EU = new Set([
  "PT", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "IE", "FI", "SE", "DK", "PL",
  "GR", "CZ", "HU", "RO", "BG", "HR", "LT", "LV", "EE", "SK", "SI", "CY", "MT", "LU",
]);

const PROFILE: Record<string, unknown> = {
  age: 24,
  country: "PT",
  sanctioned: "no",
  kyc: "valid",
};

const POLICY: ClaimReq[] = [
  { claim: "age", op: ">=", value: 18 },
  { claim: "country", op: "in", value: "EU" },
  { claim: "sanctioned", op: "==", value: "no" },
];

function evaluate(rules: ClaimReq[], profile: Record<string, unknown>): boolean {
  for (const rule of rules) {
    const pv = profile[rule.claim];
    if (pv === undefined) return false;
    const op = rule.op ?? "==";
    switch (op) {
      case ">=":
        if (Number(pv) < Number(rule.value)) return false;
        break;
      case "in":
        if (rule.value === "EU") {
          if (!EU.has(String(pv))) return false;
        } else if (Array.isArray(rule.value)) {
          if (!rule.value.includes(pv)) return false;
        } else if (rule.value !== pv) {
          return false;
        }
        break;
      case "==":
        if (pv !== rule.value) return false;
        break;
      case "not":
      case "!=":
        if (pv === rule.value) return false;
        break;
      default:
        throw new Error(`Unsupported operator: ${op}`);
    }
  }
  return true;
}

const N = Number(process.env.BENCH_N ?? 200);
const durations: number[] = [];

for (let i = 0; i < N; i++) {
  const t0 = performance.now();
  evaluate(POLICY, PROFILE);
  durations.push(performance.now() - t0);
}

// scripts/bench.py reads the first line that starts with "[".
console.log(JSON.stringify(durations));
