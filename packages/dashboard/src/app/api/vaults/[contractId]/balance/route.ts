import { NextResponse } from "next/server";
import { getVaultBalance } from "@/lib/chain";

// Read straight from Soroban RPC so the value is never cached or stale.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const balance = await getVaultBalance(params.contractId);
    return NextResponse.json({ balance });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
