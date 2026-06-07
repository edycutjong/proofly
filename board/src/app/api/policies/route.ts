import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const policy = await req.json();

    if (!policy.id || !policy.require) {
      return NextResponse.json({ error: "policy id and require rules are required" }, { status: 400 });
    }

    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:3001";
    const res = await fetch(`${agentUrl}/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create policy in agent service");
    }

    const created = await res.json();
    return NextResponse.json(created);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:3001";
    const res = await fetch(`${agentUrl}/policies`);
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch policies from agent service");
    }

    const policies = await res.json();
    return NextResponse.json(policies);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
