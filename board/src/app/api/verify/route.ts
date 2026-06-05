import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";

export async function POST(req: Request) {
  try {
    const { userDid, policyId, verifierDid } = await req.json();

    if (!userDid || !policyId) {
      return NextResponse.json({ error: "userDid and policyId are required" }, { status: 400 });
    }

    // Try communicating with the live backend agent service on port 3001
    try {
      const agentRes = await fetch("http://localhost:3001/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userDid, policyId, verifierDid })
      });
      if (agentRes.ok) {
        const presentation = await agentRes.json();
        return NextResponse.json(presentation);
      }
    } catch (e) {
      // Live agent is offline, fallback to in-memory TEE simulator
    }

    const client = new T3nClient();
    await client.handshake();
    await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

    const presentation = await client.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "verify-policy",
      input: {
        userDid,
        policyId,
        verifierDid: verifierDid || "did:t3n:crypto_exchange_verifier",
        ts: Math.floor(Date.now() / 1000)
      }
    });

    return NextResponse.json(presentation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
