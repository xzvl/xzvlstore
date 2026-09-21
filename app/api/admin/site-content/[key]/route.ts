import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidateStorefront } from "@/lib/revalidate";
import { SITE_CONTENT_KEYS, validateSection, type SiteContent } from "@/lib/site-content";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  if (!SITE_CONTENT_KEYS.includes(key as keyof SiteContent)) {
    return NextResponse.json({ error: `Unknown content section "${key}".` }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const result = validateSection(key as keyof SiteContent, raw);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const { data, error } = await supabase
    .from("site_content")
    .upsert({ key, value: result.value, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateStorefront();
  return NextResponse.json(data);
}
