import { NextResponse } from "next/server";
import { T3nClient } from "@/sdk/T3nClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const verifier = searchParams.get("verifier") || undefined;

    // Try live Agent Service
    try {
      const url = verifier 
        ? `http://localhost:3001/audit?verifier=${encodeURIComponent(verifier)}`
        : "http://localhost:3001/audit";
      const agentRes = await fetch(url);
      if (agentRes.ok) {
        const audits = await agentRes.json();
        return NextResponse.json(audits);
      }
    } catch (e) {
      // Fallback
    }

    const audits = T3nClient.getAudits(verifier);
    return NextResponse.json(audits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
