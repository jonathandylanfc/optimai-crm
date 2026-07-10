import { NextResponse } from "next/server";

const BASE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

export async function GET() {
  if (!BASE_URL || !SECRET) {
    return NextResponse.json(
      { error: "CAR_ACCESSORIES_URL and CAR_ACCESSORIES_API_SECRET must be set" },
      { status: 503 }
    );
  }
  try {
    const res = await fetch(`${BASE_URL}/api/analytics`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream responded with ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fetch failed" },
      { status: 502 }
    );
  }
}
