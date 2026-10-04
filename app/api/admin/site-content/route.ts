import { NextResponse } from "next/server";
import { getSiteContent, isMaintenanceForced } from "@/lib/get-site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getSiteContent();
  // Extra flag (not a content section) so the Maintenance tab can show the env override.
  return NextResponse.json(
    { ...content, maintenanceForced: isMaintenanceForced() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
