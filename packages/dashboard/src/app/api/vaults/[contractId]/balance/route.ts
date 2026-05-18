import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const res = await fetch(`${API_URL}/vaults/${params.contractId}/balance`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
