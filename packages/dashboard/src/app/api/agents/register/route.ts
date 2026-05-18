import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const res = await fetch(
      `${process.env.API_URL ?? "http://localhost:3000"}/agents/register`,
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
