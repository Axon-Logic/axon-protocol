import { NextResponse } from "next/server";
import { getDeployment, getVaultPolicy } from "@/lib/chain";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

// GET /api/vaults/:contractId/policy — read the live policy from policy-engine.
export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  const { policyEngineId } = getDeployment();
  if (!policyEngineId) {
    return NextResponse.json(
      { error: "POLICY_ENGINE_CONTRACT_ID is not configured" },
      { status: 500 },
    );
  }

  try {
    const policy = await getVaultPolicy(policyEngineId, params.contractId);
    return NextResponse.json(policy);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/policies/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId: params.contractId, ...body }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
