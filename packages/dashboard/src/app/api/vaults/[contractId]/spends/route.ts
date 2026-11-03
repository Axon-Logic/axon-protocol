import { NextResponse } from "next/server";
import { getVaultSpends } from "@/lib/chain";

export const dynamic = "force-dynamic";

// GET /api/vaults/:contractId/spends — spend events emitted by the vault.
export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const spends = await getVaultSpends(params.contractId);
    return NextResponse.json({ spends });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
