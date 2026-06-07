import { NextResponse } from "next/server";
import { getT3nClient } from "@/sdk/t3n";

export async function POST() {
  try {
    const client = await getT3nClient();

    // In a real TEE environment, user profiles must be self-registered by the users
    // using client.submitUserInput() after verifying their email/OTP.
    // We cannot arbitrarily seed PII for other DIDs.

    // Register Policies
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

    return NextResponse.json({ success: true, message: "Proofly policies seeded successfully in real TEE." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
