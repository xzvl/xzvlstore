import { NextResponse } from "next/server";
import { revalidateStorefront } from "@/lib/revalidate";

export async function POST() {
  revalidateStorefront();
  return NextResponse.json({ success: true, cleared_at: new Date().toISOString() });
}
