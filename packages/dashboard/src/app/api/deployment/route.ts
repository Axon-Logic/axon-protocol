import { NextResponse } from "next/server";
import { getDeployment } from "@/lib/chain";

export const dynamic = "force-dynamic";

// GET /api/deployment — network metadata the client uses to build explorer links.
export async function GET() {
  const { network, explorer, vaultId } = getDeployment();
  return NextResponse.json({ network, explorer, vaultId });
}
