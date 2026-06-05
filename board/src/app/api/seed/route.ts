import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";

export async function POST() {
  T3nClient.clearStore();
  const client = new T3nClient();
  await client.handshake();
  await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

  const mayaDid = "did:t3n:maya_lisbon_24";
  const dmitriDid = "did:t3n:dmitri_moscow_31";
  const leoDid = "did:t3n:leo_berlin_16";

  // 1. Seed Personas
  T3nClient.seedProfile(mayaDid, {
    age: 24,
    country: "PT",
    kyc: "valid",
    sanctioned: "no",
    accredited: false
  });

  T3nClient.seedProfile(dmitriDid, {
    age: 31,
    country: "RU",
    kyc: "valid",
    sanctioned: "yes",
    accredited: false
  });

  T3nClient.seedProfile(leoDid, {
    age: 16,
    country: "DE",
    kyc: "valid",
    sanctioned: "no",
    accredited: false
  });

  // 2. Register Policies
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

  await client.executeAndDecode({
    script_name: "z:tenant:proofly",
    script_version: "1.0.0",
    function_name: "create-policy",
    input: {
      id: "accredited-us",
      require: [
        { claim: "country", op: "==", value: "US" },
        { claim: "kyc", op: "==", value: "valid" },
        { claim: "accredited", op: "==", value: true }
      ]
    }
  });

  await client.executeAndDecode({
    script_name: "z:tenant:proofly",
    script_version: "1.0.0",
    function_name: "create-policy",
    input: {
      id: "age-gate-18",
      require: [
        { claim: "age", op: ">=", value: 18 }
      ]
    }
  });

  return NextResponse.json({ success: true, message: "Proofly personas and policies seeded successfully." });
}
