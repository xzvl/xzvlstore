import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/get-site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(content, { headers: { "Cache-Control": "no-store" } });
}
