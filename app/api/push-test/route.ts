import { NextResponse } from "next/server";
import { pushe } from "@/lib/ntfy";
import { testPush } from "@/lib/push-test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/push-test (Authorization: Bearer HELFER_SECRET) → ein Test-Push an das Team-Thema (lib/push-test.ts).
export async function POST(req: Request) {
  const r = await testPush(req.headers.get("authorization"), process.env.HELFER_SECRET, (titel, text) => pushe(titel, text));
  return NextResponse.json(r.body, { status: r.status });
}
