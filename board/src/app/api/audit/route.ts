import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const verifier = searchParams.get("verifier");
    const query = verifier ? `?verifier=${encodeURIComponent(verifier)}` : "";

    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:3001";
    const res = await fetch(`${agentUrl}/audit${query}`);
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch audit logs from agent service");
    }

    const audits = await res.json();
    return NextResponse.json(audits);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
