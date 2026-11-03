import { NextResponse } from "next/server";
import { getDeployedAgents } from "@/lib/chain";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

// GET /api/agents — agents from the deployed registry, read live from chain.
export async function GET() {
  try {
    const agents = await getDeployedAgents();
    return NextResponse.json(agents.map((agent) => ({ address: agent.address, record: agent })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
