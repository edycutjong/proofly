#!/usr/bin/env python3
import subprocess
import json
import math
import sys

def main():
    print("Running 200 in-process policy evaluations (not a live-enclave round-trip)...")
    
    # Run the Node benchmark runner
    try:
        res = subprocess.run(
            ["npx", "tsx", "board/src/sdk/bench-runner.ts"],
            capture_output=True,
            text=True,
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Error running benchmark runner: {e}", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        sys.exit(1)

    try:
        # Find the line that starts with [
        stdout_lines = res.stdout.strip().split("\n")
        json_line = None
        for line in stdout_lines:
            if line.strip().startswith("["):
                json_line = line
                break
        
        if not json_line:
            raise ValueError("Could not find JSON array in output")
            
        durations = json.loads(json_line)
    except Exception as e:
        print(f"Error parsing runner output: {e}", file=sys.stderr)
        print("Raw output:", res.stdout, file=sys.stderr)
        sys.exit(1)

    if not durations:
        print("No duration data collected", file=sys.stderr)
        sys.exit(1)

    durations.sort()
    count = len(durations)
    
    mean = sum(durations) / count
    
    # p50 (median)
    if count % 2 == 1:
        p50 = durations[count // 2]
    else:
        p50 = (durations[count // 2 - 1] + durations[count // 2]) / 2.0

    # p95
    idx_p95 = int(math.ceil(0.95 * count)) - 1
    p95 = durations[max(0, min(idx_p95, count - 1))]

    print("\n## Benchmark Results (200 Evals)")
    print("| Metric | Latency (ms) | Description |")
    print("|---|---|---|")
    print(f"| **Mean** | {mean:.6f} ms | Average in-process policy-evaluation time |")
    print(f"| **p50 (Median)** | {p50:.6f} ms | 50% of evaluations are faster than this |")
    print(f"| **p95** | {p95:.6f} ms | 95% of evaluations are faster than this |")
    print("\nMethodology: 200 iterations of the AND-composed policy-evaluation step (claim comparison) measured in-process, mirroring contract/src/lib.rs:verify_policy. This is NOT a live T3N enclave round-trip (handshake + encrypted channel + Wasmtime + SD-JWT/VP), which is network-bound and reported separately.")

if __name__ == "__main__":
    main()
