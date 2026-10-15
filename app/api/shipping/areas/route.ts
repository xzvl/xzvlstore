import { NextRequest, NextResponse } from "next/server";
import { getAreas } from "@/lib/jnt";

// GET /api/shipping/areas            → J&T provinces
// GET /api/shipping/areas?parentId=X → cities of province X
export async function GET(req: NextRequest) {
  const parentId = req.nextUrl.searchParams.get("parentId")?.trim() || undefined;
  if (parentId && !/^\d+$/.test(parentId)) {
    return NextResponse.json({ error: "Invalid parentId." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getAreas(parentId), {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("[shipping/areas]", err);
    return NextResponse.json({ error: "Couldn't load locations from J&T Express." }, { status: 502 });
  }
}
