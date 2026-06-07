import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userDid, policyId, verifierDid } = await req.json();

    if (!userDid || !policyId) {
      return NextResponse.json({ error: "userDid and policyId are required" }, { status: 400 });
    }

    // Proxy request to the live Agent Service
    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:3001";
    const res = await fetch(`${agentUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userDid,
        policyId,
        verifierDid: verifierDid || "did:t3n:crypto_exchange_verifier"
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verification failed in agent service");
    }

    const presentation = await res.json();
    return NextResponse.json(presentation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
