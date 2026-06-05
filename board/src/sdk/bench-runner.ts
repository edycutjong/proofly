import { T3nClient, createEthAuthInput } from "./T3nClient";

async function run() {
  const durations: number[] = [];

  for (let i = 0; i < 200; i++) {
    T3nClient.clearStore();
    const client = new T3nClient();
    
    await client.handshake();
    await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));
    
    // Seed test profile
    T3nClient.seedProfile(`did:t3n:user-${i}`, {
      age: 25,
      country: "PT",
      kyc: "valid",
      sanctioned: "no"
    });

    // Create policy
    await client.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "create-policy",
      input: {
        id: "adult-eu-nosanction",
        require: [
          { claim: "age", op: ">=", value: 18 },
          { claim: "country", op: "in", value: "EU" },
          { claim: "sanctioned", op: "==", value: "no" }
        ]
      }
    });

    const start = process.hrtime.bigint();

    // The core policy evaluation + signing (SD-JWT) + vp packaging (OID4VP)
    await client.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "verify-policy",
      input: {
        userDid: `did:t3n:user-${i}`,
        policyId: "adult-eu-nosanction",
        verifierDid: "did:t3n:crypto_exchange_verifier"
      }
    });

    const end = process.hrtime.bigint();
    const durationNs = Number(end - start);
    const durationMs = durationNs / 1_000_000;
    durations.push(durationMs);
  }

  console.log(JSON.stringify(durations));
}

run().catch(console.error);
