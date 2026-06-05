import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";

export async function POST(req: Request) {
  try {
    const policy = await req.json();

    if (!policy.id || !policy.require) {
      return NextResponse.json({ error: "policy id and require rules are required" }, { status: 400 });
    }

    // Try live Agent Service
    try {
      const agentRes = await fetch("http://localhost:3001/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy)
      });
      if (agentRes.ok) {
        const created = await agentRes.json();
        return NextResponse.json(created);
      }
    } catch (e) {
      // Fallback
    }

    const client = new T3nClient();
    await client.handshake();
    await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

    const created = await client.executeAndDecode({
      script_name: "z:tenant:proofly",
      script_version: "1.0.0",
      function_name: "create-policy",
      input: policy
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create policy" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Try live Agent Service
    try {
      const agentRes = await fetch("http://localhost:3001/policies");
      if (agentRes.ok) {
        const policies = await agentRes.json();
        return NextResponse.json(policies);
      }
    } catch (e) {
      // Fallback
    }

    const policies = [
      T3nClient.getPolicy("adult-eu-nosanction"),
      T3nClient.getPolicy("accredited-us"),
      T3nClient.getPolicy("age-gate-18")
    ].filter(Boolean);

    return NextResponse.json(policies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
