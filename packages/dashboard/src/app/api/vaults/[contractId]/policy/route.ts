import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    const res = await fetch(
      `${process.env.API_URL ?? "http://localhost:3000"}/vaults/${params.contractId}/policy`,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Policy updates require a signed transaction from the admin key.
// This route proxies to the backend API which holds the admin keypair.
export async function POST(
  req: Request,
  { params }: { params: { contractId: string } },
) {
  const body = await req.json();
  try {
    const res = await fetch(
      `${process.env.API_URL ?? "http://localhost:3000"}/vaults/${params.contractId}/policy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
