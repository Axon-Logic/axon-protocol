import { NextResponse } from "next/server";
import { AgentVaultClient, NETWORKS } from "@axon-protocol/sdk";

function client(contractId: string) {
  return new AgentVaultClient(contractId, NETWORKS[process.env.STELLAR_NETWORK ?? "testnet"]);
}

export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const balance = await client(params.contractId).balance();
    return NextResponse.json({ balance: balance.toString() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
