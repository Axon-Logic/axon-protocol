import { NextResponse } from "next/server";
import { getVaultConfig } from "@/lib/chain";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const config = await getVaultConfig(params.contractId);
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
