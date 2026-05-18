import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const res = await fetch(
      `${process.env.API_URL ?? "http://localhost:3000"}/vaults/${params.contractId}/spend-history`,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
