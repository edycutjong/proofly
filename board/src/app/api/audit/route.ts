import { NextResponse } from "next/server";
import { T3nClient } from "@/sdk/T3nClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const verifier = searchParams.get("verifier") || undefined;

    const audits = T3nClient.getAudits(verifier);
    return NextResponse.json(audits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
