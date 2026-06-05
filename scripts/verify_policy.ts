import { T3nClient, createEthAuthInput } from "../board/src/sdk/T3nClient";

async function run() {
  console.log("⚡ Replaying happy & fail path policy verification...");
  
  T3nClient.clearStore();
  const client = new T3nClient();
  await client.handshake();
  await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

  const mayaDid = "did:t3n:maya_lisbon_24";
  const dmitriDid = "did:t3n:dmitri_moscow_31";
  const leoDid = "did:t3n:leo_berlin_16";
  const verifierDid = "did:t3n:crypto_exchange_verifier";

  // Seed profiles
  T3nClient.seedProfile(mayaDid, {
    age: 24,
    country: "PT",
    kyc: "valid",
    sanctioned: "no"
  });

  T3nClient.seedProfile(dmitriDid, {
    age: 31,
    country: "RU",
    kyc: "valid",
    sanctioned: "yes"
  });

  T3nClient.seedProfile(leoDid, {
    age: 16,
    country: "DE",
    kyc: "valid",
    sanctioned: "no"
  });

  console.log("1. Creating policy 'adult-eu-nosanction'...");
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

  console.log("2. Verifying Maya (should pass)...");
  let res = await client.executeAndDecode({
    script_name: "z:tenant:proofly",
    script_version: "1.0.0",
    function_name: "verify-policy",
    input: {
      userDid: mayaDid,
      policyId: "adult-eu-nosanction",
      verifierDid
    }
  });

  if (res.disclosed.result !== true) {
    throw new Error("Failed: Maya should have passed policy verification");
  }
  console.log(`   ✅ Pass: Maya verified successfully. VP generated: ${res.vp.substring(0, 30)}...`);

  console.log("3. Verifying Dmitri (should fail on sanctions)...");
  res = await client.executeAndDecode({
    script_name: "z:tenant:proofly",
    script_version: "1.0.0",
    function_name: "verify-policy",
    input: {
      userDid: dmitriDid,
      policyId: "adult-eu-nosanction",
      verifierDid
    }
  });

  if (res.disclosed.result === true) {
    throw new Error("Failed: Dmitri should have been rejected");
  }
  console.log(`   ✅ Pass: Dmitri rejected as expected. Reason: ${res.disclosed.reason}`);

  console.log("4. Verifying Leo (should fail on age)...");
  res = await client.executeAndDecode({
    script_name: "z:tenant:proofly",
    script_version: "1.0.0",
    function_name: "verify-policy",
    input: {
      userDid: leoDid,
      policyId: "adult-eu-nosanction",
      verifierDid
    }
  });

  if (res.disclosed.result === true) {
    throw new Error("Failed: Leo should have been rejected");
  }
  console.log(`   ✅ Pass: Leo rejected as expected. Reason: ${res.disclosed.reason}`);

  console.log("🎉 Success: E2E policy verification passed. Dynamic rule composition verified!");
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
