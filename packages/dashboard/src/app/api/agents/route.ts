import { NextResponse } from "next/server";
import { RegistryClient, NETWORKS } from "@axon-protocol/sdk";

const registry = () =>
  new RegistryClient(
    process.env.REGISTRY_CONTRACT_ID ?? "",
    NETWORKS[process.env.STELLAR_NETWORK ?? "testnet"],
  );

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  if (!owner) return NextResponse.json({ error: "owner required" }, { status: 400 });

  try {
    // Registry doesn't expose a list-by-owner query on-chain;
    // in production this would be indexed off-chain. Return empty for now.
    const record = await registry().getAgent(owner);
    const agents = record ? [{ address: owner, record }] : [];
    return NextResponse.json(agents);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
